import { type FC, useState, useEffect, useRef } from 'react'
import { useAtomValue } from 'jotai'
import { motion, AnimatePresence } from 'framer-motion'
import { allPlayerSpeechesAtom, gameStateAtom, publicGameLogsAtom } from '@/store/werewolf/gameState'
import { SpeechEmotion, GameEventType } from '@/store/werewolf/types'

interface UnifiedChatPanelProps {
  onSpeak: (content: string) => void
  onSkip: () => void
  onEndDiscussion: () => void
  currentPlayer?: any
}

// 消息类型
type MessageType = 'speech' | 'system_log'

// 统一的消息接口
interface UnifiedMessage {
  id: string
  type: MessageType
  timestamp: number
  // 发言相关字段
  playerId?: string
  playerName?: string
  content?: string
  emotion?: SpeechEmotion
  isAI?: boolean
  reasoning?: string
  confidence?: number
  // 系统日志相关字段
  eventType?: GameEventType
  description?: string
  round?: number
  phase?: string
}

export const UnifiedChatPanel: FC<UnifiedChatPanelProps> = ({
  onSpeak,
  onSkip,
  onEndDiscussion,
  currentPlayer
}) => {
  const speeches = useAtomValue(allPlayerSpeechesAtom)
  const gameState = useAtomValue(gameStateAtom)
  const logs = useAtomValue(publicGameLogsAtom)
  const [speechInput, setSpeechInput] = useState('')
  const [expandedReasonings, setExpandedReasonings] = useState<Set<string>>(new Set())
  const [autoScroll, setAutoScroll] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // 从gameState中获取当前发言者信息
  const currentState = gameState as any
  const { currentSpeakerIndex = 0, speakingOrder = [], discussionComplete = false } = currentState
  const currentSpeakerId = speakingOrder[currentSpeakerIndex]
  const currentSpeaker = gameState.players.find(p => p.id === currentSpeakerId)
  const isMyTurn = currentPlayer && currentSpeaker && currentPlayer.id === currentSpeaker.id

  // 合并并排序消息
  const unifiedMessages: UnifiedMessage[] = [
    // 发言消息
    ...speeches.map(speech => ({
      id: `speech-${speech.id}`,
      type: 'speech' as MessageType,
      timestamp: speech.timestamp,
      playerId: speech.playerId,
      playerName: speech.playerName,
      content: speech.content,
      emotion: speech.emotion,
      isAI: speech.isAI,
      reasoning: speech.reasoning,
      confidence: speech.confidence,
      round: speech.round,
      phase: speech.phase
    })),
    // 系统日志消息
    ...logs.map(log => ({
      id: `log-${log.id}`,
      type: 'system_log' as MessageType,
      timestamp: log.timestamp,
      eventType: log.eventType,
      description: log.description,
      round: log.round,
      phase: log.phase
    }))
  ].sort((a, b) => a.timestamp - b.timestamp)

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [unifiedMessages, autoScroll])

  // 获取情感对应的图标
  const getEmotionIcon = (emotion: SpeechEmotion) => {
    switch (emotion) {
      case 'suspicious': return '🤔'
      case 'defensive': return '🛡️'
      case 'aggressive': return '⚔️'
      case 'confident': return '😤'
      case 'nervous': return '😰'
      case 'calm': return '😌'
      default: return '💭'
    }
  }

  // 获取情感对应的样式
  const getEmotionStyle = (emotion: SpeechEmotion) => {
    switch (emotion) {
      case 'suspicious': return 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200'
      case 'defensive': return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200'
      case 'aggressive': return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900 dark:border-red-600 dark:text-red-200'
      case 'confident': return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900 dark:border-green-600 dark:text-green-200'
      case 'nervous': return 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900 dark:border-purple-600 dark:text-purple-200'
      case 'calm': return 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'
      default: return 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'
    }
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

  // 获取阶段显示名称
  const getPhaseDisplayName = (phase: string) => {
    switch (phase) {
      case 'preparation': return '准备阶段'
      case 'night': return '夜晚阶段'
      case 'day_discussion': return '白天讨论'
      case 'day_voting': return '白天投票'
      case 'game_over': return '游戏结束'
      default: return phase
    }
  }

  // 切换推理过程显示
  const toggleReasoning = (speechId: string) => {
    const newExpanded = new Set(expandedReasonings)
    if (newExpanded.has(speechId)) {
      newExpanded.delete(speechId)
    } else {
      newExpanded.add(speechId)
    }
    setExpandedReasonings(newExpanded)
  }

  // 处理发言提交
  const handleSubmitSpeech = () => {
    if (speechInput.trim()) {
      onSpeak(speechInput.trim())
      setSpeechInput('')
    }
  }

  // 检测用户是否手动滚动
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 渲染发言消息
  const renderSpeechMessage = (message: UnifiedMessage) => (
    <motion.div
      key={message.id}
      layout
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg bg-gray-800 p-4 text-sm ml-2 mr-2"
    >
      {/* 玩家信息头部 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">👤</span>
          <span className="font-medium text-white">{message.playerName}</span>
          {message.isAI && (
            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded dark:bg-purple-900 dark:text-purple-200">
              AI
            </span>
          )}
          {/* 显示回合和阶段信息 */}
          <span className="text-xs text-blue-400">
            第{message.round}回合 · {getPhaseDisplayName(message.phase!)}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        
        {/* AI推理按钮 */}
        {message.isAI && message.reasoning && (
          <button
            onClick={() => toggleReasoning(message.id)}
            className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 px-2 py-1 rounded transition-colors"
          >
            {expandedReasonings.has(message.id) ? '隐藏推理' : '查看推理'}
          </button>
        )}
      </div>

      {/* 发言内容 */}
      <div className={`
        inline-block px-3 py-2 rounded-lg border text-sm max-w-full
        ${getEmotionStyle(message.emotion!)}
      `}>
        <div className="flex items-start space-x-2">
          <span className="text-lg flex-shrink-0">{getEmotionIcon(message.emotion!)}</span>
          <div className="flex-1">
            <p className="break-words">{message.content}</p>
            
            {/* AI置信度指示器 */}
            {message.isAI && message.confidence && (
              <div className="mt-1 text-xs opacity-70">
                置信度: {Math.round(message.confidence * 100)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI推理过程 */}
      <AnimatePresence>
        {message.isAI && message.reasoning && expandedReasonings.has(message.id) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 p-3 bg-gray-700 rounded-lg border-l-4 border-purple-500"
          >
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm">🧠</span>
              <span className="text-sm font-medium text-purple-300">AI推理过程</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {message.reasoning}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  // 渲染系统日志消息
  const renderSystemLogMessage = (message: UnifiedMessage) => (
    <motion.div
      key={message.id}
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg bg-gray-900 border border-gray-700 p-3 text-sm mx-8 my-1"
    >
      <div className="flex items-center space-x-3">
        <span className="text-lg">{getEventIcon(message.eventType!)}</span>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs text-gray-500">
              第{message.round}回合 · {message.phase}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className={`${getEventColor(message.eventType!)} font-medium text-xs`}>
            {message.description}
          </p>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* 当前发言者指示器 */}
      {gameState.currentPhase === 'day_discussion' && (
        <div className="p-4 border-b border-gray-600 bg-gray-700">
          {!discussionComplete ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <motion.div
                  className="w-3 h-3 bg-green-400 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                <div>
                  <div className="text-sm text-gray-300">当前发言者</div>
                  <div className="font-semibold text-white">
                    {currentSpeaker ? currentSpeaker.name : '等待中...'}
                    {currentSpeaker && !currentSpeaker.isPlayer && (
                      <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded dark:bg-purple-900 dark:text-purple-200">
                        AI
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 发言顺序指示器和自动滚动控制 */}
              <div className="flex items-center space-x-3">
                <div className="text-xs text-gray-400">
                  {currentSpeakerIndex + 1} / {speakingOrder.length}
                </div>
                
                {/* 自动滚动控制按钮 */}
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
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-center text-gray-300 flex-1">
                <div className="text-sm">讨论已结束</div>
                <div className="text-xs text-gray-400 mt-1">等待进入投票阶段</div>
              </div>
              
              {/* 在讨论结束状态也显示滚动控制 */}
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
          )}
        </div>
      )}

      {/* 其他阶段也添加滚动控制 */}
      {gameState.currentPhase !== 'day_discussion' && (
        <div className="p-2 border-b border-gray-600 bg-gray-700 flex justify-end">
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
      )}

      {/* 统一的消息区域 */}
      <div 
        className="flex-1 overflow-y-auto p-2" 
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        <div className="space-y-1">
          <AnimatePresence>
            {unifiedMessages.map((message) => 
              message.type === 'speech' 
                ? renderSpeechMessage(message)
                : renderSystemLogMessage(message)
            )}
          </AnimatePresence>
          
          {unifiedMessages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>游戏即将开始</p>
              <p className="text-xs mt-1">系统日志和玩家发言将在这里显示</p>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* 用户发言区域 */}
      {isMyTurn && !discussionComplete && gameState.currentPhase === 'day_discussion' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-t border-gray-600 bg-gray-700"
        >
          <div className="space-y-3">
            <div className="text-sm font-medium text-green-400 flex items-center space-x-2">
              <motion.div
                className="w-2 h-2 bg-green-400 rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              />
              <span>轮到你发言了！</span>
            </div>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={speechInput}
                onChange={(e) => setSpeechInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitSpeech()}
                placeholder="输入你的发言内容..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                maxLength={200}
              />
              <button
                onClick={handleSubmitSpeech}
                disabled={!speechInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                发言
              </button>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={onSkip}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
              >
                跳过发言
              </button>
              <button
                onClick={onEndDiscussion}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
              >
                结束讨论
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 等待发言的提示 */}
      {!isMyTurn && !discussionComplete && currentSpeaker && gameState.currentPhase === 'day_discussion' && (
        <div className="p-4 border-t border-gray-600 bg-gray-700">
          <div className="text-center text-gray-400 text-sm">
            {currentSpeaker.isPlayer ? (
              <span>等待 {currentSpeaker.name} 发言...</span>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <motion.div
                  className="w-2 h-2 bg-purple-400 rounded-full"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <span>{currentSpeaker.name} 正在思考中...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 