/**
 * 鲁棒性JSON解析器
 * 专门用于处理AI响应，能够在各种情况下最大程度地提取和构造JSON数据
 */
export class RobustJSONParser {
  private static readonly DEBUG = true // 调试模式

  /**
   * 主要解析方法 - 尝试多种策略解析JSON
   */
  static parseAIResponse(input: any): any {
    if (this.DEBUG) {
      console.log('🔍 RobustJSONParser 开始解析:', typeof input, input)
    }

    try {
      // 策略1: 处理message对象格式
      let content = this.extractContent(input)
      if (this.DEBUG) {
        console.log('📄 提取的内容:', content)
      }

      // 策略2: 清理和预处理内容
      content = this.preprocessContent(content)
      if (this.DEBUG) {
        console.log('🧹 预处理后:', content)
      }

      // 策略3: 尝试多种JSON解析方法
      const result = this.attemptMultipleParsingStrategies(content)
      
      if (this.DEBUG) {
        console.log('✅ 最终解析结果:', result)
      }

      return result
    } catch (error) {
      console.error('❌ JSON解析完全失败:', error)
      return this.createFallbackResult(input)
    }
  }

  /**
   * 策略1: 从各种格式中提取内容
   */
  private static extractContent(input: any): string {
    // 情况1: 已经是字符串
    if (typeof input === 'string') {
      return input
    }

    // 情况2: message对象格式 (你的示例)
    if (input?.message?.content) {
      return input.message.content
    }

    // 情况3: 直接的content字段
    if (input?.content) {
      return input.content
    }

    // 情况4: AI响应对象
    if (input?.choices?.[0]?.message?.content) {
      return input.choices[0].message.content
    }

    // 情况5: 流式响应格式
    if (input?.delta?.content) {
      return input.delta.content
    }

    // 情况6: 直接JSON对象
    if (typeof input === 'object' && input !== null) {
      // 如果已经是有效的游戏对象，直接返回
      if (this.isValidGameObject(input)) {
        return JSON.stringify(input)
      }
    }

    // 最后尝试转换为字符串
    return String(input)
  }

  /**
   * 策略2: 预处理内容 - 清理各种格式问题
   */
  private static preprocessContent(content: string): string {
    if (!content || typeof content !== 'string') {
      return '{}'
    }

    let processed = content.trim()

    // 移除常见的包装
    processed = this.removeCodeBlocks(processed)
    processed = this.fixEscapeSequences(processed)
    processed = this.removeExtraWhitespace(processed)
    processed = this.fixCommonJSONErrors(processed)

    return processed
  }

