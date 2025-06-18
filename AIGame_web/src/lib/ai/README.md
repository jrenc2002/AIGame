# 🤖 AI服务架构说明

## 概述

这是一个模块化的AI服务架构，使用Vercel的`ai`和`@ai-sdk`包实现，支持流式和非流式传输。

## 架构设计

```
BaseAIService (抽象基类)
├── 流式传输: generateStreamResponse()
├── 非流式传输: generateResponse()
├── 错误处理: handleAIError()
└── 配置管理: validateConfiguration()

WerewolfAIService (狼人杀专用)
├── 继承 BaseAIService
├── 狼人杀专用方法: generateSpeech(), generateDecision()
├── 上下文构建: WerewolfContextBuilder
└── 游戏逻辑处理

GameAIServiceFactory (工厂类)
├── 游戏类型管理
├── 实例缓存
└── 统一配置
```

## 使用示例

### 1. 基础非流式调用

```typescript
import { GameAIServiceFactory } from './ai/GameAIServiceFactory'
import { WerewolfAIService } from './ai/WerewolfAIService'

// 获取狼人杀AI服务
const werewolfAI = GameAIServiceFactory.getGameAIService('werewolf') as WerewolfAIService

// 生成AI发言
const speech = await werewolfAI.generateSpeech(player, gameState, '额外上下文')
console.log('AI发言:', speech.message)
console.log('情感:', speech.emotion)
console.log('可信度:', speech.confidence)
```

### 2. 流式传输调用

```typescript
// 生成流式AI发言
const speechStream = werewolfAI.generateSpeechStream(player, gameState)

for await (const chunk of speechStream) {
  console.log('实时内容:', chunk.message)
  if (chunk.delta) {
    console.log('新增内容:', chunk.delta)
  }
}
```

### 3. AI决策生成

```typescript
// 生成AI投票决策
const decision = await werewolfAI.generateDecision(
  player,           // 当前玩家
  gameState,        // 游戏状态
  availableTargets, // 可选目标
  'vote'           // 行动类型
)

console.log('选择目标:', decision.target)
console.log('决策理由:', decision.reasoning)
console.log('决策信心:', decision.confidence)
```

## Context构建机制

### 狼人杀Context结构

```typescript
[
  {
    role: 'system',
    content: '你是狼人杀游戏的AI玩家，你的身份是预言家...'
  },
  {
    role: 'user', 
    content: '以下是最近的发言记录：\n玩家1: 我觉得玩家3可疑\n玩家2: 我支持玩家1的观点'
  },
  {
    role: 'user',
    content: '重要游戏事件：\n第1轮 night: 玩家5死亡\n第1轮 day_voting: 玩家7被投票出局'
  },
  {
    role: 'user',
    content: '当前游戏状态分析：\n- 你是：预言家\n- 第2轮，day_discussion阶段\n- 存活玩家：1,2,3,4,6,8,9'
  }
]
```

## 配置要求

### 环境变量设置

```bash
# .env.local
VITE_OPENAI_API_KEY=sk-your-openai-api-key
VITE_OPENAI_MODEL=deepseek-r1
VITE_OPENAI_BASE_URL=https://api.openai-next.com/v1
VITE_AI_MAX_TOKENS=800
VITE_AI_TEMPERATURE=0.8
```

### 依赖安装

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic
```

## 错误处理

AI服务具备完善的错误处理和降级机制：

1. **API错误**: 自动识别rate limit、quota等错误
2. **网络错误**: 超时重试机制
3. **降级响应**: API不可用时使用本地逻辑
4. **配置验证**: 启动时检查API配置有效性

## 扩展新游戏

### 1. 创建游戏专用AI服务

```typescript
export class CricketAIService extends BaseAIService {
  async generateMove(player: Player, gameState: GameState): Promise<CricketMove> {
    const messages = this.buildCricketContext(player, gameState)
    const response = await this.generateResponse(messages)
    return this.parseMove(response)
  }

  private buildCricketContext(player: Player, gameState: GameState): CoreMessage[] {
    return [
      {
        role: 'system',
        content: '你是赛博板球游戏的AI玩家...'
      },
      // ... 游戏专用context
    ]
  }
}
```

### 2. 注册到工厂

```typescript
// 在 GameAIServiceFactory 中添加
case 'cricket':
  return new CricketAIService(config)
```

## 性能优化

1. **实例缓存**: 工厂模式避免重复创建
2. **并发控制**: 合理控制同时AI请求数量
3. **Token优化**: 动态调整max_tokens参数
4. **响应缓存**: 缓存相似决策结果

## 调试技巧

```typescript
// 启用调试模式
const werewolfAI = new WerewolfAIService({
  temperature: 0.1, // 降低随机性便于调试
  maxTokens: 200,   // 减少token消耗
})

// 打印完整context
const messages = WerewolfContextBuilder.buildGameContext(player, gameState)
console.log('AI Context:', JSON.stringify(messages, null, 2))
```

## 注意事项

1. ⚠️ **API密钥安全**: 不要在前端暴露真实API密钥
2. 🔒 **使用配额**: 合理设置token限制避免超额费用
3. 🎯 **提示词优化**: 根据游戏效果调整system prompt
4. 📊 **性能监控**: 监控AI响应时间和质量 