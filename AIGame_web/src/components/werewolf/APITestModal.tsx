import React, { useState, useEffect } from 'react'
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
  const [apiKey, setApiKey] = useState('sk-...')
  const [model, setModel] = useState('gpt-4o-mini')
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

  const getStatusIcon = () => {
    switch (error ? 'error' : 'success') {
      case 'testing': return '⏳'
      case 'success': return '✅'
      case 'error': return '❌'
      default: return '🔧'
    }
  }

  const getStatusColor = () => {
    switch (error ? 'error' : 'success') {
      case 'testing': return 'text-blue-600'
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
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
            >
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4">GPT-4</option>
              <option value="deepseek-r1">GPT-3.5 Turbo</option>
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

// API测试服务
class TestAPIService {
  async testConnection() {
    const apiConfig = getAPIConfig()
    const apiKey = apiConfig.openaiApiKey
    const baseURL = apiConfig.openaiBaseUrl
    
    if (!apiKey || apiKey === 'fallback_ai_mode') {
      throw new Error('API密钥未设置')
    }
    
    // 使用fetch测试API连接
    const response = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API响应错误 (${response.status}): ${errorText}`)
    }
    
    const data = await response.json()
    
    // 如果models为空数组，也算失败
    if (!data.data || data.data.length === 0) {
      throw new Error('API返回空模型列表')
    }
    
    // 返回成功信息
    return {
      model: data.data[0].id,
      models: data.data.map((m: any) => m.id)
    }
  }
} 