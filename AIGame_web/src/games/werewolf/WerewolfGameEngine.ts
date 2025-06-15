import { GameEngine, AIActionRequest, AIActionResponse } from '../../core/game/GameEngine'
import { AIMessage } from '../../core/ai/AIClient'
import { GameState as BaseGameState, Player, GamePhase, RoleType, CampType, NightAction, Vote } from '../../store/werewolf/types'
import { 
  WEREWOLF_SYSTEM_PROMPT, 
  ROLE_SPECIFIC_PROMPTS, 
  PHASE_SPECIFIC_PROMPTS, 
  PERSONALITY_PROMPTS,
  buildWerewolfPrompt,
  buildDecisionPrompt,
  parseAIResponse
} from '../../lib/werewolfPrompts'

// 扩展游戏状态以符合狼人杀需求，同时兼容基础GameEngine
export interface WerewolfGameState extends BaseGameState {
  // 从BaseGameState继承的属性：gameId, isActive, currentPhase, currentRound, players, winner
  
  // 覆盖players属性为狼人杀专用类型
  players: WerewolfPlayer[]
  
  // 狼人杀专用扩展属性
  nightActions: NightAction[]
  votes: Vote[]
  currentPhase: GamePhase
  deadPlayers: WerewolfPlayer[]
  
  // 游戏状态标记
  isGameActive: boolean
  
  // 时间控制
  phaseStartTime: number
  phaseTimeLimit: number
  
  // 游戏日志
  gameLogs: any[]
  
  // 游戏设置
  settings: Record<string, any>
}

export interface WerewolfPlayer extends Omit<GamePlayer, 'status'> {
  // 狼人杀专用属性
  role: RoleType
  camp: CampType
  aiPersonality?: string
  suspicionLevels?: Map<string, number>
  
  // 状态字段映射（狼人杀使用不同的状态值）
  status: 'alive' | 'dead' | 'eliminated'
  