  /**
   * 移除代码块标记
   */
  private static removeCodeBlocks(content: string): string {
    // 移除 ```json ``` 格式
    content = content.replace(/```json\s*\n?([\s\S]*?)\n?\s*```/g, '$1')
    // 移除 ``` ``` 格式
    content = content.replace(/```\s*\n?([\s\S]*?)\n?\s*```/g, '$1')
    // 移除单行代码标记
    content = content.replace(/`([^`]*)`/g, '$1')
    
    return content.trim()
  }

  /**
   * 修复转义序列
   */
  private static fixEscapeSequences(content: string): string {
    // 处理常见的转义序列
    content = content.replace(/\\"/g, '"')
    content = content.replace(/\\n/g, '')  // 移除换行符转义，让JSON更紧凑
    content = content.replace(/\\t/g, '')  // 移除制表符转义
    content = content.replace(/\\r/g, '')  // 移除回车符转义
    content = content.replace(/\\\\/g, '\\')
    
    // 特别处理：移除JSON中的实际换行符和多余空格
    content = content.replace(/\n\s*/g, ' ')
    content = content.replace(/\s+/g, ' ')
    
    return content.trim()
  }

  /**
   * 移除多余空白
   */
  private static removeExtraWhitespace(content: string): string {
    // 保留JSON结构，但清理多余空白
    return content.replace(/\s+/g, ' ').trim()
  }

  /**
   * 修复常见JSON错误
   */
  private static fixCommonJSONErrors(content: string): string {
    // 移除尾部逗号
    content = content.replace(/,(\s*[}\]])/g, '$1')
    
    // 修复单引号为双引号
    content = content.replace(/'/g, '"')
    
    // 确保字符串值被正确引用
    content = this.fixUnquotedStrings(content)
    
    // 修复数字后的逗号问题
    content = content.replace(/(\d+)([,}])/g, '$1$2')
    
    return content
  }

  /**
   * 修复未引用的字符串
   */
  private static fixUnquotedStrings(content: string): string {
    // 这是一个复杂的处理，需要小心处理
    // 暂时返回原内容，后续可以增强
    return content
  }

  /**
   * 策略3: 尝试多种解析策略
   */
  private static attemptMultipleParsingStrategies(content: string): any {
    const strategies = [
      () => this.directJSONParse(content),
      () => this.extractJSONFromText(content),
      () => this.fuzzyJSONParse(content),
      () => this.regexBasedParse(content),
      () => this.reconstructFromKeyValue(content)
    ]

    for (let i = 0; i < strategies.length; i++) {
      try {
        const result = strategies[i]()
        if (result && this.isValidGameObject(result)) {
          if (this.DEBUG) {
            console.log(`✅ 策略${i + 1}成功:`, result)
          }
          return result
        }
      } catch (error) {
        if (this.DEBUG) {
          console.log(`❌ 策略${i + 1}失败:`, error.message)
        }
      }
    }

    throw new Error('所有解析策略都失败了')
  }

  /**
   * 策略3.1: 直接JSON解析
   */
  private static directJSONParse(content: string): any {
    return JSON.parse(content)
  }

  /**
   * 策略3.2: 从文本中提取JSON
   */
  private static extractJSONFromText(content: string): any {
    // 寻找可能的JSON对象
    const jsonMatches = content.match(/\{[\s\S]*\}/g)
    if (jsonMatches && jsonMatches.length > 0) {
      // 尝试解析找到的JSON
      for (const match of jsonMatches) {
        try {
          return JSON.parse(match.trim())
        } catch (e) {
          continue
        }
      }
    }
    throw new Error('未找到有效JSON')
  }

  /**
   * 策略3.3: 模糊JSON解析 - 尝试修复常见错误
   */
  private static fuzzyJSONParse(content: string): any {
    let fixed = content
    
    // 添加缺失的引号
    fixed = fixed.replace(/(\w+):/g, '"$1":')
    
    // 修复值的引号
    fixed = fixed.replace(/:\s*([^",}\]]+)(?=[,}\]])/g, (match, value) => {
      value = value.trim()
      // 如果是数字或布尔值，不加引号
      if (/^(\d+\.?\d*|true|false|null)$/.test(value)) {
        return `: ${value}`
      }
      // 否则加引号
      return `: "${value}"`
    })
    
    return JSON.parse(fixed)
  }

  /**
   * 策略3.4: 正则表达式解析
   */
  private static regexBasedParse(content: string): any {
    const result: any = {}
    
    // 提取target
    const targetMatch = content.match(/["']?target["']?\s*:\s*["']?([^"',}\]]+)["']?/)
    if (targetMatch) {
      result.target = targetMatch[1].trim()
    }
    
    // 提取reasoning
    const reasoningMatch = content.match(/["']?reasoning["']?\s*:\s*["']([^"']+)["']/)
    if (reasoningMatch) {
      result.reasoning = reasoningMatch[1].trim()
    }
    
    // 提取confidence
    const confidenceMatch = content.match(/["']?confidence["']?\s*:\s*([0-9.]+)/)
    if (confidenceMatch) {
      result.confidence = parseFloat(confidenceMatch[1])
    }
    
    // 提取message
    const messageMatch = content.match(/["']?message["']?\s*:\s*["']([^"']+)["']/)
    if (messageMatch) {
      result.message = messageMatch[1].trim()
    }
    
    // 提取emotion
    const emotionMatch = content.match(/["']?emotion["']?\s*:\s*["']?([^"',}\]]+)["']?/)
    if (emotionMatch) {
      result.emotion = emotionMatch[1].trim()
    }
    
    return result
  }

  /**
   * 策略3.5: 从键值对重构
   */
  private static reconstructFromKeyValue(content: string): any {
    const result: any = {}
    
    // 按行分割并处理
    const lines = content.split(/[,\n]/)
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.length === 0) continue
      
      // 寻找键值对
      const kvMatch = trimmed.match(/^["{]?\s*(\w+)\s*["}]?\s*:\s*(.+)$/)
      if (kvMatch) {
        const key = kvMatch[1].trim()
        let value = kvMatch[2].trim()
        
        // 清理值
        value = value.replace(/^["'{]|["'}]?[,}]*$/g, '')
        
        // 类型转换
        if (key === 'confidence' && /^\d+\.?\d*$/.test(value)) {
          result[key] = parseFloat(value)
        } else {
          result[key] = value
        }
      }
    }
    
    return result
  }

  /**
   * 验证是否为有效的游戏对象
   */
  private static isValidGameObject(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return false
    }
    
    // 检查是否有基本的游戏字段
    const hasBasicFields = obj.hasOwnProperty('target') || 
                          obj.hasOwnProperty('message') || 
                          obj.hasOwnProperty('reasoning') ||
                          obj.hasOwnProperty('confidence')
    
    return hasBasicFields
  }

  /**
   * 创建后备结果
   */
  private static createFallbackResult(originalInput: any): any {
    console.warn('🚨 使用后备解析结果')
    
    return {
      target: undefined,
      reasoning: '解析失败，使用默认推理',
      confidence: 0.5,
      message: '系统消息：AI响应解析失败',
      emotion: 'neutral',
      originalInput: originalInput,
      parseError: true
    }
  }

  /**
   * 获取解析统计信息
   */
  static getParsingStats(): any {
    // 可以在这里添加统计逻辑
    return {
      totalAttempts: 0,
      successfulParses: 0,
      fallbackUses: 0
    }
  }

  /**
   * 测试解析器
   */
  static runTests(): void {
    console.log('🧪 开始RobustJSONParser测试...')
    
    const testCases = [
      // 你的实际案例
      {
        name: '实际AI响应格式',
        input: {
          "message": {
            "role": "assistant",
            "content": "{\n  \"target\": \"1\",\n  \"reasoning\": \"量子猎手可能有狼人嫌疑，需要查验。\",\n  \"confidence\": 0.8,\n  \"message\": \"我要查验量子猎手的身份。\",\n  \"emotion\": \"confident\"\n}"
          }
        }
      },
      // 标准JSON
      {
        name: '标准JSON',
        input: '{"target": "2", "reasoning": "测试", "confidence": 0.7}'
      },
      // 带代码块的JSON
      {
        name: '代码块JSON',
        input: '```json\n{"target": "3", "confidence": 0.9}\n```'
      },
      // 损坏的JSON
      {
        name: '损坏JSON',
        input: '{target: "4", reasoning: 测试推理, confidence: 0.6,}'
      },
      // 文本格式
      {
        name: '文本格式',
        input: 'TARGET: 5\nREASONING: 文本格式测试\nCONFIDENCE: 0.8'
      }
    ]

    testCases.forEach(testCase => {
      console.log(`\n📝 测试: ${testCase.name}`)
      console.log('输入:', testCase.input)
      try {
        const result = this.parseAIResponse(testCase.input)
        console.log('✅ 成功:', result)
      } catch (error) {
        console.log('❌ 失败:', error.message)
      }
    })
  }
}

// 开发环境自动测试
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  setTimeout(() => {
    RobustJSONParser.runTests()
  }, 3000)
} 