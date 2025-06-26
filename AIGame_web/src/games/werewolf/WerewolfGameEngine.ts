import { GameEngine } from '../../core/game/GameEngine'
import { GamePhase, RoleType, NightAction, Vote, GameLog, PlayerSpeech, GameEventType, SpeechEmotion, GameState, Player, GameSettings } from '../../store/werewolf/types'
import { AIMessage, AIActionResponse } from '../../core/ai/AIClient'
import type { AIActionRequest } from '../../core/game/GameEngine'
import { WerewolfAIService } from '../../lib/ai/WerewolfAIService'
import { AILogger, LoggedAIRequest } from '../../lib/ai/AILogger'
import {
  WEREWOLF_SYSTEM_PROMPT,
  ROLE_SPECIFIC_PROMPTS,
  PERSONALITY_PROMPTS,
  buildWerewolfPrompt,
  buildDecisionPrompt,
  buildNightActionPrompt,
  buildVotingPrompt,
  buildSpeechPrompt,
  parseAIResponse,
  buildPreciseActionPrompt
} from '../../lib/werewolfPrompts'

// 扩展游戏状态以符合狼人杀需求，同时兼容基础GameEngine
export interface WerewolfGameState extends GameState {
  // 基础属性
  gameId: string
  isActive: boolean
  currentPhase: GamePhase
  currentRound: number
  players: WerewolfPlayer[]
  winner?: string
  
  // 狼人杀专用扩展属性
  nightActions: NightAction[]
  votes: Vote[]
  deadPlayers: WerewolfPlayer[]
  
  // 游戏状态标记
  isGameActive: boolean
  
  // 时间控制
  phaseStartTime: number
  phaseTimeLimit: number
  
  // 游戏日志 - 仅系统事件
  gameLogs: GameLog[]
  
  // 玩家发言记录
  playerSpeeches: PlayerSpeech[]
  
  // 游戏设置
  settings: GameSettings
  
  // 新增发言轮次管理字段
  currentSpeakerIndex?: number
  speakingOrder?: string[]
  discussionComplete?: boolean
  
  // AI请求错误记录
  aiRequestErrors?: any[]
}

// 扩展玩家接口以符合狼人杀需求，同时兼容基础Player
export interface WerewolfPlayer extends Player {
  // 基础属性继承自Player
  // 添加GamePlayer所需的isAI属性
  isAI: boolean
  // 额外狼人杀专用属性
  votesReceived: number
  hasVoted: boolean
  votedFor?: string
  hasUsedSkill: boolean
  isProtected: boolean
  isPoisoned: boolean
  isSaved: boolean
}

// 狼人杀游戏引擎
export class WerewolfGameEngine extends GameEngine<WerewolfGameState> {
  private phaseTimer: NodeJS.Timeout | null = null
  private taskCompletionTimer: NodeJS.Timeout | null = null
  private aiService: WerewolfAIService
  
  // 添加发言状态跟踪，防止重复发言
  private speakingInProgress: Set<string> = new Set()
  
  private readonly PHASE_DURATIONS = {
    preparation: 30,
    night: 120,
    day_discussion: 180,
    day_voting: 60,
    game_over: 0
  }

  // 任务完成标准
  private readonly PHASE_COMPLETION_CRITERIA = {
    preparation: () => this.isPreparationComplete(),
    night: () => this.isNightActionsComplete(),
    day_discussion: () => this.isDayDiscussionComplete(),
    day_voting: () => this.isVotingComplete()
  }

  constructor(initialState: WerewolfGameState) {
    super(initialState)
    this.aiService = new WerewolfAIService()
    this.setupGameFlow()
  }

  getGameName(): string {
    return 'werewolf'
  }

  async initializeGame(): Promise<void> {
    // 分配角色
    this.assignRoles()
    
    // 初始化AI客户端的怀疑度
    this.initializeSuspicionLevels()
    
    // 开始第一个阶段
    await this.transitionToPhase('preparation')
    
    console.log('🐺 狼人杀游戏初始化完成')
  }

  async processPlayerAction(playerId: string, action: any): Promise<void> {
    console.log(`🎮 处理玩家 ${playerId} 的行动:`, action)
    
    switch (action.type) {
      case 'night_action':
        await this.processNightAction(playerId, action)
        break
      case 'vote':
        await this.processVote(playerId, action.targetId)
        break
      case 'speak':
        // 白天讨论发言
        if (this.gameState.currentPhase === 'day_discussion') {
          await this.processSpeechTurn(playerId, action.content)
        }
        break
      case 'skip_speech':
        // 跳过当前发言者
        if (playerId === 'system' || playerId === this.getCurrentSpeaker()?.id) {
          await this.skipCurrentSpeaker()
        }
        break
      case 'end_discussion':
        // 强制结束讨论
        if (playerId === 'system') {
          await this.forceEndDiscussion()
        }
        break
      default:
        console.warn(`未知的行动类型: ${action.type}`)
    }
  }

  // 获取当前发言者
  private getCurrentSpeaker(): WerewolfPlayer | undefined {
    const currentState = this.gameState as any
    const { currentSpeakerIndex = 0, speakingOrder = [] } = currentState
    
    if (currentSpeakerIndex < speakingOrder.length) {
      const speakerId = speakingOrder[currentSpeakerIndex]
      return this.gameState.players.find(p => p.id === speakerId)
    }
    
    return undefined
  }

  // 强制推进阶段（供人类玩家使用）
  async forceAdvancePhase(playerId: string): Promise<void> {
    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player || !player.isPlayer) {
      console.warn('只有人类玩家可以推进阶段')
      return
    }

    console.log(`👤 玩家 ${player.name} 强制推进阶段: ${this.gameState.currentPhase}`)
    
    // 记录推进日志
    this.addGameLog('system_action', `${player.name} 选择推进到下一阶段`, player.id)

