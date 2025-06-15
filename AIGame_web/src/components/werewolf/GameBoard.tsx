import { type FC } from 'react'
import { motion } from 'framer-motion'
import { GamePhase } from '@/store/werewolf/types'

interface GameBoardProps {
  currentPhase: GamePhase
  currentRound: number
  remainingTime: number
  alivePlayersCount: number
  werewolfCount: number
  villagerCount: number
  className?: string
}

export const GameBoard: FC<GameBoardProps> = ({
  currentPhase,
  currentRound,
  remainingTime,
  alivePlayersCount,
  werewolfCount,
  villagerCount,
  className = ''
}) => {
  // 阶段配置
  const getPhaseConfig = (phase: GamePhase) => {
    switch (phase) {
      case 'preparation':
        return {
          name: '游戏准备',
          icon: '🎮',
          color: 'bg-blue-100 text-blue-600 border-blue-200',
          description: '正在分配身份和初始化游戏'
        }
      case 'night':
        return {
          name: '夜晚阶段',
          icon: '🌙',
          color: 'bg-indigo-100 text-indigo-600 border-indigo-200',
          description: '狼人行动，特殊角色使用技能'
        }
      case 'day_discussion':
        return {
          name: '白天讨论',
          icon: '☀️',
          color: 'bg-yellow-100 text-yellow-600 border-yellow-200',
          description: '所有玩家发言讨论，寻找可疑目标'
        }
      case 'day_voting':
        return {
          name: '投票阶段',
          icon: '🗳️',
          color: 'bg-orange-100 text-orange-600 border-orange-200',
          description: '投票选择要出局的玩家'
        }
      case 'game_over':
        return {
          name: '游戏结束',
          icon: '🏁',
          color: 'bg-gray-100 text-gray-600 border-gray-200',
          description: '游戏已结束，查看结果'
        }
      default:
        return {
          name: '未知阶段',
          icon: '❓',
          color: 'bg-gray-100 text-gray-600 border-gray-200',
          description: ''
        }
    }
  }

  const phaseConfig = getPhaseConfig(currentPhase)

  // 时间格式化
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 时间颜色
  const getTimeColor = (time: number) => {
    if (time <= 10) return 'text-red-500'
    if (time <= 30) return 'text-orange-500'
    return 'text-green-500'
  }

  // 阵营平衡状态
  const getBalanceStatus = () => {
    if (werewolfCount >= villagerCount) {
      return { status: 'danger', message: '狼人占优！', color: 'text-red-500' }
    }
    if (werewolfCount === 0) {
      return { status: 'victory', message: '村民获胜！', color: 'text-green-500' }
    }
    return { status: 'balanced', message: '势均力敌', color: 'text-blue-500' }
  }

  const balanceStatus = getBalanceStatus()

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg border border-gray-300 dark:border-zinc-600 p-6 shadow-lg ${className}`}>
      {/* 游戏标题 */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
          AI狼人杀 🐺
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          智能特工推理对决
        </p>
      </div>

      {/* 当前阶段 */}
      <motion.div
        key={currentPhase}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`${phaseConfig.color} rounded-lg p-4 mb-6 border`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{phaseConfig.icon}</span>
            <div>
              <h3 className="font-bold text-lg">{phaseConfig.name}</h3>
              <p className="text-sm opacity-80">{phaseConfig.description}</p>
            </div>
          </div>
          
          {/* 倒计时 */}
          <motion.div
            key={remainingTime}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className={`text-2xl font-mono font-bold ${getTimeColor(remainingTime)}`}
          >
            {formatTime(remainingTime)}
          </motion.div>
        </div>
      </motion.div>

      {/* 游戏状态 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* 回合信息 */}
        <div className="bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-700">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl">🔄</span>
            <span className="font-medium text-gray-900 dark:text-white">回合</span>
          </div>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
            第 {currentRound} 轮
          </div>
        </div>

        {/* 存活玩家 */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl">👥</span>
            <span className="font-medium text-gray-900 dark:text-white">存活</span>
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {alivePlayersCount} 人
          </div>
        </div>
      </div>

      {/* 阵营对比 */}
      <div className="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">阵营对比</h4>
          <span className={`text-sm font-medium ${balanceStatus.color}`}>
            {balanceStatus.message}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* 村民阵营 */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">👨‍🌾</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">村民</span>
            </div>
            <div className="flex-1 bg-blue-200 dark:bg-blue-700 rounded-full h-2 relative overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${alivePlayersCount > 0 ? (villagerCount / alivePlayersCount) * 100 : 0}%` }}
                className="bg-blue-500 h-full"
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 min-w-[2rem]">
              {villagerCount}
            </span>
          </div>

          {/* 狼人阵营 */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🐺</span>
              <span className="font-medium text-red-600 dark:text-red-400">狼人</span>
            </div>
            <div className="flex-1 bg-red-200 dark:bg-red-700 rounded-full h-2 relative overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${alivePlayersCount > 0 ? (werewolfCount / alivePlayersCount) * 100 : 0}%` }}
                className="bg-red-500 h-full"
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-sm font-bold text-red-600 dark:text-red-400 min-w-[2rem]">
              {werewolfCount}
            </span>
          </div>
        </div>
      </div>

      {/* 胜利条件提示 */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-700 rounded-lg p-3">
        <div className="space-y-1">
          <div>🏆 <strong>村民获胜</strong>：消灭所有狼人</div>
          <div>🐺 <strong>狼人获胜</strong>：狼人数量 ≥ 村民数量</div>
        </div>
      </div>
    </div>
  )
} 