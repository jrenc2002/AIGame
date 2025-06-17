// JSON解析测试工具
export class JSONTestHelper {
  /**
   * 测试不同格式的AI响应解析
   */
  static testAIResponseParsing(): void {
    console.log('🧪 开始JSON解析测试...')
    
    // 测试样例1: 你遇到的问题格式
    const testResponse1 = `TARGET: 逻辑守护(3)  
REASONING: 逻辑守护可能会守护关键角色，杀掉可减少对我们行动的威胁。  
CONFIDENCE: 0.8  
MESSAGE: 建议今晚击杀逻辑守护，避免后续风险。`
    
    console.log('📝 测试文本格式解析:')
    console.log('输入:', testResponse1)
    const parsed1 = this.parseTextFormat(testResponse1)
    console.log('解析结果:', parsed1)
    
    // 测试样例2: 标准JSON格式
    const testResponse2 = `{
  "target": "3",
  "reasoning": "逻辑守护可能会守护关键角色，杀掉可减少对我们行动的威胁。",
  "confidence": 0.8,
  "message": "建议今晚击杀逻辑守护，避免后续风险。",
  "emotion": "confident"
}`
    
    console.log('\n📝 测试JSON格式解析:')
    console.log('输入:', testResponse2)
    const parsed2 = this.parseJSONFormat(testResponse2)
    console.log('解析结果:', parsed2)
    
    // 测试样例3: 带代码块的JSON格式
    const testResponse3 = `\`\`\`json
{
  "target": "3",
  "reasoning": "逻辑守护可能会守护关键角色，杀掉可减少对我们行动的威胁。",
  "confidence": 0.8,
  "message": "建议今晚击杀逻辑守护，避免后续风险。",
  "emotion": "confident"
}
\`\`\``
    
    console.log('\n📝 测试代码块JSON格式解析:')
    console.log('输入:', testResponse3)
    const parsed3 = this.parseJSONFormat(testResponse3)
    console.log('解析结果:', parsed3)
  }
  
  /**
   * 解析文本格式的AI响应
   */
  static parseTextFormat(response: string): any {
    const lines = response.split('\n').filter(line => line.trim())
    const result: any = {}
    
    for (const line of lines) {
      if (line.startsWith('TARGET:')) {
        result.target = line.replace('TARGET:', '').trim()
        // 提取ID (处理"玩家名(ID)"格式)
        const idMatch = result.target.match(/\((\d+)\)/)
        if (idMatch) {
          result.target = idMatch[1]
        }
      } else if (line.startsWith('REASONING:')) {
        result.reasoning = line.replace('REASONING:', '').trim()
      } else if (line.startsWith('CONFIDENCE:')) {
        result.confidence = parseFloat(line.replace('CONFIDENCE:', '').trim()) || 0.5
      } else if (line.startsWith('MESSAGE:')) {
        result.message = line.replace('MESSAGE:', '').trim()
      } else if (line.startsWith('EMOTION:')) {
        result.emotion = line.replace('EMOTION:', '').trim()
      }
    }
    
    return result
  }
  
  /**
   * 解析JSON格式的AI响应
   */
  static parseJSONFormat(response: string): any {
    try {
      const cleanResponse = response.trim()
      let jsonStr = cleanResponse
      
      // 处理代码块格式
      if (cleanResponse.includes('```json')) {
        const match = cleanResponse.match(/```json\s*([\s\S]*?)\s*```/)
        if (match) {
          jsonStr = match[1].trim()
        }
      } else if (cleanResponse.includes('```')) {
        const match = cleanResponse.match(/```\s*([\s\S]*?)\s*```/)
        if (match) {
          jsonStr = match[1].trim()
        }
      }
      
      return JSON.parse(jsonStr)
    } catch (error) {
      console.error('JSON解析失败:', error)
      return null
    }
  }
  
  /**
   * 通用解析函数（先尝试JSON，失败则用文本格式）
   */
  static parseAIResponse(response: string): any {
    // 首先尝试JSON解析
    const jsonResult = this.parseJSONFormat(response)
    if (jsonResult) {
      console.log('✅ JSON解析成功')
      return jsonResult
    }
    
    // 后备文本解析
    console.log('⚠️ JSON解析失败，使用文本解析')
    return this.parseTextFormat(response)
  }
}

// 自动执行测试（仅在开发环境）
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // 延迟执行，避免影响启动
  setTimeout(() => {
    JSONTestHelper.testAIResponseParsing()
  }, 5000)
} 