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

import {
  initialGameState, 
  gameStateAtom,
  currentPlayerAtom,
  gameLogsAtom,
  ROLE_CONFIGS
} from '@/store/werewolf/gameState'
import type { Player, GameState, GameLog, GamePhase } from '@/store/werewolf/types'
import { AIConfig } from '@/lib/aiConfig'
import { EnhancedWerewolfGameController } from '@/lib/enhancedWerewolfGameController'

const EnhancedWerewolfGameView: FC = () => {
  const [gameState, setGameState] = useAtom(gameStateAtom)
  const [currentPlayer, setCurrentPlayer] = useAtom(currentPlayerAtom)
  const setGameLogs = useSetAtom(gameLogsAtom)
  
  const [showRoles, setShowRoles] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  
  const controllerRef = useRef<EnhancedWerewolfGameController | null>(null)

  useEffect(() => {
      initializeGame()

    return () => {
      // cleanup if needed.
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

  return (
    <div className="flex h-screen w-full bg-gray-900 text-white">
      <div className="flex flex-1 flex-col p-4">
            <GameBoard
          gameState={gameState}
          onRestart={initializeGame}
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
          onSendMessage={handleUserMessage}
          isInputDisabled={gameState.currentPhase !== 'day_discussion' || currentPlayer?.status !== 'alive'}
        />
      </div>
    </div>
  )
}

export default EnhancedWerewolfGameView 