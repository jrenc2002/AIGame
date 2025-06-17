// 增强的狼人杀游戏控制器
// 整合LLM-Werewolf的专业游戏流程

import { GameState, Player, RoleType, GamePhase, Vote } from '@/store/werewolf/types'
import { aiGameService, AIDecisionResult as EnhancedAIDecision, AISpeechResult as EnhancedAISpeech } from './aiService'
import { RobustJSONParser } from './ai/RobustJSONParser'

// 夜晚行动结果
interface NightActionResult {
  playerId: string
  action: 'kill' | 'check' | 'save' | 'poison' | 'guard'
  target?: string
  result?: any
  success: boolean
}

// 游戏控制器配置
interface GameControllerConfig {
  enableProfessionalRules: boolean
  autoRoleReveal: boolean
  nightActionTimeout: number
  discussionTimeout: number
  votingTimeout: number
}

export class EnhancedWerewolfGameController {
  private gameState: GameState
  private config: GameControllerConfig
  private nightActionResults: NightActionResult[] = []
  private eventCallbacks: Map<string, Array<(...args: any[]) => void>> = new Map()
  private isPaused: boolean = false
  private pendingPhaseTransition: (() => void) | null = null

  constructor(initialGameState: GameState, config?: Partial<GameControllerConfig>) {
    this.gameState = initialGameState
    this.config = {
      enableProfessionalRules: true,
      autoRoleReveal: true,
      nightActionTimeout: 120,
      discussionTimeout: 180,
      votingTimeout: 60,
      ...config
    }
  }

  /**
   * 初始化增强的狼人杀游戏
   * 采用LLM-Werewolf的9人配置
   */
  initializeEnhancedGame(): GameState {
    // 使用LLM-Werewolf的角色配置：3狼人，1预言家，1女巫，1猎人，3村民
    const roles: RoleType[] = ['werewolf', 'werewolf', 'werewolf', 'seer', 'witch', 'hunter', 'villager', 'villager', 'villager']
    const shuffledRoles = [...roles].sort(() => Math.random() - 0.5)
    
    // 生成9个玩家（1个真人玩家 + 8个AI）
    const players: Player[] = Array.from({ length: 9 }, (_, i) => {
      const role = shuffledRoles[i]
      const camp = role === 'werewolf' ? 'werewolf' : 'villager'
      
      return this.generateEnhancedPlayer(i, i === 0, role, camp)
    })

    this.gameState = {
      ...this.gameState,
      gameId: this.generateGameId(),
      currentRound: 1,
      currentPhase: 'preparation',
      isGameActive: true,
      players,
      phaseStartTime: Date.now(),
      phaseTimeLimit: 30,
      gameLogs: [{
        id: '1',
        round: 0,
        phase: 'preparation',
        action: '🎮 AI狼人杀开始！采用专业9人全禁房规则',
        timestamp: Date.now(),
        isPublic: true
      }]
    }

    this.addGameLog('角色分配完成', false, {
      werewolves: players.filter(p => p.role === 'werewolf').map(p => p.name),
      gods: players.filter(p => ['seer', 'witch', 'hunter'].includes(p.role)).map(p => `${p.name}(${p.role})`),
      villagers: players.filter(p => p.role === 'villager').map(p => p.name)
    })

    return this.gameState
  }

  /**
   * 启动夜晚阶段
   */
  async startNightPhase(): Promise<void> {
    // 检查AI服务是否可用
    if (!aiGameService.isAIEnabled()) {
      this.pauseGameForAPI('夜晚阶段需要AI服务，但当前AI服务不可用', () => this.startNightPhase())
      return
    }

    this.gameState.currentPhase = 'night'
    this.gameState.phaseStartTime = Date.now()
    this.gameState.phaseTimeLimit = this.config.nightActionTimeout
    
    this.addGameLog('🌙 夜晚降临，特殊角色开始行动...', true)
    console.log(`🎮 进入夜晚阶段 - 第${this.gameState.currentRound}轮`)
    this.emit('STATE_UPDATE', this.gameState)

    try {
      this.nightActionResults = []
      await this.executeNightActions()
      this.processNightResults()
      
      this.addGameLog('🌙 夜晚行动结束', false)
      
      setTimeout(() => {
        this.startDayDiscussion()
      }, 2000)
      
    } catch (error) {
      console.error('夜晚阶段执行失败:', error)
      this.pauseGameForAPI('夜晚阶段AI服务出现错误', () => this.startNightPhase())
    }
  }

