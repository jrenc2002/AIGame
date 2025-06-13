import { type FC, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAtom, useAtomValue } from 'jotai'
import toast from 'react-hot-toast'

import { PlayerCard } from '@/components/werewolf/PlayerCard'
import { GameBoard } from '@/components/werewolf/GameBoard'
import { ChatPanel, ChatMessage } from '@/components/werewolf/ChatPanel'
import { AIConfigPanel } from '@/components/werewolf/AIConfigPanel'

import {
  gameStateAtom,
  currentPlayerAtom,
  alivePlayersAtom,
  werewolfPlayersAtom,
  villagerPlayersAtom,
  voteResultsAtom,
  canVoteAtom,
  remainingTimeAtom,
  currentPhaseAtom,
  gameWinnerAtom,
  ROLE_CONFIGS
} from '@/store/werewolf/gameState'

import { Player, RoleType, AIPersonality, AIDifficulty } from '@/store/werewolf/types'
import { aiGameService, AIDecisionResult, AISpeechResult } from '@/lib/aiService'
import { AIConfig } from '@/lib/aiConfig'

const WerewolfGameView: FC = () => {
  const [gameState, setGameState] = useAtom(gameStateAtom)
  const [currentPlayer, setCurrentPlayer] = useAtom(currentPlayerAtom)
  const alivePlayers = useAtomValue(alivePlayersAtom)
  const werewolfPlayers = useAtomValue(werewolfPlayersAtom)
  const villagerPlayers = useAtomValue(villagerPlayersAtom)
  const voteResults = useAtomValue(voteResultsAtom)
  const canVote = useAtomValue(canVoteAtom)
  const remainingTime = useAtomValue(remainingTimeAtom)
  const gameWinner = useAtomValue(gameWinnerAtom)
  
  const [isGameInitialized, setIsGameInitialized] = useState(false)
  const [showRoles, setShowRoles] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null)

  // 初始化游戏
  useEffect(() => {
    if (!isGameInitialized) {
      initializeGame()
      setIsGameInitialized(true)
    }
  }, [isGameInitialized])

  // 生成随机玩家
  const generateRandomPlayer = (id: number, isHuman: boolean = false): Player => {
    const aiNames = [
      '艾达', '博特', '赛娜', '麦克斯', '露娜', '凯文', '诺娃', '泽塔',
      '阿尔法', '贝塔', '伽马', '德尔塔', '西格玛', '欧米茄'
    ]

    const avatars = ['🤖', '👩‍💻', '👨‍💻', '🦾', '🧠', '⚡', '🔮', '🌟', '💫', '🎭', '🎯', '🔥']
    
    const personalities: AIPersonality[] = ['logical', 'intuitive', 'aggressive', 'conservative', 'leader', 'follower']
    const difficulties: AIDifficulty[] = ['easy', 'medium', 'hard']

    return {
      id: id.toString(),
      name: isHuman ? '你' : aiNames[id % aiNames.length],
      avatar: avatars[id % avatars.length],
      role: 'villager', // 初始设置为村民，后面会重新分配
      camp: 'villager',
      status: 'alive',
      isPlayer: isHuman,
      aiDifficulty: isHuman ? undefined : difficulties[Math.floor(Math.random() * difficulties.length)],
      aiPersonality: isHuman ? undefined : personalities[Math.floor(Math.random() * personalities.length)],
      suspicionLevels: isHuman ? undefined : new Map(),
      votesReceived: 0,
      hasVoted: false,
      hasUsedSkill: false,
      isProtected: false,
      isPoisoned: false,
      isSaved: false
    }
  }

  // 分配角色
  const assignRoles = (players: Player[]) => {
    const roles: RoleType[] = ['werewolf', 'werewolf', 'seer', 'witch', 'hunter', 'guard', 'villager', 'villager']
    const shuffledRoles = [...roles].sort(() => Math.random() - 0.5)
    
    return players.map((player, index) => {
      const role = shuffledRoles[index]
      const camp = role === 'werewolf' || role === 'alpha_wolf' ? 'werewolf' : 'villager'
      
      return {
        ...player,
        role,
        camp
      }
    })
  }

  // 初始化游戏
  const initializeGame = () => {
    const players = Array.from({ length: 8 }, (_, i) => generateRandomPlayer(i, i === 0))
    const playersWithRoles = assignRoles(players)
    
    const gameId = Math.random().toString(36).substring(2, 9)
    
    setGameState({
      ...gameState,
      gameId,
      currentRound: 1,
      currentPhase: 'preparation',
      isGameActive: true,
      players: playersWithRoles,
      phaseStartTime: Date.now(),
      phaseTimeLimit: 30, // 30秒准备时间
      gameLogs: [{
        id: '1',
        round: 0,
        phase: 'preparation',
        action: '游戏开始！正在分配身份...',
        timestamp: Date.now(),
        isPublic: true
      }]
    })
    
    // 设置当前玩家（真人玩家）
    setCurrentPlayer(playersWithRoles[0])
    
    // 显示角色分配
    setTimeout(() => {
      setShowRoles(true)
      toast.success(`你的身份是：${ROLE_CONFIGS[playersWithRoles[0].role].name}`)
    }, 1000)
    
    // 开始第一个夜晚
    setTimeout(() => {
      startNightPhase()
    }, 5000)
  }

  // 开始夜晚阶段
  const startNightPhase = () => {
    setGameState(prev => ({
      ...prev,
      currentPhase: 'night',
      phaseStartTime: Date.now(),
      phaseTimeLimit: 120, // 2分钟夜晚时间
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
    // 这里可以实现具体的AI逻辑
    // 现在先简单模拟一下
    
    setTimeout(() => {
      startDayDiscussion()
    }, 5000)
  }

  // 开始白天讨论
  const startDayDiscussion = () => {
    // 随机选择一个玩家"死亡"（模拟狼人杀人）
    const aliveVillagers = alivePlayers.filter(p => p.camp === 'villager')
    if (aliveVillagers.length > 0) {
      const victim = aliveVillagers[Math.floor(Math.random() * aliveVillagers.length)]
      
      setGameState(prev => ({
        ...prev,
        currentPhase: 'day_discussion',
        phaseStartTime: Date.now(),
        phaseTimeLimit: 180, // 3分钟讨论时间
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
    }
    
    // 触发AI讨论
    setTimeout(() => {
      generateAIDiscussion()
    }, 2000) // 2秒后开始AI讨论
    
    // 自动进入投票阶段
    setTimeout(() => {
      startVotingPhase()
    }, 15000) // 15秒后进入投票（给AI讨论更多时间）
  }

  // 开始投票阶段
  const startVotingPhase = () => {
    setGameState(prev => ({
      ...prev,
      currentPhase: 'day_voting',
      phaseStartTime: Date.now(),
      phaseTimeLimit: 60, // 1分钟投票时间
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
  }

  // 处理投票
  const handleVote = (targetId: string) => {
    if (!currentPlayer || !canVote) return
    
    const vote = {
      voterId: currentPlayer.id,
      targetId,
      timestamp: Date.now()
    }
    
    setGameState(prev => ({
      ...prev,
      votes: [...prev.votes, vote],
      players: prev.players.map(p => 
        p.id === currentPlayer.id ? { ...p, hasVoted: true, votedFor: targetId } :
        p.id === targetId ? { ...p, votesReceived: p.votesReceived + 1 } : p
      )
    }))
    
    const targetPlayer = alivePlayers.find(p => p.id === targetId)
    toast.success(`已投票给 ${targetPlayer?.name}`)
    
    // 模拟AI投票
    setTimeout(() => {
      simulateAIVotes()
    }, 1000)
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
        let speech: AISpeechResult
        if (aiGameService.isAIEnabled()) {
          speech = await aiGameService.generateAISpeech(ai, gameState, '讨论阶段')
        } else {
          // 备用发言
          const messages = ['我需要仔细观察', '这很可疑', '让我想想', '有什么线索吗？']
          speech = {
            message: messages[Math.floor(Math.random() * messages.length)],
            emotion: 'neutral',
            confidence: 0.5
          }
        }
        
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
  const restartGame = () => {
    setIsGameInitialized(false)
    setShowRoles(false)
    setCurrentPlayer(null)
    setChatMessages([])
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
            
            {/* AI配置面板 */}
            <AIConfigPanel onConfigUpdate={setAiConfig} />
            
            {/* 控制按钮 */}
            <div className="space-y-2">
              <button
                onClick={() => setShowRoles(!showRoles)}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {showRoles ? '隐藏身份' : '显示身份'}
              </button>
              
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
                  showRole={showRoles || gameState.currentPhase === 'game_over'}
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
      </div>
    </div>
  )
}

export default WerewolfGameView 