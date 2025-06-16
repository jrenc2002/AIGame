import { CoreMessage } from 'ai'
import { BaseAIService, AIResponse, AIStreamResponse, AIServiceConfig } from './BaseAIService'
import { Player, GameState, RoleType, GamePhase } from '@/store/werewolf/types'
import { buildWerewolfPrompt, buildDecisionPrompt, parseAIResponse } from '../werewolfPrompts'

// 狼人杀AI决策结果
export interface WerewolfAIDecision {
  action: 'vote' | 'kill' | 'check' | 'save' | 'poison' | 'guard' | 'shoot' | 'discussion'
  target?: string
  reasoning: string
  confidence: number
  message: string
  emotion?: 'neutral' | 'suspicious' | 'defensive' | 'aggressive' | 'confident'
  strategicValue?: number
  riskLevel?: number
}

// 狼人杀AI发言结果
export interface WerewolfAISpeech {
  message: string
  emotion: 'neutral' | 'suspicious' | 'defensive' | 'aggressive' | 'confident'
  confidence: number
  roleHint?: string
  suspiciousness?: number
  persuasiveness?: number
}

// 游戏上下文构建器
export class WerewolfContextBuilder {
  /**
   * 构建狼人杀游戏的完整上下文
   */
  static buildGameContext(
    player: Player,
    gameState: GameState,
    additionalContext?: string
  ): CoreMessage[] {
    const messages: CoreMessage[] = []

    // 1. System消息 - 角色身份和游戏规则
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt(player, gameState)
    })

    // 2. 游戏历史消息 - 玩家发言和游戏事件
    const historyMessages = this.buildHistoryMessages(gameState)
    messages.push(...historyMessages)

    // 3. 当前状态消息 - 当前阶段和可用信息
    messages.push({
      role: 'user',
      content: this.buildCurrentStatePrompt(player, gameState, additionalContext)
    })

    return messages
  }

  /**
   * 构建系统提示词 - 告诉AI其身份和角色
   */
  private static buildSystemPrompt(player: Player, gameState: GameState): string {
    return buildWerewolfPrompt(player, gameState)
  }

  /**
   * 构建历史消息 - 统计玩家名称和说的话
   */
  private static buildHistoryMessages(gameState: GameState): CoreMessage[] {
    const messages: CoreMessage[] = []

    // 获取游戏日志中的发言记录 - 更新匹配规则
    const speechLogs = gameState.gameLogs.filter(log => 
      log.isPublic && (
        log.action.includes('💬') || 
        log.action.includes('发言:') ||
        (log.action.includes(':') && !log.action.includes('💀') && !log.action.includes('🗳️') && !log.action.includes('🔮') && !log.action.includes('🐺'))
      )
    ).slice(-10) // 最近10条发言

    if (speechLogs.length > 0) {
      const speechHistory = speechLogs.map(log => {
        // 提取玩家名称和发言内容
        let playerName = '未知玩家'
        let speech = log.action
        
        // 尝试从log中提取玩家名称和发言内容
        if (log.playerId) {
          const player = gameState.players.find(p => p.id === log.playerId)
          playerName = player?.name || '未知玩家'
        }
        
        // 清理发言内容
        if (speech.includes('💬')) {
          speech = speech.replace('💬', '').trim()
          const parts = speech.split(':')
          if (parts.length >= 2) {
            playerName = parts[0].trim()
            speech = parts.slice(1).join(':').trim()
          }
        } else if (speech.includes('发言:')) {
          speech = speech.replace('发言:', '').trim()
        }
        
        return `${playerName}: ${speech}`
      }).join('\n')

      messages.push({
        role: 'user',
        content: `以下是最近的发言记录：\n${speechHistory}`
      })
    }

    // 添加游戏重要事件 - 更新匹配规则
    const importantEvents = gameState.gameLogs.filter(log =>
      log.isPublic && (
        log.action.includes('💀') ||          // 死亡事件
        log.action.includes('被杀死') ||      
        log.action.includes('出局') ||        // 投票出局
        log.action.includes('🗳️') ||          // 投票相关
        log.action.includes('投票') ||
        log.action.includes('🔮') ||          // 预言家查验
        log.action.includes('💊') ||          // 女巫行动
        log.action.includes('☠️') ||          // 毒杀
        log.action.includes('🛡️') ||          // 守卫保护
        log.action.includes('🔫') ||          // 猎人开枪
        log.action.includes('技能') ||
        log.action.includes('夜晚') ||
        log.action.includes('平安夜')
      )
    ).slice(-8) // 最近8个重要事件

    if (importantEvents.length > 0) {
      const eventHistory = importantEvents.map(log => 
        `第${log.round}轮 ${this.formatPhase(log.phase)}: ${log.action}`
      ).join('\n')

      messages.push({
        role: 'user',
        content: `重要游戏事件：\n${eventHistory}`
      })
    }

    return messages
  }

  /**
   * 格式化游戏阶段名称
   */
  private static formatPhase(phase: string): string {
    const phaseMap: Record<string, string> = {
      'preparation': '准备',
      'night': '夜晚',
      'day_discussion': '讨论',
      'day_voting': '投票',
      'game_over': '结束'
    }
    return phaseMap[phase] || phase
  }

  /**
   * 构建当前状态提示词
   */
  private static buildCurrentStatePrompt(
    player: Player,
    gameState: GameState,
    additionalContext?: string
  ): string {
    const alivePlayers = gameState.players.filter(p => p.status === 'alive')
    const deadPlayers = gameState.players.filter(p => p.status === 'dead')
    
    let prompt = `当前游戏状态分析：
- 你是：${player.name}（${player.role}）
- 第${gameState.currentRound}轮，${gameState.currentPhase}阶段
- 存活玩家：${alivePlayers.map(p => `${p.name}(${p.camp})`).join(', ')}
- 死亡玩家：${deadPlayers.map(p => `${p.name}(${p.role})`).join(', ')}`

    // 根据游戏阶段添加特定信息
    switch (gameState.currentPhase) {
      case 'night':
        prompt += '\n请根据你的角色执行夜晚行动。'
        break
      case 'day_discussion':
        prompt += '\n请分析局势并发表你的观点。'
        break
      case 'day_voting':
        prompt += '\n请选择你要投票的目标并说明理由。'
        break
    }

    if (additionalContext) {
      prompt += `\n\n额外信息：${additionalContext}`
    }

    return prompt
  }
}