  /**
   * 执行夜晚行动
   */
  private async executeNightActions(): Promise<void> {
    const alivePlayers = this.gameState.players.filter(p => p.status === 'alive')
    
    await this.executeWerewolfAction(alivePlayers)
    await this.executeSeerAction(alivePlayers)
    await this.executeWitchAction(alivePlayers)
    await this.executeGuardAction(alivePlayers)
  }

  private async executeWerewolfAction(alivePlayers: Player[]): Promise<void> {
    const werewolves = alivePlayers.filter(p => p.role === 'werewolf')
    if (werewolves.length === 0) return

    const villagers = alivePlayers.filter(p => p.camp === 'villager')
    if (villagers.length === 0) return

    const alphaWolf = werewolves[0]
    
    console.log(`🐺 狼人行动 - 头狼: ${alphaWolf.name}(${alphaWolf.id})`)
    console.log(`🎯 可选目标:`, villagers.map(v => `${v.name}(${v.id})`))
    
    const decision = await aiGameService.generateAIDecision(
      alphaWolf,
      this.gameState,
      villagers,
      'kill'
    )

    console.log(`🎯 狼人决策结果:`, decision)

    if (decision.target) {
      const targetPlayer = this.getPlayerById(decision.target)
      if (targetPlayer) {
        this.nightActionResults.push({ playerId: alphaWolf.id, action: 'kill', target: decision.target, success: true })
        this.addGameLog(`🐺 狼人选择了目标: ${targetPlayer.name}`, false, { target: decision.target, reasoning: decision.reasoning })
        console.log(`✅ 狼人杀人目标确认: ${targetPlayer.name}(${targetPlayer.id})`)
      } else {
        console.error(`❌ 狼人目标无效: ${decision.target}`)
      }
    } else {
      console.warn(`⚠️ 狼人未选择目标`)
    }
  }

  private async executeSeerAction(alivePlayers: Player[]): Promise<void> {
    const seer = alivePlayers.find(p => p.role === 'seer')
    if (!seer) return

    const targets = alivePlayers.filter(p => p.id !== seer.id)
    if (targets.length === 0) return

    const decision = await aiGameService.generateAIDecision(seer, this.gameState, targets, 'check')

    if (decision.target) {
      const target = targets.find(t => t.id === decision.target)
      const result = target ? (target.camp === 'werewolf' ? '狼人' : '好人') : '好人'
      this.nightActionResults.push({ playerId: seer.id, action: 'check', target: decision.target, result, success: true })
      this.addGameLog(`🔮 预言家查验了: ${this.getPlayerName(decision.target)}，结果是${result}`, false)
    }
  }

  private async executeWitchAction(alivePlayers: Player[]): Promise<void> {
    const witch = alivePlayers.find(p => p.role === 'witch')
    if (!witch) return

    const killAction = this.nightActionResults.find(r => r.action === 'kill')
    
    if (killAction && killAction.target && this.gameState.currentRound === 1) {
      this.nightActionResults.push({ playerId: witch.id, action: 'save', target: killAction.target, success: true })
      this.addGameLog(`💊 女巫第一晚救人: ${this.getPlayerName(killAction.target)}`, false)
    } else if (!witch.hasUsedSkill && Math.random() < 0.3) {
      const potentialTargets = alivePlayers.filter(p => p.id !== witch.id)
      if (potentialTargets.length > 0) {
        const decision = await aiGameService.generateAIDecision(witch, this.gameState, potentialTargets, 'poison')
        if (decision.target) {
          this.nightActionResults.push({ playerId: witch.id, action: 'poison', target: decision.target, success: true })
          this.addGameLog(`☠️ 女巫使用毒药: ${this.getPlayerName(decision.target)}`, false)
        }
      }
    }
  }

