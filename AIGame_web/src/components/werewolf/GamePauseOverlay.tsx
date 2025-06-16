import { type FC } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameState } from '@/store/werewolf/types'

interface GamePauseOverlayProps {
  gameState: GameState
  onResumeGame?: () => void
  onOpenAPIConfig?: () => void
}

export const GamePauseOverlay: FC<GamePauseOverlayProps> = ({
  gameState,
  onResumeGame,
  onOpenAPIConfig
}) => {
  const isPaused = gameState.isPaused && gameState.isGameActive

  return (
    <AnimatePresence>
      {isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-600 p-8 max-w-md mx-4 text-center"
          >
            {/* 暂停图标 */}
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <span className="text-3xl">⏸️</span>
              </div>
            </div>

            {/* 标题 */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              游戏已暂停
            </h2>

            {/* 暂停原因 */}
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
              {gameState.pauseReason || 'AI服务暂时不可用，请检查API配置'}
            </p>

            {/* 状态信息 */}
            <div className="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">当前阶段:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {gameState.currentPhase === 'night' ? '🌙 夜晚' :
                   gameState.currentPhase === 'day_discussion' ? '💬 讨论' :
                   gameState.currentPhase === 'day_voting' ? '🗳️ 投票' : '游戏中'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600 dark:text-gray-300">回合数:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  第{gameState.currentRound}轮
                </span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-3">
              <button
                onClick={onOpenAPIConfig}
                className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <span>🔧</span>
                <span>配置AI服务</span>
              </button>
              
              <button
                onClick={onResumeGame}
                className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <span>▶️</span>
                <span>尝试继续游戏</span>
              </button>
            </div>

            {/* 提示信息 */}
            <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
              <p>💡 提示：配置正确的OpenAI API Key后即可继续游戏</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 