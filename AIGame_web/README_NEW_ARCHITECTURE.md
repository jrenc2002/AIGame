# AI游戏引擎架构说明

## 概述

基于LLM-Werewolf项目重构的纯前端AI游戏架构，提供统一的AI通信层和游戏引擎，支持多种游戏类型和AI模型。

## 核心特性

### 🤖 统一AI通信层
- **多模型支持**: 文心一言、OpenAI、千帆、本地模型
- **流式传输**: 实时显示AI思考过程
- **批量处理**: 一次性获取完整响应
- **错误处理**: 自动重试和降级机制
- **并发控制**: 多AI同时行动的管理

### 🎮 模块化游戏引擎
- **游戏抽象**: 统一的游戏引擎基类
- **事件系统**: 完整的游戏事件监听机制
- **状态管理**: 自动化的游戏状态同步
- **扩展性**: 易于添加新游戏类型

### 🐺 狼人杀游戏
- **完整规则**: 基于LLM-Werewolf的9人全禁房规则
- **智能AI**: 使用专业Prompt和角色扮演
- **实时对战**: 支持人机混合对战
- **流程自动化**: 自动阶段转换和行动处理

## 架构设计

```
src/
├── core/                    # 核心引擎
│   ├── ai/                 # AI通信层
│   │   ├── AIClient.ts     # 统一客户端接口
│   │   ├── ErnieBotClient.ts # 文心一言实现
│   │   └── AIClientFactory.ts # 客户端工厂
│   ├── game/               # 游戏引擎
│   │   └── GameEngine.ts   # 游戏引擎基类
│   └── GameManager.ts      # 游戏管理器
├── games/                  # 具体游戏
│   └── werewolf/          # 狼人杀
│       └── WerewolfGameEngine.ts
├── hooks/                  # React Hooks
│   └── useGameManager.ts   # 游戏管理Hook
└── components/             # UI组件
    └── werewolf/
        └── NewWerewolfGame.tsx
```

## 快速开始

### 1. 环境配置

创建 `.env.local` 文件：

```bash
# 文心一言配置
VITE_ERNIE_API_KEY=your_api_key
VITE_ERNIE_SECRET_KEY=your_secret_key

# 或使用千帆平台
VITE_QIANFAN_AK=your_access_key
VITE_QIANFAN_SK=your_secret_key
```

### 2. 基础使用

```tsx
import { useWerewolfGame } from '@/hooks/useGameManager'

function WerewolfGameComponent() {
  const {
    createWerewolfGame,
    quickStartWerewolf,
    gameState,
    currentGame,
    aiThinking
  } = useWerewolfGame()

  const handleQuickStart = async () => {
    const gameId = await quickStartWerewolf({
      playerCount: 8,
      aiPlayerCount: 7,
      aiProvider: 'erniebot'
    })
    console.log('游戏创建成功:', gameId)
  }

  return (
    <div>
      <button onClick={handleQuickStart}>
        快速开始狼人杀
      </button>
      
      {/* 显示AI思考过程 */}
      {Array.from(aiThinking.entries()).map(([playerId, content]) => (
        <div key={playerId}>
          {playerId}: {content}
        </div>
      ))}
    </div>
  )
}
```

### 3. 高级用法

```tsx
import { gameManager } from '@/core/GameManager'
import { AIClientFactory } from '@/core/ai/AIClientFactory'

// 创建自定义AI客户端
const customAI = AIClientFactory.createClient({
  provider: 'erniebot',
  config: {
    model: 'ernie-bot-4',
    temperature: 0.8,
    apiKey: 'your_key'
  }
})

// 创建游戏并注册AI
const gameId = await gameManager.createGame({
  gameType: 'werewolf',
  gameId: 'custom_game',
  playerCount: 9,
  aiPlayerCount: 8
})

const game = gameManager.getGame(gameId)
game?.engine.registerAIClient('ai_1', customAI)
```

## AI模型配置

### 文心一言 (推荐)
```typescript
const client = AIClientFactory.createFromEnv('erniebot')
```

### OpenAI
```typescript
const client = AIClientFactory.createFromEnv('openai')
```

### 千帆平台
```typescript
const client = AIClientFactory.createFromEnv('qianfan')
```

### 本地模型
```typescript
const client = AIClientFactory.createFromEnv('local')
```

## 游戏流程

### 狼人杀游戏流程

1. **准备阶段** (30秒)
   - 分配角色
   - 初始化AI状态

2. **夜晚阶段** (120秒)
   - 狼人击杀
   - 预言家查验
   - 女巫使用技能
   - 守卫保护

3. **白天讨论** (180秒)
   - 公布夜晚结果
   - AI玩家发言讨论

4. **白天投票** (60秒)
   - 投票选择出局玩家
   - 统计票数

5. **胜负判定**
   - 狼人全部出局 → 好人获胜
   - 狼人数量 ≥ 好人数量 → 狼人获胜

## 扩展新游戏

### 1. 创建游戏引擎

```typescript
import { GameEngine } from '@/core/game/GameEngine'

export class MyGameEngine extends GameEngine<MyGameState> {
  getGameName(): string {
    return 'my_game'
  }

  async initializeGame(): Promise<void> {
    // 初始化游戏逻辑
  }

  buildAIPrompt(request: AIActionRequest): AIMessage[] {
    // 构建AI提示词
    return [
      { role: 'system', content: 'You are playing my game...' },
      { role: 'user', content: request.context }
    ]
  }

  // 实现其他抽象方法...
}
```

### 2. 注册游戏工厂

```typescript
// 在 GameManager 中添加
this.gameFactories.set('my_game', async (config) => {
  const { MyGameEngine } = await import('../games/my_game/MyGameEngine')
  return new MyGameEngine(initialState)
})
```

## 性能优化

### AI并发控制
```typescript
// 限制并发AI请求数量
const responses = await engine.processAIActionsConcurrently(requests, 3)
```

### 流式响应
```typescript
// 使用流式响应提升用户体验
await engine.requestAIActionStream(request, (chunk) => {
  console.log('AI思考:', chunk.delta)
})
```

### 健康检查
```typescript
// 定期检查AI状态
const health = await engine.checkAIHealth()
console.log('AI健康状态:', health)
```

## 调试和监控

### 开发模式
```typescript
// 启用调试信息
if (process.env.NODE_ENV === 'development') {
  console.log('游戏状态:', gameState)
}
```

### 事件监听
```typescript
engine.on('phase_changed', (event) => {
  console.log('阶段变化:', event.data.phase)
})

engine.on('ai_streaming_chunk', (event) => {
  console.log('AI流式响应:', event.data.chunk)
})
```

## 最佳实践

### 1. 错误处理
- 使用 try-catch 包装所有AI调用
- 实现降级策略和重试机制
- 提供用户友好的错误信息

### 2. 性能优化
- 合理设置AI并发数量
- 使用流式响应提升体验
- 定期清理无用的游戏实例

### 3. 用户体验
- 显示AI思考过程
- 提供实时游戏状态更新
- 支持游戏暂停和恢复

### 4. 安全考虑
- 验证所有用户输入
- 限制AI请求频率
- 保护敏感的API密钥

## 故障排除

### 常见问题

1. **AI响应超时**
   - 检查网络连接
   - 增加超时时间
   - 使用重试机制

2. **游戏状态不同步**
   - 检查事件监听器
   - 确认状态更新逻辑
   - 使用强制刷新

3. **内存泄漏**
   - 及时清理游戏实例
   - 移除事件监听器
   - 检查定时器清理

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request

## 许可证

MIT License 