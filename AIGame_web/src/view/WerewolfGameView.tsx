import { type FC, useState, useEffect, useCallback } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

import { type ChatMessage } from '@/components/werewolf/ChatPanel'
import { CircularGameBoard } from '@/components/werewolf/CircularGameBoard'
import { RoleDisplay } from '@/components/werewolf/RoleDisplay'
import { APITestModal } from '@/components/werewolf/APITestModal'
import { GamePauseOverlay } from '@/components/werewolf/GamePauseOverlay'
import { UnifiedChatPanel } from '@/components/werewolf/UnifiedChatPanel'
import { AIRequestErrorModal } from '@/components/werewolf/AIRequestErrorModal'
import { AIPromptLogViewer } from '@/components/werewolf/AIPromptLogViewer'
import { aiLogStore } from '@/store/werewolf/aiLogStore'
import { AILogger } from '@/lib/ai/AILogger'

import {
  initialGameState, 
  gameStateAtom,
  currentPlayerAtom,
  gameLogsAtom,
  ROLE_CONFIGS
} from '@/store/werewolf/gameState'
import type { GameLog } from '@/store/werewolf/types'
import { GameManager } from '@/core/GameManager'
import { useGameManager } from '@/hooks/useGameManager'

const WerewolfGameView: FC = () => {
  const [gameState, setGameState] = useAtom(gameStateAtom)
  const [currentPlayer, setCurrentPlayer] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [gameLogs, setGameLogs] = useState<GameLog[]>([])
  
  const [showRoles, setShowRoles] = useState(false)

  const [showAPIModal, setShowAPIModal] = useState(false)
  const [apiModalProps, setApiModalProps] = useState({
    title: '',
    message: ''
  })
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [gameId, setGameId] = useState<string | null>(null)
  
  // AI请求错误处理状态
  const [showAIErrorModal, setShowAIErrorModal] = useState(false)
  const [aiErrorInfo, setAIErrorInfo] = useState<any>(null)
  
  // AI日志查看器状态
  const [showAILogViewer, setShowAILogViewer] = useState(false)
  const [aiLogs, setAILogs] = useState(aiLogStore.getAllLogs())

  // 定时刷新AI日志
  useEffect(() => {
    const interval = setInterval(() => {
      setAILogs(aiLogStore.getAllLogs())
    }, 2000) // 每2秒刷新一次

    return () => clearInterval(interval)
  }, [])

  const gameManager = GameManager.getInstance()
  const { createGame, startGame, executeAction } = useGameManager()

  // 先定义所有需要的callback函数
  const refreshGameState = useCallback(() => {
    if (!gameId) return
    
    const gameInstance = gameManager.getGame(gameId)
    if (gameInstance) {
      const newState = gameInstance.engine.getGameState() as any
      console.log('🔄 轮询刷新游戏状态:', newState)
      
      setGameState(newState)
      
      // 更新当前玩家
      const player = newState.players.find((p: any) => p.isPlayer)
      if (player) {
        setCurrentPlayer(player)
      }
      
      // 更新游戏日志
      if (newState.gameLogs) {
        setGameLogs(newState.gameLogs)
      }
    }
  }, [gameId, gameManager, setGameState, setCurrentPlayer, setGameLogs])

  const setupGameEventListeners = useCallback((engine: any) => {
    engine.on('state_updated', (event: any) => {
      console.log('🔄 收到状态更新事件:', event.data)
      
      // 直接获取最新的完整状态，而不是增量更新
      const currentState = engine.getGameState()
      console.log('🔄 设置新的游戏状态:', currentState)
      
      setGameState(currentState)
      
      // 更新当前玩家
      const player = currentState.players.find((p: any) => p.isPlayer)
      if (player) {
        setCurrentPlayer(player)
      }
    })

    engine.on('game_log', (event: any) => {
      const log = event.data as GameLog
      setGameLogs(prev => [...prev, log])
    })

    engine.on('chat_message', (event: any) => {
      const message = event.data as ChatMessage
      setChatMessages(prev => [...prev, message])
    })

    engine.on('game_ended', (event: any) => {
      const { winner } = event.data
      toast.success(`游戏结束！${winner === 'villager' ? '村民' : '狼人'}阵营获胜！`)
    })

    engine.on('game_paused', (event: any) => {
      const { reason } = event.data
      setApiModalProps({
        title: '🤖 AI服务暂停',
        message: reason
      })
      setShowAPIModal(true)
      toast.error(`游戏暂停: ${reason}`)
    })

    // AI请求失败事件监听
    engine.on('ai_request_failed', (event: any) => {
      console.error('AI请求失败事件:', event.data)
      const { error, playerId, phase, logs, originalRequest } = event.data
      
      setAIErrorInfo({
        error,
        playerId,
        phase,
        logs,
        originalRequest
      })
      setShowAIErrorModal(true)
      
      toast.error(`AI请求失败: 玩家 ${playerId} 在 ${phase} 阶段`)
    })

    engine.on('game_resumed', () => {
      setShowAPIModal(false)
      toast.success('游戏已恢复!')
    })
  }, [setGameState, setCurrentPlayer, setGameLogs, setChatMessages, setApiModalProps, setShowAPIModal, setAIErrorInfo, setShowAIErrorModal])

  const initializeGame = useCallback(async () => {
    try {
      // 检查是否已经有游戏ID
      if (gameId) {
        const existingGame = gameManager.getGame(gameId)
        if (existingGame) {
          console.log(`复用现有游戏: ${gameId}`)
          refreshGameState()
          return
        }
      }
      
      // 使用核心架构创建游戏
      const newGameId = await createGame({
        gameId: `werewolf_${Date.now()}`,
        playerCount: 9, // 9人局
        aiPlayerCount: 8, // 8个AI
        aiProvider: 'openai'
      })
      
      setGameId(newGameId)
      
      // 获取游戏实例
      const gameInstance = gameManager.getGame(newGameId)
      if (!gameInstance) {
        throw new Error('Failed to create game instance')
      }

      // 更新状态
      const newGameState = gameInstance.engine.getGameState() as any
      setGameState(newGameState)
      setCurrentPlayer(newGameState.players.find((p: any) => p.isPlayer) || null)
      setChatMessages([])
      setGameLogs([])
      
      // 设置事件监听
      setupGameEventListeners(gameInstance.engine)
      
      // 显示角色
      setTimeout(() => {
        setShowRoles(true)
        const playerRole = newGameState.players.find((p: any) => p.isPlayer)?.role
        if (playerRole) {
          toast.success(`你的身份是：${ROLE_CONFIGS[playerRole].name}`)
        }
      }, 1000)
      
      // 开始游戏
      setTimeout(async () => {
        setShowRoles(false)
        try {
          await startGame(newGameId)
        } catch (startError) {
          console.error('启动游戏失败:', startError)
          toast.error(`启动游戏失败: ${startError instanceof Error ? startError.message : '未知错误'}`)
        }
      }, 5000)
      
    } catch (error) {
      console.error('初始化游戏失败:', error)
      toast.error(`游戏初始化失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setShowAPIModal(true)
    }
  }, [gameId, gameManager, createGame, startGame, refreshGameState, setGameState, setCurrentPlayer, setGameLogs, setupGameEventListeners])

  // 现在可以安全地在useEffect中使用这些函数
  useEffect(() => {
    initializeGame()

    // 设置定时器更新当前时间，用于倒计时计算
    const timeInterval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    // 设置游戏状态轮询
    const stateInterval = setInterval(() => {
      if (gameId) {
        refreshGameState()
      }
    }, 2000)

    return () => {
      clearInterval(timeInterval)
      clearInterval(stateInterval)
      // 清理游戏资源
      if (gameId) {
        gameManager.removeGame(gameId)
      }
    }
  }, [gameId, gameManager, initializeGame, refreshGameState])

  const handlePlayerVote = async (targetId: string) => {
    if (currentPlayer && gameId) {
      try {
        await executeAction(gameId, currentPlayer.id, {
          type: 'vote',
          targetId
        })
      } catch (error) {
        console.error('投票失败:', error)
        toast.error('投票失败')
      }
    }
  }

  const handleUserMessage = (message: string) => {
    if (currentPlayer) {
      const chatMessage: ChatMessage = {
        id: Date.now().toString(),
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        message,
        timestamp: Date.now(),
        emotion: 'neutral',
        confidence: 0.8,
        isAI: false
      }
      setChatMessages(prev => [...prev, chatMessage])
    }
  }

  const handleAPITestSuccess = () => {
    setShowAPIModal(false)
    toast.success('API配置成功!')
    
    // 重新初始化游戏
    if (gameId) {
      gameManager.removeGame(gameId)
      setGameId(null)
    }
    initializeGame()
  }

  const handleAPIModalClose = () => {
    setShowAPIModal(false)
    toast('您可以随时在游戏中重新配置API')
  }

  const handleResumeGame = () => {
    // 重新初始化游戏
    initializeGame()
  }

  const handleOpenAPIConfig = () => {
    setShowAPIModal(true)
  }

  const handleForceAdvancePhase = async () => {
    if (currentPlayer && gameId) {
      try {
        await executeAction(gameId, currentPlayer.id, {
          type: 'advance_phase'
        })
      } catch (error) {
        console.error('推进阶段失败:', error)
        toast.error('推进阶段失败')
      }
    }
  }

  // 处理玩家发言
  const handlePlayerSpeak = async (content: string) => {
    if (currentPlayer && gameId) {
      try {
        await executeAction(gameId, currentPlayer.id, {
          type: 'speak',
          content
        })
      } catch (error) {
        console.error('发言失败:', error)
        toast.error('发言失败')
      }
    }
  }

  // 处理跳过发言
  const handleSkipSpeech = async () => {
    if (currentPlayer && gameId) {
      try {
        await executeAction(gameId, currentPlayer.id, {
          type: 'skip_speech'
        })
      } catch (error) {
        console.error('跳过发言失败:', error)
        toast.error('跳过发言失败')
      }
    }
  }

  // 处理结束讨论
  const handleEndDiscussion = async () => {
    if (currentPlayer && gameId) {
      try {
        await executeAction(gameId, currentPlayer.id, {
          type: 'end_discussion'
        })
      } catch (error) {
        console.error('结束讨论失败:', error)
        toast.error('结束讨论失败')
      }
    }
  }

  // AI请求重试处理
  const handleAIRequestRetry = async (originalRequest: any) => {
    if (!gameId) {
      throw new Error('游戏ID不存在')
    }
    
    try {
      console.log('🔄 开始重试AI请求:', originalRequest)
      toast.loading('正在重试AI请求...', { id: 'ai-retry' })
      
      // 获取游戏实例
      const gameInstance = gameManager.getGame(gameId)
      if (!gameInstance) {
        throw new Error('游戏实例不存在')
      }
      
      // 调用游戏引擎的重试方法（使用类型断言）
      const werewolfEngine = gameInstance.engine as any
      if (werewolfEngine.retryFailedAIRequest) {
        await werewolfEngine.retryFailedAIRequest(originalRequest)
      } else {
        throw new Error('游戏引擎不支持重试功能')
      }
      
      toast.success('AI请求重试成功！', { id: 'ai-retry' })
      console.log('✅ AI请求重试成功')
      
    } catch (error) {
      console.error('❌ AI请求重试失败:', error)
      toast.error(`重试失败: ${error instanceof Error ? error.message : '未知错误'}`, { id: 'ai-retry' })
      throw error
    }
  }

  // 获取当前发言者
  const currentState = gameState as any
  const { currentSpeakerIndex = 0, speakingOrder = [] } = currentState
  const currentSpeakerId = speakingOrder[currentSpeakerIndex]
  const currentSpeaker = gameState.players.find(p => p.id === currentSpeakerId)

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* 主要布局容器 - 使用flexbox确保对齐 */}
      <div className="flex flex-col lg:flex-row w-full relative z-10 h-full">
        
        {/* 游戏主面板区域 */}
        <div className="flex flex-col flex-1 lg:order-1 order-2 min-h-0">
          {/* 移动端顶部状态栏 */}
          <div className="lg:hidden p-4 bg-black/20 backdrop-blur-xl border-b border-white/10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg 
                               flex items-center justify-center text-sm">
                  🎮
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    第 {gameState.currentRound} 轮 • {gameState.currentPhase === 'night' ? '夜晚' : 
                    gameState.currentPhase === 'day_discussion' ? '讨论' : 
                    gameState.currentPhase === 'day_voting' ? '投票' : '准备'}
                  </div>
                  <div className="text-xs text-gray-400">
                    存活: {gameState.players.filter(p => p.status === 'active').length} 人
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono font-bold text-white">
                  {Math.floor(Math.max(0, Math.floor((gameState.phaseStartTime + gameState.phaseTimeLimit * 1000 - currentTime) / 1000)) / 60)}:
                  {(Math.max(0, Math.floor((gameState.phaseStartTime + gameState.phaseTimeLimit * 1000 - currentTime) / 1000)) % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-400">剩余时间</div>
              </div>
            </motion.div>
          </div>

          {/* 游戏板容器 - 使用flex确保居中和填充 */}
          <div className="flex-1 flex items-center justify-center p-4 lg:p-8 min-h-0">
            <div className="w-full h-full max-w-4xl max-h-full flex items-center justify-center">
              <CircularGameBoard
                players={gameState.players}
                currentPlayer={currentPlayer}
                currentSpeaker={currentSpeaker}
                onVote={handlePlayerVote}
                canVote={gameState.currentPhase === 'day_voting' && currentPlayer?.status === 'active' && !currentPlayer.hasVoted}
                gamePhase={gameState.currentPhase}
                remainingTime={Math.max(0, Math.floor((gameState.phaseStartTime + gameState.phaseTimeLimit * 1000 - currentTime) / 1000))}
                currentRound={gameState.currentRound}
              />
            </div>
          </div>
        </div>

        {/* 聊天面板区域 - 固定宽度，统一布局 */}
        <div className="flex flex-col lg:w-[420px] xl:w-[480px] w-full lg:order-2 order-1 
                        lg:border-l border-t lg:border-t-0 border-white/10 bg-black/20 backdrop-blur-xl
                        lg:h-full h-auto lg:max-h-none max-h-[40vh] lg:min-h-0 min-h-[300px]">
          
          {/* 聊天面板头部 */}
          <div className="flex-shrink-0 p-4 lg:p-6 border-b border-white/10 bg-black/10 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl 
                               flex items-center justify-center shadow-lg">
                  <span className="text-lg">💬</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">游戏进程</h3>
                  <p className="text-xs text-gray-400">发言讨论与系统日志</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* 添加测试日志按钮 */}
                <button 
                  onClick={() => {
                    console.log('🧪 开始测试AI日志系统...')
                    
                    // 检查aiLogStore状态
                    const currentLogs = aiLogStore.getAllLogs()
                    console.log('📊 当前日志数量:', currentLogs.length)
                    console.log('📊 当前日志内容:', currentLogs)
                    
                    // 添加测试日志
                    AILogger.addTestLog()
                    
                    // 立即检查新日志
                    setTimeout(() => {
                      const newLogs = aiLogStore.getAllLogs()
                      console.log('📊 添加后日志数量:', newLogs.length)
                      console.log('📊 最新日志:', newLogs[0])
                      
                      // 强制刷新状态
                      setAILogs(newLogs)
                    }, 200)
                    
                    toast.success('已添加测试日志，请查看控制台')
                  }}
                  className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-colors
                           border border-green-400/30 hover:border-green-400/50 group"
                  title="添加测试日志"
                  aria-label="添加测试日志"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">🧪</span>
                </button>

                {/* AI日志查看器按钮 */}
                <button 
                  onClick={() => {
                    const currentLogs = aiLogStore.getAllLogs()
                    console.log('🤖 点击AI日志按钮，当前日志数量:', currentLogs.length)
                    console.log('🤖 日志详情:', currentLogs)
                    setAILogs(currentLogs)
                    setShowAILogViewer(true)
                  }}
                  className="relative p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors
                           border border-blue-400/30 hover:border-blue-400/50 group"
                  title={`查看AI提示词日志 (${aiLogs.length}条)`}
                  aria-label="查看AI提示词日志"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">🤖</span>
                  {aiLogs.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs 
                                   rounded-full h-4 w-4 flex items-center justify-center
                                   min-w-[16px] text-[10px]">
                      {aiLogs.length > 99 ? '99+' : aiLogs.length}
                    </span>
                  )}
                </button>
                
                {/* 移动端收起按钮 */}
                <button 
                  className="lg:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  title="收起聊天面板"
                  aria-label="收起聊天面板"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* 统一聊天面板 - 弹性填充剩余空间 */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <UnifiedChatPanel
              onSpeak={handlePlayerSpeak}
              onSkip={handleSkipSpeech}
              onEndDiscussion={handleEndDiscussion}
              currentPlayer={currentPlayer}
            />
          </div>
        </div>
      </div>

      {/* 角色显示覆盖层 */}
      <RoleDisplay 
        role={currentPlayer?.role || 'villager'}
        show={showRoles}
        onClose={() => setShowRoles(false)}
      />

      {/* 游戏暂停覆盖层 */}
      <GamePauseOverlay
        gameState={gameState}
        onResumeGame={handleResumeGame}
        onOpenAPIConfig={handleOpenAPIConfig}
      />

      {/* API配置弹窗 */}
      <APITestModal
        isOpen={showAPIModal}
        onClose={handleAPIModalClose}
      />

      {/* AI请求错误弹窗 */}
      <AIRequestErrorModal
        isOpen={showAIErrorModal}
        onClose={() => setShowAIErrorModal(false)}
        errorInfo={aiErrorInfo}
        onRetry={handleAIRequestRetry}
      />

      {/* AI提示词日志查看器 */}
      <AIPromptLogViewer
        logs={aiLogs}
        isOpen={showAILogViewer}
        onClose={() => {
          setShowAILogViewer(false)
          // 刷新日志数据
          setAILogs(aiLogStore.getAllLogs())
        }}
      />
    </div>
  )
}

export default WerewolfGameView 