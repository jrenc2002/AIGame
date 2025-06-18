import { AIClient, AIMessage, StreamingAIResponse } from '../ai/AIClient'

// 游戏状态接口
export interface GameState {
  gameId: string
  isActive: boolean
  currentPhase: string
  currentRound: number
  players: GamePlayer[]
  winner?: string
}

// 游戏玩家接口
export interface GamePlayer {
  id: string
  name: string
  isAI: boolean
  aiClient?: AIClient
  status: 'active' | 'inactive' | 'eliminated'
}

// AI行动请求
export interface AIActionRequest {
  gameId: string
  playerId: string
  phase: string
  round: number
  context: string
  availableActions: string[]
  gameState: any
  history?: string[]
}

// AI行动响应
export interface AIActionResponse {
  action?: string
  reasoning?: string
  confidence?: number
  message?: string
  content?: string
  metadata?: Record<string, any>
}

// 游戏事件
export interface GameEvent {
  type: string
  playerId?: string
  data: any
  timestamp: number
}

// 游戏引擎抽象基类
export abstract class GameEngine<TGameState extends GameState = GameState> {
  protected gameState: TGameState
  protected eventListeners: Map<string, ((event: GameEvent) => void)[]> = new Map()
  protected aiClients: Map<string, AIClient> = new Map()

  constructor(initialState: TGameState) {
    this.gameState = initialState
  }

  // 抽象方法：子类必须实现
  abstract getGameName(): string
  abstract initializeGame(): Promise<void>
  abstract processPlayerAction(playerId: string, action: any): Promise<void>
  abstract checkGameEnd(): string | null
  abstract buildAIPrompt(request: AIActionRequest): AIMessage[]

  // 获取当前游戏状态
  getGameState(): TGameState {
    return { ...this.gameState }
  }

  // 更新游戏状态
  protected updateGameState(updates: Partial<TGameState>): void {
    this.gameState = { ...this.gameState, ...updates }
    this.emitEvent('state_updated', undefined, updates)
  }

  // 注册AI客户端
  registerAIClient(playerId: string, client: AIClient): void {
    this.aiClients.set(playerId, client)
    const player = this.gameState.players.find(p => p.id === playerId)
    if (player) {
      player.aiClient = client
    }
  }

  // 请求AI行动（批量模式）
  async requestAIAction(request: AIActionRequest): Promise<AIActionResponse> {
    const client = this.aiClients.get(request.playerId)
    if (!client) {
      throw new Error(`No AI client registered for player ${request.playerId}`)
    }

    const messages = this.buildAIPrompt(request)
    
    try {
      const response = await client.chat(messages)
      return this.parseAIResponse(response.content, request)
    } catch (error) {
      console.error(`AI action failed for player ${request.playerId}:`, error)
      throw error
    }
  }

  // 请求AI行动（流式模式）
  async requestAIActionStream(
    request: AIActionRequest,
    onChunk: (chunk: StreamingAIResponse) => void
  ): Promise<AIActionResponse> {
    const client = this.aiClients.get(request.playerId)
    if (!client) {
      throw new Error(`No AI client registered for player ${request.playerId}`)
    }

    const messages = this.buildAIPrompt(request)
    
    try {
      const response = await client.streamChat(messages, onChunk)
      return this.parseAIResponse(response.content, request)
    } catch (error) {
      console.error(`AI stream action failed for player ${request.playerId}:`, error)
      throw error
    }
  }

  // 解析AI响应（子类可重写）
  protected parseAIResponse(content: string, request: AIActionRequest): AIActionResponse {
    // 默认的简单解析逻辑
    const lines = content.split('\n').filter(line => line.trim())
    const result: Partial<AIActionResponse> = {
      action: request.availableActions[0] || 'default',
      reasoning: content.slice(0, 100),
      confidence: 0.5,
      message: content.slice(0, 50)
    }

    // 尝试解析结构化响应
    for (const line of lines) {
      if (line.startsWith('ACTION:')) {
        result.action = line.replace('ACTION:', '').trim()
      } else if (line.startsWith('REASONING:')) {
        result.reasoning = line.replace('REASONING:', '').trim()
      } else if (line.startsWith('CONFIDENCE:')) {
        result.confidence = parseFloat(line.replace('CONFIDENCE:', '').trim()) || 0.5
      } else if (line.startsWith('MESSAGE:')) {
        result.message = line.replace('MESSAGE:', '').trim()
      }
    }

    return result as AIActionResponse
  }

  // 批量处理多个AI行动
  async processMultipleAIActions(requests: AIActionRequest[]): Promise<AIActionResponse[]> {
    const promises = requests.map(request => this.requestAIAction(request))
    return Promise.all(promises)
  }

  // 并发处理AI行动（带限制）
  async processAIActionsConcurrently(
    requests: AIActionRequest[], 
    concurrency: number = 3
  ): Promise<AIActionResponse[]> {
    const results: AIActionResponse[] = []
    
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map(request => this.requestAIAction(request))
      )
      results.push(...batchResults)
    }
    
    return results
  }

  // 事件系统
  on(eventType: string, callback: (event: GameEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, [])
    }
    this.eventListeners.get(eventType)!.push(callback)
  }

  off(eventType: string, callback: (event: GameEvent) => void): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  protected emitEvent(type: string, playerId?: string, data: any = {}): void {
    const event: GameEvent = {
      type,
      playerId,
      data,
      timestamp: Date.now()
    }

    const listeners = this.eventListeners.get(type) || []
    listeners.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error(`Error in event listener for ${type}:`, error)
      }
    })
  }

  // 游戏生命周期
  async startGame(): Promise<void> {
    this.updateGameState({ isActive: true } as Partial<TGameState>)
    await this.initializeGame()
    this.emitEvent('game_started')
  }

  async endGame(winner?: string): Promise<void> {
    this.updateGameState({ 
      isActive: false, 
      winner 
    } as Partial<TGameState>)
    this.emitEvent('game_ended', undefined, { winner })
  }

  // 清理资源
  destroy(): void {
    this.eventListeners.clear()
    this.aiClients.clear()
  }

  // 获取AI玩家列表
  getAIPlayers(): GamePlayer[] {
    return this.gameState.players.filter(p => p.isAI)
  }

  // 获取人类玩家列表
  getHumanPlayers(): GamePlayer[] {
    return this.gameState.players.filter(p => !p.isAI)
  }

  // 检查所有AI客户端健康状态
  async checkAIHealth(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    
    for (const [playerId, client] of this.aiClients) {
      try {
        const isHealthy = await client.healthCheck()
        results.set(playerId, isHealthy)
      } catch {
        results.set(playerId, false)
      }
    }
    
    return results
  }
} 