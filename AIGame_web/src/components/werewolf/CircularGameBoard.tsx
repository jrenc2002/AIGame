import { type FC, useState, useEffect } from 'react'
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
  const [isMobile, setIsMobile] = useState(false)

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 获取玩家在网格中的位置 - 使用4x4网格布局
  const getGridPosition = (index: number, total: number) => {
    // 4x4网格的玩家位置映射 (row, col) - 从1开始计算网格位置
    // 网格布局：
    // [1,1] [1,2] [1,3] [1,4]
    // [2,1]  中央桌子  [2,4]  
    // [3,1]  中央桌子  [3,4]
    // [4,1] [4,2] [4,3] [4,4]

    const gridPositions: { [key: number]: Array<{row: number, col: number}> } = {
      // 4人局
      4: [
        { row: 1, col: 2 },  // 上
        { row: 2, col: 4 },  // 右
        { row: 4, col: 3 },  // 下
        { row: 3, col: 1 }   // 左
      ],
      // 5人局
      5: [
        { row: 1, col: 2 },  // 上左
        { row: 1, col: 3 },  // 上右
        { row: 2, col: 4 },  // 右
        { row: 4, col: 3 },  // 下
        { row: 3, col: 1 }   // 左
      ],
      // 6人局
      6: [
        { row: 1, col: 2 },  // 上左
        { row: 1, col: 3 },  // 上右
        { row: 2, col: 4 },  // 右上
        { row: 3, col: 4 },  // 右下
        { row: 4, col: 3 },  // 下
        { row: 3, col: 1 }   // 左
      ],
      // 7人局
      7: [
        { row: 1, col: 2 },  // 上左
        { row: 1, col: 3 },  // 上右
        { row: 2, col: 4 },  // 右上
        { row: 3, col: 4 },  // 右下
        { row: 4, col: 3 },  // 下右
        { row: 4, col: 2 },  // 下左
        { row: 3, col: 1 }   // 左
      ],
      // 8人局
      8: [
        { row: 1, col: 2 },  // 上左
        { row: 1, col: 3 },  // 上右
        { row: 2, col: 4 },  // 右上
        { row: 3, col: 4 },  // 右下
        { row: 4, col: 3 },  // 下右
        { row: 4, col: 2 },  // 下左
        { row: 3, col: 1 },  // 左下
        { row: 2, col: 1 }   // 左上
      ],
      // 9人局（标准配置）
      9: [
        { row: 1, col: 1 },  // 上左
        { row: 1, col: 2 },  // 上中左
        { row: 1, col: 3 },  // 上中右
        { row: 1, col: 4 },  // 上右
        { row: 2, col: 4 },  // 右上
        { row: 3, col: 4 },  // 右下
        { row: 4, col: 3 },  // 下右
        { row: 4, col: 2 },  // 下左
        { row: 3, col: 1 }   // 左
      ]
    }

    const positions = gridPositions[total] || gridPositions[9]
    return positions[index] || { row: 1, col: 1 }
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
      case 'preparation': return 'text-amber-400'
      case 'night': return 'text-blue-400'
      case 'day_discussion': return 'text-emerald-400'
      case 'day_voting': return 'text-red-400'
      case 'game_over': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  // 获取阶段对应的渐变色
  const getPhaseGradient = (phase: string) => {
    switch (phase) {
      case 'night':
        return 'from-blue-500/20 via-indigo-600/30 to-purple-700/40'
      case 'day_discussion':
        return 'from-emerald-400/20 via-green-500/30 to-teal-600/40'
      case 'day_voting':
        return 'from-red-400/20 via-orange-500/30 to-red-600/40'
      case 'preparation':
        return 'from-amber-400/20 via-yellow-500/30 to-orange-600/40'
      default:
        return 'from-gray-400/20 via-slate-500/30 to-gray-600/40'
    }
  }

  // 获取阶段对应的光晕效果
  const getPhaseGlow = (phase: string) => {
    switch (phase) {
      case 'night': return 'shadow-blue-500/30'
      case 'day_discussion': return 'shadow-emerald-500/30'
      case 'day_voting': return 'shadow-red-500/30'
      case 'preparation': return 'shadow-amber-500/30'
      default: return 'shadow-gray-500/30'
    }
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden min-h-[600px] md:min-h-[700px]">
      {/* 背景渐变 */}
      <div className={`absolute inset-0 bg-gradient-radial ${getPhaseGradient(gamePhase)} 
                      transition-all duration-1000 backdrop-blur-3xl`} />
      
      {/* 装饰性星空背景 */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
      
      {/* 主要游戏网格容器 */}
      <div className={`
        grid grid-cols-4 grid-rows-4 gap-4 relative z-10
        ${isMobile ? 'w-[400px] h-[400px]' : 'w-[600px] h-[600px]'}
        place-items-center
      `}>
        
        {/* 渲染玩家卡片 */}
        {players.map((player, index) => {
          const gridPos = getGridPosition(index, players.length)
          const isCurrentSpeaker = currentSpeaker && player.id === currentSpeaker.id
          const isCurrentPlayer = currentPlayer && player.id === currentPlayer.id
          
          return (
            <motion.div
              key={player.id}
              className="relative z-20 flex items-center justify-center"
              style={{
                gridRow: gridPos.row,
                gridColumn: gridPos.col,
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
              whileHover={{ scale: 1.05, z: 30 }}
            >
              {/* 发言者光环效果 */}
              {isCurrentSpeaker && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-2xl -z-10"
                    animate={{ 
                      boxShadow: [
                        '0 0 0 0px rgba(34, 197, 94, 0.7)',
                        '0 0 0 15px rgba(34, 197, 94, 0)',
                        '0 0 0 0px rgba(34, 197, 94, 0.7)'
                      ]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2 
                    }}
                  />
                  <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400/20 to-green-500/20 
                                rounded-2xl blur-md -z-10 animate-pulse" />
                </>
              )}
              
              {/* 当前玩家光圈 */}
              {isCurrentPlayer && (
                <>
                  <div className="absolute -top-3 -right-3 w-6 h-6 bg-cyan-500 rounded-full 
                                 border-2 border-white z-30 shadow-lg">
                    <motion.div 
                      className="w-full h-full bg-cyan-400 rounded-full"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 
                                rounded-2xl blur-md -z-10" />
                </>
              )}
              
              <PlayerCard
                player={player}
                isCurrentPlayer={isCurrentPlayer}
                isCurrentSpeaker={isCurrentSpeaker}
                onVote={onVote}
                canVote={canVote}
                compact={isMobile}
                className="aspect-square"
              />
            </motion.div>
          )
        })}

        {/* 中央游戏桌 - 占据中央2x2网格 */}
        <motion.div
          className="relative z-10 col-start-2 col-span-2 row-start-2 row-span-2 flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {/* 桌面 */}
          <motion.div
            className={`
              ${isMobile ? 'w-48 h-48' : 'w-64 h-64'} 
              rounded-3xl relative overflow-hidden
              backdrop-blur-xl bg-gradient-to-br from-amber-900/80 to-amber-800/90
              border-4 border-amber-600/50 shadow-2xl ${getPhaseGlow(gamePhase)}
            `}
            animate={{ 
              boxShadow: gamePhase === 'night' 
                ? '0 0 60px rgba(59, 130, 246, 0.4), 0 0 120px rgba(59, 130, 246, 0.2)' 
                : gamePhase === 'day_discussion'
                ? '0 0 60px rgba(34, 197, 94, 0.4), 0 0 120px rgba(34, 197, 94, 0.2)'
                : gamePhase === 'day_voting'
                ? '0 0 60px rgba(239, 68, 68, 0.4), 0 0 120px rgba(239, 68, 68, 0.2)'
                : '0 0 60px rgba(0, 0, 0, 0.3)' 
            }}
            transition={{ duration: 1 }}
          >
            {/* 桌面纹理 */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-700/30 to-amber-900/50 
                            rounded-3xl" />
            <div className="absolute inset-4 border border-amber-600/30 rounded-2xl" />
            
            {/* 桌面中央信息 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="backdrop-blur-sm bg-black/20 rounded-2xl p-4 border border-white/20"
              >
                <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold ${getPhaseColor(gamePhase)} mb-2`}>
                  {getPhaseDisplayName(gamePhase)}
                </div>
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-300 mb-2`}>
                  第 {currentRound} 轮
                </div>
                <motion.div 
                  className={`${isMobile ? 'text-lg' : 'text-xl'} font-mono text-white font-bold`}
                  animate={{ 
                    color: remainingTime <= 10 ? '#ef4444' : 
                           remainingTime <= 30 ? '#f59e0b' : '#10b981'
                  }}
                >
                  {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
                </motion.div>
                
                {/* 当前发言者指示 */}
                {gamePhase === 'day_discussion' && currentSpeaker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 px-3 py-1.5 bg-emerald-500/20 rounded-xl text-xs text-emerald-300 
                             border border-emerald-500/40 backdrop-blur-sm"
                  >
                    <div className="flex items-center space-x-1">
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        🎤
                      </motion.span>
                      <span>{currentSpeaker.name} 发言中</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>

          {/* 阶段装饰性元素 */}
          {gamePhase === 'night' && (
            <motion.div
              className={`absolute ${isMobile ? '-top-8 -right-8 text-3xl' : '-top-10 -right-10 text-4xl'} z-5`}
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              🌙
            </motion.div>
          )}
          
          {gamePhase === 'day_discussion' && (
            <motion.div
              className={`absolute ${isMobile ? '-top-8 -left-8 text-3xl' : '-top-10 -left-10 text-4xl'} z-5`}
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              ☀️
            </motion.div>
          )}
          
          {gamePhase === 'day_voting' && (
            <motion.div
              className={`absolute ${isMobile ? '-bottom-8 -right-8 text-3xl' : '-bottom-10 -right-10 text-4xl'} z-5`}
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🗳️
            </motion.div>
          )}
        </motion.div>
      </div>
      
      {/* 移动端提示 */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-4 right-4 text-center z-30"
        >
          <div className="backdrop-blur-md bg-black/30 rounded-xl p-3 border border-white/20">
            <p className="text-xs text-white/80">
              👆 点击玩家卡片进行投票 • 整齐的网格布局确保最佳视觉体验
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}