# AI游戏中心 (AI Game Center)

一个创新的AI游戏平台，体验未来科技与传统游戏的完美融合。

## ✨ 特性

- 🎮 **AI游戏**: 创新的AI驱动游戏体验
- 🦗 **赛博斗蛐蛐**: 未来世界的蛐蛐格斗竞技场
- 🌓 **主题切换**: 支持浅色/深色模式自由切换
- 📱 **响应式布局**: 完美适配桌面端和移动端
- ⚡ **高性能**: 基于 React + Vite 构建，启动和构建速度极快
- 🔧 **状态管理**: 使用 Jotai 进行轻量级状态管理

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **样式方案**: TailwindCSS + DaisyUI
- **状态管理**: Jotai
- **路由管理**: React Router DOM
- **国际化**: i18next
- **动画效果**: Framer Motion

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- npm、yarn 或 pnpm

### 安装依赖

```bash
# 使用 npm
npm install

# 使用 yarn
yarn install

# 使用 pnpm
pnpm install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

应用将在 `http://localhost:5173` 启动

### 构建部署

```bash
# 构建生产版本
npm run build
# 或
yarn build
# 或
pnpm build
```

构建文件将生成在 `dist` 目录中

### 本地预览

```bash
# 预览构建结果
npm run preview
# 或
yarn preview
# 或
pnpm preview
```

## 📁 项目结构

```
TangPing_web/
├── public/                 # 静态资源
├── src/
│   ├── components/         # 可复用组件
│   │   ├── bg/            # 背景组件
│   │   └── dock/          # 导航栏组件
│   ├── view/              # 页面组件
│   ├── store/             # 状态管理
│   ├── assets/            # 资源文件
│   ├── i18n/              # 国际化配置
│   └── lib/               # 工具函数
├── index.html             # 入口 HTML
├── vite.config.ts         # Vite 配置
├── tailwind.config.js     # TailwindCSS 配置
└── package.json          # 项目配置
```

## 🎮 游戏特色

### 赛博斗蛐蛐
- 随机生成的AI蛐蛐，每只都有独特的属性和技能
- 回合制战斗系统，策略性十足
- 丰富的元素属性：火、水、土、雷、风
- 稀有度系统：普通、稀有、史诗、传说
- 实时战斗动画和特效

### 主题系统
- 浅色模式：清爽简洁的白色主题
- 深色模式：护眼舒适的深色主题
- 智能主题记忆，下次访问自动恢复

### 响应式设计
- 移动端优先的设计理念
- 完美适配各种屏幕尺寸
- 流畅的交互动画效果

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- GitHub Issues: [项目地址](https://github.com/example/tangping-web-app)
- Email: hello@example.com

---

开始您的AI游戏之旅！ 🎮
