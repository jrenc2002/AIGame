import { type FC } from 'react'
import { motion } from 'framer-motion'
import type { Cricket, BattleState } from '@/view/CyberCricketFightView'

interface GameControlsProps {
  onStartBattle: () => void
  battleState: BattleState
  playerCricket: Cricket | null
  enemyCricket: Cricket | null
}

export const GameControls: FC<GameControlsProps> = ({ 
  onStartBattle, 
  battleState, 
  playerCricket, 
  enemyCricket 
}) => {
  const canStartBattle = playerCricket && enemyCricket && !battleState.isActive && !battleState.winner

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-purple-500/30 p-4 shadow-xl">
      <h3 className="text-lg font-bold text-center mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        🎮 游戏控制台
      </h3>
      
      {/* 开始战斗按钮 */}
      <div className="mb-4">
        <motion.button
          whileHover={{ scale: canStartBattle ? 1.05 : 1 }}
          whileTap={{ scale: canStartBattle ? 0.95 : 1 }}
          onClick={onStartBattle}
          disabled={!canStartBattle}
          className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-300 ${
            canStartBattle
              ? 'bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-500 hover:via-red-400 hover:to-orange-400 text-white shadow-lg transform hover:shadow-red-500/25'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {battleState.isActive ? (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              ⚔️ 战斗进行中...
            </motion.span>
          ) : battleState.winner ? (
            '🏆 战斗结束'
          ) : (
            '🚀 开始战斗'
          )}
        </motion.button>
      </div>

      {/* 战斗状态信息 */}
      <div className="space-y-3">
        {/* 战斗预测 */}
        {playerCricket && enemyCricket && !battleState.isActive && !battleState.winner && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-3 border border-blue-500/30"
          >
            <div className="text-sm text-blue-300 mb-2 font-semibold">⚡ 战力分析</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="text-cyan-400 font-semibold">{playerCricket.name}</div>
                <div className="text-gray-300">
                  总战力: {playerCricket.attack + playerCricket.defense + playerCricket.speed}
                </div>
                <div className="text-gray-300">
                  优势: {playerCricket.speed > enemyCricket.speed ? '速度' : 
                          playerCricket.attack > enemyCricket.attack ? '攻击' :
                          playerCricket.defense > enemyCricket.defense ? '防御' : '平衡'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-pink-400 font-semibold">{enemyCricket.name}</div>
                <div className="text-gray-300">
                  总战力: {enemyCricket.attack + enemyCricket.defense + enemyCricket.speed}
                </div>
                <div className="text-gray-300">
                  优势: {enemyCricket.speed > playerCricket.speed ? '速度' : 
                          enemyCricket.attack > playerCricket.attack ? '攻击' :
                          enemyCricket.defense > playerCricket.defense ? '防御' : '平衡'}
                </div>
              </div>
            </div>
            
            {/* 胜率预测 */}
            <div className="mt-3 pt-3 border-t border-blue-500/20">
              <div className="text-sm text-blue-300 mb-1">胜率预测</div>
              {(() => {
                const playerPower = playerCricket.attack + playerCricket.defense + playerCricket.speed
                const enemyPower = enemyCricket.attack + enemyCricket.defense + enemyCricket.speed
                const totalPower = playerPower + enemyPower
                const playerWinRate = Math.round((playerPower / totalPower) * 100)
                const enemyWinRate = 100 - playerWinRate
                
                return (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-cyan-400">{playerWinRate}%</span>
                        <span className="text-pink-400">{enemyWinRate}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 flex">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-l-full h-2"
                          style={{ width: `${playerWinRate}%` }}
                        />
                        <div 
                          className="bg-gradient-to-r from-pink-500 to-red-500 rounded-r-full h-2"
                          style={{ width: `${enemyWinRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </motion.div>
        )}

        {/* 当前状态 */}
        <div className="bg-gradient-to-r from-gray-900/50 to-zinc-900/50 rounded-lg p-3 border border-gray-500/30">
          <div className="text-sm text-gray-300 mb-2 font-semibold">📊 游戏状态</div>
          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>当前回合:</span>
              <span className="text-yellow-400">{battleState.currentRound}</span>
            </div>
            <div className="flex justify-between">
              <span>战斗状态:</span>
              <span className={battleState.isActive ? 'text-red-400' : 'text-green-400'}>
                {battleState.isActive ? '激战中' : '待机'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>日志条目:</span>
              <span className="text-blue-400">{battleState.battleLog.length}</span>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.reload()}
            className="py-2 px-3 rounded-lg bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white text-sm font-medium transition-all duration-200"
          >
            🔄 重置游戏
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="py-2 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-sm font-medium transition-all duration-200"
            onClick={() => {
              // 这里可以添加设置功能
              alert('设置功能开发中...')
            }}
          >
            ⚙️ 设置
          </motion.button>
        </div>
      </div>
    </div>
  )
} 