  private async executeGuardAction(alivePlayers: Player[]): Promise<void> {
    const guard = alivePlayers.find(p => p.role === 'guard')
    if (!guard) return

    const targets = alivePlayers.filter(p => p.id !== guard.id)
    if (targets.length === 0) return

    const decision = await aiGameService.generateAIDecision(guard, this.gameState, targets, 'guard')

    if (decision.target) {
      this.nightActionResults.push({ playerId: guard.id, action: 'guard', target: decision.target, success: true })
      this.addGameLog(`🛡️ 守卫保护了: ${this.getPlayerName(decision.target)}`, false)
    }
  }

  private processNightResults(): void {
    const killAction = this.nightActionResults.find(r => r.action === 'kill')
    const saveAction = this.nightActionResults.find(r => r.action === 'save')
    const poisonAction = this.nightActionResults.find(r => r.action === 'poison')
    const guardAction = this.nightActionResults.find(r => r.action === 'guard')

    let deadToday = 0

    if (killAction && killAction.target) {
      const isProtected = guardAction?.target === killAction.target
      const isSaved = saveAction?.target === killAction.target
      
      if (!isProtected && !isSaved) {
        this.killPlayer(killAction.target, '被狼人杀死')
        deadToday++
      } else {
        this.addGameLog(`夜晚平安，目标被保护`, true)
      }
    }

    if (poisonAction && poisonAction.target) {
      this.killPlayer(poisonAction.target, '被女巫毒死')
      deadToday++
    }
    
    if(deadToday === 0 && killAction) {
        this.addGameLog(`昨晚是平安夜`, true)
    }
  }

  async startDayDiscussion(): Promise<void> {
    this.gameState.currentPhase = 'day_discussion'
    this.gameState.phaseStartTime = Date.now()
    this.gameState.phaseTimeLimit = this.config.discussionTimeout

    this.addGameLog('☀️ 天亮了，开始讨论', true)
    console.log(`🎮 进入白天讨论阶段 - 第${this.gameState.currentRound}轮`)
    this.emit('STATE_UPDATE', this.gameState)

    const winner = this.checkGameEnd()
    if (winner) {
      this.endGame(winner)
      return
    }

    if (this.config.autoRoleReveal) {
      await this.triggerRoleReveals()
    }

    setTimeout(() => { this.generateAIDiscussion() }, 3000)
    setTimeout(() => { this.startVotingPhase() }, this.config.discussionTimeout * 1000)
  }

  private async triggerRoleReveals(): Promise<void> {
    const alivePlayers = this.gameState.players.filter(p => p.status === 'alive')
    
    const seer = alivePlayers.find(p => p.role === 'seer')
    if (seer) {
      const checkResult = this.nightActionResults.find(r => r.action === 'check' && r.playerId === seer.id)
      if (checkResult) {
        const message = `我是预言家！昨晚查验了${this.getPlayerName(checkResult.target)}，结果是${checkResult.result}`
        this.addChatMessage(seer.id, message, 'confident')
      }
    }

    const witch = alivePlayers.find(p => p.role === 'witch')
    if (witch) {
      const witchAction = this.nightActionResults.find(r => (r.action === 'save' || r.action === 'poison') && r.playerId === witch.id)
      if (witchAction) {
        const message = witchAction.action === 'save' ? `我是女巫！昨晚救了${this.getPlayerName(witchAction.target)}` : `我是女巫！昨晚毒了${this.getPlayerName(witchAction.target)}`
        this.addChatMessage(witch.id, message, 'confident')
      }
    }
  }

