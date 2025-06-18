import { type FC } from 'react'
import { motion } from 'framer-motion'
import { PlayerCard } from './PlayerCard'
import type { Player } from '@/store/werewolf/types'

interface CircularGameBoardProps {
  players: Player[]
  currentPlayer?: Player
  currentSpeaker?: Player
  onVote: (targetId: string) => void
  canVote: boolean
  gamePhase: string
  remainingTime: number
  currentRound: number
}

export const CircularGameBoard: FC<CircularGameBoardProps> = ({
  players,
  currentPlayer,
  currentSpeaker,
  onVote,
  canVote,
  gamePhase,
  remainingTime,
  currentRound
}) => {
  // 计算玩家在圆桌上的位置
  const getPlayerPosition = (index: number, total: number) => {
    const angle = (index * 360 / total) - 90 // -90度让第一个玩家在顶部
    const radius = 200 // 圆桌半径
    const x = Math.cos(angle * Math.PI / 180) * radius
    const y = Math.sin(angle * Math.PI / 180) * radius
    return { x, y, angle }
  }

  // 获取阶段显示名称
  const getPhaseDisplayName = (phase: string) => {
    switch (phase) {
      case 'preparation': return '准备阶段'
      case 'night': return '夜晚阶段'
      case 'day_discussion': return '白天讨论'
      case 'day_voting': return '投票阶段'
      case 'game_over': return '游戏结束'
      default: return phase
    }
  }

  // 获取阶段对应的颜色
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'preparation': return 'text-yellow-400'
      case 'night': return 'text-blue-400'
      case 'day_discussion': return 'text-green-400'
      case 'day_voting': return 'text-red-400'
      case 'game_over': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  // 获取背景渐变
  const getPhaseGradient = (phase: string) => {
    switch (phase) {
      case 'night':
        return 'radial-gradient(circle, rgba(30, 58, 138, 0.3) 0%, rgba(15, 23, 42, 0.8) 100%)'
      case 'day_discussion':
        return 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)'
      case 'day_voting':
        return 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)'
      default:
        return 'radial-gradient(circle, rgba(71, 85, 105, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)'
    }
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* 背景渐变 */}
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{ 
          background: getPhaseGradient(gamePhase)
        }}
      />
      
      {/* 中央圆桌 */}
      <div className="relative">
        {/* 桌面 */}
        <motion.div
          className="w-80 h-80 rounded-full bg-gradient-to-br from-amber-900 to-amber-800 shadow-2xl border-8 border-amber-700 relative"
          animate={{ 
            boxShadow: gamePhase === 'night' 
              ? '0 0 50px rgba(59, 130, 246, 0.5)' 
              : '0 0 50px rgba(0, 0, 0, 0.5)' 
          }}
          transition={{ duration: 1 }}
        >
          {/* 桌面中央信息 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className={`text-xl font-bold ${getPhaseColor(gamePhase)} mb-2`}>
                {getPhaseDisplayName(gamePhase)}
              </div>
              <div className="text-sm text-gray-300 mb-1">
                第 {currentRound} 轮
              </div>
              <div className="text-lg font-mono text-white">
                {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
              </div>
              
              {/* 当前发言者指示 */}
              {gamePhase === 'day_discussion' && currentSpeaker && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 px-3 py-1 bg-green-500 bg-opacity-20 rounded-full text-xs text-green-300 border border-green-500"
                >
                  {currentSpeaker.name} 发言中
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* 玩家卡片环绕排列 */}
        <div className="absolute inset-0">
          {players.map((player, index) => {
            const position = getPlayerPosition(index, players.length)
            const isCurrentSpeaker = currentSpeaker && player.id === currentSpeaker.id
            const isCurrentPlayer = currentPlayer && player.id === currentPlayer.id
            
            return (
              <motion.div
                key={player.id}
                className="absolute"
                style={{
                  left: `calc(50% + ${position.x}px)`,
                  top: `calc(50% + ${position.y}px)`,
                  transform: 'translate(-50%, -50%)'
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  y: isCurrentSpeaker ? -10 : 0
                }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.1,
                  y: { duration: 0.3 }
                }}
                whileHover={{ scale: 1.05 }}
              >
                {/* 发言者光环 */}
                {isCurrentSpeaker && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    animate={{ 
                      boxShadow: [
                        '0 0 0 0px rgba(34, 197, 94, 0.7)',
                        '0 0 0 10px rgba(34, 197, 94, 0)',
                        '0 0 0 0px rgba(34, 197, 94, 0.7)'
                      ]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2 
                    }}
                  />
                )}
                
                {/* 当前玩家标记 */}
                {isCurrentPlayer && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white z-10">
                    <div className="w-full h-full bg-blue-400 rounded-full animate-ping" />
                  </div>
                )}
                
                <PlayerCard
                  player={player}
                  isCurrentPlayer={isCurrentPlayer}
                  isCurrentSpeaker={isCurrentSpeaker}
                  onVote={onVote}
                  canVote={canVote}
                  compact={true}
                />
              </motion.div>
            )
          })}
        </div>

        {/* 装饰性元素 */}
        {gamePhase === 'night' && (
          <motion.div
            className="absolute -top-10 -right-10 text-4xl"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            🌙
          </motion.div>
        )}
        
        {gamePhase === 'day_discussion' && (
          <motion.div
            className="absolute -top-10 -left-10 text-4xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ☀️
          </motion.div>
        )}
        
        {gamePhase === 'day_voting' && (
          <motion.div
            className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-4xl"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            🗳️
          </motion.div>
        )}
      </div>

      {/* 游戏统计信息 */}
      <div className="absolute top-4 left-4 space-y-2">
        <div className="bg-black bg-opacity-50 rounded-lg px-3 py-2">
          <div className="text-xs text-gray-300 mb-1">存活玩家</div>
          <div className="text-lg font-bold text-white">
            {players.filter(p => p.status === 'active').length}
          </div>
        </div>
        <div className="bg-black bg-opacity-50 rounded-lg px-3 py-2">
          <div className="text-xs text-red-300 mb-1">狼人</div>
          <div className="text-lg font-bold text-red-400">
            {players.filter(p => p.status === 'active' && p.camp === 'werewolf').length}
          </div>
        </div>
        <div className="bg-black bg-opacity-50 rounded-lg px-3 py-2">
          <div className="text-xs text-blue-300 mb-1">村民</div>
          <div className="text-lg font-bold text-blue-400">
            {players.filter(p => p.status === 'active' && p.camp === 'villager').length}
          </div>
        </div>
      </div>

      {/* 阶段提示 */}
      <div className="absolute top-4 right-4">
        <motion.div
          className="bg-black bg-opacity-50 rounded-lg px-4 py-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="text-xs text-gray-300 mb-1">当前阶段</div>
          <div className={`text-sm font-bold ${getPhaseColor(gamePhase)}`}>
            {getPhaseDisplayName(gamePhase)}
          </div>
        </motion.div>
      </div>
    </div>
  )
}