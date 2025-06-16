# 🤖 AI狼人杀 - 完整配置指南

## ⚠️ 重要说明

**AI服务已完全重构，不再支持本地模拟。游戏必须配置有效的OpenAI API Key才能运行。**

## 🔧 快速配置步骤

### 1. 获取OpenAI API Key

1. 访问 [OpenAI官网](https://platform.openai.com/)
2. 注册或登录账户
3. 进入 [API Keys页面](https://platform.openai.com/api-keys)
4. 点击 "Create new secret key"
5. 复制生成的API Key（格式：`sk-...`）

### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# 必须配置 - OpenAI API Key
VITE_OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# 可选配置
VITE_OPENAI_MODEL=gpt-3.5-turbo
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_AI_MAX_TOKENS=800
VITE_AI_TEMPERATURE=0.8
```

### 3. 通过游戏界面配置

如果不想使用环境变量，也可以在游戏中配置：

1. 启动游戏
2. 点击左侧的 "🤖 AI配置" 面板
3. 输入你的OpenAI API Key
4. 点击"测试连接"验证
5. 保存配置

## 🚨 常见问题解决

### Q1: "AI服务不可用，请配置有效的OpenAI API Key"

**解决方案**：
- 检查API Key是否正确复制（应以`sk-`开头）
- 确认API Key没有过期或被删除
- 检查OpenAI账户是否有余额

### Q2: "OpenAI API key is missing"

**解决方案**：
- 确保环境变量名称正确：`VITE_OPENAI_API_KEY`
- 重启开发服务器：`npm run dev` 或 `pnpm dev`
- 检查`.env.local`文件是否在项目根目录

### Q3: 游戏启动后立即结束

**解决方案**：
- AI服务验证失败，游戏会自动结束
- 按照上述步骤重新配置API Key
- 查看浏览器控制台的错误信息

### Q4: API配额或费用问题

**解决方案**：
- 检查OpenAI账户余额
- 降低`VITE_AI_MAX_TOKENS`值（如设为400）
- 考虑使用更便宜的模型（如`gpt-3.5-turbo`）

## 🎯 验证配置

配置完成后，你可以：

1. **检查AI配置面板**：应显示"✅ AI配置有效"
2. **开始游戏**：AI角色应能正常发言和决策
3. **观察控制台**：应无红色错误信息

## 💡 优化建议

### 模型选择
- **gpt-3.5-turbo**：速度快，成本低，推荐日常使用
- **gpt-4**：更智能，但成本较高

### Token控制
```bash
# 经济配置
VITE_AI_MAX_TOKENS=400
VITE_AI_TEMPERATURE=0.7

# 高质量配置
VITE_AI_MAX_TOKENS=1000
VITE_AI_TEMPERATURE=0.8
```

### API代理（可选）
如果需要使用代理服务：
```bash
VITE_OPENAI_BASE_URL=https://your-proxy-url.com/v1
```

## 🔒 安全注意事项

1. **保护API Key**：
   - 不要提交`.env.local`到版本控制
   - 不要在前端代码中硬编码API Key
   - 定期轮换API Key

2. **使用限制**：
   - 设置合理的Token限制
   - 监控API使用量
   - 为账户设置使用警报

## 📊 成本估算

以GPT-3.5-turbo为例：
- 每局游戏约消耗 3000-5000 tokens
- 成本约 $0.003-0.005 USD
- 玩100局约花费 $0.3-0.5 USD

## 🆘 获取帮助

如果仍有问题：

1. 检查浏览器开发者工具的控制台
2. 确认网络连接正常
3. 尝试在[OpenAI Playground](https://platform.openai.com/playground)中测试API Key
4. 查看OpenAI官方文档

---

## ✅ 配置完成检查清单

- [ ] 获得有效的OpenAI API Key
- [ ] 创建并配置`.env.local`文件
- [ ] 重启开发服务器
- [ ] 在游戏中验证AI配置面板显示"可用"
- [ ] 成功开始一局游戏并观察AI发言

配置成功后，你就可以享受真正智能的AI狼人杀体验了！🎮✨ 