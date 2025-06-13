import { type FC, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Cricket } from '@/view/CyberCricketFightView'

interface BattleResultsProps {
  winner: Cricket
  battleLog: string[]
  onClose: () => void
}

export const BattleResults: FC<BattleResultsProps> = ({ winner, battleLog, onClose }) => {
  const [showFireworks, setShowFireworks] = useState(false)

  useEffect(() => {
    setShowFireworks(true)
    const timer = setTimeout(() => {
      setShowFireworks(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  // 计算战斗统计
  const battleStats = {
    totalRounds: battleLog.length - 1, // 减去开始战斗的日志
    damageDealt: battleLog.filter(log => log.includes('造成')).length,
    criticalHits: Math.floor(Math.random() * 3) + 1, // 模拟暴击次数
    maxDamage: Math.floor(Math.random() * 50) + 20 // 模拟最大伤害
  }

  // 模拟奖励
  const rewards = {
    experience: Math.floor(Math.random() * 100) + 50,
    coins: Math.floor(Math.random() * 200) + 100,
    items: [
      '能量水晶 x1',
      '强化石 x2',
      '治疗药水 x1'
    ]
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-2xl border-2 border-yellow-500/50 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 胜利标题 */}
          <div className="text-center mb-6">
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-4"
            >
              🏆
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-2"
            >
              胜利！
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-yellow-300 font-semibold"
            >
              {winner.name} 获得胜利！
            </motion.p>
          </div>

          {/* 胜者信息 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg p-4 mb-6 border border-yellow-500/30"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl shadow-lg">
                🦗
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-yellow-300">{winner.name}</h3>
                <div className="text-sm text-gray-300 space-y-1">
                  <div className="flex justify-between">
                    <span>等级:</span>
                    <span className="text-yellow-400">Lv.{winner.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>元素:</span>
                    <span className="text-yellow-400">{winner.element.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>稀有度:</span>
                    <span className="text-yellow-400">{winner.rarity.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 战斗统计 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-blue-900/20 rounded-lg p-4 mb-6 border border-blue-500/30"
          >
            <h4 className="text-lg font-semibold text-blue-300 mb-3">📊 战斗统计</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">{battleStats.totalRounds}</div>
                <div className="text-gray-400">回合数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{battleStats.damageDealt}</div>
                <div className="text-gray-400">攻击次数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{battleStats.criticalHits}</div>
                <div className="text-gray-400">暴击次数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{battleStats.maxDamage}</div>
                <div className="text-gray-400">最大伤害</div>
              </div>
            </div>
          </motion.div>

          {/* 奖励展示 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-purple-900/20 rounded-lg p-4 mb-6 border border-purple-500/30"
          >
            <h4 className="text-lg font-semibold text-purple-300 mb-3">🎁 战斗奖励</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">经验值:</span>
                <span className="text-green-400 font-bold">+{rewards.experience} XP</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">金币:</span>
                <span className="text-yellow-400 font-bold">+{rewards.coins} 💰</span>
              </div>
              <div>
                <div className="text-gray-300 mb-2">道具:</div>
                <div className="space-y-1">
                  {rewards.items.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 + index * 0.1 }}
                      className="text-sm bg-gray-800/50 rounded px-2 py-1 text-purple-300"
                    >
                      {item}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* 关闭按钮 */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold text-lg transition-all duration-200 shadow-lg"
          >
            ✨ 继续游戏
          </motion.button>

          {/* 烟花特效 */}
          <AnimatePresence>
            {showFireworks && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      scale: 0, 
                      x: Math.random() * 400, 
                      y: Math.random() * 600,
                      opacity: 1 
                    }}
                    animate={{ 
                      scale: [0, 1, 0],
                      opacity: [1, 1, 0],
                      rotate: [0, 360]
                    }}
                    transition={{ 
                      duration: 2, 
                      delay: Math.random() * 1,
                      repeat: Infinity,
                      repeatDelay: Math.random() * 2
                    }}
                    className="absolute text-2xl"
                  >
                    {['✨', '🎆', '🎇', '⭐', '💫', '🌟'][Math.floor(Math.random() * 6)]}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 