import { GameEngine, GameState, GamePlayer } from './game/GameEngine'
import { AIClient } from './ai/AIClient'
import { AIClientFactory, AIProvider } from './ai/AIClientFactory'
import { getValidAPIKey, hasValidAPIConfig } from '../lib/apiConfig'

// 游戏类型
export type GameType = 'werewolf' | 'cricket' | 'poker' | 'mahjong'

// 游戏配置
export interface GameConfig {
  gameType: GameType
  gameId: string
  playerCount: number
  aiPlayerCount: number
  aiProvider?: AIProvider
  customSettings?: Record<string, any>
}

// 游戏实例信息
export interface GameInstance {
  gameId: string
  gameType: GameType
  engine: GameEngine
  status: 'waiting' | 'playing' | 'finished'
  createdAt: number
  players: GamePlayer[]
}

// 游戏管理器
export class GameManager {
  private static instance: GameManager
  private games: Map<string, GameInstance> = new Map()
  private gameFactories: Map<GameType, (config: GameConfig) => Promise<GameEngine>> = new Map()

  private constructor() {
    this.registerGameFactories()
  }

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager()
    }
    return GameManager.instance
  }

  // 注册游戏工厂
  private registerGameFactories(): void {
    // 狼人杀游戏工厂
    this.gameFactories.set('werewolf', async (config: GameConfig) => {
      const { WerewolfGameEngine } = await import('../games/werewolf/WerewolfGameEngine')
      
      // 创建初始状态，确保包含所有必需属性
      const initialState = {
        gameId: config.gameId,
        isActive: false, // 基础GameState必需属性
        isGameActive: false, // 狼人杀特有属性
        currentPhase: 'preparation' as const,
        currentRound: 1,
        players: this.createWerewolfPlayers(config),
        nightActions: [],
        votes: [],
        deadPlayers: [],
        gameLogs: [],
        phaseStartTime: Date.now(),
        phaseTimeLimit: 0,
        settings: config.customSettings || {}
      }
      
      const engine = new WerewolfGameEngine(initialState)
      
      // 为AI玩家注册客户端
      await this.setupAIClients(engine, config)
      
      return engine as GameEngine // 类型断言解决继承问题
    })

    // TODO: 注册其他游戏工厂
    // this.gameFactories.set('cricket', async (config) => { ... })
    // this.gameFactories.set('poker', async (config) => { ... })
  }

  // 创建游戏
  async createGame(config: GameConfig): Promise<string> {
    const factory = this.gameFactories.get(config.gameType)
    if (!factory) {
      throw new Error(`Unsupported game type: ${config.gameType}`)
    }

    try {
      const engine = await factory(config)
      
      const gameInstance: GameInstance = {
        gameId: config.gameId,
        gameType: config.gameType,
        engine,
        status: 'waiting',
        createdAt: Date.now(),
        players: this.convertToGamePlayers(engine.getGameState().players)
      }

      this.games.set(config.gameId, gameInstance)
      
      // 监听游戏事件
      this.setupGameEventListeners(gameInstance)
      
      console.log(`🎮 创建游戏成功: ${config.gameType} (${config.gameId})`)
      return config.gameId
    } catch (error) {
      console.error(`创建游戏失败:`, error)
      throw error
    }
  }

  // 开始游戏
  async startGame(gameId: string): Promise<void> {
    const gameInstance = this.games.get(gameId)
    if (!gameInstance) {
      throw new Error(`Game not found: ${gameId}`)
    }

    if (gameInstance.status !== 'waiting') {
      throw new Error(`Game ${gameId} is not in waiting status`)
    }

    try {
      await gameInstance.engine.startGame()
      gameInstance.status = 'playing'
      console.log(`🚀 游戏开始: ${gameId}`)
    } catch (error) {
      console.error(`启动游戏失败:`, error)
      throw error
    }
  }

  // 结束游戏
  async endGame(gameId: string, winner?: string): Promise<void> {
    const gameInstance = this.games.get(gameId)
    if (!gameInstance) {
      throw new Error(`Game not found: ${gameId}`)
    }

    try {
      await gameInstance.engine.endGame(winner)
      gameInstance.status = 'finished'
      console.log(`🏁 游戏结束: ${gameId}, 获胜者: ${winner || '无'}`)
    } catch (error) {
      console.error(`结束游戏失败:`, error)
      throw error
    }
  }

  // 获取游戏实例
  getGame(gameId: string): GameInstance | null {
    return this.games.get(gameId) || null
  }

  // 获取游戏状态
  getGameState(gameId: string): GameState | null {
    const gameInstance = this.games.get(gameId)
    return gameInstance ? gameInstance.engine.getGameState() : null
  }

  // 获取所有游戏
  getAllGames(): GameInstance[] {
    return Array.from(this.games.values())
  }

  // 获取指定类型的游戏
  getGamesByType(gameType: GameType): GameInstance[] {
    return Array.from(this.games.values()).filter(game => game.gameType === gameType)
  }

  // 删除游戏
  removeGame(gameId: string): boolean {
    const gameInstance = this.games.get(gameId)
    if (gameInstance) {
      // 清理资源
      gameInstance.engine.destroy()
      this.games.delete(gameId)
      console.log(`🗑️ 删除游戏: ${gameId}`)
      return true
    }
    return false
  }

  // 清理所有游戏
  clearAllGames(): void {
    for (const [gameId, gameInstance] of this.games) {
      gameInstance.engine.destroy()
    }
    this.games.clear()
    console.log('🧹 清理所有游戏')
  }

  // 玩家加入游戏
  async joinGame(gameId: string, player: Omit<GamePlayer, 'aiClient'>): Promise<void> {
    const gameInstance = this.games.get(gameId)
    if (!gameInstance) {
      throw new Error(`Game not found: ${gameId}`)
    }

    if (gameInstance.status !== 'waiting') {
      throw new Error(`Cannot join game ${gameId}: game is ${gameInstance.status}`)
    }

    const gameState = gameInstance.engine.getGameState()
    
    // 转换为狼人杀玩家格式
    const werewolfPlayer = {
      id: player.id,
      name: player.name,
      avatar: '',
      role: 'villager' as const,
      camp: 'villager' as const,
      status: 'alive' as const,
      isPlayer: !player.isAI, // 狼人杀专用属性
      isAI: player.isAI, // 通用引擎属性
      votesReceived: 0,
      hasVoted: false,
      hasUsedSkill: false,
      isProtected: false,
      isPoisoned: false,
      isSaved: false
    }
    
    const updatedPlayers = [...gameState.players, werewolfPlayer]
    
    // 更新游戏状态
    gameInstance.engine['updateGameState']({ players: updatedPlayers })
    gameInstance.players = [...gameInstance.players, {
      id: player.id,
      name: player.name,
      isAI: player.isAI,
      status: this.mapWerewolfStatusToGameStatus('alive')
    }]
    
    console.log(`👤 玩家 ${player.name} 加入游戏 ${gameId}`)
  }

  // 玩家离开游戏
  async leaveGame(gameId: string, playerId: string): Promise<void> {
    const gameInstance = this.games.get(gameId)
    if (!gameInstance) {
      throw new Error(`Game not found: ${gameId}`)
    }

    const gameState = gameInstance.engine.getGameState()
    const updatedPlayers = gameState.players.filter(p => p.id !== playerId)
    
    // 更新游戏状态
    gameInstance.engine['updateGameState']({ players: updatedPlayers })
    gameInstance.players = this.convertToGamePlayers(updatedPlayers)
    
    console.log(`👋 玩家 ${playerId} 离开游戏 ${gameId}`)
  }

  // 执行玩家行动
  async executePlayerAction(gameId: string, playerId: string, action: any): Promise<void> {
    const gameInstance = this.games.get(gameId)
    if (!gameInstance) {
      throw new Error(`Game not found: ${gameId}`)
    }

    if (gameInstance.status !== 'playing') {
      throw new Error(`Game ${gameId} is not active`)
    }

    try {
      await gameInstance.engine.processPlayerAction(playerId, action)
    } catch (error) {
      console.error(`执行玩家行动失败:`, error)
      throw error
    }
  }

  // 获取游戏统计信息
  getGameStats(): {
    totalGames: number
    activeGames: number
    gamesByType: Record<GameType, number>
  } {
    const games = Array.from(this.games.values())
    const gamesByType = {} as Record<GameType, number>
    
    games.forEach(game => {
      gamesByType[game.gameType] = (gamesByType[game.gameType] || 0) + 1
    })

    return {
      totalGames: games.length,
      activeGames: games.filter(g => g.status === 'playing').length,
      gamesByType
    }
  }

  // 健康检查所有游戏的AI
  async healthCheckAllGames(): Promise<Map<string, Map<string, boolean>>> {
    const results = new Map<string, Map<string, boolean>>()
    
    for (const [gameId, gameInstance] of this.games) {
      try {
        const gameHealth = await gameInstance.engine.checkAIHealth()
        results.set(gameId, gameHealth)
      } catch (error) {
        console.error(`健康检查失败 ${gameId}:`, error)
        results.set(gameId, new Map())
      }
    }
    
    return results
  }

  // 创建狼人杀玩家列表
  private createWerewolfPlayers(config: GameConfig): any[] {
    const players: any[] = []
    
    // 创建人类玩家
    const humanPlayerCount = config.playerCount - config.aiPlayerCount
    for (let i = 0; i < humanPlayerCount; i++) {
      players.push({
        id: `human_${i + 1}`,
        name: `玩家${i + 1}`,
        avatar: '',
        role: 'villager',
        camp: 'villager',
        status: 'alive',
        isPlayer: true, // 狼人杀引擎使用 isPlayer
        isAI: false, // 通用引擎使用 isAI
        votesReceived: 0,
        hasVoted: false,
        hasUsedSkill: false,
        isProtected: false,
        isPoisoned: false,
        isSaved: false
      })
    }
    
    // 创建AI玩家
    for (let i = 0; i < config.aiPlayerCount; i++) {
      players.push({
        id: `ai_${i + 1}`,
        name: `AI玩家${i + 1}`,
        avatar: '',
        role: 'villager',
        camp: 'villager',
        status: 'alive',
        isPlayer: false, // AI玩家（狼人杀专用）
        isAI: true, // AI玩家（通用引擎）
        votesReceived: 0,
        hasVoted: false,
        hasUsedSkill: false,
        isProtected: false,
        isPoisoned: false,
        isSaved: false
      })
    }
    
    return players
  }

  // 为AI玩家设置客户端
  private async setupAIClients(engine: GameEngine, config: GameConfig): Promise<void> {
    const gameState = engine.getGameState()
    const aiPlayers = gameState.players.filter(p => p.isAI) // 使用标准的 isAI 属性
    const provider = config.aiProvider || 'openai'
    
    // 检查是否有有效的API配置
    if (!hasValidAPIConfig(provider)) {
      console.warn(`⚠️ 没有找到 ${provider} 的有效API密钥，AI客户端将无法正常工作`)
      return
    }
    
    let successCount = 0
    const totalCount = aiPlayers.length
    
    for (const player of aiPlayers) {
      try {
        const aiClient = AIClientFactory.createFromEnv(provider)
        engine.registerAIClient(player.id, aiClient)
        successCount++
        console.log(`✅ 为玩家 ${player.id} 成功设置 ${provider} AI客户端`)
      } catch (error) {
        console.warn(`⚠️ 为玩家 ${player.id} 设置AI客户端失败:`, error)
        // 将AI玩家标记为非活跃状态（但不删除）
        const gameState = engine.getGameState()
        const playerIndex = gameState.players.findIndex(p => p.id === player.id)
        if (playerIndex !== -1) {
          gameState.players[playerIndex].status = 'inactive'
        }
      }
    }
    
    if (successCount === 0 && totalCount > 0) {
      console.warn(`⚠️ 所有AI客户端设置失败，游戏将以纯人类模式运行`)
    } else if (successCount < totalCount) {
      console.warn(`⚠️ 只有 ${successCount}/${totalCount} 个AI客户端设置成功`)
    } else if (successCount > 0) {
      console.log(`🤖 成功设置 ${successCount} 个 ${provider} AI客户端`)
    }
  }

  // 转换狼人杀玩家为通用GamePlayer格式
  private convertToGamePlayers(players: any[]): GamePlayer[] {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      isAI: p.isAI || !p.isPlayer, // 兼容两种表示方式
      status: this.mapWerewolfStatusToGameStatus(p.status)
    }))
  }

  // 映射狼人杀状态到通用游戏状态
  private mapWerewolfStatusToGameStatus(werewolfStatus: string): 'active' | 'inactive' | 'eliminated' {
    switch (werewolfStatus) {
      case 'alive':
        return 'active'
      case 'dead':
        return 'eliminated'
      default:
        return 'inactive'
    }
  }

  // 设置游戏事件监听器
  private setupGameEventListeners(gameInstance: GameInstance): void {
    const { engine, gameId } = gameInstance
    
    // 监听游戏结束事件
    engine.on('game_ended', (event) => {
      gameInstance.status = 'finished'
      console.log(`🏁 游戏 ${gameId} 结束，获胜者: ${event.data.winner || '无'}`)
    })
    
    // 监听状态更新事件
    engine.on('state_updated', (event) => {
      // 可以在这里添加状态同步逻辑
      console.log(`📊 游戏 ${gameId} 状态更新`)
    })
    
    // 监听阶段变化事件
    engine.on('phase_changed', (event) => {
      console.log(`🔄 游戏 ${gameId} 阶段变化: ${event.data.phase}`)
    })
  }
}

// 导出单例实例
export const gameManager = GameManager.getInstance()

// 便捷函数
export async function createWerewolfGame(
  gameId: string, 
  playerCount: number = 8, 
  aiPlayerCount: number = 7,
  aiProvider: AIProvider = 'openai'
): Promise<string> {
  return gameManager.createGame({
    gameType: 'werewolf',
    gameId,
    playerCount,
    aiPlayerCount,
    aiProvider
  })
}

export async function startWerewolfGame(gameId: string): Promise<void> {
  return gameManager.startGame(gameId)
}

export function getWerewolfGame(gameId: string): GameInstance | null {
  return gameManager.getGame(gameId)
} 