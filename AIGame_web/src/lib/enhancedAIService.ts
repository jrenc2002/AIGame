// 增强的AI狼人杀服务
// 整合LLM-Werewolf项目的专业AI能力

import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { getAIConfig, validateAIConfig } from './aiConfig'
import { Player, GameState, GamePhase, RoleType, NightAction } from '@/store/werewolf/types'
import { 
  buildWerewolfPrompt, 
  buildDecisionPrompt, 
  buildNightActionPrompt,
  parseAIResponse,
  WEREWOLF_SYSTEM_PROMPT 
} from './werewolfPrompts'

// AI 增强决策结果
export interface EnhancedAIDecision {
  action: 'vote' | 'kill' | 'check' | 'save' | 'poison' | 'guard' | 'shoot'
  target?: string
  reasoning: string
  confidence: number
  message: string
  emotion: 'neutral' | 'suspicious' | 'defensive' | 'aggressive' | 'confident'
  strategicValue: number // 战略价值评分 0-1
  riskLevel: number // 风险等级 0-1
}

// AI 发言结果增强版
export interface EnhancedAISpeech {
  message: string
  emotion: 'neutral' | 'suspicious' | 'defensive' | 'aggressive' | 'confident'
  confidence: number
  roleHint?: string // 可能暴露的角色信息
  suspiciousness: number // 可疑度 0-1
  persuasiveness: number // 说服力 0-1
}

// 夜晚行动结果
export interface NightActionResult {
  playerId: string
  action: 'kill' | 'check' | 'save' | 'poison' | 'guard'
  target?: string
  result?: any // 行动结果（如预言家查验结果）
  success: boolean
}

class EnhancedAIWerewolfService {
  private config: any
  private isConfigValid: boolean = false

  constructor() {
    this.config = getAIConfig()
    this.isConfigValid = validateAIConfig(this.config)
  }

  /**
   * 生成高质量的AI角色发言
   * 整合LLM-Werewolf的专业规则和角色扮演
   */
  async generateEnhancedAISpeech(
    player: Player,
    gameState: GameState,
    context: string = ''
  ): Promise<EnhancedAISpeech> {
    const hasRealAPI = this.hasValidAPIKey()
    
    if (!this.isConfigValid || !hasRealAPI) {
      return this.getIntelligentFallbackSpeech(player, gameState, context)
    }

    try {
      const prompt = buildWerewolfPrompt(player, gameState, context)
      
      const { text } = await generateText({
        model: openai(this.config.openaiModel, {
          apiKey: this.config.openaiApiKey,
          baseURL: this.config.openaiBaseUrl,
        }),
        prompt: prompt + '\n\n请用以下格式回复：\nMESSAGE: [发言内容]\nEMOTION: [情感]\nCONFIDENCE: [置信度]',
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      })

      return this.parseEnhancedSpeechResponse(text, player, gameState)
    } catch (error) {
      console.error('增强AI发言生成失败:', error)
      return this.getIntelligentFallbackSpeech(player, gameState, context)
    }
  }

  /**
   * 生成专业级AI决策
   * 采用LLM-Werewolf的决策逻辑
   */
  async generateEnhancedAIDecision(
    player: Player,
    gameState: GameState,
    availableTargets: Player[],
    actionType: 'vote' | 'kill' | 'check' | 'save' | 'poison' | 'guard' | 'shoot'
  ): Promise<EnhancedAIDecision> {
    const hasRealAPI = this.hasValidAPIKey()
    
    if (!this.isConfigValid || !hasRealAPI) {
      return this.getIntelligentFallbackDecision(player, gameState, availableTargets, actionType)
    }

    try {
      const prompt = buildDecisionPrompt(player, gameState, availableTargets, actionType)
      
      const { text } = await generateText({
        model: openai(this.config.openaiModel, {
          apiKey: this.config.openaiApiKey,
          baseURL: this.config.openaiBaseUrl,
        }),
        prompt,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      })

      return this.parseEnhancedDecisionResponse(text, availableTargets, actionType, player, gameState)
    } catch (error) {
      console.error('增强AI决策生成失败:', error)
      return this.getIntelligentFallbackDecision(player, gameState, availableTargets, actionType)
    }
  }

