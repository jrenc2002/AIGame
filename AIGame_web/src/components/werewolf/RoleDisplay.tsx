import { type FC } from 'react'
import { motion } from 'framer-motion'
import { Player } from '@/store/werewolf/types'
import { ROLE_CONFIGS } from '@/store/werewolf/gameState'

interface RoleDisplayProps {
  player?: Player | null
  role?: string
  show?: boolean
  onClose?: () => void
  className?: string
}

export const RoleDisplay: FC<RoleDisplayProps> = ({ 
  player,
  role,
  show = true,
  onClose,
  className = '' 
}) => {
  if (!show) return null
  
  let roleConfig
  const currentRole = player?.role || role || 'villager'
  
  if (ROLE_CONFIGS[currentRole as keyof typeof ROLE_CONFIGS]) {
    roleConfig = ROLE_CONFIGS[currentRole as keyof typeof ROLE_CONFIGS]
  } else {
    roleConfig = ROLE_CONFIGS.villager
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 
                  rounded-lg border-2 border-purple-200 dark:border-purple-700 p-4 relative ${className}`}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="关闭"
        >
          ✕
        </button>
      )}
      
      <div className="text-center">
        <div className="text-3xl mb-2">{roleConfig.icon}</div>
        <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-1">
          你的身份
        </h3>
        <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${roleConfig.color} mb-2`}>
          <span>{roleConfig.icon}</span>
          <span>{roleConfig.name}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {roleConfig.description}
        </p>
        
        <div className="text-left">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            技能：
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {roleConfig.abilities.map((ability, index) => (
              <li key={index} className="flex items-center space-x-1">
                <span className="text-green-500">•</span>
                <span>{ability}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            胜利条件：
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {roleConfig.winCondition}
          </p>
        </div>
      </div>
    </motion.div>
  )
} 