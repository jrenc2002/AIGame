import { type FC, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Player, GamePhase } from '@/store/werewolf/types'

// 临时定义聊天相关类型，直到chatSystem文件创建完成
interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  chatType: 'public' | 'private' | 'werewolf' | 'dead' | 'system'
  targetId?: string
  timestamp: number
  isAI: boolean
  emotion?: 'neutral' | 'suspicious' | 'defensive' | 'aggressive' | 'confident'
  confidence?: number
  phase: GamePhase
  round: number
}

interface ChatChannel {
  id: string
  name: string
  type: 'public' | 'private' | 'werewolf' | 'dead' | 'system'
  participants: string[]
  isActive: boolean
  description: string
  icon: string
}

interface EnhancedChatPanelProps {
  currentPlayer: Player | null
  allPlayers: Player[]
  currentPhase: GamePhase
  currentRound: number
  className?: string
}

export const EnhancedChatPanel: FC<EnhancedChatPanelProps> = ({
  currentPlayer,
  allPlayers,
  currentPhase,
  currentRound,
  className = ''
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [availableChannels, setAvailableChannels] = useState<ChatChannel[]>([])
  const [currentChatType, setCurrentChatType] = useState<'public' | 'private' | 'werewolf' | 'dead' | 'system'>('public')
  const [inputMessage, setInputMessage] = useState('')
  const [selectedPrivateTarget, setSelectedPrivateTarget] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 初始化可用频道
  useEffect(() => {
    if (!currentPlayer) return

    const channels: ChatChannel[] = []

    // 公开频道（存活玩家可用）
    if (currentPlayer.status === 'alive') {
      channels.push({
        id: 'public',
        name: '公开讨论',
        type: 'public',
        participants: allPlayers.filter(p => p.status === 'alive').map(p => p.id),
        isActive: true,
        description: '所有存活玩家可见的公开讨论',
        icon: '💬'
      })
    }

    // 狼人频道（狼人阵营可用）
    if (currentPlayer.camp === 'werewolf' && currentPlayer.status === 'alive') {
      channels.push({
        id: 'werewolf',
        name: '狼人密谈',
        type: 'werewolf',
        participants: allPlayers.filter(p => p.camp === 'werewolf' && p.status === 'alive').map(p => p.id),
        isActive: true,
        description: '狼人阵营内部交流',
        icon: '🐺'
      })
    }

    // 死亡频道（死亡玩家可用）
    if (currentPlayer.status === 'dead') {
      channels.push({
        id: 'dead',
        name: '天国聊天室',
        type: 'dead',
        participants: allPlayers.filter(p => p.status === 'dead').map(p => p.id),
        isActive: true,
        description: '死亡玩家的聊天频道',
        icon: '👻'
      })
    }

    // 私聊频道（存活玩家可用）
    if (currentPlayer.status === 'alive') {
      channels.push({
        id: 'private',
        name: '私人对话',
        type: 'private',
        participants: [],
        isActive: true,
        description: '与其他玩家的私人对话',
        icon: '🔒'
      })
    }

    setAvailableChannels(channels)
  }, [currentPlayer, allPlayers])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息
  const handleSendMessage = () => {
    if (!inputMessage.trim() || !currentPlayer) return

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId: currentPlayer.id,
      senderName: currentPlayer.name,
      senderAvatar: currentPlayer.avatar,
      content: inputMessage.trim(),
      chatType: currentChatType,
      targetId: currentChatType === 'private' ? selectedPrivateTarget : undefined,
      timestamp: Date.now(),
      isAI: false,
      phase: currentPhase,
      round: currentRound
    }

    setMessages(prev => [...prev, newMessage])
    setInputMessage('')

    // TODO: 这里应该通过聊天系统发送消息，并触发AI响应
    console.log(`💬 发送${currentChatType}消息:`, newMessage)
  }

  // 处理按键
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 获取情感样式
  const getEmotionStyle = (emotion?: ChatMessage['emotion']) => {
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

  // 获取情感图标
  const getEmotionIcon = (emotion?: ChatMessage['emotion']) => {
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

  // 获取频道样式
  const getChannelStyle = (channelType: string) => {
    const baseStyle = "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer"
    
    if (channelType === currentChatType) {
      switch (channelType) {
        case 'public':
          return `${baseStyle} bg-blue-500 text-white`
        case 'werewolf':
          return `${baseStyle} bg-red-500 text-white`
        case 'dead':
          return `${baseStyle} bg-gray-500 text-white`
        case 'private':
          return `${baseStyle} bg-purple-500 text-white`
        default:
          return `${baseStyle} bg-gray-500 text-white`
      }
    } else {
      return `${baseStyle} bg-gray-200 text-gray-700 hover:bg-gray-300`
    }
  }

  // 判断是否可以发送消息
  const canSendMessage = () => {
    if (!currentPlayer || currentPlayer.status !== 'alive') return false
    
    switch (currentChatType) {
      case 'public':
        return currentPhase === 'day_discussion'
      case 'werewolf':
        return currentPlayer.camp === 'werewolf' && currentPhase === 'night'
      case 'dead':
        return currentPlayer.status === 'dead'
      case 'private':
        return selectedPrivateTarget && currentPhase !== 'game_over'
      default:
        return false
    }
  }

  // 获取输入框提示文本
  const getInputPlaceholder = () => {
    switch (currentChatType) {
      case 'public':
        return '输入公开发言...'
      case 'werewolf':
        return '狼人密谈...'
      case 'dead':
        return '在天国聊天...'
      case 'private':
        return selectedPrivateTarget ? '发送私聊消息...' : '请先选择私聊对象'
      default:
        return '输入消息...'
    }
  }

  // 获取可以私聊的玩家
  const getPrivateChatTargets = () => {
    if (!currentPlayer) return []
    return allPlayers.filter(p => 
      p.id !== currentPlayer.id && 
      p.status === 'alive'
    )
  }

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg border border-gray-300 dark:border-zinc-600 shadow-lg ${className}`}>
      {/* 频道选择器 */}
      <div className="p-4 border-b border-gray-200 dark:border-zinc-600">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            💬 游戏对话
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            第{currentRound}轮 · {currentPhase === 'day_discussion' ? '讨论阶段' : 
                               currentPhase === 'day_voting' ? '投票阶段' : 
                               currentPhase === 'night' ? '夜晚阶段' : '游戏中'}
          </div>
        </div>

        {/* 频道标签 */}
        <div className="flex flex-wrap gap-2">
          {availableChannels.map(channel => (
            <button
              key={channel.id}
              onClick={() => setCurrentChatType(channel.type)}
              className={getChannelStyle(channel.type)}
            >
              <span className="mr-1">{channel.icon}</span>
              {channel.name}
            </button>
          ))}
        </div>

        {/* 私聊对象选择器 */}
        {currentChatType === 'private' && (
          <div className="mt-3">
            <select
              value={selectedPrivateTarget}
              onChange={(e) => setSelectedPrivateTarget(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg 
                       bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">选择私聊对象...</option>
              {getPrivateChatTargets().map(player => (
                <option key={player.id} value={player.id}>
                  {player.avatar} {player.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 消息列表 */}
      <div className="h-80 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-start space-x-3"
            >
              {/* 玩家头像 */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center text-sm">
                  {message.senderAvatar}
                </div>
              </div>

              {/* 消息内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {message.senderName}
                  </span>
                  {message.isAI && (
                    <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                      AI
                    </span>
                  )}
                  {message.chatType === 'werewolf' && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                      🐺 狼人
                    </span>
                  )}
                  {message.chatType === 'private' && (
                    <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                      🔒 私聊
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className={`
                  inline-block px-3 py-2 rounded-lg border text-sm max-w-xs break-words
                  ${getEmotionStyle(message.emotion)}
                `}>
                  <div className="flex items-start space-x-2">
                    <span>{getEmotionIcon(message.emotion)}</span>
                    <span>{message.content}</span>
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
          ))}
        </AnimatePresence>
        
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">💬</div>
            <p>暂无消息</p>
            <p className="text-sm">开始对话吧！</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      {canSendMessage() && (
        <div className="p-4 border-t border-gray-200 dark:border-zinc-600">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={getInputPlaceholder()}
              disabled={currentChatType === 'private' && !selectedPrivateTarget}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg 
                       bg-white dark:bg-zinc-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       placeholder-gray-500 dark:placeholder-gray-400
                       disabled:bg-gray-100 disabled:cursor-not-allowed"
              maxLength={100}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || (currentChatType === 'private' && !selectedPrivateTarget)}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 
                       text-white font-medium rounded-lg transition-colors
                       disabled:cursor-not-allowed"
            >
              发送
            </button>
          </div>
          
          {/* 当前频道提示 */}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {currentChatType === 'public' && '公开消息对所有存活玩家可见'}
            {currentChatType === 'werewolf' && '狼人密谈仅狼人阵营可见'}
            {currentChatType === 'dead' && '天国聊天室仅死亡玩家可见'}
            {currentChatType === 'private' && '私聊消息仅双方可见'}
          </div>
        </div>
      )}

      {/* 阶段限制提示 */}
      {!canSendMessage() && currentPlayer?.status === 'alive' && (
        <div className="p-4 border-t border-gray-200 dark:border-zinc-600">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            {currentPhase === 'night' && currentChatType === 'public' && '🌙 夜晚阶段无法公开发言'}
            {currentPhase === 'day_voting' && '🗳️ 投票阶段无法发言'}
            {currentChatType === 'werewolf' && currentPlayer?.camp !== 'werewolf' && '🐺 仅狼人可进入此频道'}
          </div>
        </div>
      )}
    </div>
  )
} 