  /**
   * 处理夜晚行动
   * 实现LLM-Werewolf的夜晚行动机制
   */
  async processNightActions(gameState: GameState): Promise<NightActionResult[]> {
    const results: NightActionResult[] = []
    const alivePlayers = gameState.players.filter(p => p.status === 'alive')
    
    // 狼人行动
    const werewolves = alivePlayers.filter(p => p.role === 'werewolf')
    if (werewolves.length > 0) {
      const killResult = await this.processWerewolfKill(werewolves, gameState)
      if (killResult) results.push(killResult)
    }

    // 预言家查验
    const seer = alivePlayers.find(p => p.role === 'seer')
    if (seer) {
      const checkResult = await this.processSeerCheck(seer, gameState)
      if (checkResult) results.push(checkResult)
    }

    // 女巫行动
    const witch = alivePlayers.find(p => p.role === 'witch')
    if (witch) {
      const witchResult = await this.processWitchAction(witch, gameState, results)
      if (witchResult) results.push(witchResult)
    }

    // 守卫行动
    const guard = alivePlayers.find(p => p.role === 'guard')
    if (guard) {
      const guardResult = await this.processGuardAction(guard, gameState)
      if (guardResult) results.push(guardResult)
    }

    return results
  }

  /**
   * 生成专业的角色跳出发言
   * 实现LLM-Werewolf的角色跳出机制
   */
  async generateRoleRevealSpeech(
    player: Player,
    gameState: GameState,
    roleToReveal: RoleType,
    information?: any
  ): Promise<EnhancedAISpeech> {
    const context = this.buildRoleRevealContext(player, roleToReveal, information)
    const prompt = buildWerewolfPrompt(player, gameState, context)
    
    const hasRealAPI = this.hasValidAPIKey()
    
    if (!this.isConfigValid || !hasRealAPI) {
      return this.getFallbackRoleRevealSpeech(player, roleToReveal, information)
    }

    try {
      const { text } = await generateText({
        model: openai(this.config.openaiModel, {
          apiKey: this.config.openaiApiKey,
          baseURL: this.config.openaiBaseUrl,
        }),
        prompt: prompt + '\n\n请跳出身份并报告信息，格式：\nMESSAGE: [跳身份的发言]\nEMOTION: [情感]\nCONFIDENCE: [置信度]',
        maxTokens: this.config.maxTokens,
        temperature: 0.8, // 稍微降低随机性，确保跳身份的准确性
      })

      return this.parseEnhancedSpeechResponse(text, player, gameState)
    } catch (error) {
      console.error('角色跳出发言生成失败:', error)
      return this.getFallbackRoleRevealSpeech(player, roleToReveal, information)
    }
  }

  // =============== 私有方法 ===============

  private hasValidAPIKey(): boolean {
    return this.config.openaiApiKey !== 'fallback_ai_mode' && 
           this.config.openaiApiKey !== 'your_openai_api_key_here' && 
           this.config.openaiApiKey.length > 10
  }

  private parseEnhancedSpeechResponse(
    response: string, 
    player: Player, 
    gameState: GameState
  ): EnhancedAISpeech {
    const parsed = parseAIResponse(response)
    
    return {
      message: parsed.message || this.generateFallbackMessage(player, gameState),
      emotion: (parsed.emotion as any) || 'neutral',
      confidence: parsed.confidence || 0.6,
      roleHint: this.extractRoleHint(parsed.message || '', player.role),
      suspiciousness: this.calculateSuspiciousness(parsed.message || '', player),
      persuasiveness: this.calculatePersuasiveness(parsed.message || '', player)
    }
  }

