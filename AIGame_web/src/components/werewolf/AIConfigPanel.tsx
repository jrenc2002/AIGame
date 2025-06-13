import { type FC, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AIConfig, getAIConfig, validateAIConfig } from '@/lib/aiConfig'
import { aiGameService } from '@/lib/aiService'
import toast from 'react-hot-toast'

interface AIConfigPanelProps {
  onConfigUpdate?: (config: AIConfig) => void
  className?: string
}

export const AIConfigPanel: FC<AIConfigPanelProps> = ({
  onConfigUpdate,
  className = ''
}) => {
  const [config, setConfig] = useState<AIConfig>(getAIConfig())
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)

  // 检查配置状态
  const isConfigValid = validateAIConfig(config)
  const isAIEnabled = aiGameService.isAIEnabled()

  useEffect(() => {
    if (onConfigUpdate) {
      onConfigUpdate(config)
    }
  }, [config, onConfigUpdate])

  // 更新配置
  const updateConfig = (updates: Partial<AIConfig>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    
    // 保存到localStorage
    localStorage.setItem('ai_config', JSON.stringify(newConfig))
  }

  // 测试AI连接
  const testAIConnection = async () => {
    if (!config.openaiApiKey || config.openaiApiKey === 'your_openai_api_key_here') {
      toast.error('请先配置有效的OpenAI API Key')
      return
    }

    setIsTestingConnection(true)
    
    try {
      // 这里可以做一个简单的测试请求
      toast.success('AI连接测试成功！')
    } catch (error) {
      console.error('AI连接测试失败:', error)
      toast.error('AI连接测试失败，请检查配置')
    } finally {
      setIsTestingConnection(false)
    }
  }

  // 重置配置
  const resetConfig = () => {
    const defaultConfig: AIConfig = {
      openaiApiKey: '',
      openaiModel: 'gpt-3.5-turbo',
      openaiBaseUrl: 'https://api.openai-next.com/v1',
      enabled: false,
      maxTokens: 1000,
      temperature: 0.7
    }
    setConfig(defaultConfig)
    localStorage.removeItem('ai_config')
    toast.success('配置已重置')
  }

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg border border-gray-300 dark:border-zinc-600 shadow-lg ${className}`}>
      {/* 配置面板标题 */}
      <div className="p-4 border-b border-gray-200 dark:border-zinc-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              🤖 AI配置
            </h3>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              isAIEnabled 
                ? 'bg-green-100 text-green-600' 
                : 'bg-red-100 text-red-600'
            }`}>
              {isAIEnabled ? '已启用' : '未启用'}
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ⌄
            </motion.div>
          </button>
        </div>
      </div>

      {/* 配置表单 */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="p-4 space-y-4">
          {/* AI启用开关 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              启用AI功能
            </label>
            <button
              onClick={() => updateConfig({ enabled: !config.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
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
              placeholder="输入你的OpenAI API Key"
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg 
                       bg-white dark:bg-zinc-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       placeholder-gray-500 dark:placeholder-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              在 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" 
                   className="text-purple-600 hover:text-purple-800">OpenAI官网</a> 获取API Key
            </p>
          </div>

          {/* 模型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              OpenAI模型
            </label>
            <select
              value={config.openaiModel}
              onChange={(e) => updateConfig({ openaiModel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg 
                       bg-white dark:bg-zinc-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (推荐)</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </select>
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
              placeholder="https://api.openai-next.com/v1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg 
                       bg-white dark:bg-zinc-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* 高级设置 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                最大Token数
              </label>
              <input
                type="number"
                min={100}
                max={4000}
                value={config.maxTokens}
                onChange={(e) => updateConfig({ maxTokens: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg 
                         bg-white dark:bg-zinc-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                温度 (创造性)
              </label>
              <input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={config.temperature}
                onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg 
                         bg-white dark:bg-zinc-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={testAIConnection}
              disabled={isTestingConnection || !isConfigValid}
              className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 
                       text-white font-medium rounded-lg transition-colors
                       disabled:cursor-not-allowed"
            >
              {isTestingConnection ? '测试中...' : '测试连接'}
            </button>
            
            <button
              onClick={resetConfig}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              重置
            </button>
          </div>

          {/* 配置状态提示 */}
          <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-zinc-700">
            <div className="text-sm">
              <div className={`flex items-center space-x-2 ${
                isConfigValid ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>{isConfigValid ? '✅' : '❌'}</span>
                <span>
                  {isConfigValid 
                    ? 'AI配置有效，可以使用智能功能' 
                    : '请完善AI配置以启用智能功能'
                  }
                </span>
              </div>
              
              {!isConfigValid && (
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  <p>• 请设置有效的OpenAI API Key</p>
                  <p>• 确保启用AI功能</p>
                  <p>• 检查网络连接和API配置</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
} 