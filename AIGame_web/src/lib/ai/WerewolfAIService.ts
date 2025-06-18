import { CoreMessage } from 'ai'
import { BaseAIService, AIResponse, AIServiceConfig } from './BaseAIService'
import { Player, GameState } from '@/store/werewolf/types'
import { buildWerewolfPrompt, buildDecisionPrompt } from '../werewolfPrompts'
import { RobustJSONParser } from './RobustJSONParser'

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
                log.action?.includes('💬') ||
        log.action?.includes('发言:') ||
        (log.action?.includes(':') && !log.action?.includes('💀') && !log.action?.includes('🗳️') && !log.action?.includes('🔮') && !log.action?.includes('🐺'))
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
        if (speech?.includes('💬')) {
          speech = speech.replace('💬', '').trim()
          const parts = speech.split(':')
          if (parts.length >= 2) {
            playerName = parts[0].trim()
            speech = parts.slice(1).join(':').trim()
          }
        } else if (speech?.includes('发言:')) {
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
                log.action?.includes('💀') ||          // 死亡事件
        log.action?.includes('被杀死') ||
        log.action?.includes('出局') ||        // 投票出局
        log.action?.includes('🗳️') ||          // 投票相关
        log.action?.includes('投票') ||
        log.action?.includes('🔮') ||          // 预言家查验
        log.action?.includes('💊') ||          // 女巫行动
        log.action?.includes('☠️') ||          // 毒杀
        log.action?.includes('🛡️') ||          // 守卫保护
        log.action?.includes('🔫') ||          // 猎人开枪
        log.action?.includes('技能') ||
        log.action?.includes('夜晚') ||
        log.action?.includes('平安夜')
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
    const alivePlayers = gameState.players.filter(p => p.status === 'active')
    const deadPlayers = gameState.players.filter(p => p.status === 'eliminated')
    
    let prompt = `当前游戏状态分析：
- 你是：${player.name}（${player.role}）
- 第${gameState.currentRound}轮，${gameState.currentPhase}阶段
- 存活玩家：${alivePlayers.map(p => `${p.name}(ID:${p.id})`).join(', ')}
- 死亡玩家：${deadPlayers.map(p => `${p.name}(ID:${p.id})`).join(', ')}

重要：你只知道自己的身份信息，其他玩家的身份需要通过游戏过程推断。`

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
      model: 'deepseek-r1',
      maxTokens: 2000,
      temperature: 0.8,
      ...config
    })
  }

  /**
   * 生成AI发言 - 必须返回有效的JSON格式
   */
  async generateSpeech(
    player: Player,
    gameState: GameState,
    context: string = ''
  ): Promise<WerewolfAISpeech> {
    console.log(`🗣️ 请求AI玩家 ${player.name} 发言`)
    
    const messages = WerewolfContextBuilder.buildGameContext(player, gameState, context)
    
    try {
      const response = await this.generateResponse(messages)
      console.log(`✅ 收到AI发言响应:`, response.content)
      return this.parseSpeechResponse(response)
    } catch (error) {
      console.error(`❌ AI发言生成失败:`, error)
      throw new Error(`AI发言生成失败: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  /**
   * 生成流式AI发言
   */
  async *generateSpeechStream(
    player: Player,
    gameState: GameState,
    context: string = ''
  ): AsyncGenerator<WerewolfAISpeech, void, unknown> {
    console.log(`🗣️ 请求AI玩家 ${player.name} 流式发言`)
    
    const messages = WerewolfContextBuilder.buildGameContext(player, gameState, context)
    
    try {
      let accumulatedContent = ''
      
      for await (const chunk of this.generateStreamResponse(messages)) {
        accumulatedContent = chunk.content
        
        if (chunk.isComplete) {
          console.log(`✅ AI流式发言完成:`, accumulatedContent)
          yield this.parseSpeechResponse({ 
            content: accumulatedContent, 
            confidence: 0.8 
          } as AIResponse)
        }
      }
    } catch (error) {
      console.error(`❌ AI流式发言生成失败:`, error)
      throw new Error(`AI流式发言生成失败: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  /**
   * 生成AI决策 - 必须返回有效的JSON格式
   */
  async generateDecision(
    player: Player,
    gameState: GameState,
    availableTargets: Player[],
    actionType: 'vote' | 'kill' | 'check' | 'save' | 'poison' | 'guard' | 'shoot'
  ): Promise<WerewolfAIDecision> {
    console.log(`🎯 请求AI玩家 ${player.name} 做出${actionType}决策`)
    
    const messages = WerewolfContextBuilder.buildGameContext(player, gameState)
    
    // 添加决策专用提示
    const decisionPrompt = buildDecisionPrompt(player, gameState, availableTargets, actionType)
    messages.push({
      role: 'user', 
      content: decisionPrompt
    })

    try {
      const response = await this.generateResponse(messages)
      console.log(`✅ 收到AI决策响应:`, response.content)
      return this.parseDecisionResponse(response, availableTargets, actionType)
    } catch (error) {
      console.error(`❌ AI决策生成失败:`, error)
      throw new Error(`AI决策生成失败: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  /**
   * 解析AI发言响应 - 必须成功解析或抛出错误
   */
  private parseSpeechResponse(response: AIResponse): WerewolfAISpeech {
    try {
      console.log('🔍 解析AI发言响应:', response.content)
      
      // 使用RobustJSONParser解析
      const parsed = RobustJSONParser.parse(response.content)
      
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('AI响应格式无效，不是有效的JSON对象')
      }

      // 验证必需字段
      if (!parsed.message || typeof parsed.message !== 'string') {
        throw new Error('AI响应缺少有效的message字段')
      }

      const result: WerewolfAISpeech = {
        message: parsed.message,
        emotion: this.extractEmotion(parsed.emotion || 'neutral'),
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
        roleHint: parsed.roleHint,
        suspiciousness: this.calculateSuspiciousness(parsed.message),
        persuasiveness: this.calculatePersuasiveness(parsed.message)
      }

      console.log('✅ AI发言解析成功:', result)
      return result
    } catch (error) {
      console.error('❌ AI发言响应解析失败:', error)
      throw new Error(`AI发言响应解析失败: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  /**
   * 解析AI决策响应 - 必须成功解析或抛出错误
   */
  private parseDecisionResponse(
    response: AIResponse,
    availableTargets: Player[],
    actionType: string
  ): WerewolfAIDecision {
    try {
      console.log('🔍 解析AI决策响应:', response.content)
      
      // 使用RobustJSONParser解析
      const parsed = RobustJSONParser.parse(response.content)
      
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('AI决策响应格式无效，不是有效的JSON对象')
      }

      // 验证目标有效性
      let target = parsed.target
      if (target && !availableTargets.some(t => t.id === target || t.name === target)) {
        // 尝试通过名称匹配
        const matchedTarget = availableTargets.find(t => t.name === target)
        if (matchedTarget) {
          target = matchedTarget.id
        } else {
          throw new Error(`AI选择的目标"${target}"不在可选列表中`)
        }
      }

      // 验证必需字段
      if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
        throw new Error('AI决策响应缺少有效的reasoning字段')
      }

      const result: WerewolfAIDecision = {
        action: actionType as any,
        target: target,
        reasoning: parsed.reasoning,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
        message: parsed.message || parsed.reasoning,
        emotion: this.extractEmotion(parsed.emotion || 'neutral'),
        strategicValue: parsed.strategicValue,
        riskLevel: parsed.riskLevel
      }

      console.log('✅ AI决策解析成功:', result)
      return result
    } catch (error) {
      console.error('❌ AI决策响应解析失败:', error)
      throw new Error(`AI决策响应解析失败: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  /**
   * 提取情感
   */
  private extractEmotion(content: string): WerewolfAISpeech['emotion'] {
    const emotionMap: Record<string, WerewolfAISpeech['emotion']> = {
      'suspicious': 'suspicious',
      'defensive': 'defensive', 
      'aggressive': 'aggressive',
      'confident': 'confident',
      'neutral': 'neutral'
    }
    
    return emotionMap[content] || 'neutral'
  }

  /**
   * 计算怀疑度
   */
  private calculateSuspiciousness(content: string): number {
    const suspiciousWords = ['怀疑', '可疑', '不信', '撒谎', '假的']
    const matches = suspiciousWords.filter(word => content.includes(word)).length
    return Math.min(matches * 0.3, 1.0)
  }

  /**
   * 计算说服力
   */
  private calculatePersuasiveness(content: string): number {
    const persuasiveWords = ['证据', '分析', '逻辑', '推理', '明显']
    const matches = persuasiveWords.filter(word => content.includes(word)).length
    return Math.min(0.5 + matches * 0.2, 1.0)
  }
} 