  private parseEnhancedDecisionResponse(
    response: string,
    availableTargets: Player[],
    actionType: string,
    player: Player,
    gameState: GameState
  ): EnhancedAIDecision {
    const parsed = parseAIResponse(response)
    
    const target = availableTargets.find(t => t.id === parsed.target)?.id || 
                   availableTargets[0]?.id
    
    return {
      action: actionType as any,
      target,
      reasoning: parsed.reasoning || '基于当前局势的判断',
      confidence: parsed.confidence || 0.6,
      message: parsed.message || '我做出了这个选择',
      emotion: (parsed.emotion as any) || 'neutral',
      strategicValue: this.calculateStrategicValue(target, player, gameState),
      riskLevel: this.calculateRiskLevel(target, player, gameState)
    }
  }

  private async processWerewolfKill(
    werewolves: Player[], 
    gameState: GameState
  ): Promise<NightActionResult | null> {
    const mainWerewolf = werewolves[0] // 主狼做决策
    const villagers = gameState.players.filter(p => 
      p.status === 'alive' && p.camp === 'villager'
    )
    
    if (villagers.length === 0) return null

    const decision = await this.generateEnhancedAIDecision(
      mainWerewolf,
      gameState,
      villagers,
      'kill'
    )

    return {
      playerId: mainWerewolf.id,
      action: 'kill',
      target: decision.target,
      success: true
    }
  }

  private async processSeerCheck(
    seer: Player, 
    gameState: GameState
  ): Promise<NightActionResult | null> {
    const targets = gameState.players.filter(p => 
      p.status === 'alive' && p.id !== seer.id
    )
    
    if (targets.length === 0) return null

    const decision = await this.generateEnhancedAIDecision(
      seer,
      gameState,
      targets,
      'check'
    )

    const target = targets.find(t => t.id === decision.target)
    const result = target ? (target.camp === 'werewolf' ? '狼人' : '好人') : '好人'

    return {
      playerId: seer.id,
      action: 'check',
      target: decision.target,
      result,
      success: true
    }
  }

  private async processWitchAction(
    witch: Player, 
    gameState: GameState,
    currentResults: NightActionResult[]
  ): Promise<NightActionResult | null> {
    // 女巫第一晚必须救人
    const killResult = currentResults.find(r => r.action === 'kill')
    
    if (killResult && killResult.target && gameState.currentRound === 1) {
      // 第一晚自动救人
      return {
        playerId: witch.id,
        action: 'save',
        target: killResult.target,
        success: true
      }
    }

    // 其他情况下的女巫行动（简化处理）
    return null
  }

  private async processGuardAction(
    guard: Player, 
    gameState: GameState
  ): Promise<NightActionResult | null> {
    const targets = gameState.players.filter(p => 
      p.status === 'alive' && p.id !== guard.id
    )
    
    if (targets.length === 0) return null

    const decision = await this.generateEnhancedAIDecision(
      guard,
      gameState,
      targets,
      'guard'
    )

    return {
      playerId: guard.id,
      action: 'guard',
      target: decision.target,
      success: true
    }
  }

  private buildRoleRevealContext(
    player: Player, 
    roleToReveal: RoleType, 
    information?: any
  ): string {
    const contexts = {
      seer: `你需要跳预言家身份并报告查验结果：${information || '暂无结果'}`,
      witch: `你需要跳女巫身份并报告药水使用情况：${information || '暂无使用'}`,
      hunter: `你需要跳猎人身份${information ? `并开枪射杀：${information}` : ''}`,
      guard: `你需要跳守卫身份并报告守护情况：${information || '暂无守护'}`
    }
    
    return contexts[roleToReveal as keyof typeof contexts] || '你需要跳出身份'
  }

  private extractRoleHint(message: string, actualRole: RoleType): string | undefined {
    const roleKeywords = {
      seer: ['查验', '预言', '金水', '查杀'],
      witch: ['救', '毒', '药水', '银水'],
      hunter: ['开枪', '猎人', '射杀'],
      guard: ['守护', '保护'],
      werewolf: ['同伴', '队友']
    }
    
    for (const [role, keywords] of Object.entries(roleKeywords)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return role
      }
    }
    
