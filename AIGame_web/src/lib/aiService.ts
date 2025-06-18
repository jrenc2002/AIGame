import { WerewolfAIService } from './ai/WerewolfAIService'

/**
 * 导出单例的狼人杀AI服务实例
 * 所有游戏AI相关服务通过此实例访问
 */
export const werewolfAIService = new WerewolfAIService()

// 导出统一的接口名称 (向后兼容)
export const aiGameService = werewolfAIService 