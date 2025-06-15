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

// 验证API密钥是否有效（仅包含ASCII字符且格式正确）
function isValidApiKey(apiKey: string, provider: 'openai' | 'qianfan' = 'openai'): boolean {
  if (!apiKey) return false
  
  // 检查是否为fallback模式或默认值
  if (apiKey === 'fallback_ai_mode' || 
      apiKey === 'your_openai_api_key_here' ||
      apiKey.length < 10) {
    return false
  }
  
  // 检查是否包含非ASCII字符（中文等）
  // eslint-disable-next-line no-control-regex
  const asciiRegex = /^[\x00-\x7F]*$/
  if (!asciiRegex.test(apiKey)) {
    console.warn('API密钥包含非ASCII字符，跳过API调用')
    return false
  }
  
  // 根据提供商检查格式
  if (provider === 'openai') {
    if (!apiKey.startsWith('sk-') && !apiKey.startsWith('sk_')) {
      console.warn('OpenAI API密钥格式不正确，应以sk-开头')
      return false
    }
  }
  
  return true
}

// 统一的配置获取函数
export const getAPIConfig = (): APIConfig => {
  // 先尝试从localStorage读取用户配置
  let localConfig: Partial<APIConfig> = {}
  try {
    const saved = localStorage.getItem('api_config')
    if (saved) {
      localConfig = JSON.parse(saved)
    }
  } catch (e) {
    console.warn('读取本地API配置失败:', e)
  }

  // 合并配置：localStorage > 环境变量 > 默认值
  const config: APIConfig = {
    openaiApiKey: localConfig.openaiApiKey || import.meta.env.VITE_OPENAI_API_KEY || 'fallback_ai_mode',
    openaiModel: localConfig.openaiModel || import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo',
    openaiBaseUrl: localConfig.openaiBaseUrl || import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai-next.com/v1',
    qianfanApiKey: localConfig.qianfanApiKey || import.meta.env.VITE_QIANFAN_AK,
    qianfanSecretKey: localConfig.qianfanSecretKey || import.meta.env.VITE_QIANFAN_SK,
    localApiUrl: localConfig.localApiUrl || import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:8000',
    enabled: localConfig.enabled !== undefined ? localConfig.enabled : (import.meta.env.VITE_AI_ENABLED !== 'false'),
    maxTokens: localConfig.maxTokens || parseInt(import.meta.env.VITE_AI_MAX_TOKENS || '1000'),
    temperature: localConfig.temperature || parseFloat(import.meta.env.VITE_AI_TEMPERATURE || '0.7')
  }

  return config
}

// 获取有效的API密钥
export const getValidAPIKey = (provider: 'openai' | 'qianfan' = 'openai'): string | null => {
  const config = getAPIConfig()
  
  switch (provider) {
    case 'openai':
      return isValidApiKey(config.openaiApiKey, 'openai') ? config.openaiApiKey : null
    case 'qianfan':
      return isValidApiKey(config.qianfanApiKey || '', 'qianfan') ? config.qianfanApiKey! : null
    default:
      return null
  }
}

// 检查是否有有效的API配置
export const hasValidAPIConfig = (provider: 'openai' | 'qianfan' | 'local' = 'openai'): boolean => {
  if (provider === 'local') {
    // 本地模型不需要API密钥验证
    return true
  }
  return getValidAPIKey(provider) !== null
}

// 保存配置到localStorage
export const saveAPIConfig = (config: Partial<APIConfig>): void => {
  try {
    const currentConfig = getAPIConfig()
    const newConfig = { ...currentConfig, ...config }
    localStorage.setItem('api_config', JSON.stringify(newConfig))
  } catch (e) {
    console.error('保存API配置失败:', e)
  }
}

// 清除本地配置
export const clearAPIConfig = (): void => {
  try {
    localStorage.removeItem('api_config')
  } catch (e) {
    console.error('清除API配置失败:', e)
  }
}

// 默认配置（当环境变量不可用时）
export const defaultAPIConfig: APIConfig = {
  openaiApiKey: 'fallback_ai_mode',
  openaiModel: 'gpt-3.5-turbo',
  openaiBaseUrl: 'https://api.openai-next.com/v1',
  enabled: true,
  maxTokens: 1000,
  temperature: 0.7
}

// 兼容旧的aiConfig接口
export interface AIConfig extends APIConfig {}
export const getAIConfig = getAPIConfig 