    return undefined
  }

  private calculateSuspiciousness(message: string, player: Player): number {
    let score = 0.5 // 基础可疑度
    
    // 发言内容分析
    if (message.includes('不是我') || message.includes('冤枉')) score += 0.1
    if (message.includes('相信我') || message.includes('发誓')) score += 0.1
    if (message.includes('狼人') && message.includes('找到')) score -= 0.1
    
    // 角色相关
    if (player.role === 'werewolf') score += 0.2
    
    return Math.max(0, Math.min(1, score))
  }

  private calculatePersuasiveness(message: string, player: Player): number {
    let score = 0.5 // 基础说服力
    
    // 发言质量分析
    if (message.length > 15) score += 0.1 // 详细发言
    if (message.includes('逻辑') || message.includes('分析')) score += 0.1
    if (message.includes('证据') || message.includes('理由')) score += 0.1
    
    // 性格影响
    if (player.aiPersonality === 'leader') score += 0.1
    if (player.aiPersonality === 'logical') score += 0.1
    
    return Math.max(0, Math.min(1, score))
  }

  private calculateStrategicValue(
    targetId: string | undefined, 
    player: Player, 
    gameState: GameState
  ): number {
    if (!targetId) return 0.5
    
    const target = gameState.players.find(p => p.id === targetId)
    if (!target) return 0.5
    
    let value = 0.5
    
    // 角色价值评估
    if (target.role === 'seer' || target.role === 'witch') value += 0.3
    if (target.role === 'werewolf' && player.camp === 'villager') value += 0.3
    if (target.role === 'villager') value += 0.1
    
    return Math.max(0, Math.min(1, value))
  }

  private calculateRiskLevel(
    targetId: string | undefined, 
    player: Player, 
    gameState: GameState
  ): number {
    if (!targetId) return 0.5
    
    let risk = 0.3 // 基础风险
    
    // 身份暴露风险
    if (player.role === 'werewolf') risk += 0.2
    
    // 投票风险
    if (gameState.currentPhase === 'day_voting') risk += 0.2
    
    return Math.max(0, Math.min(1, risk))
  }

  // =============== Fallback 方法 ===============

  private getIntelligentFallbackSpeech(
    player: Player, 
    gameState: GameState, 
    context: string
  ): EnhancedAISpeech {
    const personality = player.aiPersonality || 'logical'
    const phase = gameState.currentPhase
    
    let message = '我需要仔细观察情况...'
    let emotion: any = 'neutral'
    let confidence = 0.6
    
    // 根据阶段和角色生成fallback发言
    if (phase === 'day_discussion') {
      if (player.role === 'werewolf') {
        message = this.getWerewolfDiscussionMessage(personality)
        emotion = 'neutral'
      } else {
        message = this.getVillagerDiscussionMessage(personality)
        emotion = 'suspicious'
      }
    } else if (phase === 'day_voting') {
      message = this.getVotingMessage(personality)
      emotion = 'confident'
    }
    
    return {
      message,
      emotion,
      confidence,
      suspiciousness: player.role === 'werewolf' ? 0.6 : 0.4,
      persuasiveness: 0.5
    }
  }

  private getIntelligentFallbackDecision(
    player: Player,
    gameState: GameState,
    availableTargets: Player[],
    actionType: string
  ): EnhancedAIDecision {
    if (availableTargets.length === 0) {
      return {
        action: actionType as any,
        target: undefined,
        reasoning: '没有可选目标',
        confidence: 0.5,
        message: '无法做出选择',
        emotion: 'neutral',
        strategicValue: 0,
        riskLevel: 0.5
      }
    }

    let target: Player
    let reasoning: string
    let message: string

    // 智能目标选择
    if (player.camp === 'werewolf') {
      // 狼人优先攻击神职
      target = this.selectWerewolfTarget(availableTargets)
      reasoning = '选择威胁最大的目标'
      message = '基于战略考虑的选择'
    } else {
      // 村民随机选择可疑目标
      target = availableTargets[Math.floor(Math.random() * availableTargets.length)]
      reasoning = '基于推理和观察'
      message = `怀疑${target.name}的行为`
    }

    return {
      action: actionType as any,
      target: target.id,
      reasoning,
      confidence: 0.6,
      message,
      emotion: 'neutral',
      strategicValue: this.calculateStrategicValue(target.id, player, gameState),
      riskLevel: this.calculateRiskLevel(target.id, player, gameState)
    }
  }

  private getFallbackRoleRevealSpeech(
    player: Player,
    roleToReveal: RoleType,
    information?: any
  ): EnhancedAISpeech {
    const messages = {
      seer: `我是预言家！${information || '我需要报告查验结果'}`,
      witch: `我是女巫！${information || '我需要说明药水使用情况'}`,
      hunter: `我是猎人！${information ? `我要开枪带走${information}` : ''}`,
      guard: `我是守卫！${information || '我一直在保护大家'}`
    }
    
    return {
      message: messages[roleToReveal as keyof typeof messages] || '我跳身份！',
      emotion: 'confident',
      confidence: 0.8,
      suspiciousness: 0.3,
      persuasiveness: 0.7
    }
  }

  private selectWerewolfTarget(targets: Player[]): Player {
    // 优先级：预言家 > 女巫 > 猎人 > 守卫 > 村民
    const priority = { seer: 4, witch: 3, hunter: 2, guard: 1, villager: 0 }
    
    return targets.reduce((best, current) => {
      const currentPriority = priority[current.role as keyof typeof priority] ?? 0
      const bestPriority = priority[best.role as keyof typeof priority] ?? 0
      return currentPriority > bestPriority ? current : best
    })
  }

  private getWerewolfDiscussionMessage(personality: string): string {
    const messages = {
      logical: '从逻辑上分析，昨晚的死者很可疑',
      intuitive: '我感觉有人在隐瞒什么',
      aggressive: '必须找出真正的狼人！',
      conservative: '我们需要更多线索',
      leader: '大家跟我一起分析',
      follower: '我同意之前的分析'
    }
    return messages[personality as keyof typeof messages] || '需要仔细分析'
  }

  private getVillagerDiscussionMessage(personality: string): string {
    const messages = {
      logical: '根据发言逻辑，我怀疑某些人',
      intuitive: '直觉告诉我有人在说谎',
      aggressive: '肯定有狼人在伪装！',
      conservative: '现在下结论还太早',
      leader: '让我来总结一下线索',
      follower: '听听大家的想法'
    }
    return messages[personality as keyof typeof messages] || '继续观察分析'
  }

  private getVotingMessage(personality: string): string {
    const messages = {
      logical: '基于逻辑推理的选择',
      intuitive: '相信我的直觉',
      aggressive: '果断投票！',
      conservative: '慎重考虑的决定',
      leader: '跟我投票',
      follower: '支持主流选择'
    }
    return messages[personality as keyof typeof messages] || '我的投票选择'
  }

  private generateFallbackMessage(player: Player, gameState: GameState): string {
    const phase = gameState.currentPhase
    const personality = player.aiPersonality || 'logical'
    
    if (phase === 'preparation') return '游戏开始，让我们理性分析'
    if (phase === 'night') return '夜晚降临，保持警惕'
    if (phase === 'day_discussion') return this.getVillagerDiscussionMessage(personality)
    if (phase === 'day_voting') return this.getVotingMessage(personality)
    
    return '让我仔细思考...'
  }
}

// 导出增强AI服务实例
export const enhancedAIWerewolfService = new EnhancedAIWerewolfService()

// 保持向后兼容
export {
  type EnhancedAIDecision as AIDecisionResult,
  type EnhancedAISpeech as AISpeechResult
} 