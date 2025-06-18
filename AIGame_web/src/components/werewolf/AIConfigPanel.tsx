import { useState, useEffect } from 'react'
import { aiGameService } from '@/lib/aiService'
import { getAPIConfig, saveAPIConfig, hasAPIConfig } from '@/lib/apiConfig'

export function AIConfigPanel() {
  const [config, setConfig] = useState({
    openaiApiKey: '',
    openaiModel: 'deepseek-r1',
    openaiBaseUrl: 'https://api.openai-next.com/v1',
    enabled: true,
    maxTokens: 2000,
    temperature: 0.7
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  
  useEffect(() => {
    try {
      // 始终不抛出错误地获取配置
      const apiConfig = getAPIConfig(false)
      setConfig(apiConfig)
      
      if (hasAPIConfig()) {
        setMessage('✅ AI配置已加载')
        setMessageType('success')
      } else {
        setMessage('💡 请配置OpenAI API密钥以启用AI功能')
        setMessageType('info')
      }
    } catch (error) {
      setMessage(`⚠️ 配置加载失败: ${error instanceof Error ? error.message : 'unknown error'}`)
      setMessageType('error')
    }
  }, [])

  const handleSave = async () => {
    setIsLoading(true)
    setMessage('')
    
    try {
      // 验证API密钥
      if (!config.openaiApiKey || config.openaiApiKey.length < 10) {
        throw new Error('请输入有效的OpenAI API密钥')
      }
      
      if (!config.openaiApiKey.startsWith('sk-')) {
        throw new Error('OpenAI API密钥格式不正确，应以sk-开头')
      }
      
      // 保存配置
      saveAPIConfig(config)
      
      setMessage('✅ AI配置保存成功')
      setMessageType('success')
      
      // 延迟测试连接，确保配置已生效
      setTimeout(async () => {
        try {
          const isAvailable = await aiGameService.isAvailable()
          if (isAvailable) {
            setMessage('✅ AI配置保存成功，服务连接正常')
            setMessageType('success')
          } else {
            setMessage('⚠️ 配置已保存，但AI服务连接失败，请检查网络连接')
            setMessageType('error')
          }
        } catch (error) {
          setMessage('⚠️ 配置已保存，但无法验证AI服务连接')
          setMessageType('error')
        }
      }, 1000)
      
    } catch (error) {
      setMessage(`❌ 配置保存失败: ${error instanceof Error ? error.message : 'unknown error'}`)
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTest = async () => {
    setIsLoading(true)
    setMessage('')
    
    try {
      if (!hasAPIConfig()) {
        throw new Error('请先保存API配置再进行测试')
      }
      
      const isAvailable = await aiGameService.isAvailable()
      if (!isAvailable) {
        throw new Error('AI服务不可用，请检查配置和网络连接')
      }
      
      setMessage('✅ AI服务连接测试成功')
      setMessageType('success')
    } catch (error) {
      setMessage(`❌ 连接测试失败: ${error instanceof Error ? error.message : 'unknown error'}`)
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const getMessageStyle = () => {
    switch (messageType) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          OpenAI API密钥
        </label>
        <input
          id="apiKey"
          type="password"
          placeholder="sk-..."
          value={config.openaiApiKey}
          onChange={(e) => setConfig({...config, openaiApiKey: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          模型
        </label>
        <select
          id="model"
          value={config.openaiModel}
          onChange={(e) => setConfig({...config, openaiModel: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
        >
          <option value="deepseek-r1">DeepSeek R1 (推荐)</option>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          API地址
        </label>
        <input
          id="baseUrl"
          type="url"
          placeholder="https://api.openai-next.com/v1"
          value={config.openaiBaseUrl}
          onChange={(e) => setConfig({...config, openaiBaseUrl: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
        >
          {isLoading ? '保存中...' : '保存配置'}
        </button>
        <button
          onClick={handleTest}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
        >
          {isLoading ? '测试中...' : '测试连接'}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg border text-sm ${getMessageStyle()}`}>
          {message}
        </div>
      )}
    </div>
  )
} 