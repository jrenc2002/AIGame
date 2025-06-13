// AI 配置文件
export interface AIConfig {
  openaiApiKey: string
  openaiModel: string
  openaiBaseUrl: string
  enabled: boolean
  maxTokens: number
  temperature: number
}

// 从环境变量读取配置
export const getAIConfig = (): AIConfig => {
  return {
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || 'fallback_ai_mode',
    openaiModel: import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo',
    openaiBaseUrl: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai-next.com/v1',
    enabled: import.meta.env.VITE_AI_ENABLED !== 'false', // 默认启用，除非明确设置为false
    maxTokens: parseInt(import.meta.env.VITE_AI_MAX_TOKENS || '1000'),
    temperature: parseFloat(import.meta.env.VITE_AI_TEMPERATURE || '0.7')
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