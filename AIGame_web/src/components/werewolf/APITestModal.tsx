import React, { useState, useEffect } from 'react'
import { getAPIConfig, saveAPIConfig } from '@/lib/apiConfig'
import { aiGameService } from '@/lib/aiService'

interface APITestModalProps {
  isOpen: boolean
  onClose: () => void
}

export const APITestModal: React.FC<APITestModalProps> = ({
  isOpen,
  onClose
}) => {
  const [apiKey, setApiKey] = useState('sk-...')
  const [model, setModel] = useState('deepseek-r1')
  const [baseUrl, setBaseUrl] = useState('https://api.openai-next.com/v1')
  const [testMessage, setTestMessage] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      try {
        const config = getAPIConfig()
        setApiKey(config.openaiApiKey)
        setModel(config.openaiModel)
        setBaseUrl(config.openaiBaseUrl)
      } catch (error) {
        setError(`配置加载失败: ${error instanceof Error ? error.message : 'unknown error'}`)
      }
    }
  }, [isOpen])

  const handleTest = async () => {
    if (!apiKey) {
      setError('请输入API密钥')
      return
    }

    if (!testMessage.trim()) {
      setError('请输入测试消息')
      return
    }

    setIsLoading(true)
    setError('')
    setResponse('')

    try {
      // 临时保存配置进行测试
      const testConfig = {
        openaiApiKey: apiKey,
        openaiModel: model,
        openaiBaseUrl: baseUrl,
        enabled: true,
        maxTokens: 500,
        temperature: 0.7
      }
      
      saveAPIConfig(testConfig)

      // 测试AI连接
      const isAvailable = await aiGameService.isAvailable()
      if (!isAvailable) {
        throw new Error('AI服务连接失败')
      }

      // 模拟一个简单的AI测试
      const testResult = await aiGameService.generateResponse([
        { role: 'user', content: testMessage }
      ])

      setResponse(testResult.content)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'unknown error'
      setError(`API测试失败: ${errorMessage}`)
      console.error('API测试失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = () => {
    try {
      saveAPIConfig({
        openaiApiKey: apiKey,
        openaiModel: model,
        openaiBaseUrl: baseUrl
      })
      onClose()
    } catch (error) {
      setError(`保存配置失败: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }



  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">API配置测试</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">API密钥</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">模型</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              aria-label="选择AI模型"
            >
              <option value="deepseek-r1">DeepSeek R1 (推荐)</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">API地址</label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai-next.com/v1"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">测试消息</label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="输入测试消息，例如：你好，请介绍一下狼人杀游戏"
              rows={3}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? '测试中...' : '测试API'}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              保存配置
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {response && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">AI响应</label>
              <div className="p-3 bg-gray-100 border rounded whitespace-pre-wrap">
                {response}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

