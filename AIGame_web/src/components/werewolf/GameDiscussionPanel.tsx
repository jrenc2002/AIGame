import { type FC, useState } from 'react'
import { useAtomValue } from 'jotai'
import { motion, AnimatePresence } from 'framer-motion'
import { discussionSpeechesAtom } from '@/store/werewolf/gameState'
import { SpeechEmotion } from '@/store/werewolf/types'

export const GameDiscussionPanel: FC = () => {
  const speeches = useAtomValue(discussionSpeechesAtom)
  const [expandedReasonings, setExpandedReasonings] = useState<Set<string>>(new Set())

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

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h3 className="mb-2 text-lg font-semibold text-white">💬 游戏讨论</h3>
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
            <p>暂无讨论内容</p>
            <p className="text-xs mt-1">等待玩家发言...</p>
          </div>
        )}
      </div>
    </div>
  )
} 