// 狼人杀AI服务
export class WerewolfAIService extends BaseAIService {
  constructor(config?: Partial<AIServiceConfig>) {
    super({
      ...config,
      temperature: 0.8, // 狼人杀需要更多创意
      maxTokens: 800    // 适中的回复长度
    })
  }

  /**
   * 生成AI发言（非流式）
   */
  async generateSpeech(
    player: Player,
    gameState: GameState,
    context: string = ''
  ): Promise<WerewolfAISpeech> {
    if (!this.isAIEnabled()) {
      throw new Error('AI服务不可用，请配置有效的OpenAI API Key')
    }

    const messages = WerewolfContextBuilder.buildGameContext(player, gameState, context)
    const response = await this.generateResponse(messages)
    
    return this.parseSpeechResponse(response)
  }

  /**
   * 生成AI发言（流式）
   */
  async *generateSpeechStream(
    player: Player,
    gameState: GameState,
    context: string = ''
  ): AsyncGenerator<WerewolfAISpeech, void, unknown> {
    if (!this.isAIEnabled()) {
      throw new Error('AI服务不可用，请配置有效的OpenAI API Key')
    }

    const messages = WerewolfContextBuilder.buildGameContext(player, gameState, context)
    
    let accumulatedContent = ''
    
    for await (const chunk of this.generateStreamResponse(messages)) {
      accumulatedContent = chunk.content
      
      yield {
        message: chunk.content,
        emotion: this.extractEmotion(chunk.content),
        confidence: chunk.isComplete ? this.calculateConfidence(chunk.content) : 0.5,
        suspiciousness: this.calculateSuspiciousness(chunk.content),
        persuasiveness: this.calculatePersuasiveness(chunk.content)
      }
      
      if (chunk.isComplete) {
        break
      }
    }
  }

