import { type FC } from 'react'
import { useAtomValue } from 'jotai'
import { motion, AnimatePresence } from 'framer-motion'
import { gameLogsAtom } from '@/store/werewolf/gameState'
import { GameLog } from '@/store/werewolf/types'

export const GameLogPanel: FC = () => {
  const logs = useAtomValue(gameLogsAtom)

  // 只显示公开的日志
  const publicLogs = logs.filter(log => log.isPublic)

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h3 className="mb-2 text-lg font-semibold text-white">游戏日志</h3>
      <div className="space-y-2">
        <AnimatePresence>
          {publicLogs.map((log) => (
            <motion.div
              key={log.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="rounded-lg bg-gray-700 p-2 text-sm text-gray-300"
            >
              <p>
                <span className="mr-2 text-gray-400">
                  [回合 {log.round} - {log.phase}]
                </span>
                {log.action}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
} 