    // 强制完成当前阶段
    await this.handleTaskCompletion()
  }

  checkGameEnd(): string | null {
    const alivePlayers = this.gameState.players.filter(p => p.status === 'active')
    const aliveWerewolves = alivePlayers.filter(p => p.camp === 'werewolf')
    const aliveVillagers = alivePlayers.filter(p => p.camp === 'villager')

    if (aliveWerewolves.length === 0) {
      return 'villager'
    }
    
    if (aliveWerewolves.length >= aliveVillagers.length) {
      return 'werewolf'
    }
    
    return null
  }

  buildAIPrompt(request: AIActionRequest): AIMessage[] {
    const player = this.gameState.players.find(p => p.id === request.playerId)
    if (!player) {
      throw new Error(`Player ${request.playerId} not found`)
    }

    // 根据阶段选择不同的prompt构建方式
    let systemPrompt: string
    
    if (request.phase === 'night') {
      // 特殊处理女巫角色 - 使用新的行动格式
      if (player.role === 'witch') {
        // 女巫使用特殊的行动格式，直接传递availableActions
        systemPrompt = buildPreciseActionPrompt(
          player as any, 
          this.gameState as any, // 转换类型以兼容GameState
          request.availableActions as any, // 直接传递行动选项
          'poison', // actionType不重要，女巫有专门处理
          request.context
        )
      } else {
        // 其他角色：使用行动决策prompt，需要目标列表
        const availableTargets = this.gameState.players.filter(p => 
          request.availableActions.includes(p.id)
        )
        systemPrompt = buildNightActionPrompt(player as any, this.gameState as any, availableTargets)
      }
    } else if (request.phase === 'day_voting') {
      // 投票阶段：使用投票决策prompt
      const availableTargets = this.gameState.players.filter(p => 
        request.availableActions.includes(p.id)
      )
      systemPrompt = buildVotingPrompt(player as any, this.gameState, availableTargets)
    } else {
      // 其他阶段：使用通用发言prompt
      systemPrompt = buildSpeechPrompt(player as any, this.gameState, request.context)
    }
    
    return [
      { role: 'system', content: systemPrompt }
    ]
  }

  // 增强的AI请求方法，支持重试机制
  async requestAIActionWithRetry(request: AIActionRequest, maxRetries: number = 3): Promise<AIActionResponse> {
    const errorLogs: string[] = []
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 AI请求 - 玩家 ${request.playerId}, 尝试 ${attempt}/${maxRetries}`)
        errorLogs.push(`🤖 尝试 ${attempt}/${maxRetries} - 开始AI请求`)
        
        const aiClient = this.aiClients.get(request.playerId)
        if (!aiClient) {
          throw new Error(`AI客户端未找到: ${request.playerId}`)
        }

        const messages = this.buildAIPrompt(request)
        const response = await aiClient.chat(messages)
        
        console.log(`🔍 AI原始响应 (尝试 ${attempt}):`, response.content)
        errorLogs.push(`🔍 尝试 ${attempt} - AI原始响应: ${response.content.substring(0, 200)}...`)
        
        const parsedResponse = this.parseAIResponse(response.content, request)
        
        // 验证解析结果
        if (request.phase === 'night' || request.phase === 'day_voting') {
          if (!parsedResponse.action) {
            throw new Error(`AI响应缺少必要的目标选择。解析结果: ${JSON.stringify(parsedResponse)}`)
          }
          
          // 验证目标是否有效
          if (request.availableActions.length > 0 && !request.availableActions.includes(parsedResponse.action)) {
            throw new Error(`AI选择的目标"${parsedResponse.action}"不在可选列表中: ${request.availableActions.join(', ')}`)
          }
        }
        
        console.log(`✅ AI请求成功 (尝试 ${attempt}):`, {
          action: parsedResponse.action,
          reasoning: parsedResponse.reasoning
        })
        errorLogs.push(`✅ 尝试 ${attempt} - 成功！选择目标: ${parsedResponse.action}`)
        
        return parsedResponse
        
      } catch (error) {
        lastError = error as Error
        const errorMsg = error instanceof Error ? error.message : 'unknown error'
        console.warn(`⚠️ AI请求失败 (尝试 ${attempt}/${maxRetries}):`, errorMsg)
        errorLogs.push(`❌ 尝试 ${attempt} - 失败: ${errorMsg}`)
        
        // 如果不是最后一次尝试，等待一下再重试
        if (attempt < maxRetries) {
          const delayMs = 1000 * attempt
          errorLogs.push(`⏳ 等待 ${delayMs}ms 后重试...`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }
      }
    }
    
    // 所有重试都失败了，抛出包含详细信息的错误
    const detailedError = new Error(`AI请求完全失败: ${lastError?.message || '未知错误'}`)
    ;(detailedError as any).logs = errorLogs
    ;(detailedError as any).playerId = request.playerId
    ;(detailedError as any).phase = request.phase
    ;(detailedError as any).availableActions = request.availableActions
    ;(detailedError as any).originalRequest = request
    
    console.error(`❌ AI请求完全失败，抛出详细错误`, {
      playerId: request.playerId,
      phase: request.phase,
      logs: errorLogs
    })
    
    throw detailedError
  }

  // 使用重试机制的AI行动处理方法
  async processAIActionsWithRetry(requests: AIActionRequest[]): Promise<AIActionResponse[]> {
    console.log(`🚀 开始处理 ${requests.length} 个AI请求（支持重试）`)
    
    const responses: AIActionResponse[] = []
    const errors: any[] = []
    
    // 串行处理，避免并发请求导致的混乱
    for (const request of requests) {
      try {
        const response = await this.requestAIActionWithRetry(request, 3)
        responses.push(response)
      } catch (error) {
        console.error(`💥 AI请求最终失败:`, error)
        errors.push(error)
        
        // 发送失败事件给前端
        this.emitEvent('ai_request_failed', undefined, {
          error: error,
          playerId: (error as any).playerId,
          phase: (error as any).phase,
          logs: (error as any).logs,
          originalRequest: (error as any).originalRequest
        })
      }
    }
    
    console.log(`✅ 完成AI请求处理，成功 ${responses.length}/${requests.length}，失败 ${errors.length}`)
    
    // 如果有失败的请求，暂停游戏等待用户处理
    if (errors.length > 0) {
      console.log(`⏸️ 由于AI请求失败，暂停游戏进程`)
      this.updateGameState({ 
        isGameActive: false,
        aiRequestErrors: errors
      })
    }
    
    return responses
  }

  // 重试失败的AI请求
  async retryFailedAIRequest(originalRequest: AIActionRequest): Promise<AIActionResponse> {
    console.log(`🔄 重试失败的AI请求:`, originalRequest.playerId)
    
    try {
      const response = await this.requestAIActionWithRetry(originalRequest, 3)
      
      // 成功后恢复游戏
      this.updateGameState({ 
        isGameActive: true,
        aiRequestErrors: []
      })
      
      // 继续处理这个响应
      if (originalRequest.phase === 'night') {
        await this.processNightActionResponses([response], [originalRequest])
      } else if (originalRequest.phase === 'day_voting') {
        await this.processVoteResponses([response], [originalRequest])
      }
      
      // 检查是否可以进入下一阶段
      await this.handleTaskCompletion()
      
      return response
    } catch (error) {
      // 重试仍然失败，重新发送失败事件
      this.emitEvent('ai_request_failed', undefined, {
        error: error,
        playerId: (error as any).playerId,
        phase: (error as any).phase,
        logs: (error as any).logs,
        originalRequest: (error as any).originalRequest
      })
      throw error
    }
  }

  // 重写AI响应解析，使用现有的解析逻辑
  protected parseAIResponse(content: string, request: AIActionRequest): AIActionResponse {
    try {
      console.log(`🔍 解析AI响应 (${request.phase}):`, content)
      
      const parsed = parseAIResponse(content)
      
      if (!parsed) {
        throw new Error('AI响应解析失败，返回空结果')
      }
      
      // 对于讨论阶段，将完整内容作为发言内容
      if (request.phase === 'day_discussion') {
        if (!parsed.message && !content.trim()) {
          throw new Error('AI发言内容为空，请检查AI配置')
        }
        
        return {
          action: 'speak',
          reasoning: parsed.reasoning || '基于当前局势的分析',
          content: parsed.message || content.trim()
        } as any
      }
      
      // 对于夜晚行动和投票阶段，确保AI必须提供有效目标
      const targetId = parsed.target
      
      // ❌ 移除随机兜底：如果AI没有提供目标，直接报错
      if (!targetId) {
        throw new Error(`AI未提供目标选择。AI响应: ${JSON.stringify(parsed)}。这表明AI prompt可能需要优化，或者AI服务存在问题。`)
      }
      
      // 验证目标是否在可选列表中
      if (request.availableActions.length > 0 && !request.availableActions.includes(targetId)) {
        throw new Error(`AI选择的目标"${targetId}"不在可选列表中: ${request.availableActions.join(', ')}。AI响应: ${JSON.stringify(parsed)}`)
      }

      return {
        action: targetId, // 直接使用AI选择的目标ID
        reasoning: parsed.reasoning || '基于当前局势的判断',
        content: parsed.message || ''
      } as any
    } catch (error) {
      console.error(`❌ AI响应解析失败:`, error)
      
      // ❌ 移除随机兜底：直接抛出错误，让上层处理
      throw new Error(`AI响应解析失败: ${error instanceof Error ? error.message : 'unknown error'}。请检查AI配置或重试。`)
    }
  }

  // 阶段转换
  async transitionToPhase(phase: GamePhase): Promise<void> {
    // 清理之前的计时器
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
      this.phaseTimer = null
    }
    if (this.taskCompletionTimer) {
      clearTimeout(this.taskCompletionTimer)
      this.taskCompletionTimer = null
    }

    this.updateGameState({
      currentPhase: phase,
      phaseStartTime: Date.now(),
      phaseTimeLimit: this.PHASE_DURATIONS[phase]
    })

    // 执行阶段特定逻辑
    await this.executePhaseLogic(phase)

    // 启动任务完成检查
    this.startTaskCompletionCheck(phase)

    // 设置最大时间限制（兜底机制）
    const duration = this.PHASE_DURATIONS[phase]
    if (duration > 0) {
      this.phaseTimer = setTimeout(() => {
        console.log(`⏰ 阶段 ${phase} 超时，强制转换`)
        this.handlePhaseTimeout()
      }, duration * 1000)
    }

    // 记录阶段开始的系统事件
    this.addGameLog('phase_start', `${this.getPhaseDisplayName(phase)}阶段开始`)
    
    this.emitEvent('phase_changed', undefined, { phase, duration })
    console.log(`🎮 转换到阶段: ${phase}，持续 ${duration} 秒 (支持任务完成提前结束)`)
  }

  // 执行阶段特定逻辑
  private async executePhaseLogic(phase: GamePhase): Promise<void> {
    switch (phase) {
      case 'preparation':
        await this.handlePreparationPhase()
        break
      case 'night':
        await this.handleNightPhase()
        break
      case 'day_discussion':
        await this.handleDayDiscussionPhase()
        break
      case 'day_voting':
        await this.handleDayVotingPhase()
        break
      case 'game_over':
        await this.handleGameOverPhase()
        break
    }
  }

  // 准备阶段
  private async handlePreparationPhase(): Promise<void> {
    // 通知所有玩家游戏即将开始
    this.emitEvent('preparation_started')
  }

  // 夜晚阶段 - 分阶段执行：狼人->女巫->其他角色
  private async handleNightPhase(): Promise<void> {
    console.log('🌙 开始处理夜晚阶段')
    this.emitEvent('night_started')
    
    // 清空夜晚行动
    this.updateGameState({ nightActions: [] })
    
    // 获取需要行动的AI玩家
    const allPlayers = this.gameState.players
    const aiPlayers = allPlayers.filter(p => !p.isPlayer && p.status === 'active')
    
    console.log(`🌙 所有玩家(${allPlayers.length}):`, allPlayers.map(p => `${p.name}(${!p.isPlayer ? 'AI' : 'Human'}, ${p.role || 'unknown'}, ${p.status})`))
    console.log(`🌙 存活AI玩家(${aiPlayers.length}):`, aiPlayers.map(p => `${p.name}(${p.role})`))
    
    // 第一阶段：狼人杀人
    await this.handleWerewolfKillPhase(aiPlayers)
    
    // 第二阶段：女巫行动（基于狼人的杀人结果）
    await this.handleWitchActionPhase(aiPlayers)
    
    // 第三阶段：其他角色行动（预言家查验、守卫保护等）
    await this.handleOtherRolesPhase(aiPlayers)
    
    console.log('🌙 夜晚阶段所有行动完成')
  }

  // 第一阶段：狼人杀人
  private async handleWerewolfKillPhase(aiPlayers: WerewolfPlayer[]): Promise<void> {
    console.log('🐺 第一阶段：狼人杀人')
    
    const werewolves = aiPlayers.filter(p => p.role === 'werewolf')
    if (werewolves.length === 0) {
      console.log('🐺 没有存活的狼人，跳过杀人阶段')
      return
    }
    
    const actionRequests: AIActionRequest[] = []
    const alivePlayers = this.gameState.players.filter(p => p.status === 'active')
    
    for (const werewolf of werewolves) {
      // 狼人只能杀村民阵营
      const availableTargetIds = alivePlayers
        .filter(p => p.camp === 'villager')
        .map(p => p.id)
      
      console.log(`🐺 狼人${werewolf.name}可杀目标:`, availableTargetIds)
      
      if (availableTargetIds.length > 0) {
        actionRequests.push({
          gameId: this.gameState.gameId,
          playerId: werewolf.id,
          phase: 'night',
          round: this.gameState.currentRound,
          context: this.buildNightContext(werewolf),
          availableActions: availableTargetIds,
          gameState: this.gameState
        })
      }
    }
    
    if (actionRequests.length > 0) {
      console.log(`🐺 处理 ${actionRequests.length} 个狼人杀人请求`)
      try {
        const responses = await this.processAIActionsConcurrently(actionRequests, 2)
        await this.processWerewolfKillResponses(responses, actionRequests)
      } catch (error) {
        console.error('🐺 狼人杀人阶段失败:', error)
      }
    }
  }

  // 第二阶段：女巫行动（基于狼人的杀人结果）
  private async handleWitchActionPhase(aiPlayers: WerewolfPlayer[]): Promise<void> {
    console.log('💊 第二阶段：女巫行动')
    
    const witches = aiPlayers.filter(p => p.role === 'witch')
    if (witches.length === 0) {
      console.log('💊 没有存活的女巫，跳过女巫阶段')
      return
    }

    const actionRequests: AIActionRequest[] = []
    const alivePlayers = this.gameState.players.filter(p => p.status === 'active')
    
    // 查找当晚被狼人杀死的玩家
    const recentKills = this.gameState.nightActions
      .filter(a => 
        a.actionType === 'werewolf_kill' && 
        a.timestamp > this.gameState.phaseStartTime - 60000 // 1分钟内的杀人行动
      )
      .map(a => a.targetId)
      .filter(Boolean) as string[]

    for (const witch of witches) {
      // 女巫总是有行动可选，不需要检查getAvailableNightActions
      console.log(`💊 处理女巫${witch.name}的行动选择`)

      // 构建女巫的可选行动
      let availableActions: string[] = []
      
      // 如果女巫有救人药且当晚有人被杀，可以救人
      if (!witch.hasUsedSkill && recentKills.length > 0) {
        // 救人选项：为被杀的玩家添加"save_"前缀
        recentKills.forEach(killTargetId => {
          availableActions.push(`save_${killTargetId}`)
        })
      }
      
      // 女巫总是可以选择毒人（除了自己和已被杀的人）
      const poisonTargets = alivePlayers
        .filter(p => p.id !== witch.id && !recentKills.includes(p.id))
        .map(p => `poison_${p.id}`)
      
      availableActions.push(...poisonTargets)
      
      // 女巫也可以选择什么都不做
      availableActions.push('skip')
      
      console.log(`💊 女巫${witch.name}可选行动:`, availableActions)
      console.log(`💊 当晚被杀玩家:`, recentKills)
      
      if (availableActions.length > 0) {
        actionRequests.push({
          gameId: this.gameState.gameId,
          playerId: witch.id,
          phase: 'night',
          round: this.gameState.currentRound,
          context: this.buildWitchContext(witch, recentKills),
          availableActions: availableActions,
          gameState: this.gameState
        })
      }
    }

    if (actionRequests.length > 0) {
      console.log(`💊 处理 ${actionRequests.length} 个女巫行动请求`)
      try {
        const responses = await this.processAIActionsConcurrently(actionRequests, 2)
        await this.processWitchActionResponses(responses, actionRequests)
      } catch (error) {
        console.error('💊 女巫行动阶段失败:', error)
      }
    }
  }

  // 第三阶段：其他角色行动
  private async handleOtherRolesPhase(aiPlayers: WerewolfPlayer[]): Promise<void> {
    console.log('🔮 第三阶段：其他角色行动')
    
    const otherRoles = aiPlayers.filter(p => 
      p.role !== 'werewolf' && 
      p.role !== 'witch' && 
      p.role !== 'villager'
    )
    
    if (otherRoles.length === 0) {
      console.log('🔮 没有其他需要行动的角色，跳过')
      return
    }
    
    const actionRequests: AIActionRequest[] = []
    const alivePlayers = this.gameState.players.filter(p => p.status === 'active')
    
    for (const player of otherRoles) {
      const availableNightActions = this.getAvailableNightActions(player)
      if (availableNightActions.length === 0) {
        console.log(`🔮 ${player.name}(${player.role})没有可用行动，跳过`)
        continue
      }
      
      let availableTargetIds: string[] = []
      
      switch (player.role) {
        case 'seer':
          // 预言家可以查验除自己外的所有存活玩家
          availableTargetIds = alivePlayers
            .filter(p => p.id !== player.id)
            .map(p => p.id)
          console.log(`🔮 预言家${player.name}可查验目标:`, availableTargetIds)
          break
        case 'guard':
          // 守卫可以保护除自己外的所有存活玩家
          availableTargetIds = alivePlayers
            .filter(p => p.id !== player.id)
            .map(p => p.id)
          console.log(`🛡️ 守卫${player.name}可保护目标:`, availableTargetIds)
          break
        default:
          console.log(`🔮 未知角色${player.role}，跳过`)
          continue
      }
      
      if (availableTargetIds.length > 0) {
        actionRequests.push({
          gameId: this.gameState.gameId,
          playerId: player.id,
          phase: 'night',
          round: this.gameState.currentRound,
          context: this.buildNightContext(player),
          availableActions: availableTargetIds,
          gameState: this.gameState
        })
      }
    }
    
    if (actionRequests.length > 0) {
      console.log(`🔮 处理 ${actionRequests.length} 个其他角色行动请求`)
      try {
        const responses = await this.processAIActionsConcurrently(actionRequests, 2)
        await this.processOtherRolesResponses(responses, actionRequests)
      } catch (error) {
        console.error('🔮 其他角色行动阶段失败:', error)
      }
    }
  }

  // 白天讨论阶段
  private async handleDayDiscussionPhase(): Promise<void> {
    this.emitEvent('day_discussion_started')
    
    // 处理夜晚结果
    await this.resolveNightActions()
    
    // 检查游戏是否结束
    const winner = this.checkGameEnd()
    if (winner) {
      await this.endGame(winner)
      return
    }

    // AI玩家进行讨论
    await this.processAIDiscussion()
  }

  // 白天投票阶段
  private async handleDayVotingPhase(): Promise<void> {
    this.emitEvent('day_voting_started')
    
    // 清空投票
    this.updateGameState({ votes: [] })
    
    // 获取存活的AI玩家
    const aiPlayers = this.gameState.players.filter(p => !p.isPlayer && p.status === 'active')
    const voteRequests: AIActionRequest[] = []

    for (const player of aiPlayers) {
      const candidates = this.gameState.players.filter(p => 
        p.status === 'active' && p.id !== player.id
      )
      
      voteRequests.push({
        gameId: this.gameState.gameId,
        playerId: player.id,
        phase: 'day_voting',
        round: this.gameState.currentRound,
        context: this.buildVotingContext(player),
        availableActions: candidates.map(c => c.id),
        gameState: this.gameState
      })
    }

    // 处理AI投票
    if (voteRequests.length > 0) {
      try {
        const responses = await this.processAIActionsConcurrently(voteRequests, 3)
        await this.processVoteResponses(responses, voteRequests)
      } catch (error) {
        console.error('处理AI投票失败:', error)
      }
    }
  }

  // 游戏结束阶段
  private async handleGameOverPhase(): Promise<void> {
    const winner = this.checkGameEnd()
    
    // 添加游戏结束日志，包含所有玩家的角色身份信息
    this.addGameEndLog(winner)
    
    this.emitEvent('game_over', undefined, { winner })
  }

  // 添加游戏结束日志，公布所有玩家身份
  private addGameEndLog(winner: string | null): void {
    // 添加游戏结束系统日志
    const winnerText = winner === 'villager' ? '村民阵营' : winner === 'werewolf' ? '狼人阵营' : '平局'
    this.addGameLog('game_end', `🏆 游戏结束！${winnerText}获胜！`, undefined, undefined, { winner })
    
    // 公布所有玩家的身份信息
    this.addGameLog('system_action', '📋 身份公布：', undefined, undefined, {})
    
    // 按阵营分组显示玩家身份
    const villagerPlayers = this.gameState.players.filter(p => p.camp === 'villager')
    const werewolfPlayers = this.gameState.players.filter(p => p.camp === 'werewolf')
    
    // 显示村民阵营
    const villagerInfo = villagerPlayers.map(p => {
      const statusIcon = p.status === 'active' ? '✅' : '💀'
      const roleIcon = this.getRoleIcon(p.role)
      return `${statusIcon} ${p.name}: ${roleIcon}${this.getRoleName(p.role)}`
    }).join(', ')
    
    this.addGameLog('system_action', `🏘️ 村民阵营: ${villagerInfo}`, undefined, undefined, {
      camp: 'villager',
      players: villagerPlayers
    })
    
    // 显示狼人阵营
    const werewolfInfo = werewolfPlayers.map(p => {
      const statusIcon = p.status === 'active' ? '✅' : '💀'
      const roleIcon = this.getRoleIcon(p.role)
      return `${statusIcon} ${p.name}: ${roleIcon}${this.getRoleName(p.role)}`
    }).join(', ')
    
    this.addGameLog('system_action', `🐺 狼人阵营: ${werewolfInfo}`, undefined, undefined, {
      camp: 'werewolf', 
      players: werewolfPlayers
    })

    // 添加MVP信息（如果存在）
    const mvpPlayer = this.calculateMVP()
    if (mvpPlayer) {
      this.addGameLog('system_action', `🌟 本局MVP: ${mvpPlayer.name} (${this.getRoleName(mvpPlayer.role)})`, mvpPlayer.id, undefined, {
        mvp: mvpPlayer
      })
    }
  }

  // 获取角色图标
  private getRoleIcon(role: string): string {
    const roleIcons: Record<string, string> = {
      villager: '👨‍🌾',
      seer: '🔮',
      witch: '🧙‍♀️',
      hunter: '🏹',
      guard: '🛡️',
      werewolf: '🐺',
      alpha_wolf: '👑🐺'
    }
    return roleIcons[role] || '❓'
  }

  // 获取角色名称
  private getRoleName(role: string): string {
    const roleNames: Record<string, string> = {
      villager: '村民',
      seer: '预言家',
      witch: '女巫',
      hunter: '猎人',
      guard: '守卫',
      werewolf: '狼人',
      alpha_wolf: '狼王'
    }
    return roleNames[role] || '未知角色'
  }

  // 计算MVP（最佳玩家）
  private calculateMVP(): WerewolfPlayer | null {
    // 简单的MVP计算逻辑，可以根据需要扩展
    const alivePlayers = this.gameState.players.filter(p => p.status === 'active')
    
    // 如果游戏结束时还有存活的关键角色，优先选为MVP
    const keyRoles = ['seer', 'witch', 'hunter']
    const aliveKeyRoles = alivePlayers.filter(p => keyRoles.includes(p.role))
    
    if (aliveKeyRoles.length > 0) {
      return aliveKeyRoles[0]
    }
    
    // 否则随机选择一个存活玩家
    return alivePlayers.length > 0 ? alivePlayers[0] : null
  }

  // 阶段超时处理
  private async handlePhaseTimeout(): Promise<void> {
    const currentPhase = this.gameState.currentPhase
    
    switch (currentPhase) {
      case 'preparation':
        await this.transitionToPhase('night')
        break
      case 'night':
        await this.transitionToPhase('day_discussion')
        break
      case 'day_discussion':
        await this.transitionToPhase('day_voting')
        break
      case 'day_voting': {
        await this.resolveVoting()
        // 检查游戏是否结束
        const winner = this.checkGameEnd()
        if (winner) {
          await this.endGame(winner)
        } else {
          // 进入下一轮
          this.updateGameState({ currentRound: this.gameState.currentRound + 1 })
          await this.transitionToPhase('night')
        }
        break
      }
    }
  }

  // 角色分配
  private assignRoles(): void {
    const players = [...this.gameState.players]
    const totalPlayers = players.length
    
    // 固定角色配置（移除随机性）
    const roles: RoleType[] = []
    
    // 根据玩家数量分配角色（固定配置）
    if (totalPlayers >= 6) {
      // 标准配置：3狼人 + 1预言家 + 1女巫 + 其余村民
      roles.push('werewolf', 'werewolf', 'werewolf') // 3个狼人
      roles.push('seer') // 1个预言家
      roles.push('witch') // 1个女巫
      
      // 剩余位置分配村民
      for (let i = roles.length; i < totalPlayers; i++) {
        roles.push('villager')
      }
    } else {
      // 简化配置：适用于少量玩家
      roles.push('werewolf', 'werewolf') // 2个狼人
      roles.push('seer') // 1个预言家
      
      // 剩余位置分配村民
      for (let i = roles.length; i < totalPlayers; i++) {
        roles.push('villager')
      }
    }
    
    // ✅ 移除随机洗牌：按固定顺序分配角色
    // 前面的玩家分配特殊角色，后面的玩家分配村民
    // 这样确保角色分配是确定性的，而不是随机的
    
    // 分配给玩家（按玩家ID顺序分配）
    const sortedPlayers = [...players].sort((a, b) => a.id.localeCompare(b.id))
    sortedPlayers.forEach((player, index) => {
      const role = roles[index]
      player.role = role
      player.camp = role === 'werewolf' ? 'werewolf' : 'villager'
    })
    
    console.log('🎯 确定性角色分配完成:', sortedPlayers.map(p => `${p.name}: ${p.role}`).join(', '))
    
    this.updateGameState({ players: sortedPlayers })
  }

  // 初始化怀疑度
  private initializeSuspicionLevels(): void {
    const players = this.gameState.players.map(player => {
      if (player.isAI) {
        const suspicionLevels = new Map<string, number>()
        this.gameState.players.forEach(otherPlayer => {
          if (otherPlayer.id !== player.id) {
            suspicionLevels.set(otherPlayer.id, 0.5) // 初始中性怀疑度
          }
        })
        player.suspicionLevels = suspicionLevels
      }
      return player
    })
    
    this.updateGameState({ players })
  }

  // 获取可用的夜晚行动
  private getAvailableNightActions(player: WerewolfPlayer): string[] {
    const actions: string[] = []
    
    switch (player.role) {
      case 'werewolf':
        actions.push('kill')
        break
      case 'seer':
        actions.push('check')
        break
      case 'witch':
        // 女巫总是有行动可选：
        // 1. 如果还有解药，可以救人
        // 2. 总是可以毒人
        // 3. 总是可以跳过
        if (!player.hasUsedSkill) {
          actions.push('save')  // 有解药时可以救人
        }
        actions.push('poison')   // 总是可以毒人
        actions.push('skip')     // 总是可以跳过
        break
      case 'guard':
        actions.push('guard')
        break
    }
    
    return actions
  }

  // 构建夜晚上下文
  private buildNightContext(player: WerewolfPlayer): string {
    const alivePlayers = this.gameState.players.filter(p => p.status === 'active')
    
    // 根据角色获取可选目标
    let availableTargets: WerewolfPlayer[] = []
    let actionType: 'kill' | 'check' | 'save' | 'poison' | 'guard' = 'kill'
    
    switch (player.role) {
      case 'werewolf':
        // 狼人只能杀村民阵营
        availableTargets = alivePlayers.filter(p => p.camp === 'villager')
        actionType = 'kill'
        break
      case 'seer':
        // 预言家可以查验除自己外的所有存活玩家
        availableTargets = alivePlayers.filter(p => p.id !== player.id)
        actionType = 'check'
        break
      case 'witch':
        // 女巫行动：救人或毒人
        if (!player.hasUsedSkill) {
          // 如果女巫还没用过技能，优先救人（查找当晚被杀的玩家）
          const killedThisNight = this.gameState.nightActions
            .filter(a => a.actionType === 'werewolf_kill' && a.timestamp > this.gameState.phaseStartTime - 300000)
            .map(a => a.targetId)
            .map(id => this.gameState.players.find(p => p.id === id))
            .filter(p => p && p.status === 'eliminated') as WerewolfPlayer[]
          
          if (killedThisNight.length > 0) {
            // 有被杀的玩家，女巫可以救人
            availableTargets = killedThisNight
            actionType = 'save'
          } else {
            // 没有被杀的玩家，女巫可以毒人
            availableTargets = alivePlayers.filter(p => p.id !== player.id)
            actionType = 'poison'
          }
        } else {
          // 已经用过救人药，只能毒人
          availableTargets = alivePlayers.filter(p => p.id !== player.id)
          actionType = 'poison'
        }
        break
      case 'guard':
        // 守卫可以保护除自己外的所有存活玩家
        availableTargets = alivePlayers.filter(p => p.id !== player.id)
        actionType = 'guard'
        break
      default:
        availableTargets = []
    }

    // 使用决策专用提示词
    return buildDecisionPrompt(
      player as any, // 类型转换
      this.gameState as any, // 类型转换
      availableTargets as any[], // 类型转换
      actionType
    )
  }

  // 构建投票上下文
  private buildVotingContext(player: WerewolfPlayer): string {
    const alivePlayers = this.gameState.players.filter(p => p.status === 'active')
    return `投票阶段，请选择要投票出局的玩家。候选人：${alivePlayers.filter(p => p.id !== player.id).map(p => p.name).join(', ')}`
  }

  // 构建讨论上下文
  private buildDiscussionContext(player: WerewolfPlayer): string {
    const alivePlayers = this.gameState.players.filter(p => p.status === 'active')
    const deadPlayers = this.gameState.players.filter(p => p.status === 'eliminated')
    
    // 构建夜晚结果信息
    const nightResults = this.getNightResults()
    
    let context = `白天讨论阶段 - 第${this.gameState.currentRound}轮\n`
    context += `你是 ${player.name}，身份是 ${player.role}，阵营是 ${player.camp}\n`
    context += `存活玩家 (${alivePlayers.length}人): ${alivePlayers.map(p => p.name).join(', ')}\n`
    
    if (deadPlayers.length > 0) {
      context += `已出局玩家: ${deadPlayers.map(p => p.name).join(', ')}\n`
    }
    
    context += `重要：你只知道自己的身份信息，其他玩家的身份需要通过游戏过程推断。\n`
    
    if (nightResults) {
      context += `昨夜结果: ${nightResults}\n`
    }
    
    // 添加之前的发言内容（仅内容，不包含推理过程）
    const previousSpeeches = this.gameState.playerSpeeches.filter(speech => 
      speech.round === this.gameState.currentRound && 
      speech.phase === 'day_discussion' &&
      speech.isVisible
    )
    
    if (previousSpeeches.length > 0) {
      context += `\n之前的发言内容:\n`
      previousSpeeches.forEach(speech => {
        context += `${speech.playerName}: ${speech.content}\n`
      })
    }
    
    context += `\n请根据你的身份和已知信息进行发言，分析局势，表达怀疑或为自己辩护。发言要符合你的身份特点。`
    
    return context
  }

  // 获取夜晚结果信息
  private getNightResults(): string {
    const nightActions = this.gameState.nightActions.filter(a => 
      a.timestamp > this.gameState.phaseStartTime - 300000 // 最近5分钟的行动
    )
    
    const results: string[] = []
    
    // 查找死亡信息
    const killActions = nightActions.filter(a => a.actionType === 'werewolf_kill')
    if (killActions.length > 0) {
      const target = this.gameState.players.find(p => p.id === killActions[0].targetId)
      if (target && target.status === 'eliminated') {
        results.push(`${target.name} 被狼人杀害`)
      }
    }
    
    return results.length > 0 ? results.join(', ') : '昨夜平安无事'
  }

  // 添加系统事件日志
  private addGameLog(eventType: GameEventType, description: string, playerId?: string, targetId?: string, data?: any): void {
    const log: GameLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      round: this.gameState.currentRound,
      phase: this.gameState.currentPhase,
      eventType,
      description,
      playerId,
      targetId,
      timestamp: Date.now(),
      isPublic: true,
      data
    }
    
    const currentLogs = [...this.gameState.gameLogs, log]
    this.updateGameState({ gameLogs: currentLogs })
  }

  // 添加玩家发言记录
  private addPlayerSpeech(
    playerId: string, 
    content: string, 
    emotion: SpeechEmotion = 'neutral',
    reasoning?: string
  ): void {
    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player) return

    const speech: PlayerSpeech = {
      id: `speech_${Date.now()}_${playerId}`,
      playerId,
      playerName: player.name,
      content,
      emotion,
      round: this.gameState.currentRound,
      phase: this.gameState.currentPhase,
      timestamp: Date.now(),
      isAI: !player.isPlayer,
      reasoning,
      isVisible: true
    }
    
    const currentSpeeches = [...this.gameState.playerSpeeches, speech]
    this.updateGameState({ playerSpeeches: currentSpeeches })
  }

  // 获取阶段显示名称
  private getPhaseDisplayName(phase: GamePhase): string {
    switch (phase) {
      case 'preparation': return '准备'
      case 'night': return '夜晚'
      case 'day_discussion': return '白天讨论'
      case 'day_voting': return '白天投票'
      case 'game_over': return '游戏结束'
      default: return phase
    }
  }

  // 处理夜晚行动
  private async processNightAction(playerId: string, action: any): Promise<void> {
    const nightAction: NightAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      actionType: action.type,
      targetId: action.targetId,
      timestamp: Date.now()
    }
    
    const currentActions = [...this.gameState.nightActions, nightAction]
    this.updateGameState({ nightActions: currentActions })
  }

  // 处理投票
  private async processVote(playerId: string, targetId: string): Promise<void> {
    const vote: Vote = {
      id: `vote_${Date.now()}_${playerId}`,
      voterId: playerId,
      targetId,
      timestamp: Date.now()
    }
    
    const currentVotes = [...this.gameState.votes, vote]
    this.updateGameState({ votes: currentVotes })
    
    // 标记玩家已投票
    const players = this.gameState.players.map(p => 
      p.id === playerId ? { ...p, hasVoted: true, votedFor: targetId } : p
    )
    this.updateGameState({ players })
  }

  // 解决夜晚行动
  private async resolveNightActions(): Promise<void> {
    const actions = this.gameState.nightActions
    const players = [...this.gameState.players]
    const nightResults: string[] = []
    
    // 处理狼人击杀
    const killActions = actions.filter(a => a.actionType === 'werewolf_kill')
    if (killActions.length > 0) {
      const targetId = killActions[0].targetId
      if (targetId) {
        const targetIndex = players.findIndex(p => p.id === targetId)
        if (targetIndex !== -1) {
          players[targetIndex].status = 'eliminated'
          const target = players[targetIndex]
          nightResults.push(`${target.name} 被狼人杀害`)
          
          // 添加游戏日志
          this.addGameLog('werewolf_kill', `${target.name} 被狼人杀害`, targetId)
        }
      }
    }
    
    // 处理女巫救人
    const saveActions = actions.filter(a => a.actionType === 'witch_save')
    if (saveActions.length > 0) {
      const targetId = saveActions[0].targetId
      if (targetId) {
        const targetIndex = players.findIndex(p => p.id === targetId)
        if (targetIndex !== -1 && players[targetIndex].status === 'eliminated') {
          players[targetIndex].status = 'active'
          players[targetIndex].isSaved = true
          const target = players[targetIndex]
          nightResults.push(`${target.name} 被女巫救活`)
          
          // 添加游戏日志
          this.addGameLog('witch_save', `${target.name} 被女巫救活`, targetId)
        }
      }
    }
    
    // 处理女巫毒人
    const poisonActions = actions.filter(a => a.actionType === 'witch_poison')
    if (poisonActions.length > 0) {
      const targetId = poisonActions[0].targetId
      if (targetId) {
        const targetIndex = players.findIndex(p => p.id === targetId)
        if (targetIndex !== -1) {
          players[targetIndex].status = 'eliminated'
          players[targetIndex].isPoisoned = true
          const target = players[targetIndex]
          nightResults.push(`${target.name} 被女巫毒杀`)
          
          // 添加游戏日志
          this.addGameLog('witch_poison', `${target.name} 被女巫毒杀`, targetId)
        }
      }
    }
    
    // 如果昨夜平安无事
    if (nightResults.length === 0) {
      this.addGameLog('peaceful_night', '昨夜平安无事，没有玩家死亡')
    }
    
    this.updateGameState({ players })
    console.log('🌅 夜晚结果已处理，游戏日志已更新')
  }

  // 解决投票
  private async resolveVoting(): Promise<void> {
    const votes = this.gameState.votes
    const voteCount = new Map<string, number>()
    
    // 统计票数
    votes.forEach(vote => {
      voteCount.set(vote.targetId, (voteCount.get(vote.targetId) || 0) + 1)
    })
    
    // 找出得票最多的玩家
    let maxVotes = 0
    let eliminatedPlayerId: string | null = null
    
    for (const [playerId, count] of voteCount) {
      if (count > maxVotes) {
        maxVotes = count
        eliminatedPlayerId = playerId
      }
    }
    
    // 淘汰玩家
    if (eliminatedPlayerId) {
      const eliminatedPlayer = this.gameState.players.find(p => p.id === eliminatedPlayerId)
      const players = this.gameState.players.map(p => 
        p.id === eliminatedPlayerId ? { ...p, status: 'eliminated' as const } : p
      )
      this.updateGameState({ players })
      
      // 记录投票结果系统事件
      this.addGameLog('voting_result', `${eliminatedPlayer?.name} 被投票出局 (得票 ${maxVotes} 票)`, eliminatedPlayerId)
      
      this.emitEvent('player_eliminated', eliminatedPlayerId, { votes: maxVotes })
    } else {
      // 没有人被淘汰
      this.addGameLog('voting_result', '投票结果：平票，无人出局')
    }
  }

  // 设置游戏流程
  private setupGameFlow(): void {
    // 监听游戏事件并触发对应的UI更新
    this.on('phase_transition', (newPhase) => {
      console.log(`🎮 转换到阶段: ${newPhase}`)
    })

    this.on('player_eliminated', (playerId) => {
      console.log(`💀 玩家 ${playerId} 被淘汰`)
    })

    this.on('game_over', (winner) => {
      console.log(`🏆 游戏结束，获胜方: ${winner}`)
    })
    
    // 监听讨论轮次开始事件，自动触发AI发言
    this.on('discussion_turn_start', async (event: any) => {
      console.log(`🗣️ 发言轮次开始: ${event.playerId}`)
      
      const player = this.gameState.players.find(p => p.id === event.playerId)
      if (player && !player.isPlayer && player.status === 'active') {
        // AI玩家自动发言
        console.log(`🗣️ 触发AI玩家 ${player.name} 自动发言`)
        setTimeout(() => {
          this.processSpeechTurn(event.playerId)
        }, 1000) // 延迟1秒给UI反应时间
      }
    })
  }

  // 处理夜晚行动响应
  private async processNightActionResponses(
    responses: AIActionResponse[], 
    requests: AIActionRequest[]
  ): Promise<void> {
    console.log(`🌙 处理 ${responses.length} 个夜晚行动响应`)
    
    let successCount = 0
    let failureCount = 0
    
    for (let i = 0; i < responses.length; i++) {
      try {
        const response = responses[i]
        const request = requests[i]
        const player = this.gameState.players.find(p => p.id === request.playerId)
        
        if (!player) {
          throw new Error(`找不到玩家 ${request.playerId}`)
        }

        // 修复目标ID解析逻辑
        let targetId: string | undefined
        let actionType: string = 'kill' // 默认为kill，会根据角色调整

        console.log(`🔍 处理AI玩家 ${player.name} 的响应:`, {
          action: response.action,
          metadata: response.metadata,
          availableActions: request.availableActions
        })

        // 优先从response.action中获取targetId（这是我们设置的主要字段）
        if (response.action && typeof response.action === 'string') {
          // 检查action是否是一个有效的玩家ID
          if (request.availableActions.includes(response.action)) {
            targetId = response.action
            console.log(`✅ 从response.action获取目标ID: ${targetId}`)
          } 
          // 检查是否是复合action格式（如 "kill_ai_3"）
          else if (response.action.includes('_')) {
            const parts = response.action.split('_')
            actionType = parts[0]
            targetId = parts.slice(1).join('_')
            console.log(`✅ 从复合action解析: actionType=${actionType}, targetId=${targetId}`)
          }
        }
        
        // 如果从action中没有获取到有效的targetId，尝试从metadata中获取
        if (!targetId && response.metadata?.targetId) {
          targetId = String(response.metadata.targetId)
          console.log(`✅ 从metadata获取目标ID: ${targetId}`)
        }
        
        // 根据玩家角色确定动作类型（如果还没确定的话）
        if (targetId && actionType === 'kill') {
          switch (player.role) {
            case 'werewolf': actionType = 'kill'; break
            case 'seer': actionType = 'check'; break
            case 'witch': 
              // 根据游戏轮次和技能使用情况判断是救人还是毒人
              if (this.gameState.currentRound === 1 && !player.hasUsedSkill) {
                actionType = 'save'
              } else {
                actionType = 'poison'
              }
              break
            case 'guard': actionType = 'guard'; break
            default: actionType = 'kill'
          }
        }
        
        // 如果AI没有提供有效目标，记录错误但继续处理其他玩家
        if (!targetId) {
          console.warn(`⚠️ AI玩家 ${player.name} 未提供有效的行动目标，跳过该玩家`)
          failureCount++
          continue
        }

        // 验证目标是否有效
        const target = this.gameState.players.find(p => p.id === targetId)
        if (!target) {
          console.warn(`⚠️ AI玩家 ${player.name} 选择的目标 ${targetId} 不存在，跳过该玩家`)
          failureCount++
          continue
        }

        // 女巫救人时，目标应该是死亡状态；其他情况目标应该是存活状态
        if (actionType === 'save') {
          if (target.status !== 'eliminated') {
            console.warn(`⚠️ AI玩家 ${player.name} 尝试救活的目标 ${target.name} 不是死亡状态，跳过该玩家`)
            failureCount++
            continue
          }
        } else {
          if (target.status !== 'active') {
            console.warn(`⚠️ AI玩家 ${player.name} 选择的目标 ${target.name} 已经死亡，跳过该玩家`)
            failureCount++
            continue
          }
        }

        // 验证目标是否在可选列表中
        if (request.availableActions.length > 0 && !request.availableActions.includes(targetId)) {
          console.warn(`⚠️ AI玩家 ${player.name} 选择的目标 ${target.name} 不在可选列表中，跳过该玩家`)
          failureCount++
          continue
        }

        // 执行夜晚行动
        await this.processNightAction(request.playerId, {
          type: this.mapActionToNightActionType(actionType),
          targetId: targetId
        })
        
        console.log(`✅ ${player.name} (${player.role}) 对 ${target.name} 执行夜晚行动: ${actionType}`)
        successCount++
        
      } catch (error) {
        console.error(`❌ 处理AI玩家夜晚行动失败:`, error)
        failureCount++
        // 继续处理下一个玩家，不中断整个流程
        continue
      }
    }
    
    console.log(`🌙 夜晚行动处理完成: 成功 ${successCount}/${responses.length}, 失败 ${failureCount}`)
    
    // 即使有部分失败，也记录处理结果
    if (failureCount > 0) {
      this.addGameLog('system_action', `夜晚行动部分失败: ${failureCount} 个AI玩家行动失败`)
    }
    
    // 检查夜晚行动是否已完成，如果是则提前结束
    console.log('🌙 检查夜晚行动是否已全部完成...')
  }

  // 处理投票响应
  private async processVoteResponses(
    responses: AIActionResponse[], 
    requests: AIActionRequest[]
  ): Promise<void> {
    console.log(`🗳️ 处理 ${responses.length} 个投票响应`)
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i]
      const request = requests[i]
      const player = this.gameState.players.find(p => p.id === request.playerId)
      
      if (!player) {
        throw new Error(`找不到投票玩家 ${request.playerId}`)
      }

      // 验证AI是否提供了有效的投票目标
      if (!response.action) {
        throw new Error(`AI玩家 ${player.name} 未提供投票目标。AI响应: ${JSON.stringify(response)}`)
      }

      // 验证投票目标是否存在
      const target = this.gameState.players.find(p => p.id === response.action)
      if (!target) {
        throw new Error(`AI玩家 ${player.name} 投票的目标 ${response.action} 不存在`)
      }

      // 验证投票目标是否存活
      if (target.status !== 'active') {
        throw new Error(`AI玩家 ${player.name} 不能投票给已死亡的玩家 ${target.name}`)
      }

      // 验证是否在可选列表中
      if (request.availableActions.length > 0 && !request.availableActions.includes(response.action)) {
        throw new Error(`AI玩家 ${player.name} 投票的目标 ${target.name} 不在可选列表中: ${request.availableActions.join(', ')}`)
      }

      await this.processVote(request.playerId, response.action)
      
      console.log(`🗳️ ${player.name} 投票给 ${target.name}`)
    }
    
    // 检查投票是否已完成
    console.log('🗳️ 检查投票是否已全部完成...')
  }

  // 映射行动到夜晚行动类型
  private mapActionToNightActionType(action: string): NightAction['actionType'] {
    switch (action) {
      case 'kill': return 'werewolf_kill'
      case 'check': return 'seer_check'
      case 'save': return 'witch_save'
      case 'poison': return 'witch_poison'
      case 'witch_skip': return 'witch_skip'
      case 'guard': return 'guard_protect'
      default: return 'werewolf_kill'
    }
  }

  // AI讨论处理 - 改为轮流发言机制
  private async processAIDiscussion(): Promise<void> {
    console.log('🗣️ 开始轮流讨论阶段')
    
    // 获取存活的所有玩家（包括用户）
    const alivePlayers = this.gameState.players.filter(p => p.status === 'active')
    
    if (alivePlayers.length === 0) {
      console.log('🗣️ 没有存活的玩家，跳过讨论阶段')
      return
    }
    
    // 初始化发言状态
    this.updateGameState({ 
      currentSpeakerIndex: 0,
      speakingOrder: alivePlayers.map(p => p.id),
      discussionComplete: false 
    })
    
    // 触发发言轮次开始事件
    this.emitEvent('discussion_turn_start', alivePlayers[0].id)
    
    // 检查第一个发言者是否是AI，如果是则自动触发
    await this.checkAndTriggerAISpeech(alivePlayers[0].id)
  }

  // 处理单个玩家发言
  async processSpeechTurn(playerId: string, content?: string): Promise<void> {
    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player || player.status !== 'active') {
      console.log(`🗣️ 玩家 ${playerId} 不存在或已出局，跳过发言`)
      return
    }

    // 检查是否已经在发言中
    if (this.speakingInProgress.has(playerId)) {
      console.log(`🗣️ 玩家 ${player.name} 正在发言中，跳过重复请求`)
      return
    }

    // 检查是否已经发言过
    const currentRoundSpeeches = this.gameState.playerSpeeches.filter(speech => 
      speech.round === this.gameState.currentRound && 
      speech.phase === 'day_discussion' &&
      speech.playerId === playerId
    )
    
    if (currentRoundSpeeches.length > 0) {
      console.log(`🗣️ 玩家 ${player.name} 本轮已发言过，跳过`)
      return
    }

    let speechContent = content
    
    // 如果是AI玩家且没有提供内容，则请求AI生成发言
    if (!player.isPlayer && !speechContent) {
      try {
        // 标记正在发言
        this.speakingInProgress.add(playerId)
        console.log(`🗣️ 请求AI玩家 ${player.name} 发言`)
        
        // 使用WerewolfAIService生成发言
        const speechResult = await this.aiService.generateSpeech(
          player as any, 
          this.gameState as any, 
          this.buildDiscussionContext(player)
        )
        
        if (!speechResult.message) {
          throw new Error(`AI玩家 ${player.name} 未返回有效发言内容`)
        }
        
        speechContent = speechResult.message
        
        // 确定发言情感
        let emotion: SpeechEmotion = 'neutral'
        switch (speechResult.emotion) {
          case 'suspicious': emotion = 'suspicious'; break
          case 'defensive': emotion = 'defensive'; break
          case 'aggressive': emotion = 'aggressive'; break
          case 'confident': emotion = 'confident'; break
          default: emotion = 'neutral'
        }
        
        // 添加发言记录
        this.addPlayerSpeech(
          player.id, 
          speechContent, 
          emotion
        )
        
        console.log(`🗣️ ${player.name} AI发言: ${speechContent}`)
      } catch (error) {
        console.error(`❌ AI玩家 ${player.name} 发言失败:`, error)
        throw new Error(`AI玩家 ${player.name} 发言失败: ${error instanceof Error ? error.message : 'unknown error'}`)
      } finally {
        // 移除发言状态标记
        this.speakingInProgress.delete(playerId)
      }
    } else if (player.isPlayer && speechContent) {
      // 用户发言
      this.addPlayerSpeech(player.id, speechContent, 'neutral')
      console.log(`🗣️ 用户玩家 ${player.name} 发言: ${speechContent}`)
    } else {
      throw new Error(`玩家 ${player.name} 发言内容为空`)
    }
    
    // 发言完成，准备下一轮
    this.advanceToNextSpeaker()
  }

  // 推进到下一个发言者
  private advanceToNextSpeaker(): void {
    const currentState = this.gameState as any
    const { currentSpeakerIndex = 0, speakingOrder = [] } = currentState
    
    const nextIndex = currentSpeakerIndex + 1
    
    if (nextIndex >= speakingOrder.length) {
      // 一轮发言结束，检查每个玩家是否都已经发言过
      const currentRoundSpeeches = this.gameState.playerSpeeches.filter(speech => 
        speech.round === this.gameState.currentRound && 
        speech.phase === 'day_discussion'
      )
      
      // 检查每个存活玩家是否都已发言
      const alivePlayers = this.getAlivePlayers()
      const playersWhoSpoke = new Set(currentRoundSpeeches.map(s => s.playerId))
      const playersNotSpoken = alivePlayers.filter(p => !playersWhoSpoke.has(p.id))
      
      if (playersNotSpoken.length > 0) {
        // 还有玩家没有发言，继续当前轮次，但只让未发言的玩家发言
        console.log(`🗣️ 发现 ${playersNotSpoken.map(p => p.name).join(', ')} 尚未发言，继续当前轮次`)
        
        // 从未发言的第一个玩家开始
        const nextSpeakerId = playersNotSpoken[0].id
        const nextSpeakerIndexInOrder = speakingOrder.findIndex(id => id === nextSpeakerId)
        
        this.updateGameState({ currentSpeakerIndex: nextSpeakerIndexInOrder })
        this.emitEvent('discussion_turn_start', nextSpeakerId)
        
        // 立即检查并触发AI发言
        this.checkAndTriggerAISpeech(nextSpeakerId)
      } else {
        // 所有玩家都已发言，讨论完成
        console.log('🗣️ 讨论阶段完成，所有存活玩家已发言')
        this.updateGameState({ discussionComplete: true })
        this.emitEvent('discussion_complete')
      }
    } else {
      // 检查下一个玩家是否已经发言过
      const nextSpeakerId = speakingOrder[nextIndex]
      const currentRoundSpeeches = this.gameState.playerSpeeches.filter(speech => 
        speech.round === this.gameState.currentRound && 
        speech.phase === 'day_discussion'
      )
      const hasSpoken = currentRoundSpeeches.some(s => s.playerId === nextSpeakerId)
      
      if (hasSpoken) {
        // 下一个玩家已经发言过，跳过到下一个
        console.log(`🗣️ 玩家 ${nextSpeakerId} 已发言过，跳过到下一个`)
        this.updateGameState({ currentSpeakerIndex: nextIndex })
        this.advanceToNextSpeaker() // 递归调用找到下一个未发言的玩家
        return
      }
      
      // 下一个玩家发言
      this.updateGameState({ currentSpeakerIndex: nextIndex })
      this.emitEvent('discussion_turn_start', nextSpeakerId)
      console.log(`🗣️ 轮到 ${nextSpeakerId} 发言`)
      
      // 立即检查并触发AI发言
      this.checkAndTriggerAISpeech(nextSpeakerId)
    }
  }

  // 检查并触发AI发言
  private async checkAndTriggerAISpeech(playerId: string): Promise<void> {
    const player = this.gameState.players.find(p => p.id === playerId)
    
    if (player && !player.isPlayer && player.status === 'active') {
      // 检查是否已经在发言中
      if (this.speakingInProgress.has(playerId)) {
        console.log(`🤖 AI玩家 ${player.name} 已在发言中，跳过触发`)
        return
      }
      
      // 检查是否已经发言过
      const currentRoundSpeeches = this.gameState.playerSpeeches.filter(speech => 
        speech.round === this.gameState.currentRound && 
        speech.phase === 'day_discussion' &&
        speech.playerId === playerId
      )
      
      if (currentRoundSpeeches.length > 0) {
        console.log(`🤖 AI玩家 ${player.name} 本轮已发言过，跳过触发`)
        return
      }
      
      console.log(`🤖 自动触发AI玩家 ${player.name} 发言`)
      
      // 延迟500ms让前端UI先更新，然后触发AI发言
      setTimeout(async () => {
        try {
          await this.processSpeechTurn(playerId)
        } catch (error) {
          console.error(`❌ AI玩家 ${player.name} 发言失败:`, error)
          // AI发言失败时直接抛出错误，停止游戏
          throw new Error(`AI玩家 ${player.name} 发言失败: ${error instanceof Error ? error.message : 'unknown error'}`)
        }
      }, 500)
    }
  }

  // 跳过当前发言者
  async skipCurrentSpeaker(): Promise<void> {
    const currentState = this.gameState as any
    const { currentSpeakerIndex = 0, speakingOrder = [] } = currentState
    
    if (currentSpeakerIndex < speakingOrder.length) {
      const currentSpeakerId = speakingOrder[currentSpeakerIndex]
      const player = this.gameState.players.find(p => p.id === currentSpeakerId)
      
      console.log(`🗣️ 强制跳过玩家 ${player?.name} 的发言`)
      
      // 如果是AI玩家，这表示AI系统出现问题，应该报错
      if (player && !player.isPlayer) {
        throw new Error(`AI玩家 ${player.name} 无法发言，请检查AI配置`)
      }
      
      // 只有人类玩家才允许跳过
      this.advanceToNextSpeaker()
    }
  }

  // 强制结束讨论
  async forceEndDiscussion(): Promise<void> {
    console.log('🗣️ 强制结束讨论阶段')
    this.updateGameState({ discussionComplete: true })
    this.emitEvent('discussion_complete')
  }

  // 检查准备阶段是否完成
  private isPreparationComplete(): boolean {
    // 准备阶段在角色分配后自动完成
    return this.gameState.players.every(p => p.role !== undefined)
  }

  // 检查夜晚行动是否完成
  private isNightActionsComplete(): boolean {
    const aliveWerewolves = this.gameState.players.filter(p => 
      p.status === 'active' && p.camp === 'werewolf'
    )
    const aliveSpecialRoles = this.gameState.players.filter(p => 
      p.status === 'active' && ['seer', 'witch', 'guard'].includes(p.role) && !p.isPlayer
    )
    
    // 检查狼人是否已投票杀人 - 只要有一个狼人杀人行动就算完成
    const werewolfActions = this.gameState.nightActions.filter(a => 
      a.actionType === 'werewolf_kill' && aliveWerewolves.some(w => w.id === a.playerId)
    )
    
    // 检查特殊角色是否已行动（包括跳过行动）
    const specialRoleActions = this.gameState.nightActions.filter(a => 
      aliveSpecialRoles.some(p => p.id === a.playerId) && 
      ['seer_check', 'witch_save', 'witch_poison', 'witch_skip', 'guard_protect'].includes(a.actionType)
    )
    
    // 对于AI狼人，只要有狼人行动就算完成（团队决策）
    const aiWerewolves = aliveWerewolves.filter(w => !w.isPlayer)
    const expectedWerewolfActions = aiWerewolves.length > 0 ? 1 : 0 // 团队只需要一个杀人行动
    
    // 对于特殊角色，每个角色都需要行动
    const expectedSpecialActions = aliveSpecialRoles.length
    
    console.log(`🌙 夜晚行动检查: 狼人行动 ${werewolfActions.length}/${expectedWerewolfActions}, 特殊角色行动 ${specialRoleActions.length}/${expectedSpecialActions}`)
    console.log(`🌙 存活狼人: ${aliveWerewolves.map(w => `${w.name}(${!w.isPlayer ? 'AI' : 'Human'})`).join(', ')}`)
    console.log(`🌙 存活特殊角色: ${aliveSpecialRoles.map(p => `${p.name}(${p.role})`).join(', ')}`)
    
    // 如果没有AI狼人，直接跳过狼人行动检查
    if (aiWerewolves.length === 0) {
      console.log('🌙 没有AI狼人，跳过狼人行动等待')
      return specialRoleActions.length >= expectedSpecialActions
    }
    
    return werewolfActions.length >= expectedWerewolfActions && 
           specialRoleActions.length >= expectedSpecialActions
  }

  // 检查白天讨论是否完成
  private isDayDiscussionComplete(): boolean {
    const currentState = this.gameState as any
    
    // 如果有轮流发言机制，检查是否已完成
    if (currentState.discussionComplete !== undefined) {
      console.log(`☀️ 讨论完成检查: 轮流发言状态 ${currentState.discussionComplete}`)
      return currentState.discussionComplete
    }
    
    // 兜底逻辑：基于发言数量
    const minDiscussionTurns = Math.max(2, this.getAlivePlayers().length - 2)
    const discussionMessages = this.gameState.playerSpeeches.filter(speech => 
      speech.round === this.gameState.currentRound &&
      speech.phase === 'day_discussion'
    )
    
    console.log(`☀️ 讨论完成检查: 发言数 ${discussionMessages.length}/${minDiscussionTurns}`)
    return discussionMessages.length >= minDiscussionTurns
  }

  // 检查投票是否完成
  private isVotingComplete(): boolean {
    const alivePlayers = this.getAlivePlayers()
    const votes = this.gameState.votes
    
    console.log(`🗳️ 投票完成检查: 投票数 ${votes.length}/${alivePlayers.length}`)
    return votes.length >= alivePlayers.length
  }

  // 获取存活玩家
  private getAlivePlayers() {
    return this.gameState.players.filter(p => p.status === 'active')
  }

  // 启动任务完成检查
  private startTaskCompletionCheck(phase: GamePhase): void {
    const checkCompletion = this.PHASE_COMPLETION_CRITERIA[phase]
    if (!checkCompletion) return

    const checkInterval = () => {
      if (checkCompletion()) {
        console.log(`✅ 阶段 ${phase} 任务完成，提前转换到下一阶段`)
        this.handleTaskCompletion()
      } else {
        // 继续检查
        this.taskCompletionTimer = setTimeout(checkInterval, 2000) // 每2秒检查一次
      }
    }

    // 延迟3秒开始检查，给AI一些反应时间
    this.taskCompletionTimer = setTimeout(checkInterval, 3000)
  }

  // 处理任务完成
  private async handleTaskCompletion(): Promise<void> {
    const currentPhase = this.gameState.currentPhase
    
    // 清理计时器
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
      this.phaseTimer = null
    }
    if (this.taskCompletionTimer) {
      clearTimeout(this.taskCompletionTimer)
      this.taskCompletionTimer = null
    }
    
    // 转换到下一阶段
    await this.transitionToNextPhase(currentPhase)
  }

  // 转换到下一阶段
  private async transitionToNextPhase(currentPhase: GamePhase): Promise<void> {
    switch (currentPhase) {
      case 'preparation':
        await this.transitionToPhase('night')
        break
      case 'night':
        await this.transitionToPhase('day_discussion')
        break
      case 'day_discussion':
        await this.transitionToPhase('day_voting')
        break
      case 'day_voting': {
        await this.resolveVoting()
        const winner = this.checkGameEnd()
        if (winner) {
          await this.endGame(winner)
        } else {
          this.updateGameState({ currentRound: this.gameState.currentRound + 1 })
          await this.transitionToPhase('night')
        }
        break
      }
    }
  }

  // 处理狼人杀人响应
  private async processWerewolfKillResponses(
    responses: AIActionResponse[], 
    requests: AIActionRequest[]
  ): Promise<void> {
    console.log(`🐺 处理 ${responses.length} 个狼人杀人响应`)
    
    const killVotes: { [targetId: string]: number } = {}
    
    for (let i = 0; i < responses.length; i++) {
      try {
        const response = responses[i]
        const request = requests[i]
        const player = this.gameState.players.find(p => p.id === request.playerId)
        
        if (!player) {
          console.warn(`找不到狼人玩家 ${request.playerId}`)
          continue
        }

        let targetId: string | undefined
        
        if (response.action && typeof response.action === 'string') {
          if (request.availableActions.includes(response.action)) {
            targetId = response.action
            console.log(`🐺 狼人${player.name}选择杀害: ${targetId}`)
          }
        }
        
        if (!targetId) {
          console.warn(`🐺 狼人${player.name}未提供有效目标，跳过`)
          continue
        }

        // 统计杀人票数
        killVotes[targetId] = (killVotes[targetId] || 0) + 1
        
      } catch (error) {
        console.error(`🐺 处理狼人杀人响应失败:`, error)
        continue
      }
    }
    
    // 找出得票最多的目标
    let maxVotes = 0
    let selectedTarget: string | undefined
    
    for (const [targetId, votes] of Object.entries(killVotes)) {
      if (votes > maxVotes) {
        maxVotes = votes
        selectedTarget = targetId
      }
    }
    
    if (selectedTarget) {
      console.log(`🐺 狼人团队决定杀害: ${selectedTarget} (得票${maxVotes}票)`)
      
      // 执行杀人行动 - 使用第一个狼人的ID而不是werewolf_team
      const firstWerewolf = requests.find(req => 
        this.gameState.players.find(p => p.id === req.playerId && p.camp === 'werewolf')
      )
      
      if (firstWerewolf) {
        await this.processNightAction(firstWerewolf.playerId, {
          type: 'werewolf_kill',
          targetId: selectedTarget
        })
      }
    } else {
      console.log(`🐺 狼人没有达成一致，今夜无人死亡`)
    }
  }

  // 构建女巫上下文
  private buildWitchContext(player: WerewolfPlayer, killedPlayers: string[]): string {
    const baseContext = this.buildNightContext(player)
    
    let witchSpecificContext = '\n\n=== 女巫特殊信息 ===\n'
    
    if (killedPlayers.length > 0) {
      const killedNames = killedPlayers.map(id => {
        const killedPlayer = this.gameState.players.find(p => p.id === id)
        return killedPlayer ? `${killedPlayer.name}(${id})` : id
      }).join(', ')
      
      witchSpecificContext += `今夜狼人杀害了: ${killedNames}\n\n`
      
      if (!player.hasUsedSkill) {
        witchSpecificContext += `🧪 你有两种选择：\n`
        witchSpecificContext += `1. 救人：选择 save_xxx (例如 save_${killedPlayers[0]}) 救活被杀的玩家\n`
        witchSpecificContext += `2. 毒人：选择 poison_xxx (例如 poison_player_1) 毒死其他玩家\n`
        witchSpecificContext += `3. 跳过：选择 skip 什么都不做\n\n`
        witchSpecificContext += `⚠️ 重要：救人药只能使用一次，请谨慎选择！\n`
      } else {
        witchSpecificContext += `🧪 你已经使用过救人药，现在只能：\n`
        witchSpecificContext += `1. 毒人：选择 poison_xxx 毒死其他玩家\n`
        witchSpecificContext += `2. 跳过：选择 skip 什么都不做\n\n`
      }
    } else {
      witchSpecificContext += `今夜没有人被狼人杀死。\n\n`
      witchSpecificContext += `🧪 你可以选择：\n`
      witchSpecificContext += `1. 毒人：选择 poison_xxx 毒死其他玩家\n`
      witchSpecificContext += `2. 跳过：选择 skip 什么都不做\n\n`
    }
    
    witchSpecificContext += `请从可选行动中选择一个，严格按照格式回复。`
    
    return baseContext + witchSpecificContext
  }

  // 处理女巫行动响应
  private async processWitchActionResponses(
    responses: AIActionResponse[], 
    requests: AIActionRequest[]
  ): Promise<void> {
    console.log(`💊 处理 ${responses.length} 个女巫行动响应`)
    
    for (let i = 0; i < responses.length; i++) {
      try {
        const response = responses[i]
        const request = requests[i]
        const player = this.gameState.players.find(p => p.id === request.playerId)
        
        if (!player) {
          console.warn(`找不到女巫玩家 ${request.playerId}`)
          continue
        }

        const selectedAction = response.action
        
        if (!selectedAction || !request.availableActions.includes(selectedAction)) {
          console.log(`💊 女巫${player.name}选择了无效行动或跳过: ${selectedAction}`)
          continue
        }
        
        // 跳过行动 - 需要记录一个虚拟行动，以便isNightActionsComplete能正确计算
        if (selectedAction === 'skip') {
          console.log(`💊 女巫${player.name}选择不采取行动`)
          
          // 记录跳过行动，使用特殊的action type
          await this.processNightAction(request.playerId, {
            type: 'witch_skip',
            targetId: undefined
          })
          continue
        }
        
        // 解析行动类型和目标
        let actionType: 'save' | 'poison'
        let targetId: string
        
        if (selectedAction.startsWith('save_')) {
          actionType = 'save'
          targetId = selectedAction.replace('save_', '')
          console.log(`💊 女巫${player.name}选择救活: 玩家${targetId}`)
          
          // 标记女巫已使用救人药
          const updatedPlayers = this.gameState.players.map(p => 
            p.id === player.id ? { ...p, hasUsedSkill: true } : p
          )
          this.updateGameState({ players: updatedPlayers })
          
        } else if (selectedAction.startsWith('poison_')) {
          actionType = 'poison'
          targetId = selectedAction.replace('poison_', '')
          console.log(`💊 女巫${player.name}选择毒死: 玩家${targetId}`)
          
        } else {
          console.warn(`💊 女巫${player.name}选择了未知行动格式: ${selectedAction}`)
          continue
        }

        // 验证目标玩家存在
        const target = this.gameState.players.find(p => p.id === targetId)
        if (!target) {
          console.warn(`💊 女巫${player.name}选择的目标不存在: ${targetId}`)
          continue
        }

        // 执行女巫行动
        await this.processNightAction(request.playerId, {
          type: this.mapActionToNightActionType(actionType),
          targetId: targetId
        })
        
      } catch (error) {
        console.error(`💊 处理女巫行动响应失败:`, error)
        continue
      }
    }
  }

  // 处理其他角色行动响应
  private async processOtherRolesResponses(
    responses: AIActionResponse[], 
    requests: AIActionRequest[]
  ): Promise<void> {
    console.log(`🔮 处理 ${responses.length} 个其他角色行动响应`)
    
    for (let i = 0; i < responses.length; i++) {
      try {
        const response = responses[i]
        const request = requests[i]
        const player = this.gameState.players.find(p => p.id === request.playerId)
        
        if (!player) {
          console.warn(`找不到玩家 ${request.playerId}`)
          continue
        }

        let targetId: string | undefined
        let actionType: string = 'check' // 默认查验
        
        if (response.action && typeof response.action === 'string') {
          if (request.availableActions.includes(response.action)) {
            targetId = response.action
            
            // 根据角色确定行动类型
            switch (player.role) {
              case 'seer': actionType = 'check'; break
              case 'guard': actionType = 'guard'; break
              default: actionType = 'check'
            }
            
            const target = this.gameState.players.find(p => p.id === targetId)
            console.log(`🔮 ${player.name}(${player.role})选择对${target?.name}执行${actionType}`)
          }
        }
        
        if (!targetId) {
          console.log(`🔮 ${player.name}选择不采取行动`)
          continue
        }

        // 执行行动
        await this.processNightAction(request.playerId, {
          type: this.mapActionToNightActionType(actionType),
          targetId: targetId
        })
        
      } catch (error) {
        console.error(`🔮 处理其他角色行动响应失败:`, error)
        continue
      }
    }
  }

  // 重写AI请求方法，添加日志记录功能
  async requestAIAction(request: AIActionRequest): Promise<AIActionResponse> {
    const player = this.gameState.players.find(p => p.id === request.playerId)
    if (!player) {
      throw new Error(`找不到玩家 ${request.playerId}`)
    }

    // 构建日志请求对象
    const actionType = this.getActionTypeFromRequest(request)
    const logRequest: LoggedAIRequest = {
      playerId: request.playerId,
      playerName: player.name,
      gamePhase: request.phase as any,
      round: request.round,
      actionType: actionType,
      gameState: this.gameState as any,
      additionalContext: request.context,
      availableTargets: request.availableActions
    }

    // 构建消息
    const messages = this.buildAIPrompt(request)
    const fullPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n')
    
    // 记录AI请求开始
    const logId = AILogger.logRequest(logRequest, messages as any, fullPrompt)
    const startTime = Date.now()

    try {
      // 调用父类的AI请求方法
      const response = await super.requestAIAction(request)
      const processingTime = Date.now() - startTime
      
      // 记录AI响应
      AILogger.logResponse(logId, JSON.stringify(response), response, processingTime)
      
      return response
    } catch (error) {
      // 记录错误
      if (error instanceof Error) {
        AILogger.logError(logId, error)
      }
      
      throw error
    }
  }

  // 根据请求确定行动类型
  private getActionTypeFromRequest(request: AIActionRequest): string {
    const player = this.gameState.players.find(p => p.id === request.playerId)
    if (!player) return 'unknown'

    if (request.phase === 'night') {
      switch (player.role) {
        case 'werewolf': return 'decision_kill'
        case 'seer': return 'decision_check'
        case 'witch': return 'decision_witch_action'
        case 'guard': return 'decision_guard'
        case 'hunter': return 'decision_shoot'
        default: return 'decision_night'
      }
    } else if (request.phase === 'day_voting') {
      return 'decision_vote'
    } else if (request.phase === 'day_discussion') {
      return 'speech'
    }
    
    return `decision_${request.phase}`
  }
} 