  // 额外的狼人杀属性
  avatar: string
  isPlayer: boolean // 狼人杀专用的isPlayer属性
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
    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player || player.status !== 'alive') {
      throw new Error('Invalid player or player not alive')
    }

    // 特殊行动类型处理
    if (action.type === 'advance_phase') {
      await this.forceAdvancePhase(playerId)
      return
    }

    switch (this.gameState.currentPhase) {
      case 'night':
        await this.processNightAction(playerId, action)
        break
      case 'day_voting':
        await this.processVote(playerId, action.targetId)
        break
      default:
        throw new Error(`Actions not allowed in phase: ${this.gameState.currentPhase}`)
    }
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
    this.updateGameState({
      gameLogs: [...this.gameState.gameLogs, {
        id: Date.now().toString(),
        round: this.gameState.currentRound,
        phase: this.gameState.currentPhase,
        action: `${player.name} 选择推进到下一阶段`,
        timestamp: Date.now(),
        isPublic: true
      }]
    })

    // 强制完成当前阶段
    await this.handleTaskCompletion()
  }

  checkGameEnd(): string | null {
    const alivePlayers = this.gameState.players.filter(p => p.status === 'alive')
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

    // 使用现有的 prompt 构建逻辑
    const systemPrompt = buildWerewolfPrompt(player, this.gameState, request.context)
    
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: request.context }
    ]
  }

  // 重写AI响应解析，使用现有的解析逻辑
  protected parseAIResponse(content: string, request: AIActionRequest): AIActionResponse {
    const parsed = parseAIResponse(content)
    
    return {
      action: parsed.target || request.availableActions[0] || 'default',
      reasoning: parsed.reasoning || '未提供推理',
      confidence: parsed.confidence || 0.5,
      message: parsed.message || '',
      metadata: {
        emotion: parsed.emotion,
        originalContent: content
      }
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

  // 夜晚阶段
  private async handleNightPhase(): Promise<void> {
    console.log('🌙 开始处理夜晚阶段')
    this.emitEvent('night_started')
    
    // 清空夜晚行动
    this.updateGameState({ nightActions: [] })
    
    // 获取需要行动的AI玩家 - 修复AI玩家判断逻辑
    const allPlayers = this.gameState.players
    const aiPlayers = allPlayers.filter(p => !p.isPlayer && p.status === 'alive')
    
    console.log(`🌙 所有玩家(${allPlayers.length}):`, allPlayers.map(p => `${p.name}(${!p.isPlayer ? 'AI' : 'Human'}, ${p.role || 'unknown'}, ${p.status})`))
    console.log(`🌙 存活AI玩家(${aiPlayers.length}):`, aiPlayers.map(p => `${p.name}(${p.role})`))
    
    const actionRequests: AIActionRequest[] = []

    for (const player of aiPlayers) {
      const availableActions = this.getAvailableNightActions(player)
      console.log(`🌙 ${player.name}(${player.role}) 可用夜晚行动:`, availableActions)
      
      if (availableActions.length > 0) {
        const hasAIClient = this.aiClients.has(player.id)
        console.log(`🌙 ${player.name} AI客户端状态:`, hasAIClient ? '已注册' : '未注册')
        
        actionRequests.push({
          gameId: this.gameState.gameId,
          playerId: player.id,
          phase: 'night',
          round: this.gameState.currentRound,
          context: this.buildNightContext(player),
          availableActions,
          gameState: this.gameState
        })
      }
    }

    console.log(`🌙 总共生成 ${actionRequests.length} 个AI夜晚行动请求`)

    // 并发处理AI夜晚行动 - 异步执行，不阻塞阶段转换
    if (actionRequests.length > 0) {
      console.log(`🌙 启动 ${actionRequests.length} 个AI夜晚行动请求`)
      
      this.processAIActionsConcurrently(actionRequests, 2)
        .then(responses => {
          console.log(`🌙 收到 ${responses.length} 个AI夜晚行动响应`)
          return this.processNightActionResponses(responses, actionRequests)
        })
        .catch(error => {
          console.error('🌙 处理夜晚AI行动失败:', error)
        })
    } else {
      console.log('🌙 没有AI夜晚行动请求需要处理')
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
    const aiPlayers = this.gameState.players.filter(p => !p.isPlayer && p.status === 'alive')
    const voteRequests: AIActionRequest[] = []

    for (const player of aiPlayers) {
      const candidates = this.gameState.players.filter(p => 
        p.status === 'alive' && p.id !== player.id
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
    this.emitEvent('game_over', undefined, { winner })
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

  // 分配角色
  private assignRoles(): void {
    const players = [...this.gameState.players]
    const roles: RoleType[] = ['seer', 'witch', 'hunter', 'werewolf', 'werewolf', 'werewolf']
    
    // 剩余位置分配村民
    while (roles.length < players.length) {
      roles.push('villager')
    }
    
    // 随机分配
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]]
    }
    
    // 分配给玩家
    players.forEach((player, index) => {
      const role = roles[index]
      player.role = role
      player.camp = role === 'werewolf' ? 'werewolf' : 'villager'
    })
    
    this.updateGameState({ players })
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
        if (!player.hasUsedSkill) {
          actions.push('save', 'poison')
        }
        break
      case 'guard':
        actions.push('guard')
        break
    }
    
    return actions
  }

  // 构建夜晚上下文
  private buildNightContext(player: WerewolfPlayer): string {
    const alivePlayers = this.gameState.players.filter(p => p.status === 'alive')
    return `夜晚阶段，你是${player.role}。存活玩家：${alivePlayers.map(p => p.name).join(', ')}`
  }

  // 构建投票上下文
  private buildVotingContext(player: WerewolfPlayer): string {
    const alivePlayers = this.gameState.players.filter(p => p.status === 'alive')
    return `投票阶段，请选择要投票出局的玩家。候选人：${alivePlayers.filter(p => p.id !== player.id).map(p => p.name).join(', ')}`
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
    
    // 处理狼人击杀
    const killActions = actions.filter(a => a.actionType === 'werewolf_kill')
    if (killActions.length > 0) {
      const targetId = killActions[0].targetId
      if (targetId) {
        const targetIndex = players.findIndex(p => p.id === targetId)
        if (targetIndex !== -1) {
          players[targetIndex].status = 'dead'
        }
      }
    }
    
    // 处理女巫救人
    const saveActions = actions.filter(a => a.actionType === 'witch_save')
    if (saveActions.length > 0) {
      const targetId = saveActions[0].targetId
      if (targetId) {
        const targetIndex = players.findIndex(p => p.id === targetId)
        if (targetIndex !== -1 && players[targetIndex].status === 'dead') {
          players[targetIndex].status = 'alive'
          players[targetIndex].isSaved = true
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
          players[targetIndex].status = 'dead'
          players[targetIndex].isPoisoned = true
        }
      }
    }
    
    this.updateGameState({ players })
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
      const players = this.gameState.players.map(p => 
        p.id === eliminatedPlayerId ? { ...p, status: 'eliminated' as const } : p
      )
      this.updateGameState({ players })
      
      this.emitEvent('player_eliminated', eliminatedPlayerId, { votes: maxVotes })
    }
  }

  // 设置游戏流程
  private setupGameFlow(): void {
    // 监听游戏事件，自动推进流程
    this.on('night_actions_complete', () => {
      // 所有夜晚行动完成后，可以提前进入白天
    })
    
    this.on('all_votes_cast', () => {
      // 所有投票完成后，可以提前结束投票阶段
    })
  }

  // 处理夜晚行动响应
  private async processNightActionResponses(
    responses: AIActionResponse[], 
    requests: AIActionRequest[]
  ): Promise<void> {
    console.log(`🌙 处理 ${responses.length} 个夜晚行动响应`)
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i]
      const request = requests[i]
      const player = this.gameState.players.find(p => p.id === request.playerId)
      
      // 解析AI响应以获取目标ID
      let targetId: string | undefined
      let actionType: string
      
      // 如果响应包含目标信息，解析出来
      if (response.action.includes('_')) {
        // 格式可能是 "kill_player_id" 或 "check_player_id"
        const parts = response.action.split('_')
        actionType = parts[0]
        targetId = parts.slice(1).join('_')
      } else {
        // 简单的动作类型，需要从可用玩家中随机选择目标
        actionType = response.action
        const alivePlayers = this.gameState.players.filter(p => 
          p.status === 'alive' && p.id !== request.playerId
        )
        
        if (player?.role === 'werewolf') {
          // 狼人选择村民阵营目标
          const villagers = alivePlayers.filter(p => p.camp === 'villager')
          targetId = villagers.length > 0 ? villagers[Math.floor(Math.random() * villagers.length)].id : undefined
        } else {
          // 其他角色随机选择目标
          targetId = alivePlayers.length > 0 ? alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id : undefined
        }
      }
      
      if (targetId) {
        await this.processNightAction(request.playerId, {
          type: this.mapActionToNightActionType(actionType),
          targetId: targetId
        })
        
        const target = this.gameState.players.find(p => p.id === targetId)
        console.log(`🌙 ${player?.name} (${player?.role}) 对 ${target?.name} 执行夜晚行动: ${actionType}`)
      } else {
        console.log(`🌙 ${player?.name} (${player?.role}) 夜晚行动无有效目标: ${actionType}`)
      }
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
      
      await this.processVote(request.playerId, response.action)
      
      const player = this.gameState.players.find(p => p.id === request.playerId)
      const target = this.gameState.players.find(p => p.id === response.action)
      console.log(`🗳️ ${player?.name} 投票给 ${target?.name}`)
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
      case 'guard': return 'guard_protect'
      default: return 'werewolf_kill'
    }
  }

  // AI讨论处理
  private async processAIDiscussion(): Promise<void> {
    // TODO: 实现AI讨论逻辑
    console.log('🗣️ AI讨论阶段')
  }

  // 检查准备阶段是否完成
  private isPreparationComplete(): boolean {
    // 准备阶段在角色分配后自动完成
    return this.gameState.players.every(p => p.role !== undefined)
  }

  // 检查夜晚行动是否完成
  private isNightActionsComplete(): boolean {
    const aliveWerewolves = this.gameState.players.filter(p => 
      p.status === 'alive' && p.camp === 'werewolf'
    )
    const aliveSpecialRoles = this.gameState.players.filter(p => 
      p.status === 'alive' && ['seer', 'witch', 'guard'].includes(p.role) && !p.isPlayer
    )
    
    // 检查狼人是否已投票杀人
    const werewolfActions = this.gameState.nightActions.filter(a => 
      a.actionType === 'werewolf_kill' && aliveWerewolves.some(w => w.id === a.playerId)
    )
    
    // 检查特殊角色是否已行动
    const specialRoleActions = this.gameState.nightActions.filter(a => 
      aliveSpecialRoles.some(p => p.id === a.playerId)
    )
    
    // 对于AI狼人，期望的行动数是AI狼人数量，但团队只需要一个杀人决策
    const aiWerewolves = aliveWerewolves.filter(w => !w.isPlayer)
    const expectedWerewolfActions = Math.min(1, aiWerewolves.length) // 团队决策，只需要一个杀人行动
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
    // 基于AI发言数量或人类玩家主动推进
    const minDiscussionTurns = Math.max(2, this.getAlivePlayers().length - 2)
    const discussionMessages = this.gameState.gameLogs.filter(log => 
      log.phase === 'day_discussion' && 
      log.round === this.gameState.currentRound &&
      log.action.includes('发言')
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
    return this.gameState.players.filter(p => p.status === 'alive')
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
} 