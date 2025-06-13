import { type FC } from 'react'
import { motion } from 'framer-motion'
import { Player } from '@/store/werewolf/types'
import { ROLE_CONFIGS } from '@/store/werewolf/gameState'

interface PlayerCardProps {
  player: Player
  isCurrentPlayer?: boolean
  canVote?: boolean
  hasVoted?: boolean
  votesReceived?: number
  onVote?: (playerId: string) => void
  showRole?: boolean
  className?: string
}

export const PlayerCard: FC<PlayerCardProps> = ({
  player,
  isCurrentPlayer = false,
  canVote = false,
  hasVoted = false,
  votesReceived = 0,
  onVote,
  showRole = false,
  className = ''
}) => {
  const roleConfig = ROLE_CONFIGS[player.role]
  const isAlive = player.status === 'alive'
  const isEliminated = player.status === 'eliminated'
  const isDead = player.status === 'dead'

  const handleVoteClick = () => {
    if (canVote && onVote && !hasVoted && isAlive && !isCurrentPlayer) {
      onVote(player.id)
    }
  }

  // 卡片状态样式
  const getCardStyle = () => {
    if (isCurrentPlayer) {
      return 'ring-2 ring-cyan-400 bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-900/20 dark:to-blue-800/20'
    }
    if (isDead || isEliminated) {
      return 'bg-gray-100 dark:bg-gray-800 opacity-60'
    }
    if (canVote && !hasVoted && !isCurrentPlayer) {
      return 'hover:ring-2 hover:ring-orange-300 cursor-pointer bg-white dark:bg-zinc-800 hover:bg-orange-50 dark:hover:bg-orange-900/10'
    }
    return 'bg-white dark:bg-zinc-800'
  }

  // 状态指示器
  const getStatusIndicator = () => {
    if (isDead) return { icon: '💀', color: 'text-red-500', label: '死亡' }
    if (isEliminated) return { icon: '❌', color: 'text-gray-500', label: '出局' }
    if (player.isProtected) return { icon: '🛡️', color: 'text-cyan-500', label: '被保护' }
    if (player.isPoisoned) return { icon: '☠️', color: 'text-purple-500', label: '中毒' }
    return { icon: '✅', color: 'text-green-500', label: '存活' }
  }

  const statusIndicator = getStatusIndicator()

  return (
    <motion.div
      whileHover={canVote && !hasVoted && !isCurrentPlayer && isAlive ? { scale: 1.02, y: -2 } : {}}
      whileTap={canVote && !hasVoted && !isCurrentPlayer && isAlive ? { scale: 0.98 } : {}}
      onClick={handleVoteClick}
      className={`
        ${getCardStyle()}
        rounded-lg border border-gray-300 dark:border-zinc-600 p-4 shadow-lg
        transition-all duration-300 relative overflow-hidden
        ${className}
      `}
    >
      {/* 背景装饰 */}
      {isCurrentPlayer && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-bl-full opacity-10" />
      )}

      {/* 投票数指示器 */}
      {votesReceived > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center z-10"
        >
          {votesReceived}
        </motion.div>
      )}

      {/* 当前玩家标识 */}
      {isCurrentPlayer && (
        <div className="absolute top-2 left-2 bg-cyan-400 text-white text-xs px-2 py-1 rounded-full font-medium">
          你
        </div>
      )}

      {/* 玩家头像区域 */}
      <div className="flex items-center space-x-3 mb-3">
        <div className="relative">
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center text-2xl
            ${isAlive ? 'bg-gradient-to-br from-gray-100 to-gray-200' : 'bg-gray-300'}
            dark:${isAlive ? 'from-zinc-700 to-zinc-800' : 'bg-gray-600'}
          `}>
            {player.avatar || '👤'}
          </div>
          
          {/* 状态指示器 */}
          <div className={`absolute -bottom-1 -right-1 text-sm ${statusIndicator.color}`}>
            {statusIndicator.icon}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className={`font-semibold truncate ${
              isAlive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {player.name}
            </h3>
            
            {/* AI难度标识 */}
            {!player.isPlayer && player.aiDifficulty && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                player.aiDifficulty === 'easy' ? 'bg-green-100 text-green-600' :
                player.aiDifficulty === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                {player.aiDifficulty === 'easy' ? '新手' :
                 player.aiDifficulty === 'medium' ? '进阶' : '专家'}
              </span>
            )}
          </div>

          {/* AI性格标识 */}
          {!player.isPlayer && player.aiPersonality && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {player.aiPersonality === 'logical' ? '逻辑型' :
               player.aiPersonality === 'intuitive' ? '直觉型' :
               player.aiPersonality === 'aggressive' ? '激进型' :
               player.aiPersonality === 'conservative' ? '保守型' :
               player.aiPersonality === 'leader' ? '领袖型' : '跟风型'} AI
            </p>
          )}
        </div>
      </div>

      {/* 角色信息（仅在允许时显示） */}
      {showRole && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-3"
        >
          <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${roleConfig.color}`}>
            <span>{roleConfig.icon}</span>
            <span>{roleConfig.name}</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            {roleConfig.description}
          </p>
        </motion.div>
      )}

      {/* 玩家状态信息 */}
      <div className="flex items-center justify-between text-sm">
        <div className={`flex items-center space-x-1 ${statusIndicator.color}`}>
          <span>{statusIndicator.icon}</span>
          <span className="font-medium">{statusIndicator.label}</span>
        </div>

        {/* 投票状态 */}
        {player.hasVoted && isAlive && (
          <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
            <span>✓</span>
            <span className="text-xs">已投票</span>
          </div>
        )}
      </div>

      {/* 投票按钮（仅在可投票时显示） */}
      {canVote && !hasVoted && isAlive && !isCurrentPlayer && (
        <motion.div
          className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-600"
        >
          <button
            className="w-full bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 
                     text-white font-medium py-2 px-4 rounded-lg transition-all duration-300
                     transform hover:scale-105 active:scale-95"
          >
            投票出局
          </button>
        </motion.div>
      )}

      {/* 已投票提示 */}
      {hasVoted && canVote && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-600">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            已投票
          </div>
        </div>
      )}
    </motion.div>
  )
} 