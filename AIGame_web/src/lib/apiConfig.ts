// 统一的API配置管理中心
export interface APIConfig {
  openaiApiKey: string
  openaiModel: string
  openaiBaseUrl: string
  qianfanApiKey?: string
  qianfanSecretKey?: string
  localApiUrl?: string
  enabled: boolean
  maxTokens: number
  temperature: number
}

// 默认配置（不包含任何敏感信息）
const DEFAULT_CONFIG: APIConfig = {
  openaiApiKey: '',
  openaiModel: 'deepseek-r1',
  openaiBaseUrl: 'https://api.openai-next.com/v1',
  qianfanApiKey: '',
  qianfanSecretKey: '',
  localApiUrl: 'http://localhost:8000',
  enabled: true,
  maxTokens: 2000,
  temperature: 0.7
}

// 验证API密钥是否有效（仅包含ASCII字符且格式正确）
function isValidApiKey(apiKey: string, provider: 'openai' | 'qianfan' = 'openai'): boolean {
  if (!apiKey) {
    throw new Error(`${provider} API密钥为空或未配置`)
  }
  
  // 检查长度
  if (apiKey.length < 10) {
    throw new Error(`${provider} API密钥长度不足，请检查配置`)
  }
  
  // 检查是否包含非ASCII字符（中文等）
  // eslint-disable-next-line no-control-regex
  const asciiRegex = /^[\x00-\x7F]*$/
  if (!asciiRegex.test(apiKey)) {
    throw new Error(`${provider} API密钥包含非ASCII字符，请检查配置`)
  }
  
  // 根据提供商检查格式
  if (provider === 'openai') {
    if (!apiKey.startsWith('sk-')) {
      throw new Error('OpenAI API密钥格式不正确，应以sk-开头')
    }
  }
  
  return true
}

// 从localStorage读取配置
function getLocalConfig(): Partial<APIConfig> {
  try {
    const saved = localStorage.getItem('api_config')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.warn('读取本地API配置失败:', e)
  }
  return {}
}

// 统一的配置获取函数 - 只从localStorage读取，不依赖环境变量
export const getAPIConfig = (throwOnMissing: boolean = true): APIConfig => {
  const localConfig = getLocalConfig()
  
  // 合并配置：localStorage > 默认值
  const config: APIConfig = {
    ...DEFAULT_CONFIG,
    ...localConfig
  }

  // 如果没有API密钥且要求抛出错误，则抛出错误
  if (!config.openaiApiKey && throwOnMissing) {
    throw new Error('未配置OpenAI API密钥！请在设置页面配置有效的API密钥')
  }

  // 只有在有API密钥时才验证
  if (config.openaiApiKey && throwOnMissing) {
    isValidApiKey(config.openaiApiKey, 'openai')
  }

  return config
}

// 获取有效的API密钥 - 现在只从localStorage读取
export const getValidAPIKey = (provider: 'openai' | 'qianfan' = 'openai'): string => {
  const config = getAPIConfig()
  
  switch (provider) {
    case 'openai':
      if (!config.openaiApiKey) {
        throw new Error('OpenAI API密钥未配置，请在设置页面配置')
      }
      isValidApiKey(config.openaiApiKey, 'openai')
      return config.openaiApiKey
    case 'qianfan':
      if (!config.qianfanApiKey) {
        throw new Error('千帆API密钥未配置')
      }
      isValidApiKey(config.qianfanApiKey, 'qianfan')
      return config.qianfanApiKey
    default:
      throw new Error(`不支持的AI提供商: ${provider}`)
  }
}

// 检查是否有有效的API配置
export const hasValidAPIConfig = (provider: 'openai' | 'qianfan' | 'local' = 'openai'): boolean => {
  if (provider === 'local') {
    throw new Error('本地模式暂不支持，请使用OpenAI或千帆API')
  }
  
  getValidAPIKey(provider)
  return true
}

// 保存配置到localStorage - 直接保存，不依赖现有配置
export const saveAPIConfig = (config: Partial<APIConfig>): void => {
  // 获取当前配置（不抛出错误）
  const currentConfig = getAPIConfig(false)
  const newConfig = { ...currentConfig, ...config }
  
  // 如果有API密钥，立即验证
  if (newConfig.openaiApiKey) {
    isValidApiKey(newConfig.openaiApiKey, 'openai')
  }
  
  localStorage.setItem('api_config', JSON.stringify(newConfig))
  console.log('✅ API配置保存成功')
}

// 清除本地配置
export const clearAPIConfig = (): void => {
  try {
    localStorage.removeItem('api_config')
    console.log('✅ API配置已清除')
  } catch (e) {
    console.error('❌ 清除API配置失败:', e)
    throw e
  }
}

// 检查是否有配置
export const hasAPIConfig = (): boolean => {
  const config = getAPIConfig(false)
  return !!config.openaiApiKey
}

// 兼容旧的aiConfig接口
export type AIConfig = APIConfig
export const getAIConfig = getAPIConfig 