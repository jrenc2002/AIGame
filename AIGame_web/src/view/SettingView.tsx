import { type FC } from 'react'
import { useAtom } from 'jotai'
import { themeAtom, BgKindAtom, type Theme, type BgKind } from '@/store/AppSet'

interface SocialLink {
  platform: string
  username: string
  url: string
  icon: string
}

interface ProjectInfo {
  name: string
  description: string
  url: string
  stars?: number
}

const SettingView: FC = () => {
  const [theme, setTheme] = useAtom(themeAtom)
  const [bgKind, setBgKind] = useAtom(BgKindAtom)

  const socialLinks: SocialLink[] = [
    {
      platform: 'GitHub',
      username: '我的代码空间',
      url: 'https://github.com',
      icon: '/icons/github.svg'
    },
    {
      platform: 'Twitter',
      username: '我的动态',
      url: 'https://twitter.com',
      icon: '/icons/twitter.svg'
    },
    {
      platform: '个人博客',
      username: '我的想法',
      url: 'https://example.com',
      icon: '/icons/blog.svg'
    },
    {
      platform: '邮箱联系',
      username: '保持联系',
      url: 'mailto:hello@example.com',
      icon: '/icons/mail.svg'
    },
  ]

  const projectInfo: ProjectInfo[] = [
    {
      name: 'TangPing Web App',
      description: '一个简洁优雅的个人空间应用',
      url: 'https://github.com/example/tangping-web-app',
      stars: 999
    }
  ]

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    // 更新document的class来应用主题
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleBgChange = (newBg: BgKind) => {
    setBgKind(newBg)
  }

  return (
    <div className="flex max-h-screen flex-col pt-6 md:pt-8">
      <div className="container mx-auto px-4 max-w-screen-sm md:max-w-none grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
        
        {/* 应用设置卡片 */}
        <div className="flex flex-col h-auto md:h-[calc(100vh-8rem)] w-full">
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-300 dark:border-zinc-600 p-4 md:p-6 shadow-lg mb-4 md:mb-6 w-full">
            <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-gray-900 dark:text-white">应用设置</h2>
            
            {/* 主题设置 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">主题模式</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    theme === 'light'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
                  }`}
                >
                  🌞 浅色模式
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    theme === 'dark'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
                  }`}
                >
                  🌙 深色模式
                </button>
              </div>
            </div>

            {/* 背景设置 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">背景样式</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBgChange('grid')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    bgKind === 'grid'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
                  }`}
                >
                  📊 网格
                </button>
                <button
                  onClick={() => handleBgChange('mini-grid')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    bgKind === 'mini-grid'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
                  }`}
                >
                  ⬜ 小网格
                </button>
                <button
                  onClick={() => handleBgChange('dot')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    bgKind === 'dot'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
                  }`}
                >
                  🔘 点状
                </button>
              </div>
            </div>

            {/* 应用信息 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">应用信息</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>版本：v1.0.0</p>
                <p>更新时间：{new Date().toLocaleDateString()}</p>
                <p>状态：运行正常 ✅</p>
              </div>
            </div>
          </div>
        </div>

        {/* 社交媒体和项目信息 */}
        <div className="flex flex-col h-auto md:h-[calc(100vh-8rem)] w-full">
          {/* 社交媒体账号卡片 */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-300 dark:border-zinc-600 p-4 md:p-6 shadow-lg mb-4 md:mb-6 w-full">
            <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-gray-900 dark:text-white">社交链接</h2>
            <div className="space-y-3 md:space-y-4">
              {socialLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-lg transition-colors border border-gray-200 dark:border-zinc-600"
                >
                  <div className="ml-3 md:ml-4">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm md:text-base">{link.platform}</h3>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{link.username}</p>
                  </div>
                  <div className="ml-auto">
                    <svg
                      className="w-4 h-4 md:w-5 md:h-5 text-gray-400 dark:text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* 项目信息卡片 */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-300 dark:border-zinc-600 p-4 md:p-6 shadow-lg w-full">
            <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-gray-900 dark:text-white">项目信息</h2>
            <div className="space-y-3 md:space-y-4">
              {projectInfo.map((project) => (
                <a
                  key={project.name}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-lg transition-colors border border-gray-200 dark:border-zinc-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-blue-500 dark:text-blue-400 text-sm md:text-base">{project.name}</h3>
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs md:text-sm">
                      ⭐ 关注项目
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">{project.description}</p>
                </a>
              ))}
            </div>
            
            {/* 使用说明 */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">使用提示</h3>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                欢迎使用躺平空间！这是一个现代化的个人空间应用，支持主题切换和背景定制。您可以在这里享受简洁优雅的数字生活体验。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingView