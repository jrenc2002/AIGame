/**
 * 鲁棒的JSON解析器
 * 用于解析AI响应中的JSON内容，处理各种格式问题
 */
export class RobustJSONParser {
  /**
   * 解析JSON字符串 - 失败时直接抛出错误，不使用fallback
   */
  static parse(input: string): any {
    if (!input || typeof input !== 'string') {
      throw new Error('输入为空或不是字符串')
    }

    console.log('🔍 开始解析JSON:', input.substring(0, 100) + '...')

    // 1. 尝试直接解析
    try {
      const result = JSON.parse(input.trim())
      console.log('✅ 直接JSON解析成功')
      return result
    } catch (error) {
      console.log('⚠️ 直接JSON解析失败，尝试清理后解析')
    }

    // 2. 清理并尝试解析
    const cleaned = this.cleanJSONString(input)
    try {
      const result = JSON.parse(cleaned)
      console.log('✅ 清理后JSON解析成功')
      return result
    } catch (error) {
      console.log('⚠️ 清理后JSON解析失败，尝试提取JSON')
    }

    // 3. 尝试提取JSON对象
    const extracted = this.extractJSONFromText(input)
    if (extracted) {
      try {
        const result = JSON.parse(extracted)
        console.log('✅ 提取JSON解析成功')
        return result
      } catch (error) {
        console.log('⚠️ 提取JSON解析失败')
      }
    }

    // 4. 最后的尝试：智能解析
    try {
      const result = this.intelligentParse(input)
      console.log('✅ 智能解析成功')
      return result
    } catch (error) {
      console.error('❌ 所有JSON解析方法都失败了:', error)
      throw new Error(`JSON解析失败: 无法从以下内容中提取有效JSON:\n${input.substring(0, 200)}...`)
    }
  }

  /**
   * 清理JSON字符串
   */
  private static cleanJSONString(input: string): string {
    return input
      .trim()
      // 移除代码块标记
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      // 移除前后的非JSON内容
      .replace(/^[^{[]*/, '')
      .replace(/[^}\]]*$/, '')
      // 修复常见的格式问题
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      // 修复未转义的引号
      .replace(/(?<!\\)"/g, '"')
      .replace(/(?<!\\)'/g, '"')
  }

  /**
   * 从文本中提取JSON对象
   */
  private static extractJSONFromText(text: string): string | null {
    // 查找JSON对象模式 {...}
    const objectMatch = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g)
    if (objectMatch) {
      return objectMatch[objectMatch.length - 1] // 返回最后一个匹配
    }

    // 查找JSON数组模式 [...]
    const arrayMatch = text.match(/\[[^[\]]*(?:\[[^[\]]*\][^[\]]*)*\]/g)
    if (arrayMatch) {
      return arrayMatch[arrayMatch.length - 1] // 返回最后一个匹配
    }

    return null
  }

  /**
   * 智能解析 - 尝试修复常见的JSON格式错误
   */
  private static intelligentParse(input: string): any {
    let text = input.trim()

    // 如果不是以{或[开头，尝试找到开始位置
    const startMatch = text.match(/[{[]/)
    if (startMatch) {
      text = text.substring(startMatch.index!)
    }

    // 如果不是以}或]结尾，尝试找到结束位置
    const reverseText = text.split('').reverse().join('')
    const endMatch = reverseText.match(/[}\]]/)
    if (endMatch) {
      const endIndex = text.length - endMatch.index!
      text = text.substring(0, endIndex)
    }

    // 尝试修复属性名没有引号的问题
    text = text.replace(/(\w+):/g, '"$1":')

    // 尝试修复值没有引号的问题（排除数字、布尔值、null）
    text = text.replace(/:\s*([^",[\]{}]+?)(\s*[,}])/g, (match, value, ending) => {
      const trimmedValue = value.trim()
      if (trimmedValue === 'true' || trimmedValue === 'false' || 
          trimmedValue === 'null' || /^\d+(\.\d+)?$/.test(trimmedValue)) {
        return `:${trimmedValue}${ending}`
      }
      return `:"${trimmedValue}"${ending}`
    })

    return JSON.parse(text)
  }
} 