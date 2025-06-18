import { type FC, useState, useRef, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { motion, AnimatePresence } from 'framer-motion'
import { publicGameLogsAtom } from '@/store/werewolf/gameState'
import { GameEventType } from '@/store/werewolf/types'

export const GameLogPanel: FC = () => {
  const logs = useAtomValue(publicGameLogsAtom)
  const [autoScroll, setAutoScroll] = useState(true) // 添加自动滚动开关
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  // 检测用户是否手动滚动
  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10
      
      // 如果用户滚动到了非底部位置，自动关闭自动滚动
      if (!isAtBottom && autoScroll) {
        setAutoScroll(false)
      }
    }
  }

  // 手动滚动到底部
  const scrollToBottom = () => {
    setAutoScroll(true)
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 获取事件类型对应的图标
  const getEventIcon = (eventType: GameEventType) => {
    switch (eventType) {
      case 'phase_start': return '🎮'
      case 'phase_end': return '⏰'
      case 'player_death': return '💀'
      case 'voting_result': return '🗳️'
      case 'night_result': return '🌙'
      case 'game_start': return '🚀'
      case 'game_end': return '🏆'
      case 'skill_used': return '✨'
      case 'system_action': return '⚙️'
      default: return '📋'
    }
  }

  // 获取事件类型对应的颜色
  const getEventColor = (eventType: GameEventType) => {
    switch (eventType) {
      case 'phase_start': return 'text-blue-400'
      case 'player_death': return 'text-red-400'
      case 'voting_result': return 'text-yellow-400'
      case 'night_result': return 'text-purple-400'
      case 'game_start': return 'text-green-400'
      case 'game_end': return 'text-orange-400'
      case 'skill_used': return 'text-pink-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏和滚动控制 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-600 bg-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <span>📋</span>
          <span>游戏日志</span>
        </h3>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              autoScroll 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
            title={autoScroll ? '关闭自动滚动' : '开启自动滚动'}
          >
            {autoScroll ? '📍自动' : '📍手动'}
          </button>
          
          {!autoScroll && (
            <button
              onClick={scrollToBottom}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title="滚动到底部"
            >
              ⬇️
            </button>
          )}
        </div>
      </div>

      {/* 日志内容区域 */}
      <div 
        className="flex-1 overflow-y-auto p-4" 
        ref={logsContainerRef}
        onScroll={handleScroll}
      >
        <div className="space-y-2">
          <AnimatePresence>
            {logs.map((log, index) => (
              <motion.div
                key={`${log.id}-${log.timestamp}-${index}`}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg bg-gray-700 p-3 text-sm text-gray-300"
              >
                <div className="flex items-start space-x-2">
                  <span className="text-lg">{getEventIcon(log.eventType)}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs text-gray-500">
                        第{log.round}回合 · {log.phase}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className={`${getEventColor(log.eventType)} font-medium`}>
                      {log.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {logs.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>暂无游戏事件</p>
            </div>
          )}
        </div>
        <div ref={logsEndRef} />
      </div>
    </div>
  )
} 