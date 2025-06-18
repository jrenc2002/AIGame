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
    <div className="group">
      <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4 
                      hover:bg-white/8 transition-all duration-300 hover:border-white/20">
        {/* 玩家信息头部 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full 
                           flex items-center justify-center text-sm shadow-lg">
              👤
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-white text-sm">{message.playerName}</span>
                {message.isAI && (
                  <span className="text-xs bg-gradient-to-r from-purple-500/20 to-purple-600/20 
                                 text-purple-300 px-2 py-1 rounded-full border border-purple-500/30
                                 backdrop-blur-sm">
                    AI
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                <span>第{message.round}回合</span>
                <span>•</span>
                <span>{getPhaseDisplayName(message.phase!)}</span>
                <span>•</span>
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          
          {/* AI推理按钮 */}
          {message.isAI && message.reasoning && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleReasoning(message.id)}
              className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 
                       px-3 py-1.5 rounded-lg transition-all duration-200 border border-purple-500/30
                       backdrop-blur-sm min-h-[32px] touch-manipulation"
            >
              {expandedReasonings.has(message.id) ? '隐藏推理' : '🧠 推理'}
            </motion.button>
          )}
        </div>

        {/* 发言内容 */}
        <div className={`
          p-4 rounded-xl border backdrop-blur-sm text-sm lg:text-base
          ${getEmotionStyle(message.emotion!)}
        `}>
          <div className="flex items-start space-x-3">
            <span className="text-xl flex-shrink-0 mt-1">{getEmotionIcon(message.emotion!)}</span>
            <div className="flex-1 min-w-0">
              <p className="break-words leading-relaxed">{message.content}</p>
              
              {/* AI置信度指示器 */}
              {message.isAI && message.confidence && (
                <div className="mt-2 flex items-center space-x-2">
                  <div className="flex-1 bg-black/20 rounded-full h-1.5">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full
                               transition-all duration-500"
                      style={{ width: `${message.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {Math.round(message.confidence * 100)}%
                  </span>
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
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="mt-4 p-4 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 
                       rounded-xl border border-purple-500/30 backdrop-blur-sm"
            >
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg 
                               flex items-center justify-center text-sm">
                  🧠
                </div>
                <span className="text-sm font-medium text-purple-300">AI推理过程</span>
              </div>
              <p className="text-xs lg:text-sm text-gray-300 leading-relaxed">
                {message.reasoning}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )

  // 渲染系统日志消息
  const renderSystemLogMessage = (message: UnifiedMessage) => (
    <div className="flex justify-center">
      <div className="max-w-md mx-4">
        <div className="backdrop-blur-sm bg-black/20 border border-white/20 rounded-xl p-3 
                        text-center hover:bg-black/30 transition-all duration-300">
          <div className="flex items-center justify-center space-x-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-lg
                           ${message.eventType === 'player_death' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                             message.eventType === 'phase_start' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                             message.eventType === 'voting_result' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                             message.eventType === 'night_result' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                             message.eventType === 'game_start' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                             message.eventType === 'game_end' ? 'bg-gradient-to-br from-gray-500 to-gray-600' :
                             'bg-gradient-to-br from-gray-400 to-gray-500'}`}>
              {getEventIcon(message.eventType!)}
            </div>
            
            <div className="flex-1 text-left">
              <p className={`${getEventColor(message.eventType!)} font-medium text-sm leading-relaxed`}>
                {message.description}
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 mt-1">
                <span>第{message.round}回合</span>
                <span>•</span>
                <span>{message.phase}</span>
                <span>•</span>
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* 消息列表容器 */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/20 
                   scrollbar-track-transparent hover:scrollbar-thumb-white/30"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        <AnimatePresence initial={false}>
          {unifiedMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {message.type === 'speech' ? renderSpeechMessage(message) : renderSystemLogMessage(message)}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* 自动滚动指示器 */}
        {!autoScroll && unifiedMessages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={scrollToBottom}
            className="fixed bottom-32 right-6 lg:bottom-6 lg:right-6 z-30 
                       bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700
                       text-white p-3 rounded-full shadow-lg shadow-blue-500/25 backdrop-blur-sm
                       transition-all duration-200 min-h-[48px] min-w-[48px] lg:min-h-[40px] lg:min-w-[40px]
                       flex items-center justify-center touch-manipulation"
            title="滚动到底部"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.button>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 操作区域 */}
      {isMyTurn && gameState.currentPhase === 'day_discussion' && currentPlayer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 lg:p-4 border-t border-white/10 bg-gradient-to-r from-black/10 to-black/20 backdrop-blur-sm"
        >
          <div className="space-y-3">
            {/* 发言状态提示 */}
            <div className="flex items-center space-x-2 text-sm">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-3 h-3 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50"
              />
              <span className="text-emerald-400 font-medium">轮到你发言了</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-400">仔细思考后表达观点</span>
            </div>
            
            {/* 发言输入框 */}
            <div className="space-y-3">
              <textarea
                value={speechInput}
                onChange={(e) => setSpeechInput(e.target.value)}
                placeholder="分享你的观察和推理..."
                className="w-full p-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50
                         backdrop-blur-sm resize-none transition-all duration-200 min-h-[100px]
                         text-sm lg:text-base"
                maxLength={500}
              />
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  {speechInput.length}/500 字符
                </div>
                
                {/* 操作按钮 */}
                <div className="flex space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onSkip}
                    className="px-4 py-2 bg-gray-600/50 hover:bg-gray-600/70 text-gray-300 
                             rounded-lg transition-all duration-200 text-sm min-h-[40px] touch-manipulation
                             backdrop-blur-sm border border-white/10"
                  >
                    跳过发言
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmitSpeech}
                    disabled={!speechInput.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-600 
                             hover:from-emerald-600 hover:to-green-700 disabled:from-gray-600 
                             disabled:to-gray-700 text-white rounded-lg transition-all duration-200 
                             text-sm font-medium min-h-[40px] touch-manipulation
                             shadow-lg shadow-emerald-500/25 disabled:shadow-none
                             backdrop-blur-sm border border-white/20 disabled:border-gray-600/50"
                  >
                    发表观点
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 讨论结束控制 */}
      {gameState.currentPhase === 'day_discussion' && !discussionComplete && currentPlayer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 lg:p-4 border-t border-white/10 bg-black/10 backdrop-blur-sm"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onEndDiscussion}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 
                     hover:to-red-700 text-white rounded-xl transition-all duration-200
                     font-medium shadow-lg shadow-orange-500/25 backdrop-blur-sm
                     border border-white/20 min-h-[48px] touch-manipulation"
          >
            结束讨论，进入投票
          </motion.button>
        </motion.div>
      )}
    </div>
  )
} 