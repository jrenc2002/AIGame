import { type FC, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAtom, useAtomValue } from 'jotai'
import toast from 'react-hot-toast'

import { PlayerCard } from '@/components/werewolf/PlayerCard'
import { GameBoard } from '@/components/werewolf/GameBoard'
import { ChatPanel, ChatMessage } from '@/components/werewolf/ChatPanel'
import { AIConfigPanel } from '@/components/werewolf/AIConfigPanel'
import { RoleDisplay } from '@/components/werewolf/RoleDisplay'
import { LLMTestPanel } from '@/components/werewolf/LLMTestPanel'

import {
  gameStateAtom,
  currentPlayerAtom,
  alivePlayersAtom,
  werewolfPlayersAtom,
  villagerPlayersAtom,
  voteResultsAtom,
  canVoteAtom,
  currentPhaseAtom,
  gameWinnerAtom,
  initialGameState,
  ROLE_CONFIGS
} from '@/store/werewolf/gameState'

import { useGameTimer } from '@/hooks/useGameTimer'
import { useWerewolfGame } from '@/hooks/useGameManager'
import { gameManager } from '@/core/GameManager'
import { Player, RoleType, AIPersonality, AIDifficulty } from '@/store/werewolf/types'
import { aiGameService, AIDecisionResult, AISpeechResult } from '@/lib/aiService'
import { APIConfig } from '@/lib/apiConfig'

