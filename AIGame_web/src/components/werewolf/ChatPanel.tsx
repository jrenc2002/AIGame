import { type FC, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Player, GamePhase } from '@/store/werewolf/types'
import { WerewolfAISpeech } from '@/lib/ai/WerewolfAIService'

// 聊天消息接口
export interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  message: string
  timestamp: number
  emotion: 'neutral' | 'suspicious' | 'defensive' | 'aggressive' | 'confident'
  confidence?: number
  isAI?: boolean
}

interface ChatPanelProps {
  messages: ChatMessage[]
  currentPhase: GamePhase
  alivePlayers: Player[]
  onSendMessage?: (message: string) => void
  className?: string
}

export const ChatPanel: FC<ChatPanelProps> = ({
  messages,
  currentPhase,
  alivePlayers,
  onSendMessage,
  className = ''
}) => {
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    if (inputMessage.trim() && onSendMessage) {
      onSendMessage(inputMessage.trim())
      setInputMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 获取情感对应的样式
  const getEmotionStyle = (emotion: WerewolfAISpeech['emotion']) => {
    switch (emotion) {
      case 'suspicious':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'defensive':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'aggressive':
        return 'bg-red-100 border-red-300 text-red-800'
      case 'confident':
        return 'bg-green-100 border-green-300 text-green-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  // 获取情感对应的图标
  const getEmotionIcon = (emotion: WerewolfAISpeech['emotion']) => {
    switch (emotion) {
      case 'suspicious':
        return '🤔'
      case 'defensive':
        return '🛡️'
      case 'aggressive':
        return '⚔️'
      case 'confident':
        return '😤'
      default:
        return '💭'
    }
  }

  // 获取阶段提示
  const getPhaseHint = (phase: GamePhase) => {
    switch (phase) {
      case 'day_discussion':
        return '💬 讨论阶段 - 所有玩家可以发言讨论'
      case 'day_voting':
        return '🗳️ 投票阶段 - 请选择要出局的玩家'
      case 'night':
        return '🌙 夜晚阶段 - 特殊角色正在行动...'
      default:
        return '🎮 游戏进行中'
    }
  }

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg border border-gray-300 dark:border-zinc-600 shadow-lg ${className}`}>
      {/* 聊天面板标题 */}
      <div className="p-4 border-b border-gray-200 dark:border-zinc-600">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            💬 游戏讨论
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {getPhaseHint(currentPhase)}
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="h-64 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {messages.map((message, index) => {
            const player = alivePlayers?.find(p => p.id === message.playerId)
            return (
              <motion.div
                key={`${message.id}-${message.timestamp}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-start space-x-3"
              >
                {/* 玩家头像 */}
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center text-sm">
                    {player?.avatar || '👤'}
                  </div>
                </div>

                {/* 消息内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {message.playerName || '未知玩家'}
                    </span>
                    {message.isAI && (
                      <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                        AI
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className={`
                    inline-block px-3 py-2 rounded-lg border text-sm
                    ${getEmotionStyle(message.emotion)}
                  `}>
                    <div className="flex items-center space-x-2">
                      <span>{getEmotionIcon(message.emotion)}</span>
                      <span>{message.message}</span>
                    </div>
                    
                    {/* AI置信度指示器 */}
                    {message.isAI && message.confidence && (
                      <div className="mt-1 text-xs opacity-70">
                        置信度: {Math.round(message.confidence * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框（仅在讨论阶段显示） */}
      {currentPhase === 'day_discussion' && onSendMessage && (
        <div className="p-4 border-t border-gray-200 dark:border-zinc-600">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入你的发言..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg 
                       bg-white dark:bg-zinc-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       placeholder-gray-500 dark:placeholder-gray-400"
              maxLength={100}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 
                       text-white font-medium rounded-lg transition-colors
                       disabled:cursor-not-allowed"
            >
              发送
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            按 Enter 发送，最多 100 字符
          </div>
        </div>
      )}

      {/* 阶段提示 */}
      {currentPhase !== 'day_discussion' && (
        <div className="p-4 border-t border-gray-200 dark:border-zinc-600">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            {currentPhase === 'day_voting' && '💭 投票阶段，无法发言'}
            {currentPhase === 'night' && '🌙 夜晚阶段，请保持安静'}
            {currentPhase === 'preparation' && '⏳ 游戏准备中...'}
            {currentPhase === 'game_over' && '🏁 游戏已结束'}
          </div>
        </div>
      )}
    </div>
  )
} 