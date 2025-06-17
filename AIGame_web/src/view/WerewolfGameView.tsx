import { type FC, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAtom, useSetAtom } from 'jotai'
import toast from 'react-hot-toast'

import { PlayerCard } from '@/components/werewolf/PlayerCard'
import { GameBoard } from '@/components/werewolf/GameBoard'
import { ChatPanel, type ChatMessage } from '@/components/werewolf/ChatPanel'
import { AIConfigPanel } from '@/components/werewolf/AIConfigPanel'
import { GameLogPanel } from '@/components/werewolf/GameLogPanel'
import { RoleDisplay } from '@/components/werewolf/RoleDisplay'
import { APITestModal } from '@/components/werewolf/APITestModal'
import { GamePauseOverlay } from '@/components/werewolf/GamePauseOverlay'

import {
  initialGameState, 
  gameStateAtom,
  currentPlayerAtom,
  gameLogsAtom,
  ROLE_CONFIGS
} from '@/store/werewolf/gameState'
import type { Player, GameState, GameLog, GamePhase } from '@/store/werewolf/types'
import { AIConfig } from '@/lib/apiConfig'
import { EnhancedWerewolfGameController } from '@/lib/enhancedWerewolfGameController'
import { JSONTestHelper } from '@/lib/debug/jsonTestHelper'
import { RobustJSONParser } from '@/lib/ai/RobustJSONParser'
import { AIResponseTester } from '@/lib/ai/AIResponseTester'

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
  
  const controllerRef = useRef<EnhancedWerewolfGameController | null>(null)

  useEffect(() => {
    initializeGame()

    // 设置定时器更新当前时间，用于倒计时计算
    const timeInterval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => {
      clearInterval(timeInterval)
    }
  }, [])

  const initializeGame = () => {
    const controller = new EnhancedWerewolfGameController(initialGameState)
    const newGameState = controller.initializeEnhancedGame()
    
    setGameState(newGameState)
    setCurrentPlayer(newGameState.players.find(p => p.isPlayer) || null)
    setChatMessages([])
    setGameLogs([])
    
    controllerRef.current = controller
    
    setupControllerListeners(controller)
    
    setTimeout(() => {
      setShowRoles(true)
      const playerRole = newGameState.players.find(p => p.isPlayer)?.role
      if (playerRole) {
        toast.success(`你的身份是：${ROLE_CONFIGS[playerRole].name}`)
      }
    }, 1000)
    
    setTimeout(() => {
      setShowRoles(false);
      controller.startNightPhase()
    }, 5000)
  }

  const setupControllerListeners = (controller: EnhancedWerewolfGameController) => {
    controller.on('STATE_UPDATE', (updatedState: Partial<GameState>) => {
      setGameState(prev => ({ ...prev, ...updatedState }))
    })

    controller.on('LOG_UPDATE', (logs: GameLog[]) => {
      setGameLogs([...logs])
    })

    controller.on('CHAT_MESSAGE', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message])
    })

    controller.on('GAME_END', ({ winner }: { winner: string }) => {
      toast.success(`游戏结束！${winner === 'villager' ? '村民' : '狼人'}阵营获胜！`)
    })

    controller.on('GAME_PAUSED', ({ reason, needsAPIConfig }: { reason: string, needsAPIConfig: boolean }) => {
      if (needsAPIConfig) {
        setApiModalProps({
          title: '🤖 AI服务暂停',
          message: reason
        })
        setShowAPIModal(true)
      }
      toast.error(`游戏暂停: ${reason}`)
    })

    controller.on('GAME_RESUMED', () => {
      setShowAPIModal(false)
      toast.success('游戏已恢复!')
    })

    controller.on('API_TEST_FAILED', ({ message }: { message: string }) => {
      toast.error(`API测试失败: ${message}`)
    })
  }

  const handlePlayerVote = (targetId: string) => {
    if (currentPlayer && controllerRef.current) {
      controllerRef.current.handlePlayerVote(currentPlayer.id, targetId)
    }
  }

  const handleUserMessage = (message: string) => {
    if (currentPlayer && controllerRef.current) {
      controllerRef.current.handlePlayerMessage(currentPlayer.id, message)
    }
  }

  const handleAPITestSuccess = () => {
    if (controllerRef.current) {
      controllerRef.current.resumeGame()
    }
  }

  const handleAPIModalClose = () => {
    setShowAPIModal(false)
    // 用户关闭弹窗但没有修复API，可以选择稍后重试
    toast.warn('您可以随时在游戏中重新配置API')
  }

  const handleResumeGame = () => {
    if (controllerRef.current) {
      controllerRef.current.retryAIOperation()
    }
  }

  const handleOpenAPIConfig = () => {
    setShowAPIModal(true)
  }

  return (
    <div className="flex h-screen w-full bg-gray-900 text-white relative">
      <div className="flex flex-1 flex-col p-4">
        <GameBoard
          currentPhase={gameState.currentPhase}
          currentRound={gameState.currentRound}
          remainingTime={Math.max(0, Math.floor((gameState.phaseStartTime + gameState.phaseTimeLimit * 1000 - currentTime) / 1000))}
          alivePlayersCount={gameState.players.filter(p => p.status === 'alive').length}
          werewolfCount={gameState.players.filter(p => p.status === 'alive' && p.camp === 'werewolf').length}
          villagerCount={gameState.players.filter(p => p.status === 'alive' && p.camp === 'villager').length}
        />
        
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {gameState.players.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrentPlayer={player.id === currentPlayer?.id}
              onVote={handlePlayerVote}
              canVote={gameState.currentPhase === 'day_voting' && currentPlayer?.status === 'alive' && !currentPlayer.hasVoted}
                    />
                  ))}
                </div>
          </div>

      <div className="flex w-[400px] flex-col border-l border-gray-700 bg-gray-800">
        <RoleDisplay 
          role={currentPlayer?.role || 'villager'}
          show={showRoles}
          onClose={() => setShowRoles(false)}
        />
        <GameLogPanel />
        <ChatPanel
          messages={chatMessages}
          currentPhase={gameState.currentPhase}
          alivePlayers={gameState.players.filter(p => p.status === 'alive')}
          onSendMessage={handleUserMessage}
        />
      </div>

      {/* 游戏暂停覆盖层 */}
      <GamePauseOverlay
        gameState={gameState}
        onResumeGame={handleResumeGame}
        onOpenAPIConfig={handleOpenAPIConfig}
      />

      {/* API测试弹窗 */}
      <APITestModal
        isOpen={showAPIModal}
        onClose={handleAPIModalClose}
        onSuccess={handleAPITestSuccess}
        title={apiModalProps.title}
        message={apiModalProps.message}
      />
    </div>
  )
}

export default WerewolfGameView 