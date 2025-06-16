import { type FC, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAPIConfig, saveAPIConfig, hasValidAPIConfig, APIConfig } from '@/lib/apiConfig'
import { aiGameService } from '@/lib/aiService'
import toast from 'react-hot-toast'

interface APITestModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  title?: string
  message?: string
}

export const APITestModal: FC<APITestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "🤖 AI服务暂停",
  message = "AI服务暂时不可用，请检查并测试API配置"
}) => {
  const [config, setConfig] = useState<APIConfig>(getAPIConfig())
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testResults, setTestResults] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error'
    message: string
  }>({ status: 'idle', message: '' })

  // 重新加载配置
  const refreshConfig = () => {
    setConfig(getAPIConfig())
    setTestResults({ status: 'idle', message: '' })
  }

  useEffect(() => {
    if (isOpen) {
      refreshConfig()
    }
  }, [isOpen])

  // 更新配置
  const updateConfig = (updates: Partial<APIConfig>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    saveAPIConfig(newConfig)
    
    // 刷新AI服务配置
    aiGameService.refreshAIConfiguration()
  }

  // 测试API连接
  const testAPIConnection = async () => {
    if (!config.openaiApiKey || config.openaiApiKey === 'fallback_ai_mode') {
      setTestResults({
        status: 'error',
        message: '请先配置有效的OpenAI API Key'
      })
      return
    }

    setIsTestingConnection(true)
    setTestResults({ status: 'testing', message: '正在测试连接...' })

    try {
      // 创建一个测试玩家和基础游戏状态来测试AI服务
      const testPlayer = {
        id: 'test',
        name: '测试玩家',
        avatar: '🤖',
        role: 'villager' as const,
        camp: 'villager' as const,
        status: 'alive' as const,
        isPlayer: false,
        votesReceived: 0,
        hasVoted: false,
        hasUsedSkill: false,
        isProtected: false,
        isPoisoned: false,
        isSaved: false
      }

      const testGameState = {
        gameId: 'test',
        currentRound: 1,
        currentPhase: 'day_discussion' as const,
        isGameActive: true,
        players: [testPlayer],
        deadPlayers: [],
        nightActions: [],
        votes: [],
        gameLogs: [],
        phaseStartTime: Date.now(),
        phaseTimeLimit: 60,
        settings: {
          totalPlayers: 8,
          werewolfCount: 2,
          specialRoles: ['seer', 'witch'] as const,
          timeLimit: { discussion: 180, voting: 60, night: 120 },
          aiSettings: {
            difficulty: 'medium' as const,
            personalityDistribution: {
              logical: 0.2, intuitive: 0.15, aggressive: 0.15,
              conservative: 0.2, leader: 0.15, follower: 0.15
            }
          }
        }
      }

      // 测试AI发言生成
      const testSpeech = await aiGameService.generateAISpeech(
        testPlayer,
        testGameState,
        '这是一个API连接测试'
      )

      if (testSpeech && testSpeech.message) {
        setTestResults({
          status: 'success',
          message: `连接成功！AI回复: "${testSpeech.message.substring(0, 50)}..."`
        })
        toast.success('🎉 API连接测试成功！')
      } else {
        throw new Error('AI返回空响应')
      }
    } catch (error: any) {
      console.error('API连接测试失败:', error)
      let errorMessage = 'API连接失败'
      
      if (error.message?.includes('API key')) {
        errorMessage = 'API Key无效，请检查配置'
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'API调用频率限制，请稍后重试'
      } else if (error.message?.includes('insufficient_quota')) {
        errorMessage = 'API额度不足，请检查账户余额'
      } else if (error.message?.includes('network')) {
        errorMessage = '网络连接失败，请检查网络'
      }
      
      setTestResults({
        status: 'error',
        message: `${errorMessage}: ${error.message || '未知错误'}`
      })
      toast.error(`❌ ${errorMessage}`)
    } finally {
      setIsTestingConnection(false)
    }
  }

  // 完成配置
  const handleComplete = () => {
    if (testResults.status === 'success' && hasValidAPIConfig('openai')) {
      onSuccess()
      toast.success('AI服务已恢复，游戏继续！')
    } else {
      toast.error('请先完成API测试')
    }
  }

  const getStatusIcon = () => {
    switch (testResults.status) {
      case 'testing': return '⏳'
      case 'success': return '✅'
      case 'error': return '❌'
      default: return '🔧'
    }
  }

  const getStatusColor = () => {
    switch (testResults.status) {
      case 'testing': return 'text-blue-600'
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-600"
          >
            {/* 标题 */}
            <div className="p-6 border-b border-gray-200 dark:border-zinc-600">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {message}
              </p>
            </div>

            {/* 配置表单 */}
            <div className="p-6 space-y-4">
              {/* AI启用状态 */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  AI服务状态
                </span>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  aiGameService.isAIEnabled() 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  {aiGameService.isAIEnabled() ? '可用' : '不可用'}
                </div>
              </div>

              {/* OpenAI API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={config.openaiApiKey}
                  onChange={(e) => updateConfig({ openaiApiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg 
                           bg-white dark:bg-zinc-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent
                           placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* API Base URL */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  API Base URL
                </label>
                <input
                  type="url"
                  value={config.openaiBaseUrl}
                  onChange={(e) => updateConfig({ openaiBaseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg 
                           bg-white dark:bg-zinc-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent
                           placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* 测试结果 */}
              {testResults.status !== 'idle' && (
                <div className={`p-3 rounded-lg border ${
                  testResults.status === 'success' 
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700' 
                    : testResults.status === 'error'
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                    : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                }`}>
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">{getStatusIcon()}</span>
                    <div>
                      <p className={`text-sm font-medium ${getStatusColor()}`}>
                        {testResults.status === 'testing' ? '测试中...' : 
                         testResults.status === 'success' ? '测试成功' : '测试失败'}
                      </p>
                      <p className={`text-xs mt-1 ${getStatusColor()}`}>
                        {testResults.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={testAPIConnection}
                  disabled={isTestingConnection}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 
                           text-white font-medium rounded-lg transition-colors
                           disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isTestingConnection ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>测试中...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>测试连接</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleComplete}
                  disabled={testResults.status !== 'success'}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 
                           text-white font-medium rounded-lg transition-colors
                           disabled:cursor-not-allowed"
                >
                  继续游戏
                </button>
              </div>

              {/* 取消按钮 */}
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600
                         text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              >
                稍后配置
              </button>
            </div>

            {/* 帮助信息 */}
            <div className="px-6 pb-6">
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>💡 提示：</p>
                <p>• 在 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI官网</a> 获取API Key</p>
                <p>• 确保账户有足够的余额</p>
                <p>• 如使用代理，请配置正确的Base URL</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
} 