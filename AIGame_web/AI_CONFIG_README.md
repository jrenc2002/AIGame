# AI狼人杀 - AI配置指南

## 🤖 AI功能概述

AI狼人杀游戏集成了OpenAI GPT模型，为每个AI角色提供：
- 智能对话生成
- 基于游戏状态的推理决策
- 不同性格的AI行为模式
- 实时的策略调整

## 📋 环境变量配置

### 1. 创建环境变量文件

在项目根目录创建 `.env.local` 文件：

```bash
# OpenAI API 配置
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENAI_MODEL=gpt-3.5-turbo
VITE_OPENAI_BASE_URL=https://api.openai-next.com/v1

# AI 功能配置
VITE_AI_ENABLED=true
VITE_AI_MAX_TOKENS=1000
VITE_AI_TEMPERATURE=0.7
```

### 2. 配置参数说明

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `VITE_OPENAI_API_KEY` | OpenAI API密钥 | 无 | `sk-...` |
| `VITE_OPENAI_MODEL` | 使用的GPT模型 | `gpt-3.5-turbo` | `gpt-4` |
| `VITE_OPENAI_BASE_URL` | API基础URL | `https://api.openai-next.com/v1` | 自定义API端点 |
| `VITE_AI_ENABLED` | 是否启用AI功能 | `false` | `true` |
| `VITE_AI_MAX_TOKENS` | 最大Token数 | `1000` | `1500` |
| `VITE_AI_TEMPERATURE` | 创造性参数 | `0.7` | `0.8` |

## 🔑 获取OpenAI API Key

1. 访问 [OpenAI官网](https://platform.openai.com/)
2. 注册/登录账户
3. 进入 [API Keys页面](https://platform.openai.com/api-keys)
4. 创建新的API Key
5. 复制密钥到环境变量中

## 🛠️ 模型选择建议

### GPT-3.5 Turbo (推荐)
- **优点**: 速度快，成本低，效果好
- **适用**: 大多数游戏场景
- **成本**: ~$0.001/1K tokens

### GPT-4
- **优点**: 更智能的推理，更丰富的对话
- **适用**: 追求最佳AI体验
- **成本**: ~$0.03/1K tokens

### GPT-4 Turbo
- **优点**: 平衡性能和成本
- **适用**: 中等要求场景
- **成本**: ~$0.01/1K tokens

## ⚙️ 高级配置

### Temperature 参数调节
- **0.1-0.3**: 更稳定，逻辑性强
- **0.4-0.7**: 平衡创造性和逻辑性 (推荐)
- **0.8-1.0**: 更有创造性，更随机

### Max Tokens 设置
- **500-800**: 简短回复
- **1000-1500**: 标准设置 (推荐)
- **2000+**: 详细分析

## 🔄 备用方案

当AI未配置或不可用时，游戏会自动：
- 使用预设的随机对话
- 采用基础的随机决策逻辑
- 保持游戏正常进行

## 🚨 常见问题

### Q: API Key无效
**A**: 检查密钥是否正确复制，是否有足够的配额

### Q: 连接超时
**A**: 检查网络连接，可能需要使用代理

### Q: 费用过高
**A**: 调整Token限制，选择更便宜的模型

### Q: AI回复不合理
**A**: 调整Temperature参数，检查提示词设置

## 📊 性能优化

1. **合理设置Token限制**: 避免过长的回复
2. **选择合适的模型**: 平衡性能和成本
3. **控制调用频率**: 避免频繁请求
4. **缓存策略**: 复用相似的决策

## 🔒 安全注意事项

1. **保护API Key**: 不要提交到版本控制
2. **设置使用限制**: 避免意外的高额费用
3. **监控使用量**: 定期检查API使用情况
4. **备份配置**: 保存重要的配置设置

## 📞 支持与反馈

如果遇到问题或有改进建议：
1. 检查本文档的常见问题部分
2. 查看浏览器控制台的错误信息
3. 在游戏中使用AI配置面板进行调试 