  /**
   * 生成AI决策
   */
  async generateDecision(
    player: Player,
    gameState: GameState,
    availableTargets: Player[],
    actionType: 'vote' | 'kill' | 'check' | 'save' | 'poison' | 'guard' | 'shoot'
  ): Promise<WerewolfAIDecision> {
    if (!this.isAIEnabled()) {
      throw new Error('AI服务不可用，请配置有效的OpenAI API Key')
    }

    const messages: CoreMessage[] = [
      {
        role: 'system',
        content: buildDecisionPrompt(player, gameState, availableTargets, actionType)
      },
      {
        role: 'user',
        content: `请选择${actionType}的目标，并说明理由。可选目标：${availableTargets.map(p => `${p.name}(${p.id})`).join(', ')}`
      }
    ]

    const response = await this.generateResponse(messages)
    return this.parseDecisionResponse(response, availableTargets, actionType)
  }

  /**
   * 解析AI发言响应
   */
  private parseSpeechResponse(response: AIResponse): WerewolfAISpeech {
    return {
      message: response.content.trim(),
      emotion: this.extractEmotion(response.content),
      confidence: response.confidence,
      suspiciousness: this.calculateSuspiciousness(response.content),
      persuasiveness: this.calculatePersuasiveness(response.content)
    }
  }

  /**
   * 解析AI决策响应
   */
  private parseDecisionResponse(
    response: AIResponse,
    availableTargets: Player[],
    actionType: string
  ): WerewolfAIDecision {
    const parsed = parseAIResponse(response.content)
    
    // 查找目标
    let target: string | undefined
    if (parsed.target) {
      const foundTarget = availableTargets.find(p => 
        p.name.includes(parsed.target!) || p.id === parsed.target
      )
      target = foundTarget?.id
    }
    
    // 如果没有找到有效目标，随机选择一个
    if (!target && availableTargets.length > 0) {
      target = availableTargets[Math.floor(Math.random() * availableTargets.length)].id
    }

    return {
      action: actionType as any,
      target,
      reasoning: parsed.reasoning || '基于当前局势的判断',
      confidence: response.confidence,
      message: parsed.message || response.content.trim(),
      emotion: this.extractEmotion(response.content),
      strategicValue: 0.7,
      riskLevel: 0.5
    }
  }

  /**
   * 提取情感
   */
  private extractEmotion(content: string): WerewolfAISpeech['emotion'] {
    if (/！|绝对|肯定|确信/.test(content)) return 'aggressive'
    if (/怀疑|觉得|可能是/.test(content)) return 'suspicious'
    if (/不是|没有|反对/.test(content)) return 'defensive'
    if (/明确|清楚|一定/.test(content)) return 'confident'
    return 'neutral'
  }

  /**
   * 计算可疑度
   */
  private calculateSuspiciousness(content: string): number {
    let suspiciousness = 0.5
    if (/狼人|可疑|怀疑/.test(content)) suspiciousness += 0.2
    if (/好人|相信|支持/.test(content)) suspiciousness -= 0.2
    return Math.max(0, Math.min(1, suspiciousness))
  }

  /**
   * 计算说服力
   */
  private calculatePersuasiveness(content: string): number {
    let persuasiveness = 0.5
    if (/因为|所以|分析|推理/.test(content)) persuasiveness += 0.2
    if (/可能|或许|不确定/.test(content)) persuasiveness -= 0.1
    if (content.length > 30) persuasiveness += 0.1
    return Math.max(0, Math.min(1, persuasiveness))
  }
} 