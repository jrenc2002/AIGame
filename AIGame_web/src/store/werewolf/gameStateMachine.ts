import { GameState, GamePhase, Player } from './types'

// 状态机事件类型
export type StateMachineEvent = 
  | 'START_GAME'
  | 'START_NIGHT'
  | 'START_DAY_DISCUSSION'
  | 'START_DAY_VOTING'
  | 'END_VOTING'
  | 'GAME_OVER'
  | 'PHASE_TIMEOUT'

// 状态转换配置
interface PhaseConfig {
  duration: number // 持续时间（秒）
  canSkip: boolean // 是否可以提前结束
  nextPhase?: GamePhase
  actions?: (() => void)[] // 阶段开始时执行的动作
}

// 状态机类
export class WerewolfGameStateMachine {
  private currentState: GameState
  private phaseTimer: NodeJS.Timeout | null = null
  private eventListeners: Map<StateMachineEvent, (() => void)[]> = new Map()
  
  // 阶段配置
  private phaseConfigs: Record<GamePhase, PhaseConfig> = {
    preparation: {
      duration: 30,
      canSkip: true,
      nextPhase: 'night'
    },
    night: {
      duration: 120,
      canSkip: false,
      nextPhase: 'day_discussion'
    },
    day_discussion: {
      duration: 180,
      canSkip: true,
      nextPhase: 'day_voting'
    },
    day_voting: {
      duration: 60,
      canSkip: false,
      nextPhase: 'night'
    },
    game_over: {
      duration: 0,
      canSkip: false
    }
  }

  constructor(initialState: GameState) {
    this.currentState = { ...initialState }
  }

  // 获取当前状态
  getCurrentState(): GameState {
    return { ...this.currentState }
  }

  // 更新游戏状态
  updateState(newState: Partial<GameState>): void {
    this.currentState = { ...this.currentState, ...newState }
  }

  // 注册事件监听器
  on(event: StateMachineEvent, callback: () => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  // 触发事件
  private emit(event: StateMachineEvent): void {
    const listeners = this.eventListeners.get(event) || []
    listeners.forEach(callback => callback())
  }

  // 转换到新阶段
  transitionToPhase(phase: GamePhase): void {
    const config = this.phaseConfigs[phase]
    
    // 清除之前的定时器
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
      this.phaseTimer = null
    }

    // 更新状态
    this.currentState = {
      ...this.currentState,
      currentPhase: phase,
      phaseStartTime: Date.now(),
      phaseTimeLimit: config.duration
    }

    // 执行阶段动作
    if (config.actions) {
      config.actions.forEach(action => action())
    }

    // 设置阶段定时器
    if (config.duration > 0) {
      this.phaseTimer = setTimeout(() => {
        this.handlePhaseTimeout()
      }, config.duration * 1000)
    }

    // 触发阶段开始事件
    this.emit(`START_${phase.toUpperCase()}` as StateMachineEvent)

    console.log(`🎮 状态机：转换到 ${phase} 阶段，持续 ${config.duration} 秒`)
  }

  // 处理阶段超时
  private handlePhaseTimeout(): void {
    const currentPhase = this.currentState.currentPhase
    const config = this.phaseConfigs[currentPhase]
    
    this.emit('PHASE_TIMEOUT')
    
    // 自动转换到下一阶段
    if (config.nextPhase) {
      this.transitionToPhase(config.nextPhase)
    }
  }

  // 检查是否可以进入下一阶段
  canAdvancePhase(): boolean {
    const currentPhase = this.currentState.currentPhase
    const config = this.phaseConfigs[currentPhase]
    return config.canSkip
  }

  // 手动推进到下一阶段
  advancePhase(): boolean {
    if (!this.canAdvancePhase()) {
      return false
    }

    const currentPhase = this.currentState.currentPhase
    const config = this.phaseConfigs[currentPhase]
    
    if (config.nextPhase) {
      this.transitionToPhase(config.nextPhase)
      return true
    }
    
    return false
  }

  // 开始游戏
  startGame(): void {
    this.emit('START_GAME')
    this.transitionToPhase('preparation')
  }

  // 结束游戏
  endGame(winner?: 'villager' | 'werewolf'): void {
    this.currentState = {
      ...this.currentState,
      currentPhase: 'game_over',
      isGameActive: false,
      winner
    }
    
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
      this.phaseTimer = null
    }
    
    this.emit('GAME_OVER')
  }

  // 检查游戏胜负
  checkGameEnd(): 'villager' | 'werewolf' | null {
    const alivePlayers = this.currentState.players.filter(p => p.status === 'active')
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

  // 获取剩余时间
  getRemainingTime(): number {
    const now = Date.now()
    const elapsed = Math.floor((now - this.currentState.phaseStartTime) / 1000)
    return Math.max(0, this.currentState.phaseTimeLimit - elapsed)
  }

  // 销毁状态机
  destroy(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
      this.phaseTimer = null
    }
    this.eventListeners.clear()
  }

  // 游戏流程自动化管理
  setupAutomaticFlow(): void {
    // 准备阶段结束后自动进入夜晚
    this.on('PHASE_TIMEOUT', () => {
      if (this.currentState.currentPhase === 'preparation') {
        this.transitionToPhase('night')
      }
    })

    // 夜晚阶段结束后自动进入白天讨论
    this.on('PHASE_TIMEOUT', () => {
      if (this.currentState.currentPhase === 'night') {
        this.processNightActions()
        this.transitionToPhase('day_discussion')
      }
    })

    // 白天讨论结束后自动进入投票
    this.on('PHASE_TIMEOUT', () => {
      if (this.currentState.currentPhase === 'day_discussion') {
        this.transitionToPhase('day_voting')
      }
    })

    // 投票结束后处理结果
    this.on('PHASE_TIMEOUT', () => {
      if (this.currentState.currentPhase === 'day_voting') {
        this.processVotingResults()
        
        // 检查游戏是否结束
        const winner = this.checkGameEnd()
        if (winner) {
          this.endGame(winner)
        } else {
          // 进入下一轮夜晚
          this.currentState.currentRound++
          this.transitionToPhase('night')
        }
      }
    })
  }

  // 处理夜晚行动
  private processNightActions(): void {
    // TODO: 实现夜晚行动处理逻辑
    console.log('🌙 处理夜晚行动...')
  }

  // 处理投票结果
  private processVotingResults(): void {
    // TODO: 实现投票结果处理逻辑
    console.log('��️ 处理投票结果...')
  }
} 