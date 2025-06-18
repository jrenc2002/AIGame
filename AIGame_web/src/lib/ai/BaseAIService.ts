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

  constructor(config?: Partial<AIServiceConfig>) {
    // 先使用不抛出错误的方式获取配置
    const apiConfig = getAPIConfig(false)
    
    this.config = {
      provider: 'openai',
      model: apiConfig.openaiModel || 'gpt-4o-mini',
      maxTokens: apiConfig.maxTokens || 2000,
      temperature: apiConfig.temperature || 0.7,
      timeout: 30000,
      ...config
    }
    
    // 延迟验证配置 - 只有在实际使用时才验证
    console.log('🚀 AI服务初始化完成（延迟验证配置）')
  }

  /**
   * 验证AI配置是否有效 - 失败时直接抛出错误
   */
  protected validateConfiguration(): void {
    try {
      hasValidAPIConfig('openai')
      getValidAPIKey('openai')
      console.log('✅ AI服务配置验证成功')
    } catch (error) {
      console.error('❌ AI服务配置验证失败:', error)
      throw new Error(`AI服务配置无效: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  /**
   * 获取AI模型实例 - 在这里验证配置
   */
  protected getModel() {
    // 每次使用时验证配置
    this.validateConfiguration()
    
    const apiKey = getValidAPIKey('openai')
    const apiConfig = getAPIConfig()
    
    // 创建OpenAI客户端实例
    const openaiClient = createOpenAI({
      apiKey: apiKey,
      baseURL: apiConfig.openaiBaseUrl || 'https://api.openai-next.com/v1'
    })

    // 返回指定模型
    return openaiClient(this.config.model)
  }

  /**
   * 非流式AI调用 - 失败时直接抛出错误
   */
  async generateResponse(messages: CoreMessage[]): Promise<AIResponse> {
    try {
      console.log(`🤖 AI调用开始 - 模型: ${this.config.model}`)
      const model = this.getModel()
      const result = await generateText({
        model,
        messages,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      })

      console.log(`✅ AI调用成功 - 响应长度: ${result.text.length}`)
      return {
        content: result.text,
        confidence: this.calculateConfidence(result.text),
        metadata: {
          finishReason: result.finishReason,
          usage: result.usage,
          model: this.config.model,
          isRealAI: true
        }
      }
    } catch (error) {
      console.error('❌ AI生成失败:', error)
      throw new Error(`AI调用失败: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  /**
   * 流式AI调用 - 失败时直接抛出错误
   */
  async *generateStreamResponse(
    messages: CoreMessage[]
  ): AsyncGenerator<AIStreamResponse, void, unknown> {
    try {
      console.log(`🤖 AI流式调用开始 - 模型: ${this.config.model}`)
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
      console.log(`✅ AI流式调用成功 - 总长度: ${content.length}`)
      yield {
        content,
        isComplete: true
      }
      
    } catch (error) {
      console.error('❌ AI流式生成失败:', error)
      throw new Error(`AI流式调用失败: ${error instanceof Error ? error.message : 'unknown error'}`)
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
   * 检查AI服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.generateResponse([
        { role: 'user', content: '测试连接' }
      ])
      return true
    } catch {
      return false
    }
  }

  /**
   * 刷新配置
   */
  refreshConfiguration(): void {
    this.validateConfiguration()
  }
} 