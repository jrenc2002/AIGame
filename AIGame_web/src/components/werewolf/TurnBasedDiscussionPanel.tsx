import { type FC, useState } from 'react'
import { useAtomValue } from 'jotai'
import { motion, AnimatePresence } from 'framer-motion'
import { discussionSpeechesAtom, gameStateAtom } from '@/store/werewolf/gameState'
import { SpeechEmotion } from '@/store/werewolf/types'

interface TurnBasedDiscussionPanelProps {
  onSpeak: (content: string) => void
  onSkip: () => void
  onEndDiscussion: () => void
  currentPlayer?: any
}

export const TurnBasedDiscussionPanel: FC<TurnBasedDiscussionPanelProps> = ({
  onSpeak,
  onSkip,
  onEndDiscussion,
  currentPlayer
}) => {
  const speeches = useAtomValue(discussionSpeechesAtom)
  const gameState = useAtomValue(gameStateAtom)
  const [speechInput, setSpeechInput] = useState('')
  const [expandedReasonings, setExpandedReasonings] = useState<Set<string>>(new Set())

  // 从gameState中获取当前发言者信息
  const currentState = gameState as any
  const { currentSpeakerIndex = 0, speakingOrder = [], discussionComplete = false } = currentState
  const currentSpeakerId = speakingOrder[currentSpeakerIndex]
  const currentSpeaker = gameState.players.find(p => p.id === currentSpeakerId)
  const isMyTurn = currentPlayer && currentSpeaker && currentPlayer.id === currentSpeaker.id

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

  // AI发言现在由后端自动触发，前端只需要显示状态
  // 移除了自动触发逻辑，避免重复调用

  return (
    <div className="flex flex-col h-full">
      {/* 当前发言者指示器 */}
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
            
            {/* 发言顺序指示器 */}
            <div className="text-xs text-gray-400">
              {currentSpeakerIndex + 1} / {speakingOrder.length}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-300">
            <div className="text-sm">讨论已结束</div>
            <div className="text-xs text-gray-400 mt-1">等待进入投票阶段</div>
          </div>
        )}
      </div>

      {/* 发言历史 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          <AnimatePresence>
            {speeches.map((speech, index) => (
              <motion.div
                key={`${speech.id}-${speech.timestamp}-${index}`}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg bg-gray-800 p-4 text-sm"
              >
                {/* 玩家信息头部 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">👤</span>
                    <span className="font-medium text-white">{speech.playerName}</span>
                    {speech.isAI && (
                      <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded dark:bg-purple-900 dark:text-purple-200">
                        AI
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(speech.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {/* AI推理按钮 */}
                  {speech.isAI && speech.reasoning && (
                    <button
                      onClick={() => toggleReasoning(speech.id)}
                      className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 px-2 py-1 rounded transition-colors"
                    >
                      {expandedReasonings.has(speech.id) ? '隐藏推理' : '查看推理'}
                    </button>
                  )}
                </div>

                {/* 发言内容 */}
                <div className={`
                  inline-block px-3 py-2 rounded-lg border text-sm max-w-full
                  ${getEmotionStyle(speech.emotion)}
                `}>
                  <div className="flex items-start space-x-2">
                    <span className="text-lg flex-shrink-0">{getEmotionIcon(speech.emotion)}</span>
                    <div className="flex-1">
                      <p className="break-words">{speech.content}</p>
                      
                      {/* AI置信度指示器 */}
                      {speech.isAI && speech.confidence && (
                        <div className="mt-1 text-xs opacity-70">
                          置信度: {Math.round(speech.confidence * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI推理过程 */}
                <AnimatePresence>
                  {speech.isAI && speech.reasoning && expandedReasonings.has(speech.id) && (
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
                        {speech.reasoning}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {speeches.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>讨论即将开始</p>
              <p className="text-xs mt-1">按发言顺序进行...</p>
            </div>
          )}
        </div>
      </div>

      {/* 用户发言区域 */}
      {isMyTurn && !discussionComplete && (
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
      {!isMyTurn && !discussionComplete && currentSpeaker && (
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