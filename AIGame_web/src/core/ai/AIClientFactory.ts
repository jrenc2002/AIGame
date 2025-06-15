import { AIClient, AIClientConfig, RetryableAIClient } from './AIClient'
import { OpenAIClient } from './OpenAIClient'

// 支持的AI提供商
export type AIProvider = 'openai' | 'qianfan' | 'local'

// AI客户端配置映射
export interface AIProviderConfig {
  provider: AIProvider
  config: AIClientConfig
  enableRetry?: boolean
}

// AI客户端工厂
export class AIClientFactory {
  private static clients: Map<string, AIClient> = new Map()
  
  // 创建AI客户端
  static createClient(providerConfig: AIProviderConfig): AIClient {
    const key = this.getClientKey(providerConfig)
    
    if (this.clients.has(key)) {
      return this.clients.get(key)!
    }
    
    let client: AIClient
    
    switch (providerConfig.provider) {
      case 'openai':
        client = new OpenAIClient(providerConfig.config)
        break
        
      case 'qianfan':
        // TODO: 实现千帆客户端
        throw new Error('Qianfan client not implemented yet')
        
      case 'local':
        // TODO: 实现本地模型客户端
        throw new Error('Local client not implemented yet')
        
      default:
        throw new Error(`Unsupported AI provider: ${providerConfig.provider}`)
    }
    
    // 如果启用重试，包装客户端
    if (providerConfig.enableRetry !== false) {
      client = new RetryableAIClient(client)
    }
    
    this.clients.set(key, client)
    return client
  }
  
  // 获取默认配置
  static getDefaultConfig(provider: AIProvider): Partial<AIClientConfig> {
    switch (provider) {
      case 'openai':
        return {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          topP: 1.0,
          maxTokens: 2000,
          timeout: 30000
        }
        
      case 'qianfan':
        return {
          model: 'ERNIE-Bot',
          temperature: 0.95,
          topP: 0.8,
          maxTokens: 2000,
          timeout: 30000
        }
        
      case 'local':
        return {
          model: 'local-model',
          temperature: 0.7,
          topP: 0.9,
          maxTokens: 2000,
          timeout: 60000
        }
        
      default:
        return {}
    }
  }
  
  // 从环境变量创建客户端
  static createFromEnv(provider: AIProvider = 'openai'): AIClient {
    const defaultConfig = this.getDefaultConfig(provider)
    
    let config: AIClientConfig
    let hasValidCredentials = false
    
    switch (provider) {
      case 'openai': {
        const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY
        hasValidCredentials = !!openaiApiKey
        
        config = {
          ...defaultConfig,
          apiKey: openaiApiKey,
          baseURL: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai-next.com/v1',
          model: import.meta.env.VITE_OPENAI_MODEL || defaultConfig.model!
        }
        break
      }
        
      case 'qianfan': {
        const qianfanApiKey = import.meta.env.VITE_QIANFAN_AK
        const qianfanSecretKey = import.meta.env.VITE_QIANFAN_SK
        hasValidCredentials = !!(qianfanApiKey && qianfanSecretKey)
        
        config = {
          ...defaultConfig,
          apiKey: qianfanApiKey,
          secretKey: qianfanSecretKey,
          model: import.meta.env.VITE_QIANFAN_MODEL || defaultConfig.model!
        }
        break
      }
        
      case 'local':
        // 本地模型不需要API密钥检查
        hasValidCredentials = true
        config = {
          ...defaultConfig,
          baseURL: import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:8000',
          model: import.meta.env.VITE_LOCAL_MODEL || defaultConfig.model!
        }
        break
        
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
    
    // 如果没有有效的API密钥，直接抛出错误
    if (!hasValidCredentials) {
      throw new Error(`❌ 没有找到 ${provider} 的有效API密钥！请检查环境变量配置：
        - openai: VITE_OPENAI_API_KEY 和 VITE_OPENAI_BASE_URL
        - qianfan: VITE_QIANFAN_AK 和 VITE_QIANFAN_SK`)
    }
    
    return this.createClient({
      provider,
      config,
      enableRetry: true
    })
  }
  
  // 批量创建多个客户端（用于多AI对战）
  static createMultipleClients(configs: AIProviderConfig[]): AIClient[] {
    return configs.map(config => this.createClient(config))
  }
  
  // 健康检查所有客户端
  static async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    
    for (const [key, client] of this.clients) {
      try {
        const isHealthy = await client.healthCheck()
        results.set(key, isHealthy)
      } catch {
        results.set(key, false)
      }
    }
    
    return results
  }
  
  // 清理客户端缓存
  static clearCache(): void {
    this.clients.clear()
  }
  
  // 生成客户端缓存键
  private static getClientKey(providerConfig: AIProviderConfig): string {
    const { provider, config } = providerConfig
    return `${provider}_${config.model}_${config.apiKey?.slice(-8) || 'default'}`
  }
}

// 便捷函数：获取默认AI客户端
export function getDefaultAIClient(): AIClient {
  return AIClientFactory.createFromEnv()
}

// 便捷函数：获取指定提供商的客户端
export function getAIClient(provider: AIProvider): AIClient {
  return AIClientFactory.createFromEnv(provider)
} 