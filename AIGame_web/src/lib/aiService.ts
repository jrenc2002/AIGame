import { WerewolfAIService, WerewolfAISpeech, WerewolfAIDecision } from './ai/WerewolfAIService'
import { getAPIConfig, getValidAPIKey, hasValidAPIConfig } from './apiConfig'
import { Player, GameState, GamePhase, RoleType, NightAction } from '@/store/werewolf/types'

// 兼容旧接口的类型别名
export type AIDecisionResult = WerewolfAIDecision
export type AISpeechResult = WerewolfAISpeech

// 夜晚行动结果
export interface NightActionResult {
  playerId: string
  action: 'kill' | 'check' | 'save' | 'poison' | 'guard'
  target?: string
  result?: any
  success: boolean
}

// AI游戏服务 - 重构为使用新的模块化AI服务
class AIGameService {
  private werewolfAI: WerewolfAIService
  private isConfigValid = false

  constructor() {
    this.werewolfAI = new WerewolfAIService()
    this.isConfigValid = hasValidAPIConfig('openai')
  }

  // 检查AI是否可用
  isAIEnabled(): boolean {
    return this.werewolfAI.isAIEnabled()
  }

  // 生成AI角色的发言
  async generateAISpeech(
    player: Player,
    gameState: GameState,
    context: string = ''
  ): Promise<AISpeechResult> {
    return await this.werewolfAI.generateSpeech(player, gameState, context)
  }

  // 生成AI角色的发言（流式）
  async *generateAISpeechStream(
    player: Player,
    gameState: GameState,
    context: string = ''
  ): AsyncGenerator<AISpeechResult, void, unknown> {
    for await (const speech of this.werewolfAI.generateSpeechStream(player, gameState, context)) {
      yield speech
    }
  }

  // 生成AI的游戏决策
  async generateAIDecision(
    player: Player,
    gameState: GameState,
    availableTargets: Player[],
    actionType: string = 'vote'
  ): Promise<AIDecisionResult> {
    return await this.werewolfAI.generateDecision(
      player, 
      gameState, 
      availableTargets, 
      actionType as any
    )
  }

  /**
   * 处理夜晚行动
   */
  async processNightActions(gameState: GameState): Promise<NightActionResult[]> {
    const results: NightActionResult[] = []
    const alivePlayers = gameState.players.filter(p => p.status === 'alive')
    
    // 狼人行动
    const werewolves = alivePlayers.filter(p => p.role === 'werewolf')
    if (werewolves.length > 0) {
      const availableTargets = gameState.players.filter(p => 
        p.status === 'alive' && p.camp !== 'werewolf'
      )
      
      if (availableTargets.length > 0) {
        const target = availableTargets[Math.floor(Math.random() * availableTargets.length)]
        results.push({
          playerId: werewolves[0].id,
          action: 'kill',
          target: target.id,
          success: true
        })
      }
    }

    return results
  }

  /**
   * 生成角色跳出发言
   */
  async generateRoleRevealSpeech(
    player: Player,
    gameState: GameState,
    roleToReveal: RoleType,
    information?: any
  ): Promise<AISpeechResult> {
    const roleNames: Record<RoleType, string> = {
      'seer': '预言家',
      'witch': '女巫',
      'hunter': '猎人',
      'guard': '守卫',
      'villager': '村民',
      'werewolf': '狼人',
      'alpha_wolf': '狼王'
    }
    
    const roleName = roleNames[roleToReveal] || '村民'
    let message = `我是${roleName}`
    
    if (roleToReveal === 'seer' && information) {
      message += `，昨晚查验了${information.target}，结果是${information.result === 'werewolf' ? '狼人' : '好人'}`
    } else if (roleToReveal === 'witch' && information) {
      message += `，昨晚${information.action === 'save' ? '救了人' : '毒了人'}`
    }
    
    return {
      message,
      emotion: 'confident',
      confidence: 0.9,
      suspiciousness: roleToReveal === 'werewolf' ? 0.9 : 0.3,
      persuasiveness: 0.8
    }
  }

  // 刷新AI配置
  refreshAIConfiguration(): void {
    this.werewolfAI.refreshConfiguration()
    this.isConfigValid = hasValidAPIConfig('openai')
  }
}

// 导出单例实例和增强服务别名
export const aiGameService = new AIGameService()
export const enhancedAIWerewolfService = aiGameService // 兼容别名 