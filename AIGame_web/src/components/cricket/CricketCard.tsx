import { type FC } from 'react'
import { motion } from 'framer-motion'
import type { Cricket } from '@/view/CyberCricketFightView'

interface CricketCardProps {
  cricket: Cricket
  isPlayer: boolean
  onRegenerate: () => void
}

export const CricketCard: FC<CricketCardProps> = ({ cricket, isPlayer, onRegenerate }) => {
  // 根据稀有度获取颜色
  const getRarityColor = (rarity: Cricket['rarity']) => {
    switch (rarity) {
      case 'common': return 'from-gray-400 to-gray-600'
      case 'rare': return 'from-blue-400 to-blue-600'
      case 'epic': return 'from-purple-400 to-purple-600'
      case 'legendary': return 'from-yellow-400 to-yellow-600'
      default: return 'from-gray-400 to-gray-600'
    }
  }

  // 根据元素获取颜色
  const getElementColor = (element: Cricket['element']) => {
    switch (element) {
      case 'fire': return 'text-red-400 bg-red-900/20'
      case 'water': return 'text-blue-400 bg-blue-900/20'
      case 'earth': return 'text-yellow-400 bg-yellow-900/20'
      case 'thunder': return 'text-purple-400 bg-purple-900/20'
      case 'wind': return 'text-green-400 bg-green-900/20'
      default: return 'text-gray-400 bg-gray-900/20'
    }
  }

  // 根据元素获取图标
  const getElementIcon = (element: Cricket['element']) => {
    switch (element) {
      case 'fire': return '🔥'
      case 'water': return '💧'
      case 'earth': return '🗿'
      case 'thunder': return '⚡'
      case 'wind': return '💨'
      default: return '❓'
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-lg border-2 ${
        isPlayer ? 'border-cyan-500' : 'border-pink-500'
      } bg-zinc-800/90 backdrop-blur-sm shadow-xl`}
    >
      {/* 稀有度光效背景 */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getRarityColor(cricket.rarity)} opacity-10`} />
      
      {/* 蛐蛐头像区域 */}
      <div className="relative p-4">
        <div className="text-center mb-4">
          <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${getRarityColor(cricket.rarity)} flex items-center justify-center text-3xl mb-2 shadow-lg`}>
            🦗
          </div>
          <h3 className="text-lg font-bold text-white">{cricket.name}</h3>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getElementColor(cricket.element)}`}>
              {getElementIcon(cricket.element)} {cricket.element.toUpperCase()}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getRarityColor(cricket.rarity)} text-white`}>
              {cricket.rarity.toUpperCase()}
            </span>
          </div>
        </div>

        {/* 等级和血量 */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Lv.{cricket.level}</span>
            <span className="text-sm text-gray-300">
              {cricket.hp}/{cricket.maxHp} HP
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(cricket.hp / cricket.maxHp) * 100}%` }}
            />
          </div>
        </div>

        {/* 属性面板 */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300 flex items-center gap-1">
              ⚔️ 攻击力
            </span>
            <span className="text-red-400 font-semibold">{cricket.attack}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300 flex items-center gap-1">
              🛡️ 防御力
            </span>
            <span className="text-blue-400 font-semibold">{cricket.defense}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300 flex items-center gap-1">
              💨 速度
            </span>
            <span className="text-green-400 font-semibold">{cricket.speed}</span>
          </div>
        </div>

        {/* 技能 */}
        <div className="mb-4">
          <div className="text-sm text-gray-300 mb-1">绝技</div>
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded px-3 py-2 border border-purple-500/30">
            <span className="text-purple-300 font-semibold">{cricket.skill}</span>
          </div>
        </div>

        {/* 战绩 */}
        <div className="flex justify-between text-sm mb-4">
          <div className="text-center">
            <div className="text-green-400 font-semibold">{cricket.wins}</div>
            <div className="text-gray-400">胜</div>
          </div>
          <div className="text-center">
            <div className="text-red-400 font-semibold">{cricket.losses}</div>
            <div className="text-gray-400">负</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-400 font-semibold">
              {cricket.wins + cricket.losses > 0 ? 
                Math.round((cricket.wins / (cricket.wins + cricket.losses)) * 100) : 0}%
            </div>
            <div className="text-gray-400">胜率</div>
          </div>
        </div>

        {/* 重新生成按钮 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRegenerate}
          className={`w-full py-2 rounded-lg font-semibold text-white bg-gradient-to-r ${
            isPlayer ? 'from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400' : 
                      'from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400'
          } transition-all duration-200 shadow-lg`}
        >
          🎲 重新生成
        </motion.button>
      </div>
    </motion.div>
  )
} 