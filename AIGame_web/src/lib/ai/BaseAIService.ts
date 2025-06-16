import { generateText, streamText, CoreMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getAPIConfig, getValidAPIKey, hasValidAPIConfig } from '../apiConfig'

// AI响应结果接口
export interface AIResponse {
  content: string
  confidence: number
  reasoning?: string
  metadata?: Record<string, any>
}

// AI流式响应接口
export interface AIStreamResponse {
  content: string
  isComplete: boolean
  delta?: string
}

// AI配置接口
export interface AIServiceConfig {
  provider: 'openai'
  model: string
  maxTokens: number
  temperature: number
  timeout: number
}

// 基础AI服务类
export abstract class BaseAIService {
  protected config: AIServiceConfig
  protected isEnabled: boolean = false

  constructor(config?: Partial<AIServiceConfig>) {
    const apiConfig = getAPIConfig()
    
    this.config = {
      provider: 'openai',
      model: apiConfig.openaiModel || 'gpt-3.5-turbo',
      maxTokens: apiConfig.maxTokens || 1000,
      temperature: apiConfig.temperature || 0.7,
      timeout: 30000,
      ...config
    }
    
    this.isEnabled = this.validateConfiguration()
  }

  /**
   * 验证AI配置是否有效
   */
  protected validateConfiguration(): boolean {
    try {
      const hasValidConfig = hasValidAPIConfig('openai')
      const hasValidKey = getValidAPIKey('openai') !== null
      
      if (!hasValidConfig || !hasValidKey) {
        console.warn(`AI服务未启用: OpenAI 配置无效`)
        return false
      }
      
      return true
    } catch (error) {
      console.error('AI配置验证失败:', error)
      return false
    }
  }

  /**
   * 获取AI模型实例
   */
  protected getModel() {
    const apiKey = getValidAPIKey('openai')
    if (!apiKey) {
      throw new Error(`无效的OpenAI API密钥`)
    }

    const apiConfig = getAPIConfig()
    
    // 创建OpenAI客户端实例
    const openaiClient = createOpenAI({
      apiKey: apiKey,
      baseURL: apiConfig.openaiBaseUrl || 'https://api.openai.com/v1'
    })

    // 返回指定模型
    return openaiClient(this.config.model)
  }

  /**
   * 非流式AI调用
   */
  async generateResponse(messages: CoreMessage[]): Promise<AIResponse> {
    if (!this.isEnabled) {
      throw new Error('AI服务未启用，请检查配置')
    }

    try {
      const model = this.getModel()
      const result = await generateText({
        model,
        messages,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      })

      return {
        content: result.text,
        confidence: this.calculateConfidence(result.text),
        metadata: {
          finishReason: result.finishReason,
          usage: result.usage
        }
      }
    } catch (error) {
      console.error('AI生成失败:', error)
      throw this.handleAIError(error)
    }
  }

  /**
   * 流式AI调用
   */
  async *generateStreamResponse(
    messages: CoreMessage[]
  ): AsyncGenerator<AIStreamResponse, void, unknown> {
    if (!this.isEnabled) {
      throw new Error('AI服务未启用，请检查配置')
    }

    try {
      const model = this.getModel()
      const stream = await streamText({
        model,
        messages,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      })

      let content = ''
      
      for await (const delta of stream.textStream) {
        content += delta
        yield {
          content,
          isComplete: false,
          delta
        }
      }

      // 最终响应
      yield {
        content,
        isComplete: true
      }
      
    } catch (error) {
      console.error('AI流式生成失败:', error)
      throw this.handleAIError(error)
    }
  }

  /**
   * 计算响应可信度（简单实现）
   */
  protected calculateConfidence(text: string): number {
    // 基于文本长度和关键词密度计算可信度
    const length = text.length
    const hasReasoningKeywords = /因为|所以|分析|判断|推理/.test(text)
    const hasUncertainty = /可能|或许|不确定|大概/.test(text)
    
    let confidence = 0.7 // 基础可信度
    
    if (length > 20 && length < 200) confidence += 0.1
    if (hasReasoningKeywords) confidence += 0.1
    if (hasUncertainty) confidence -= 0.1
    
    return Math.max(0.1, Math.min(1.0, confidence))
  }

  /**
   * 处理AI错误
   */
  protected handleAIError(error: any): Error {
    if (error.message?.includes('rate limit')) {
      return new Error('AI请求频率超限，请稍后重试')
    }
    if (error.message?.includes('insufficient_quota')) {
      return new Error('AI配额不足，请检查账户余额')
    }
    if (error.message?.includes('invalid_api_key')) {
      return new Error('AI密钥无效，请检查配置')
    }
    
    return new Error(`AI服务错误: ${error.message || '未知错误'}`)
  }

  /**
   * 检查AI服务是否可用
   */
  isAIEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * 重新验证配置
   */
  refreshConfiguration(): void {
    this.isEnabled = this.validateConfiguration()
  }
} 