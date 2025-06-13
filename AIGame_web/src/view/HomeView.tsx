import { type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const HomeView: FC = () => {
  const navigate = useNavigate()

  return (
    <div className="flex max-h-screen flex-col pt-6 md:pt-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* 主内容区域 */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-300 dark:border-zinc-600 p-6 md:p-8 shadow-lg">
          {/* 欢迎标题 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
              AI游戏中心 🎮
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              体验未来科技与传统游戏的完美融合
            </p>
          </div>

          {/* 游戏卡片区域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/cyber-cricket')}
              className="bg-gradient-to-br from-cyan-50 to-purple-100 dark:from-cyan-900/20 dark:to-purple-800/20 p-6 rounded-lg border border-cyan-200 dark:border-cyan-700 cursor-pointer group shadow-lg hover:shadow-cyan-500/25 transition-all duration-300"
            >
              <div className="text-cyan-600 dark:text-cyan-400 mb-3 group-hover:scale-110 transition-transform duration-300">
                <div className="w-12 h-12 text-3xl flex items-center justify-center">🦗</div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">赛博斗蛐蛐</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                未来世界的AI蛐蛐格斗竞技场，体验科技与传统的碰撞
              </p>
              <div className="mt-3 text-sm text-cyan-600 dark:text-cyan-400 font-medium">
                🚀 点击进入游戏 →
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-center min-h-[200px]"
            >
              <div className="text-gray-400 dark:text-gray-500 mb-3">
                <div className="w-12 h-12 text-3xl flex items-center justify-center">🚧</div>
              </div>
              <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">AI狼人杀</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500">即将上线...</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-center min-h-[200px]"
            >
              <div className="text-gray-400 dark:text-gray-500 mb-3">
                <div className="w-12 h-12 text-3xl flex items-center justify-center">🍻</div>
              </div>
              <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">AI酒馆</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500">即将上线...</p>
            </motion.div>
          </div>

          {/* 游戏状态 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center p-6 bg-gradient-to-r from-cyan-50 to-purple-50 dark:from-cyan-900/10 dark:to-purple-900/10 rounded-lg border border-cyan-200 dark:border-cyan-700"
          >
            <div className="text-gray-600 dark:text-gray-300">
              <p className="text-lg font-semibold mb-2">🎮 游戏中心已就绪</p>
              <p className="text-sm opacity-80">开始您的AI游戏之旅，体验未来科技的魅力</p>
              <div className="mt-4 flex justify-center gap-4 text-xs">
                <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                  ✅ 赛博斗蛐蛐 已上线
                </span>
                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded-full">
                  🚧 更多游戏开发中
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default HomeView
