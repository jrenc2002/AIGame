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

  // 计算玩家在方桌周围的位置
  const getPlayerPosition = (index: number, total: number) => {
    // 方形桌子的参数 - 确保与实际渲染的桌子尺寸一致
    const tableSize = isMobile ? 240 : 320  // 匹配实际桌子尺寸
    const margin = isMobile ? 90 : 110      // 调整边距保持合理间距
    const sideLength = tableSize / 2 + margin
    
    // 优化的9人位置模板：确保均匀分布，基于实际桌子尺寸
    if (total === 9) {
      const positions = [
        // 上边：3个玩家
        { x: -tableSize * 0.35, y: -sideLength },   // 上左
        { x: 0, y: -sideLength },                   // 上中  
        { x: tableSize * 0.35, y: -sideLength },    // 上右
        
        // 右边：2个玩家
        { x: sideLength, y: -tableSize * 0.25 },    // 右上
        { x: sideLength, y: tableSize * 0.25 },     // 右下
        
        // 下边：2个玩家
        { x: tableSize * 0.25, y: sideLength },     // 下右
        { x: -tableSize * 0.25, y: sideLength },    // 下左
        
        // 左边：2个玩家
        { x: -sideLength, y: tableSize * 0.25 },    // 左下
        { x: -sideLength, y: -tableSize * 0.25 }    // 左上
      ]
      return positions[index] || { x: 0, y: -sideLength }
    }
    
    // 预定义位置模板，确保均匀分布
    const positionTemplates: { [key: number]: Array<{x: number, y: number}> } = {
      4: [
        { x: 0, y: -sideLength },           // 上
        { x: sideLength, y: 0 },            // 右
        { x: 0, y: sideLength },            // 下
        { x: -sideLength, y: 0 }            // 左
      ],
      5: [
        { x: -tableSize * 0.25, y: -sideLength },  // 上左
        { x: tableSize * 0.25, y: -sideLength },   // 上右
        { x: sideLength, y: 0 },                   // 右
        { x: 0, y: sideLength },                   // 下
        { x: -sideLength, y: 0 }                   // 左
      ],
      6: [
        { x: -tableSize * 0.25, y: -sideLength },   // 上左
        { x: tableSize * 0.25, y: -sideLength },    // 上右
        { x: sideLength, y: -tableSize * 0.2 },     // 右上
        { x: sideLength, y: tableSize * 0.2 },      // 右下
        { x: 0, y: sideLength },                    // 下
        { x: -sideLength, y: 0 }                    // 左
      ],
      7: [
        { x: -tableSize * 0.25, y: -sideLength },   // 上左
        { x: tableSize * 0.25, y: -sideLength },    // 上右
        { x: sideLength, y: -tableSize * 0.2 },     // 右上
        { x: sideLength, y: tableSize * 0.2 },      // 右下
        { x: tableSize * 0.2, y: sideLength },      // 下右
        { x: -tableSize * 0.2, y: sideLength },     // 下左
        { x: -sideLength, y: 0 }                    // 左
      ],
      8: [
        { x: -tableSize * 0.25, y: -sideLength },   // 上左
        { x: tableSize * 0.25, y: -sideLength },    // 上右
        { x: sideLength, y: -tableSize * 0.2 },     // 右上
        { x: sideLength, y: tableSize * 0.2 },      // 右下
        { x: tableSize * 0.25, y: sideLength },     // 下右
        { x: -tableSize * 0.25, y: sideLength },    // 下左
        { x: -sideLength, y: tableSize * 0.2 },     // 左下
        { x: -sideLength, y: -tableSize * 0.2 }     // 左上
      ]
    }
    
    // 获取对应人数的位置模板，如果没有则使用通用算法
    const template = positionTemplates[total]
    if (template && index < template.length) {
      return template[index]
    }
    
    // 通用算法处理其他人数
    const angle = (index * 360 / total) - 90 // -90度让第一个玩家在顶部
    const radius = sideLength * 0.9 // 稍微缩小半径，避免重叠
    const x = Math.cos(angle * Math.PI / 180) * radius
    const y = Math.sin(angle * Math.PI / 180) * radius
    
    return { x, y }
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
      
      {/* 中央方桌 */}
      <div className="relative z-10">
        {/* 桌面 */}
        <motion.div
          className={`
            ${isMobile ? 'w-60 h-60' : 'w-80 h-80'} 
            rounded-3xl relative overflow-hidden
            backdrop-blur-xl bg-gradient-to-br from-amber-900/80 to-amber-800/90
            border-4 border-amber-600/50 shadow-2xl ${getPhaseGlow(gamePhase)}
          `}
          style={{
            width: isMobile ? '240px' : '320px',
            height: isMobile ? '240px' : '320px'
          }}
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

        {/* 玩家卡片围绕方桌排列 */}
        <div className="absolute inset-0">
          {players.map((player, index) => {
            const position = getPlayerPosition(index, players.length)
            const isCurrentSpeaker = currentSpeaker && player.id === currentSpeaker.id
            const isCurrentPlayer = currentPlayer && player.id === currentPlayer.id
            
            return (
              <motion.div
                key={player.id}
                className="absolute z-20"
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
        </div>

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
              👆 点击玩家卡片进行投票 • 👈👉 左右滑动查看更多信息
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}