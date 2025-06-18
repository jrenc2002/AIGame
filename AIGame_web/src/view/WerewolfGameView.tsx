import { type FC, useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAtom, useSetAtom } from 'jotai'
import toast from 'react-hot-toast'

import { PlayerCard } from '@/components/werewolf/PlayerCard'
import { GameBoard } from '@/components/werewolf/GameBoard'
import { ChatPanel, type ChatMessage } from '@/components/werewolf/ChatPanel'
import { AIConfigPanel } from '@/components/werewolf/AIConfigPanel'
import { GameLogPanel } from '@/components/werewolf/GameLogPanel'
import { GameDiscussionPanel } from '@/components/werewolf/GameDiscussionPanel'
import { TurnBasedDiscussionPanel } from '@/components/werewolf/TurnBasedDiscussionPanel'
import { CircularGameBoard } from '@/components/werewolf/CircularGameBoard'
import { RoleDisplay } from '@/components/werewolf/RoleDisplay'
import { APITestModal } from '@/components/werewolf/APITestModal'
import { GamePauseOverlay } from '@/components/werewolf/GamePauseOverlay'
import { UnifiedChatPanel } from '@/components/werewolf/UnifiedChatPanel'
import { AIRequestErrorModal } from '@/components/werewolf/AIRequestErrorModal'

import {
  initialGameState, 
  gameStateAtom,
  currentPlayerAtom,
  gameLogsAtom,
  ROLE_CONFIGS
} from '@/store/werewolf/gameState'
import type { Player, GameState, GameLog, GamePhase } from '@/store/werewolf/types'
import { GameManager } from '@/core/GameManager'
import { useGameManager } from '@/hooks/useGameManager'

const WerewolfGameView: FC = () => {
  const [gameState, setGameState] = useAtom(gameStateAtom)
  const [currentPlayer, setCurrentPlayer] = useAtom(currentPlayerAtom)
  const setGameLogs = useSetAtom(gameLogsAtom)
  
  const [showRoles, setShowRoles] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
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
      if (!gameInstance || !gameInstance.engine.retryFailedAIRequest) {
        throw new Error('游戏实例不存在或不支持重试功能')
      }
      
      // 调用游戏引擎的重试方法
      await gameInstance.engine.retryFailedAIRequest(originalRequest)
      
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
    <div className="flex h-screen w-full bg-gray-900 text-white relative">
      {/* 主游戏区域 */}
      <div className="flex flex-1 flex-col">
        {/* 圆桌游戏界面 */}
        <div className="flex-1 min-h-0">
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
        
        {/* 阶段推进按钮 */}
        {currentPlayer && gameState.currentPhase !== 'game_over' && (
          <div className="p-4 flex justify-center bg-gray-800 border-t border-gray-700">
            <button
              onClick={handleForceAdvancePhase}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              推进到下一阶段
            </button>
          </div>
        )}
      </div>

      <div className="flex w-[400px] flex-col border-l border-gray-700 bg-gray-800">
        <RoleDisplay 
          role={currentPlayer?.role || 'villager'}
          show={showRoles}
          onClose={() => setShowRoles(false)}
        />
        
        {/* 统一聊天面板头部 */}
        <div className="p-4 border-b border-gray-600 bg-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <span>💬</span>
            <span>游戏进程</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">发言讨论与系统日志</p>
        </div>
        
        {/* 统一聊天面板 */}
        <UnifiedChatPanel
          onSpeak={handlePlayerSpeak}
          onSkip={handleSkipSpeech}
          onEndDiscussion={handleEndDiscussion}
          currentPlayer={currentPlayer}
        />
      </div>

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
        onSuccess={handleAPITestSuccess}
        title={apiModalProps.title}
        message={apiModalProps.message}
      />

             {/* AI请求错误弹窗 */}
       <AIRequestErrorModal
         isOpen={showAIErrorModal}
         onClose={() => setShowAIErrorModal(false)}
         errorInfo={aiErrorInfo}
         onRetry={handleAIRequestRetry}
       />
    </div>
  )
}

export default WerewolfGameView 