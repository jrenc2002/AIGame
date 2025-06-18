# 🤖 LLM AI接入指南

## 问题诊断

当前LLM没有接入的可能原因：
1. **环境变量未配置** - API Key等配置缺失
2. **游戏引擎未连接** - UI层使用的是简化模式，未连接真正的游戏引擎
3. **AI服务配置错误** - aiService配置验证失败

## 解决方案

### 1. 环境变量配置 🔧

创建 `.env.local` 文件（项目根目录）：

```bash
# AI配置
VITE_AI_ENABLED=true
VITE_OPENAI_API_KEY=your_actual_openai_api_key_here
VITE_OPENAI_MODEL=deepseek-r1
VITE_OPENAI_BASE_URL=https://api.openai-next.com/v1
VITE_AI_MAX_TOKENS=1000
VITE_AI_TEMPERATURE=0.7
```

**获取API Key**：
- OpenAI: https://platform.openai.com/api-keys
- 或使用代理服务，如：https://api.openai-next.com/v1

### 2. 修复游戏引擎连接 🎮

当前 `WerewolfGameView.tsx` 已修改为使用真正的游戏引擎：

```typescript
// 使用真正的狼人杀游戏引擎
const {
  currentGame,
  gameState: engineGameState,
  createWerewolfGame,
  joinGame,
  executeAction,
  aiThinking,
  aiStreamingActive
} = useWerewolfGame()
```

### 3. AI服务状态检查 ✅

检查AI服务是否正常工作：

```typescript
// 在控制台查看
console.log('AI服务状态:', aiGameService.isAIEnabled())
```

### 4. 测试AI功能 🧪

#### **查看AI配置面板**
1. 点击左侧 "🤖 AI配置" 面板
2. 确认 "已启用" 状态
3. 配置正确的API Key
4. 点击 "测试连接"

#### **AI功能触发时机**
- **夜晚阶段**: AI自动执行技能行动
- **讨论阶段**: AI自动生成发言
- **投票阶段**: AI自动进行投票决策

#### **观察AI工作状态**
- 游戏区域会显示 "AI正在思考..." 提示
- 聊天面板会显示AI生成的发言
- 控制台会输出AI调用日志

## 调试步骤

### Step 1: 检查环境变量
```bash
# 在浏览器控制台执行
console.log(import.meta.env.VITE_OPENAI_API_KEY)
# 应该显示你的API Key，而不是 undefined
```

### Step 2: 检查AI配置
```typescript
import { getAIConfig, validateAIConfig } from '@/lib/aiConfig'
console.log('AI配置:', getAIConfig())
console.log('配置有效:', validateAIConfig(getAIConfig()))
```

### Step 3: 手动测试AI服务
```typescript
import { aiGameService } from '@/lib/aiService'

// 测试AI发言生成
const testPlayer = {
  id: 'test',
  name: '测试',
  role: 'villager',
  aiPersonality: 'logical'
}

const testGameState = {
  currentPhase: 'day_discussion',
  currentRound: 1,
  players: [testPlayer]
}

aiGameService.generateAISpeech(testPlayer, testGameState, '测试发言')
  .then(result => console.log('AI发言结果:', result))
  .catch(error => console.error('AI发言失败:', error))
```

## 常见问题

### Q1: "AI连接测试失败"
**解决方案**：
- 检查API Key是否正确
- 检查网络连接
- 尝试更换Base URL（如使用代理服务）

### Q2: "AI功能未启用"
**解决方案**：
- 确认 `VITE_AI_ENABLED=true`
- 重启开发服务器
- 检查环境变量是否正确加载

### Q3: AI不生成发言
**解决方案**：
- 检查游戏是否使用了真正的游戏引擎
- 确认 `WerewolfGameEngine` 正确调用AI服务
- 查看控制台是否有错误日志

### Q4: API配额超限
**解决方案**：
- 检查OpenAI账户余额
- 降低 `VITE_AI_MAX_TOKENS` 值
- 增加请求间隔时间

## 功能验证

启动游戏后，应该看到：

1. ✅ **AI配置面板显示"已启用"**
2. ✅ **游戏开始时显示"LLM AI将在对话阶段自动生成发言"**
3. ✅ **讨论阶段出现"AI正在思考..."提示**
4. ✅ **聊天面板显示AI生成的发言**
5. ✅ **控制台输出AI调用成功日志**

## 高级配置

### 自定义AI服务提供商
```typescript
// 修改 src/lib/aiConfig.ts
export const getAIConfig = (): AIConfig => {
  return {
    openaiApiKey: 'your_api_key',
    openaiModel: 'gpt-4', // 使用更强的模型
    openaiBaseUrl: 'https://your-custom-endpoint.com/v1',
    temperature: 0.9, // 更有创意的回复
    maxTokens: 2000 // 更长的回复
  }
}
```

### 调整AI性格
```typescript
// 在 WerewolfGameEngine.ts 中
// AI会根据设定的性格特征生成不同风格的发言
const personalities = ['logical', 'intuitive', 'aggressive', 'conservative', 'leader', 'follower']
```

LLM AI接入成功后，你会看到真正智能的AI玩家参与游戏！🎉 