const WerewolfGameView: FC = () => {
  const [gameState, setGameState] = useAtom(gameStateAtom)
  const [currentPlayer, setCurrentPlayer] = useAtom(currentPlayerAtom)
  const alivePlayers = useAtomValue(alivePlayersAtom)
  const werewolfPlayers = useAtomValue(werewolfPlayersAtom)
  const villagerPlayers = useAtomValue(villagerPlayersAtom)
  const voteResults = useAtomValue(voteResultsAtom)
  const canVote = useAtomValue(canVoteAtom)
  const gameWinner = useAtomValue(gameWinnerAtom)
  
  // 使用新的游戏计时器
  const { remainingTime, currentPhase, isActive } = useGameTimer()
  
  const [gameId, setGameId] = useState<string>('')
  
  // 使用真正的狼人杀游戏引擎
  const {
    currentGame,
    gameState: engineGameState,
    isLoading,
    error,
    aiThinking,
    aiStreamingActive,
    createWerewolfGame,
    quickStartWerewolf,
    startGame: startEngineGame,
    joinGame,
    executeAction,
    clearError,
    refreshGameState
  } = useWerewolfGame(gameId)
  const [isGameInitialized, setIsGameInitialized] = useState(false)
  const [showRoles, setShowRoles] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [aiConfig, setAiConfig] = useState<APIConfig | null>(null)

  // 初始化游戏
  useEffect(() => {
    if (!isGameInitialized && !currentGame) {
      console.log('🎮 首次初始化游戏...')
      initializeGame()
      setIsGameInitialized(true)
    }
  }, [isGameInitialized, currentGame])

  // 使用真正的游戏引擎初始化游戏
  const initializeGame = async () => {
    try {
      console.log('🎮 开始创建真正的狼人杀游戏...')
      
      // 创建游戏（暂时使用文心一言，避免OpenAI配置问题）
      const newGameId = await createWerewolfGame({
        playerCount: 8,
        aiPlayerCount: 7,
        aiProvider: 'openai'  // 使用OpenAI作为默认AI提供商
      })
      
      console.log(`✅ 游戏创建成功，ID: ${newGameId}`)
      setGameId(newGameId)
      
      // 等待gameId状态更新
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 加入游戏（作为真人玩家）
      console.log('👤 加入游戏作为真人玩家...')
      await joinGame(newGameId, {
        id: `player_${Date.now()}`, // 使用时间戳避免ID冲突
        name: '你',
        isAI: false,
        status: 'active'
      })
      
      console.log('✅ 真人玩家加入成功')
      
      // 开始游戏
      console.log('🚀 启动游戏引擎...')
      await startEngineGame(newGameId)
      
      console.log('✅ 游戏引擎启动成功')
      
      toast.success('游戏创建成功！AI玩家正在加入...')
      toast('LLM AI将在对话阶段自动生成发言', { icon: 'ℹ️' })
      
      console.log('🎮 真正的狼人杀游戏初始化完成，LLM AI已接入')
      
      // 手动刷新游戏状态，多次尝试确保同步
      const forceSync = async (attempts = 0) => {
        if (attempts >= 5) {
          console.warn('⚠️ 游戏状态同步失败，已达到最大重试次数')
          return
        }
        
        console.log(`🔄 手动刷新游戏状态... (尝试 ${attempts + 1}/5)`)
        refreshGameState()
        
        // 等待状态更新
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // 检查同步结果
        const game = gameManager.getGame(newGameId)
        const state = game?.engine.getGameState()
        
        console.log('🔍 检查游戏状态同步:')
        console.log('  - 游戏ID:', newGameId)
        console.log('  - 当前游戏实例:', game ? 'Found' : 'null')
        console.log('  - 引擎游戏状态:', state ? 'Found' : 'null')
        console.log('  - UI游戏状态:', gameState)
        
        if (!game || !state) {
          console.log('⚠️ 状态同步未完成，稍后重试...')
          setTimeout(() => forceSync(attempts + 1), 1000)
        } else {
          console.log('✅ 游戏状态同步成功')
        }
      }
      
      setTimeout(() => forceSync(), 100)
      
    } catch (error) {
      console.error('游戏创建失败:', error)
      toast.error('游戏创建失败，使用模拟模式')
      
      // 回退到简化模式
      initializeSimpleGame()
    }
  }

  // 简化模式（备用）
  const initializeSimpleGame = () => {
    console.log('🔄 启动简化游戏模式...')
    
    const gameId = Math.random().toString(36).substring(2, 9)
    
    setGameState({
      ...gameState,
      gameId,
      currentRound: 1,
      currentPhase: 'preparation',
      isGameActive: true,
      players: [],
      phaseStartTime: Date.now(),
      phaseTimeLimit: 10,
      gameLogs: [{
        id: '1',
        round: 0,
        phase: 'preparation',
        action: '游戏开始！正在分配身份...',
        timestamp: Date.now(),
        isPublic: true
      }]
    })
    
    toast('使用简化游戏模式，AI功能有限', { icon: 'ℹ️' })
  }

  // 同步游戏引擎状态到本地状态 - 只在关键状态变化时同步
  useEffect(() => {
    if (engineGameState && gameId) {
      // 检查是否需要更新状态（防止无限循环）
      const needsUpdate = 
        gameState.gameId !== engineGameState.gameId ||
        gameState.currentPhase !== engineGameState.currentPhase ||
        gameState.currentRound !== engineGameState.currentRound ||
        gameState.players.length !== engineGameState.players.length ||
        !gameState.isGameActive
        
      if (needsUpdate) {
        console.log('🔄 同步游戏引擎状态到UI:', {
          phase: engineGameState.currentPhase,
          round: engineGameState.currentRound,
          players: engineGameState.players.length,
          active: engineGameState.isActive
        })
        
        // 获取正确的阶段时间限制
        const phaseTimeLimit = engineGameState.phaseTimeLimit || 30
        
        // 更新本地状态
        setGameState(prev => ({
          ...prev,
          gameId: engineGameState.gameId,
          currentRound: engineGameState.currentRound,
          currentPhase: engineGameState.currentPhase as any,
          isGameActive: true, // 游戏引擎运行时，游戏应该是激活状态
          players: engineGameState.players as any[],
          phaseStartTime: engineGameState.phaseStartTime || Date.now(),
          phaseTimeLimit: phaseTimeLimit
        }))
        
        console.log(`📊 状态已同步 - 阶段: ${engineGameState.currentPhase}, 时间限制: ${phaseTimeLimit}秒`)
        
              // 查找真人玩家
      const humanPlayer = engineGameState.players.find(p => p.isPlayer)
      if (humanPlayer && humanPlayer.role) {
        setCurrentPlayer(humanPlayer as any)
        
        // 显示角色信息（只在第一次设置时显示）
        if (!currentPlayer || currentPlayer.role !== humanPlayer.role) {
          const roleConfig = ROLE_CONFIGS[humanPlayer.role as keyof typeof ROLE_CONFIGS]
          if (roleConfig) {
            toast.success(`你的身份是：${roleConfig.name}`)
          }
        }
      }
      }
    }
  }, [
    engineGameState?.gameId,
    engineGameState?.currentPhase, 
    engineGameState?.currentRound,
    engineGameState?.players?.length,
    gameId,
    gameState.gameId,
    gameState.currentPhase,
    gameState.currentRound,
    gameState.isGameActive
  ])

  // 监听阶段变化，执行相应的游戏逻辑
  useEffect(() => {
    console.log(`🎮 阶段监听 - 当前阶段: ${currentPhase}, 游戏激活: ${gameState.isGameActive}`)
    
    if (!gameState.isGameActive) {
      console.log('⚠️ 游戏未激活，跳过阶段逻辑执行')
      return
    }

    console.log(`✅ 执行阶段逻辑: ${currentPhase}`)
    
    switch (currentPhase) {
      case 'preparation':
        console.log('📋 准备阶段：游戏引擎会自动检查角色分配完成后转换...')
        break
      case 'night':
        handleNightPhase()
        break
      case 'day_discussion':
        handleDayDiscussionPhase()
        break
      case 'day_voting':
        handleVotingPhase()
        break
    }
  }, [currentPhase, gameState.isGameActive])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      console.log('🧹 WerewolfGameView 组件卸载，清理资源...')
      if (gameId && currentGame) {
        // 清理游戏资源
        console.log('🧹 清理游戏实例:', gameId)
      }
    }
  }, [])

  // 处理夜晚阶段
  const handleNightPhase = () => {
    console.log('🌙 进入夜晚阶段')
    
    setGameState(prev => ({
      ...prev,
      gameLogs: [...prev.gameLogs, {
        id: Date.now().toString(),
        round: prev.currentRound,
        phase: 'night',
        action: '夜晚降临，狼人开始行动...',
        timestamp: Date.now(),
        isPublic: true
      }]
    }))

    // 模拟AI夜晚行动
    setTimeout(() => {
      simulateNightActions()
    }, 3000)
  }

  // 模拟AI夜晚行动
  const simulateNightActions = () => {
    console.log('🐺 AI夜晚行动')
    // 这里实现具体的AI逻辑
    // 现在先简单模拟一下
  }

  // 处理白天讨论阶段
  const handleDayDiscussionPhase = () => {
    console.log('☀️ 进入白天讨论阶段')
    
    // 随机选择一个玩家"死亡"（模拟狼人杀人）
    const aliveVillagers = alivePlayers.filter(p => p.camp === 'villager')
    if (aliveVillagers.length > 0) {
      const victim = aliveVillagers[Math.floor(Math.random() * aliveVillagers.length)]
      
      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p => 
          p.id === victim.id ? { ...p, status: 'dead' } : p
        ),
        deadPlayers: [...prev.deadPlayers, { ...victim, status: 'dead' }],
        gameLogs: [...prev.gameLogs, {
          id: Date.now().toString(),
          round: prev.currentRound,
          phase: 'day_discussion',
          action: `天亮了，${victim.name} 死了`,
          timestamp: Date.now(),
          isPublic: true
        }]
      }))
      
      toast.error(`${victim.name} 在夜里被狼人杀死了`)
      
      // 触发AI讨论
      setTimeout(() => {
        generateAIDiscussion()
      }, 2000)
    }
  }

  // 人类玩家推进到下一阶段
  const advanceToNextPhase = async () => {
    if (!gameId || !currentPlayer) return
    
    try {
      // 通过游戏引擎强制推进阶段
      console.log('👤 玩家主动推进到下一阶段')
      
      await executeAction(gameId, currentPlayer.id, {
        type: 'advance_phase'
      })
      
      toast.success('推进到下一阶段')
      
    } catch (error) {
      console.error('推进阶段失败:', error)
      toast.error('推进失败，请重试')
    }
  }

  // 处理投票阶段
  const handleVotingPhase = () => {
    console.log('🗳️ 进入投票阶段')
    
    setGameState(prev => ({
      ...prev,
      votes: [], // 清空之前的投票
      players: prev.players.map(p => ({ ...p, hasVoted: false, votesReceived: 0 })),
      gameLogs: [...prev.gameLogs, {
        id: Date.now().toString(),
        round: prev.currentRound,
        phase: 'day_voting',
        action: '开始投票，选择要出局的玩家',
        timestamp: Date.now(),
        isPublic: true
      }]
    }))

    toast('开始投票！选择要出局的玩家', { icon: '🗳️' })
    
    // 模拟AI投票
    setTimeout(() => {
      simulateAIVotes()
    }, 1000)
  }

  // 处理投票
  const handleVote = async (targetId: string) => {
    if (!currentPlayer || !canVote || !gameId) return
    
    try {
      // 使用游戏引擎处理投票
      await executeAction(gameId, currentPlayer.id, {
        type: 'vote',
        targetId
      })
      
      const targetPlayer = alivePlayers.find(p => p.id === targetId)
      toast.success(`已投票给 ${targetPlayer?.name}`)
      
      console.log('🗳️ 投票已提交到游戏引擎')
      
    } catch (error) {
      console.error('投票失败:', error)
      toast.error('投票失败，请重试')
    }
  }

  // 模拟AI投票
  const simulateAIVotes = async () => {
    const aiPlayers = alivePlayers.filter(p => !p.isPlayer && !p.hasVoted)
    
    for (let i = 0; i < aiPlayers.length; i++) {
      const ai = aiPlayers[i]
      await new Promise(resolve => setTimeout(resolve, i * 1000)) // 每1秒一个AI投票
      
      try {
        const votableTargets = alivePlayers.filter(p => p.id !== ai.id)
        
        // 使用AI服务生成决策
        let decision: AIDecisionResult
        if (aiGameService.isAIEnabled()) {
          decision = await aiGameService.generateAIDecision(ai, gameState, votableTargets)
        } else {
          // 备用随机决策
          const target = votableTargets[Math.floor(Math.random() * votableTargets.length)]
          decision = {
            action: 'vote',
            target: target.id,
            reasoning: '基于当前局势的判断',
            confidence: 0.5,
            message: '我认为这是最佳选择'
          }
        }
        
        // 添加AI发言
        const chatMessage: ChatMessage = {
          id: Date.now().toString() + ai.id,
          playerId: ai.id,
          playerName: ai.name,
          message: decision.message,
          emotion: 'neutral',
          confidence: decision.confidence,
          timestamp: Date.now(),
          isAI: true
        }
        setChatMessages(prev => [...prev, chatMessage])
        
        // 执行投票
        setGameState(prev => ({
          ...prev,
          votes: [...prev.votes, {
            voterId: ai.id,
            targetId: decision.target!,
            timestamp: Date.now()
          }],
          players: prev.players.map(p => 
            p.id === ai.id ? { ...p, hasVoted: true, votedFor: decision.target } :
            p.id === decision.target ? { ...p, votesReceived: p.votesReceived + 1 } : p
          )
        }))
        
        const targetPlayer = alivePlayers.find(p => p.id === decision.target)
        toast.success(`${ai.name} 投票给了 ${targetPlayer?.name}`)
        
      } catch (error) {
        console.error(`AI ${ai.name} 投票失败:`, error)
        // 备用随机投票
        const votableTargets = alivePlayers.filter(p => p.id !== ai.id)
        const target = votableTargets[Math.floor(Math.random() * votableTargets.length)]
        
        setGameState(prev => ({
          ...prev,
          votes: [...prev.votes, {
            voterId: ai.id,
            targetId: target.id,
            timestamp: Date.now()
          }],
          players: prev.players.map(p => 
            p.id === ai.id ? { ...p, hasVoted: true, votedFor: target.id } :
            p.id === target.id ? { ...p, votesReceived: p.votesReceived + 1 } : p
          )
        }))
      }
    }
  }

  // 生成AI讨论发言
  const generateAIDiscussion = async () => {
    const aiPlayers = alivePlayers.filter(p => !p.isPlayer)
    
    for (let i = 0; i < Math.min(aiPlayers.length, 3); i++) {
      const ai = aiPlayers[Math.floor(Math.random() * aiPlayers.length)]
      await new Promise(resolve => setTimeout(resolve, i * 2000)) // 每2秒一个AI发言
      
      try {
        // 使用真实的AI服务生成发言
        const speech = await aiGameService.generateAISpeech(ai, gameState, '讨论阶段')
        
        const chatMessage: ChatMessage = {
          id: Date.now().toString() + ai.id,
          playerId: ai.id,
          playerName: ai.name,
          message: speech.message,
          emotion: speech.emotion,
          confidence: speech.confidence,
          timestamp: Date.now(),
          isAI: true
        }
        setChatMessages(prev => [...prev, chatMessage])
        
      } catch (error) {
        console.error(`AI ${ai.name} 发言失败:`, error)
        // 如果AI发言失败，记录错误但不显示mock消息
        console.warn(`跳过AI ${ai.name}的发言，等待下次触发`)
      }
    }
  }

  // 处理用户发言
  const handleUserMessage = (message: string) => {
    if (!currentPlayer) return
    
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      message,
      emotion: 'neutral',
      confidence: 1.0,
      timestamp: Date.now(),
      isAI: false
    }
    setChatMessages(prev => [...prev, chatMessage])
    
    // 触发AI回应（有概率）
    if (Math.random() < 0.3) { // 30%概率AI会回应
      setTimeout(() => {
        generateAIDiscussion()
      }, 1000)
    }
  }

  // 重新开始游戏
  const restartGame = async () => {
    console.log('🔄 重新开始游戏...')
    
    try {
      // 如果当前有游戏实例，先清理
      if (currentGame && gameId) {
        console.log('🧹 清理旧游戏实例...')
        // 这里可以添加清理游戏的逻辑
      }
      
      // 重置本地状态
      setIsGameInitialized(false)
      setShowRoles(false)
      setCurrentPlayer(null)
      setChatMessages([])
      setGameId('')
      setAiConfig(null)
      
      // 重置游戏状态原子
      setGameState(initialGameState)
      
      // 清空错误状态
      if (error) {
        clearError()
      }
      
      toast('游戏重新开始，身份重新分配', { icon: '🔄' })
      
      // 等待状态清理完成，然后重新初始化
      setTimeout(async () => {
        console.log('🚀 开始重新初始化游戏...')
        await initializeGame()
        setIsGameInitialized(true)
      }, 200)
      
    } catch (error) {
      console.error('重启游戏失败:', error)
      toast.error('重启游戏失败，请刷新页面重试')
    }
  }

  return (
    <div className="flex max-h-screen flex-col pt-6 md:pt-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* 游戏标题 */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent mb-4"
          >
            AI狼人杀 🐺
          </motion.h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            智能特工推理对决，体验未来科技的狼人杀
          </p>
        </div>

        {/* 主游戏区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {/* 左侧控制面板 */}
          <div className="lg:col-span-1 space-y-4">
            <GameBoard
              currentPhase={gameState.currentPhase}
              currentRound={gameState.currentRound}
              remainingTime={remainingTime}
              alivePlayersCount={alivePlayers.length}
              werewolfCount={werewolfPlayers.length}
              villagerCount={villagerPlayers.length}
            />
            
            {/* 玩家身份显示 */}
            <RoleDisplay player={currentPlayer} />
            
            {/* AI配置面板 */}
            <AIConfigPanel onConfigUpdate={setAiConfig} />
            
            {/* LLM测试面板 */}
            <LLMTestPanel />
            
            {/* 控制按钮 */}
            <div className="space-y-2">
              <button
                onClick={() => setShowRoles(!showRoles)}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {showRoles ? '关闭上帝视角' : '开启上帝视角'}
              </button>
              
              {/* 推进阶段按钮 */}
              {currentPlayer && gameState.isGameActive && (
                <button
                  onClick={advanceToNextPhase}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  推进到下一阶段 ⏩
                </button>
              )}
              
              <button
                onClick={restartGame}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                重新开始
              </button>
              
              {gameState.currentPhase === 'day_discussion' && (
                <button
                  onClick={generateAIDiscussion}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  触发AI讨论
                </button>
              )}
            </div>
          </div>

          {/* 中央游戏区域 */}
          <div className="lg:col-span-2">
            {/* AI状态显示 */}
            {(aiStreamingActive || aiThinking.size > 0) && (
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 
                            rounded-lg border border-purple-200 dark:border-purple-700 p-4 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="animate-pulse text-purple-600">🤖</div>
                  <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    AI正在思考...
                  </h3>
                </div>
                {Array.from(aiThinking.entries()).map(([playerId, content]) => (
                  <div key={playerId} className="text-xs text-purple-700 dark:text-purple-300 mb-1">
                    <span className="font-medium">{playerId}:</span> {content}
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {alivePlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrentPlayer={player.id === currentPlayer?.id}
                  canVote={canVote}
                  hasVoted={currentPlayer?.hasVoted || false}
                  votesReceived={voteResults[player.id] || 0}
                  onVote={handleVote}
                  showRole={
                    (player.id === currentPlayer?.id) || // 显示自己的身份
                    (showRoles) || // 管理员模式显示所有身份
                    (gameState.currentPhase === 'game_over') // 游戏结束显示所有身份
                  }
                />
              ))}
            </div>

            {/* 死亡玩家区域 */}
            {gameState.deadPlayers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-4 text-center">
                  💀 已出局玩家
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gameState.deadPlayers.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      showRole={true}
                      className="opacity-60"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右侧聊天面板 */}
          <div className="lg:col-span-2">
            <ChatPanel
              messages={chatMessages}
              currentPhase={gameState.currentPhase}
              alivePlayers={alivePlayers}
              onSendMessage={handleUserMessage}
              className="h-full"
            />
          </div>
        </div>

        {/* 游戏胜利提示 */}
        <AnimatePresence>
          {gameWinner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-8 max-w-md mx-4 text-center">
                <div className="text-6xl mb-4">
                  {gameWinner === 'villager' ? '🏆' : '🐺'}
                </div>
                <h2 className="text-2xl font-bold mb-4">
                  {gameWinner === 'villager' ? '村民阵营获胜！' : '狼人阵营获胜！'}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {gameWinner === 'villager' 
                    ? '成功找出了所有狼人，正义得到了伸张！'
                    : '狼人成功混入村庄，占据了优势地位！'
                  }
                </p>
                <button
                  onClick={restartGame}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300"
                >
                  再来一局
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* 调试面板 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg text-sm max-w-sm z-50">
            <h3 className="font-bold mb-2">🔧 调试信息</h3>
            <div>游戏ID: {gameId}</div>
            <div>当前阶段: {currentPhase}</div>
            <div>游戏激活: {gameState.isGameActive ? '✅' : '❌'}</div>
            <div>剩余时间: {remainingTime}秒</div>
            <div>引擎状态: {engineGameState ? '✅' : '❌'}</div>
            <div>游戏实例: {currentGame ? '✅' : '❌'}</div>
            {engineGameState && (
              <div>
                <div>引擎阶段: {engineGameState.currentPhase}</div>
                <div>引擎激活: {engineGameState.isActive ? '✅' : '❌'}</div>
                <div>引擎时间: {engineGameState.phaseTimeLimit}秒</div>
              </div>
            )}
            
            {/* 强制刷新按钮 */}
            <div className="mt-2 space-y-1">
              <button
                onClick={() => {
                  console.log('🔄 强制状态检查...')
                  console.log('当前游戏实例:', currentGame)
                  console.log('引擎状态:', engineGameState)
                  console.log('UI状态:', gameState)
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded"
              >
                检查状态
              </button>
              
              <button
                onClick={() => {
                  console.log('🔄 手动刷新游戏状态...')
                  refreshGameState()
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
              >
                刷新状态
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WerewolfGameView 