// AI 配置文件
export interface AIConfig {
  openaiApiKey: string
  openaiModel: string
  openaiBaseUrl: string
  enabled: boolean
  maxTokens: number
  temperature: number
}

// 从环境变量和localStorage读取配置
export const getAIConfig = (): AIConfig => {
  // 先尝试从localStorage读取用户配置
  let localConfig: Partial<AIConfig> = {}
  try {
    const saved = localStorage.getItem('ai_config')
    if (saved) {
      localConfig = JSON.parse(saved)
    }
  } catch (e) {
    console.warn('读取本地AI配置失败:', e)
  }

  // 合并配置：localStorage > 环境变量 > 默认值
  return {
    openaiApiKey: localConfig.openaiApiKey || import.meta.env.VITE_OPENAI_API_KEY || 'sk-lmG7mcY1T1Eba1Gy77Aa4553538a4cAeAa8f1641C718C33c',
    openaiModel: localConfig.openaiModel || import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo',
    openaiBaseUrl: localConfig.openaiBaseUrl || import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai-next.com/v1',
    enabled: localConfig.enabled !== undefined ? localConfig.enabled : (import.meta.env.VITE_AI_ENABLED !== 'false'),
    maxTokens: localConfig.maxTokens || parseInt(import.meta.env.VITE_AI_MAX_TOKENS || '1000'),
    temperature: localConfig.temperature || parseFloat(import.meta.env.VITE_AI_TEMPERATURE || '0.7')
  }
}

// 验证配置是否有效
export const validateAIConfig = (config: AIConfig): boolean => {
  // 对于AI狼人杀游戏，AI应该始终可用
  // 即使没有真实的API密钥，我们也使用智能fallback
  return config.enabled
}

// 默认配置（当环境变量不可用时）
export const defaultAIConfig: AIConfig = {
  openaiApiKey: 'fallback_ai_mode',
  openaiModel: 'gpt-3.5-turbo',
  openaiBaseUrl: 'https://api.openai-next.com/v1',
  enabled: true, // AI狼人杀游戏默认启用AI
  maxTokens: 1000,
  temperature: 0.7
} 