  private async generateAIDiscussion(): Promise<void> {
    const alivePlayers = this.gameState.players.filter(p => p.status === 'alive')
    // 按ID排序，确保每轮都是相同的发言顺序
    alivePlayers.sort((a, b) => parseInt(a.id) - parseInt(b.id))

    // 轮流发言，从第一个玩家到最后一个玩家
    for (const player of alivePlayers) {
      try {
        if (player.isPlayer) {
          // 人类玩家暂时跳过，可以手动发言
          continue
        }

        const context = `第${this.gameState.currentRound}轮讨论，你是第${parseInt(player.id)}号玩家，请分析昨晚的情况并发表看法`
        
        // 检查AI是否可用
        if (!aiGameService.isAIEnabled()) {
          this.pauseGameForAPI('讨论阶段需要AI服务，但当前AI服务不可用', () => this.generateAIDiscussion())
          return
        }

        const speech = await aiGameService.generateAISpeech(player, this.gameState, context)
        this.addChatMessage(player.id, speech.message, speech.emotion)
        
        // 添加发言日志
        this.addGameLog(`💬 ${player.name}: ${speech.message}`, true)
        
        // 轮流发言间隔2-4秒，模拟真实思考时间
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000))
      } catch (error) {
        console.error(`AI ${player.name} 发言失败:`, error)
        this.pauseGameForAPI(`AI ${player.name} 发言失败，可能是API服务问题`, () => this.generateAIDiscussion())
        return
      }
    }
    
    console.log('🗣️ 本轮AI讨论完成')
  }

  async startVotingPhase(): Promise<void> {
    this.gameState.currentPhase = 'day_voting'
    this.gameState.phaseStartTime = Date.now()
    this.gameState.phaseTimeLimit = this.config.votingTimeout
    this.gameState.votes = []

    this.addGameLog('🗳️ 投票阶段开始', true)
    this.emit('STATE_UPDATE', this.gameState)

    setTimeout(() => { this.executeAIVotes() }, 5000)
    setTimeout(() => { this.processVotingResults() }, this.config.votingTimeout * 1000)
  }

  private async executeAIVotes(): Promise<void> {
    // 检查AI服务是否可用
    if (!aiGameService.isAIEnabled()) {
      this.pauseGameForAPI('投票阶段需要AI服务，但当前AI服务不可用', () => this.executeAIVotes())
      return
    }

    const aiPlayers = this.gameState.players.filter(p => p.status === 'alive' && !p.isPlayer && !p.hasVoted)

    for (const ai of aiPlayers) {
      try {
        const availableTargets = this.gameState.players.filter(p => p.status === 'alive' && p.id !== ai.id)
        const decision = await aiGameService.generateAIDecision(ai, this.gameState, availableTargets, 'vote')
        
        if (decision.target) {
          this.addVote(ai.id, decision.target)
          this.addChatMessage(ai.id, decision.message, decision.emotion)
        }
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
      } catch (error) {
        console.error(`AI ${ai.name} 投票失败:`, error)
        this.pauseGameForAPI(`AI ${ai.name} 投票失败，可能是API服务问题`, () => this.executeAIVotes())
        return
      }
    }
  }

  private processVotingResults(): void {
    const voteCount = new Map<string, number>()
    
    this.gameState.votes.forEach(vote => {
      voteCount.set(vote.targetId, (voteCount.get(vote.targetId) || 0) + 1)
    })

    let maxVotes = 0, eliminatedPlayerId = ''
    voteCount.forEach((votes, playerId) => {
      if (votes > maxVotes) {
        maxVotes = votes
        eliminatedPlayerId = playerId
      }
    })

    if (eliminatedPlayerId) {
      const eliminatedPlayer = this.getPlayerById(eliminatedPlayerId)
      if (eliminatedPlayer) {
        this.addGameLog(`🗳️ ${eliminatedPlayer.name} 被票出局 (${maxVotes}票)`, true)
        this.killPlayer(eliminatedPlayerId, '被投票出局')
        if (eliminatedPlayer.role === 'hunter') {
          this.triggerHunterSkill(eliminatedPlayer)
        }
      }
    } else {
        this.addGameLog(`🗳️ 投票平票，无人出局`, true)
    }

    const winner = this.checkGameEnd()
    if (winner) {
      this.endGame(winner)
    } else {
      this.gameState.currentRound++
      this.startNightPhase()
    }
  }

  private async triggerHunterSkill(hunter: Player): Promise<void> {
    const alivePlayers = this.gameState.players.filter(p => p.status === 'alive')
    if (alivePlayers.length === 0) return

    const decision = await aiGameService.generateAIDecision(hunter, this.gameState, alivePlayers, 'shoot')

    if (decision.target) {
      const target = this.getPlayerById(decision.target)
      if (target) {
        this.addGameLog(`🔫 猎人开枪带走了 ${target.name}`, true)
        this.killPlayer(decision.target, '被猎人开枪射杀')
      }
    }
  }

  private checkGameEnd(): 'villager' | 'werewolf' | null {
    const alive = this.gameState.players.filter(p => p.status === 'alive')
    const aliveWerewolves = alive.filter(p => p.camp === 'werewolf')
    const aliveGods = alive.filter(p => ['seer', 'witch', 'hunter'].includes(p.role))
    const aliveVillagers = alive.filter(p => p.camp === 'villager')

    if (aliveGods.length === 0 || aliveWerewolves.length >= aliveVillagers.length) return 'werewolf'
    if (aliveWerewolves.length === 0) return 'villager'
    return null
  }

  private endGame(winner: 'villager' | 'werewolf'): void {
    this.gameState.currentPhase = 'game_over'
    this.gameState.isGameActive = false
    this.gameState.winner = winner
    this.addGameLog(`🎯 游戏结束！${winner === 'villager' ? '村民' : '狼人'}阵营获胜！`, true)
    this.emit('GAME_END', { winner })
  }

  // 辅助方法
  private getPlayerById = (id?: string) => this.gameState.players.find(p => p.id === id)
  private getPlayerName = (id?: string) => this.getPlayerById(id)?.name || '未知玩家'
  
  private generateEnhancedPlayer(id: number, isHuman: boolean, role: RoleType, camp: 'villager' | 'werewolf'): Player {
    const aiNames = ['赛博战士', '量子猎手', '数据法师', '逻辑守护', '智能先知', '算法骑士', '代码巫师', '神经网络', '深度学习']
    const avatars = ['🤖', '👩‍💻', '👨‍💻', '🦾', '🧠', '⚡', '🔮', '🌟', '💫']
    const personalities = ['logical', 'intuitive', 'aggressive', 'conservative', 'leader', 'follower']
    const difficulties = ['easy', 'medium', 'hard']

    return {
      id: id.toString(),
      name: isHuman ? '你' : aiNames[id % aiNames.length],
      avatar: avatars[id % avatars.length],
      role, camp, status: 'alive', isPlayer: isHuman,
      aiDifficulty: isHuman ? undefined : difficulties[Math.floor(Math.random() * difficulties.length)] as any,
      aiPersonality: isHuman ? undefined : personalities[Math.floor(Math.random() * personalities.length)] as any,
      suspicionLevels: isHuman ? undefined : new Map(),
      votesReceived: 0, hasVoted: false, hasUsedSkill: false,
      isProtected: false, isPoisoned: false, isSaved: false
    }
  }

  private generateGameId = () => Math.random().toString(36).substring(2, 9)
  
  private killPlayer(playerId: string, reason: string): void {
    const player = this.getPlayerById(playerId)
    if (player && player.status === 'alive') {
      player.status = 'dead'
      this.gameState.deadPlayers.push(player)
      this.addGameLog(`💀 ${player.name} ${reason}，身份是${player.role}`, true)
    }
  }

  private addVote(voterId: string, targetId: string): void {
    this.gameState.votes.push({ id: Date.now().toString(), voterId, targetId, timestamp: Date.now() })
    const voter = this.getPlayerById(voterId)
    if(voter) voter.hasVoted = true
  }

  private addGameLog(action: string, isPublic: boolean, data?: any): void {
    this.gameState.gameLogs.push({
      id: Date.now().toString(),
      round: this.gameState.currentRound,
      phase: this.gameState.currentPhase,
      action,
      timestamp: Date.now(),
      isPublic,
      data
    })
    this.emit('LOG_UPDATE', this.gameState.gameLogs)
  }

  private addChatMessage(playerId: string, message: string, emotion?: string): void {
    const player = this.getPlayerById(playerId)
    if (!player) return

    const chatMessage = {
      id: Date.now().toString(),
      playerId,
      playerName: player.name,
      message,
      emotion,
      timestamp: Date.now(),
      isAI: !player.isPlayer
    }
    
    // 同时记录到游戏日志中，供AI上下文使用
    this.addGameLog(`💬 ${player.name}: ${message}`, true)
    
    this.emit('CHAT_MESSAGE', chatMessage)
  }

  private emit(event: string, data?: any): void {
    console.log(`🔊 事件发出: ${event}`, data ? `数据: ${JSON.stringify(data, null, 2)}` : '')
    ;(this.eventCallbacks.get(event) || []).forEach(cb => cb(data))
  }

  // 公开接口
  public on = (event: string, callback: (...args: any[]) => void) => {
    if (!this.eventCallbacks.has(event)) this.eventCallbacks.set(event, [])
    this.eventCallbacks.get(event)!.push(callback)
  }

  public getCurrentState = () => this.gameState

  public handlePlayerVote = (playerId: string, targetId: string) => {
    if (this.gameState.currentPhase === 'day_voting') {
      this.addVote(playerId, targetId)
      this.addGameLog(`${this.getPlayerName(playerId)} 投票给 ${this.getPlayerName(targetId)}`, true)
    }
  }

  public handlePlayerMessage = (playerId: string, message: string) => {
    if (this.gameState.currentPhase === 'day_discussion') {
      this.addChatMessage(playerId, message, 'neutral')
    }
  }

  /**
   * 暂停游戏等待API恢复
   */
  private pauseGameForAPI(reason: string, retryCallback: () => void): void {
    this.isPaused = true
    this.pendingPhaseTransition = retryCallback
    
    // 更新游戏状态
    this.gameState.isPaused = true
    this.gameState.pauseReason = reason
    
    this.addGameLog(`⏸️ 游戏暂停: ${reason}`, true)
    
    // 触发暂停事件，通知UI显示API测试弹窗
    this.emit('GAME_PAUSED', {
      reason,
      needsAPIConfig: true
    })
    
    this.emit('STATE_UPDATE', this.gameState)
  }

  /**
   * 恢复游戏
   */
  public resumeGame(): void {
    if (this.isPaused && this.pendingPhaseTransition) {
      this.isPaused = false
      
      // 更新游戏状态
      this.gameState.isPaused = false
      this.gameState.pauseReason = undefined
      
      this.addGameLog('▶️ 游戏恢复', true)
      this.emit('GAME_RESUMED')
      this.emit('STATE_UPDATE', this.gameState)
      
      // 执行之前暂停的操作
      const callback = this.pendingPhaseTransition
      this.pendingPhaseTransition = null
      callback()
    }
  }

  /**
   * 检查游戏是否暂停
   */
  public isGamePaused(): boolean {
    return this.isPaused
  }

  /**
   * 强制重试AI操作
   */
  public retryAIOperation(): void {
    if (this.isPaused) {
      // 刷新AI服务配置
      aiGameService.refreshAIConfiguration()
      
      if (aiGameService.isAIEnabled()) {
        this.resumeGame()
      } else {
        this.addGameLog('❌ AI服务仍不可用，请检查配置', true)
        this.emit('API_TEST_FAILED', { message: 'AI服务配置无效' })
      }
    }
  }
}

export default EnhancedWerewolfGameController 