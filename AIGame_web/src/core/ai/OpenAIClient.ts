import { AIClient, AIClientConfig, AIMessage, AIResponse, StreamingAIResponse, AIClientError } from './AIClient'

// OpenAI API响应格式
interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface OpenAIStreamResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string
    }
    finish_reason?: string
  }>
}

// OpenAI客户端实现
export class OpenAIClient extends AIClient {
  constructor(config: AIClientConfig) {
    super({
      baseURL: 'https://api.openai-next.com/v1',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      topP: 1.0,
      maxTokens: 2000,
      timeout: 30000,
      ...config
    })
  }

  async chat(messages: AIMessage[]): Promise<AIResponse> {
    const url = `${this.config.baseURL}/chat/completions`
    const body = this.buildRequestBody(messages)
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout || 30000)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new AIClientError(
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`,
          'HTTP_ERROR',
          response.status,
          response.status >= 500 || response.status === 429
        )
      }

      const data: OpenAIResponse = await response.json()
      
      if (!data.choices?.[0]?.message?.content) {
        throw new AIClientError('Empty response from OpenAI API', 'EMPTY_RESPONSE')
      }

      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        },
        model: data.model,
        finishReason: data.choices[0].finish_reason as any
      }
    } catch (error) {
      if (error instanceof AIClientError) {
        throw error
      }
      
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new AIClientError('Request timeout', 'TIMEOUT', undefined, true)
      }
      
      throw new AIClientError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK_ERROR',
        undefined,
        true
      )
    }
  }

  async streamChat(
    messages: AIMessage[], 
    onChunk: (chunk: StreamingAIResponse) => void
  ): Promise<AIResponse> {
    const url = `${this.config.baseURL}/chat/completions`
    const body = this.buildRequestBody(messages, true)
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout || 60000)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new AIClientError(
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`,
          'HTTP_ERROR',
          response.status,
          response.status >= 500 || response.status === 429
        )
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new AIClientError('No response body', 'NO_BODY')
      }

      const decoder = new TextDecoder()
      let fullContent = ''
      let lastUsage: AIResponse['usage']

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim() !== '')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            
            if (dataStr === '[DONE]') {
              onChunk({
                content: fullContent,
                delta: '',
                done: true,
                usage: lastUsage
              })
              return {
                content: fullContent,
                usage: lastUsage,
                model: this.config.model,
                finishReason: 'stop'
              }
            }
            
            try {
              const data: OpenAIStreamResponse = JSON.parse(dataStr)
              const choice = data.choices?.[0]
              
              if (choice?.delta?.content) {
                const delta = choice.delta.content
                fullContent += delta
                
                onChunk({
                  content: fullContent,
                  delta,
                  done: false
                })
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', dataStr, e)
            }
          }
        }
      }

      return {
        content: fullContent,
        usage: lastUsage,
        model: this.config.model,
        finishReason: 'stop'
      }
    } catch (error) {
      if (error instanceof AIClientError) {
        throw error
      }
      
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new AIClientError('Stream timeout', 'TIMEOUT', undefined, true)
      }
      
      throw new AIClientError(
        `Stream error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STREAM_ERROR',
        undefined,
        true
      )
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testResponse = await this.chat([
        { role: 'user', content: 'Hello' }
      ])
      return testResponse.content.length > 0
    } catch {
      return false
    }
  }

  getSupportedModels(): string[] {
    return [
      'deepseek-r1',
      'deepseek-r1-16k',
      'gpt-4',
      'gpt-4-turbo-preview',
      'gpt-4o',
      'gpt-4o-mini'
    ]
  }

  // 构建请求体
  private buildRequestBody(messages: AIMessage[], stream: boolean = false): any {
    return {
      model: this.config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: this.config.temperature ?? 0.7,
      top_p: this.config.topP ?? 1.0,
      max_tokens: this.config.maxTokens ?? 2000,
      stream
    }
  }
} 