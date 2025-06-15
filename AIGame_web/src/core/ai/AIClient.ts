// AI客户端统一接口
export interface AIClientConfig {
  apiKey?: string
  secretKey?: string
  baseURL?: string
  model: string
  temperature?: number
  topP?: number
  maxTokens?: number
  timeout?: number
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  finishReason?: 'stop' | 'length' | 'content_filter'
}

export interface StreamingAIResponse {
  content: string
  delta: string
  done: boolean
  usage?: AIResponse['usage']
}

// AI客户端抽象基类
export abstract class AIClient {
  protected config: AIClientConfig

  constructor(config: AIClientConfig) {
    this.config = config
  }

  // 批量请求
  abstract chat(messages: AIMessage[]): Promise<AIResponse>
  
  // 流式请求
  abstract streamChat(
    messages: AIMessage[], 
    onChunk: (chunk: StreamingAIResponse) => void
  ): Promise<AIResponse>

  // 健康检查
  abstract healthCheck(): Promise<boolean>

  // 获取支持的模型列表
  abstract getSupportedModels(): string[]
}

// 错误类型
export class AIClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'AIClientError'
  }
}

// 重试配置
export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
}

// 带重试的AI客户端装饰器
export class RetryableAIClient extends AIClient {
  private client: AIClient
  private retryConfig: RetryConfig

  constructor(client: AIClient, retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  }) {
    super(client.config)
    this.client = client
    this.retryConfig = retryConfig
  }

  async chat(messages: AIMessage[]): Promise<AIResponse> {
    return this.withRetry(() => this.client.chat(messages))
  }

  async streamChat(
    messages: AIMessage[], 
    onChunk: (chunk: StreamingAIResponse) => void
  ): Promise<AIResponse> {
    return this.withRetry(() => this.client.streamChat(messages, onChunk))
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await this.client.healthCheck()
    } catch {
      return false
    }
  }

  getSupportedModels(): string[] {
    return this.client.getSupportedModels()
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (error instanceof AIClientError && !error.retryable) {
          throw error
        }
        
        if (attempt === this.retryConfig.maxRetries) {
          break
        }
        
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
          this.retryConfig.maxDelay
        )
        
        console.warn(`AI请求失败，${delay}ms后重试 (${attempt + 1}/${this.retryConfig.maxRetries})`, error)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError!
  }
} 