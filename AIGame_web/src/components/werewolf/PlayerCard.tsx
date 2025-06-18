import { type FC } from 'react'
import { motion } from 'framer-motion'
import { Player } from '@/store/werewolf/types'
import { ROLE_CONFIGS } from '@/store/werewolf/gameState'

interface PlayerCardProps {
  player: Player
  isCurrentPlayer?: boolean
  isCurrentSpeaker?: boolean
  canVote?: boolean
  hasVoted?: boolean
  votesReceived?: number
  onVote?: (playerId: string) => void
  showRole?: boolean
  compact?: boolean
  className?: string
}

export const PlayerCard: FC<PlayerCardProps> = ({
  player,
  isCurrentPlayer = false,
  isCurrentSpeaker = false,
  canVote = false,
  hasVoted = false,
  votesReceived = 0,
  onVote,
  showRole = false,
  compact = false,
  className = ''
}) => {
  const roleConfig = ROLE_CONFIGS[player.role]
  const isAlive = player.status === 'active'
  const isEliminated = player.status === 'eliminated'

  const handleVoteClick = () => {
    if (canVote && onVote && !hasVoted && isAlive && !isCurrentPlayer) {
      onVote(player.id)
    }
  }

  // 现代化卡片样式
  const getCardStyle = () => {
    const baseStyle = `
      backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10
      shadow-xl shadow-black/5 dark:shadow-black/20
    `
    
    if (isCurrentSpeaker) {
      return `${baseStyle} ring-2 ring-emerald-400/60 bg-emerald-50/20 dark:bg-emerald-900/20 
              shadow-emerald-500/20 dark:shadow-emerald-400/10`
    }
    if (isCurrentPlayer) {
      return `${baseStyle} ring-2 ring-cyan-400/60 bg-cyan-50/20 dark:bg-cyan-900/20
              shadow-cyan-500/20 dark:shadow-cyan-400/10`
    }
    if (isEliminated) {
      return `${baseStyle} opacity-40 grayscale saturate-50`
    }
    if (canVote && !hasVoted && !isCurrentPlayer) {
      return `${baseStyle} hover:ring-2 hover:ring-orange-300/60 cursor-pointer 
              hover:bg-orange-50/10 dark:hover:bg-orange-900/10 hover:shadow-orange-500/20
              transition-all duration-300 ease-out`
    }
    return baseStyle
  }

  // 状态指示器
  const getStatusIndicator = () => {
    if (isEliminated) return { icon: '❌', color: 'text-gray-400', label: '出局' }
    if (player.isProtected) return { icon: '🛡️', color: 'text-cyan-400', label: '被保护' }
    if (player.isPoisoned) return { icon: '☠️', color: 'text-purple-400', label: '中毒' }
    return { icon: '✅', color: 'text-emerald-400', label: '存活' }
  }

  const statusIndicator = getStatusIndicator()

  return (
    <motion.div
      whileHover={canVote && !hasVoted && !isCurrentPlayer && isAlive ? { 
        scale: 1.02, 
        y: -2,
        transition: { duration: 0.2, ease: "easeOut" }
      } : {}}
      whileTap={canVote && !hasVoted && !isCurrentPlayer && isAlive ? { 
        scale: 0.98,
        transition: { duration: 0.1 }
      } : {}}
      onClick={handleVoteClick}
      className={`
        ${getCardStyle()}
        rounded-2xl p-3 relative overflow-hidden
        ${compact ? 'w-32 h-32' : 'w-40 h-40'}
        flex flex-col
        transition-all duration-300 ease-out
        ${className}
      `}
    >
      {/* 背景装饰光晕 */}
      {isCurrentPlayer && (
        <div className="absolute -inset-1 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 
                        rounded-2xl blur-lg -z-10 animate-pulse" />
      )}
      {isCurrentSpeaker && (
        <div className="absolute -inset-1 bg-gradient-to-br from-emerald-400/20 to-green-500/20 
                        rounded-2xl blur-lg -z-10 animate-pulse" />
      )}

      {/* 投票数指示器 */}
      {votesReceived > 0 && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-red-600 
                     text-white text-xs font-bold rounded-full w-6 h-6 flex items-center 
                     justify-center z-10 shadow-lg border-2 border-white/20"
        >
          {votesReceived}
        </motion.div>
      )}

      {/* 当前玩家标识 */}
      {isCurrentPlayer && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-2 left-2 bg-gradient-to-r from-cyan-500 to-blue-500 
                     text-white text-xs px-2 py-1 rounded-full font-medium 
                     shadow-lg backdrop-blur-sm"
        >
          你
        </motion.div>
      )}

      {/* 发言者标识 */}
      {isCurrentSpeaker && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-2 right-2 bg-gradient-to-r from-emerald-500 to-green-500 
                     text-white text-xs px-2 py-1 rounded-full font-medium 
                     shadow-lg backdrop-blur-sm"
        >
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            发言
          </motion.span>
        </motion.div>
      )}

      {/* 玩家头像区域 */}
      <div className="flex flex-col items-center flex-1 justify-center space-y-2">
        <div className="relative">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className={`
              ${compact ? 'w-8 h-8' : 'w-10 h-10'} 
              rounded-full flex items-center justify-center text-lg
              bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm
              border border-white/30 dark:border-white/20
              ${isAlive ? 'shadow-lg' : 'opacity-60'}
            `}
          >
            {player.avatar || '👤'}
          </motion.div>
          
          {/* 状态指示器 */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -bottom-1 -right-1 text-xs ${statusIndicator.color} 
                       bg-white/80 dark:bg-black/80 rounded-full p-0.5 shadow-md backdrop-blur-sm`}
          >
            {statusIndicator.icon}
          </motion.div>
        </div>

        {/* 玩家名称 */}
        <div className="text-center">
          <h3 className={`font-medium truncate ${compact ? 'text-xs' : 'text-sm'} ${
            isAlive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {player.name}
          </h3>
          
          {/* AI难度标识 */}
          {!player.isPlayer && player.aiDifficulty && !compact && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-xs px-1.5 py-0.5 rounded-full backdrop-blur-sm border mt-1 inline-block ${
                player.aiDifficulty === 'easy' ? 'bg-emerald-100/60 text-emerald-700 border-emerald-200/60' :
                player.aiDifficulty === 'medium' ? 'bg-amber-100/60 text-amber-700 border-amber-200/60' :
                'bg-red-100/60 text-red-700 border-red-200/60'
              }`}
            >
              {player.aiDifficulty === 'easy' ? '新手' :
               player.aiDifficulty === 'medium' ? '进阶' : '专家'}
            </motion.span>
          )}
        </div>
      </div>

      {/* 角色信息（仅在允许时显示） */}
      {showRole && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="mt-2"
        >
          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium 
                          backdrop-blur-sm border ${roleConfig.color}`}>
            <span className="text-sm">{roleConfig.icon}</span>
            <span>{roleConfig.name}</span>
          </div>
        </motion.div>
      )}

      {/* 玩家状态信息 */}
      <div className="flex items-center justify-between text-xs mt-2">
        <div className={`flex items-center space-x-1 ${statusIndicator.color}`}>
          <span>{statusIndicator.icon}</span>
          <span className="font-medium">{statusIndicator.label}</span>
        </div>

        {/* 投票状态 */}
        {player.hasVoted && isAlive && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center space-x-1 text-emerald-500 dark:text-emerald-400"
          >
            <span>✓</span>
            <span className="text-xs font-medium">已投票</span>
          </motion.div>
        )}
      </div>

      {/* 投票按钮（仅在可投票时显示） */}
      {canVote && !hasVoted && isAlive && !isCurrentPlayer && (
        <motion.div
          className="mt-2 pt-2 border-t border-white/20 dark:border-white/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 
                       hover:to-red-600 text-white font-medium py-1.5 px-2 rounded-lg
                       shadow-lg shadow-orange-500/25 backdrop-blur-sm border border-white/20
                       transition-all duration-200 text-xs
                       active:shadow-lg active:shadow-orange-500/40
                       touch-manipulation min-h-[32px]"
          >
            投票
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  )
} 