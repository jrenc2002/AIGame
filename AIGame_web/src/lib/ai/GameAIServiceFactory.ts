import { WerewolfAIService } from './WerewolfAIService'
import { BaseAIService, AIServiceConfig } from './BaseAIService'

// 支持的游戏类型
export type GameType = 'werewolf' | 'cricket' | 'poker' | 'mahjong'

// 游戏AI服务工厂
export class GameAIServiceFactory {
  private static instances: Map<GameType, BaseAIService> = new Map()

  /**
   * 创建或获取指定游戏的AI服务实例
   */
  static getGameAIService(
    gameType: GameType, 
    config?: Partial<AIServiceConfig>
  ): BaseAIService {
    // 检查是否已有实例
    let instance = this.instances.get(gameType)
    
    if (!instance) {
      instance = this.createGameAIService(gameType, config)
      this.instances.set(gameType, instance)
    }
    
    return instance
  }

  /**
   * 创建指定游戏类型的AI服务
   */
  private static createGameAIService(
    gameType: GameType,
    config?: Partial<AIServiceConfig>
  ): BaseAIService {
    switch (gameType) {
      case 'werewolf':
        return new WerewolfAIService(config)
      
      case 'cricket':
        // TODO: 实现赛博板球AI服务
        return new WerewolfAIService(config) // 临时使用狼人杀服务
      
      case 'poker':
        // TODO: 实现扑克游戏AI服务
        return new WerewolfAIService(config) // 临时使用狼人杀服务
      
      case 'mahjong':
        // TODO: 实现麻将游戏AI服务
        return new WerewolfAIService(config) // 临时使用狼人杀服务
      
      default:
        throw new Error(`不支持的游戏类型: ${gameType}`)
    }
  }

  /**
   * 刷新所有AI服务配置
   */
  static refreshAllConfigurations(): void {
    this.instances.forEach(instance => {
      instance.refreshConfiguration()
    })
  }

  /**
   * 清除所有AI服务实例
   */
  static clearInstances(): void {
    this.instances.clear()
  }

  /**
   * 检查指定游戏类型的AI服务是否可用
   */
  static isGameAIAvailable(gameType: GameType): boolean {
    try {
      const service = this.getGameAIService(gameType)
      return service.isAIEnabled()
    } catch (error) {
      console.error(`检查游戏AI可用性失败 (${gameType}):`, error)
      return false
    }
  }
} 