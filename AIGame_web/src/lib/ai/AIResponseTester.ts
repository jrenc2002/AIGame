/**
 * AI响应测试器 - 专门测试用户提供的实际AI响应格式
 */
import { RobustJSONParser } from './RobustJSONParser'

export class AIResponseTester {
  /**
   * 测试用户提供的具体响应格式
   */
  static testUserProvidedResponse(): void {
    console.log('🧪 开始测试用户提供的AI响应格式...')
    
    // 用户提供的实际响应
    const userResponse = {
      "message": {
        "role": "assistant",
        "content": "{\n  \"target\": \"1\",\n  \"reasoning\": \"量子猎手可能有狼人嫌疑，需要查验。\",\n  \"confidence\": 0.8,\n  \"message\": \"我要查验量子猎手的身份。\",\n  \"emotion\": \"confident\"\n}"
      }
    }
    
    console.log('📥 用户实际响应:', userResponse)
    
    try {
      // 使用鲁棒解析器处理
      const parsed = RobustJSONParser.parseAIResponse(userResponse)
      console.log('✅ 解析成功！结果:', parsed)
      
      // 验证解析结果的完整性
      this.validateParsedResult(parsed)
      
    } catch (error) {
      console.error('❌ 解析失败:', error)
    }
  }
  
  /**
   * 验证解析结果
   */
  private static validateParsedResult(result: any): void {
    console.log('\n🔍 验证解析结果...')
    
    const requiredFields = ['target', 'reasoning', 'confidence', 'message', 'emotion']
    const missingFields = requiredFields.filter(field => !result.hasOwnProperty(field))
    
    if (missingFields.length === 0) {
      console.log('✅ 所有必需字段都存在')
      console.log('🎯 target:', result.target, typeof result.target)
      console.log('🧠 reasoning:', result.reasoning)
      console.log('📊 confidence:', result.confidence, typeof result.confidence)
      console.log('💬 message:', result.message)
      console.log('😊 emotion:', result.emotion)
    } else {
      console.warn('⚠️ 缺少字段:', missingFields)
    }
    
    // 类型验证
    if (typeof result.confidence === 'number') {
      console.log('✅ confidence 是数字类型')
    } else {
      console.warn('⚠️ confidence 不是数字类型:', typeof result.confidence)
    }
    
    if (typeof result.target === 'string') {
      console.log('✅ target 是字符串类型')
    } else {
      console.warn('⚠️ target 不是字符串类型:', typeof result.target)
    }
  }
  
  /**
   * 测试各种可能的响应格式变体
   */
  static testVariousFormats(): void {
    console.log('\n🧪 测试各种响应格式变体...')
    
    const testCases = [
      {
        name: '标准嵌套格式',
        data: {
          "message": {
            "role": "assistant",
            "content": "{\n  \"target\": \"2\",\n  \"reasoning\": \"测试推理\",\n  \"confidence\": 0.7,\n  \"message\": \"测试消息\",\n  \"emotion\": \"neutral\"\n}"
          }
        }
      },
      {
        name: '直接content格式',
        data: {
          "content": "{\"target\": \"3\", \"reasoning\": \"直接测试\", \"confidence\": 0.9}"
        }
      },
      {
        name: '带转义的JSON',
        data: "{\\"target\\": \\"4\\", \\"reasoning\\": \\"转义测试\\", \\"confidence\\": 0.5}"
      },
      {
        name: 'OpenAI风格响应',
        data: {
          "choices": [{
            "message": {
              "content": "{\"target\": \"5\", \"reasoning\": \"OpenAI格式\", \"confidence\": 0.8}"
            }
          }]
        }
      }
    ]
    
    testCases.forEach(testCase => {
      console.log(`\n📝 测试: ${testCase.name}`)
      try {
        const result = RobustJSONParser.parseAIResponse(testCase.data)
        console.log('✅ 成功:', result)
      } catch (error) {
        console.log('❌ 失败:', error.message)
      }
    })
  }
  
  /**
   * 性能测试
   */
  static performanceTest(): void {
    console.log('\n⚡ 性能测试...')
    
    const testData = {
      "message": {
        "role": "assistant", 
        "content": "{\n  \"target\": \"1\",\n  \"reasoning\": \"性能测试推理\",\n  \"confidence\": 0.8,\n  \"message\": \"性能测试消息\",\n  \"emotion\": \"confident\"\n}"
      }
    }
    
    const iterations = 100
    const startTime = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      RobustJSONParser.parseAIResponse(testData)
    }
    
    const endTime = performance.now()
    const avgTime = (endTime - startTime) / iterations
    
    console.log(`📊 ${iterations}次解析平均用时: ${avgTime.toFixed(2)}ms`)
    console.log(`📊 每秒可处理: ${Math.round(1000 / avgTime)}次`)
  }
  
  /**
   * 运行所有测试
   */
  static runAllTests(): void {
    console.log('🚀 开始AI响应解析器全套测试...')
    
    this.testUserProvidedResponse()
    this.testVariousFormats()
    this.performanceTest()
    
    console.log('\n✅ 所有测试完成！')
  }
}

// 在开发环境自动运行测试
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  setTimeout(() => {
    AIResponseTester.runAllTests()
  }, 2000)
} 