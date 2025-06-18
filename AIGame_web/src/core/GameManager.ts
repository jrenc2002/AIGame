import { GameEngine, GameState, GamePlayer } from './game/GameEngine'
import { AIClientFactory, AIProvider } from './ai/AIClientFactory'
import { hasValidAPIConfig } from '../lib/apiConfig'

// 目前支持的游戏类型（专注狼人杀，未来可扩展）
export type GameType = 'werewolf'

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
      
      // 创建初始状态
      const initialState = {
        gameId: config.gameId,
        isActive: false,
        isGameActive: false,
        currentPhase: 'preparation' as const,
        currentRound: 1,
        players: this.createWerewolfPlayers(config),
        nightActions: [],
        votes: [],
        deadPlayers: [],
        gameLogs: [],
      playerSpeeches: [],
        phaseStartTime: Date.now(),
        phaseTimeLimit: 0,
        settings: config.customSettings || {}
      }
      
      const engine = new WerewolfGameEngine(initialState)
      
      // 为AI玩家注册客户端
      await this.setupAIClients(engine, config)
      
      return engine
    })
  }

  // 创建游戏
  async createGame(config: GameConfig): Promise<string> {
    const factory = this.gameFactories.get(config.gameType)
    if (!factory) {
      throw new Error(`不支持的游戏类型: ${config.gameType}`)
    }

    try {
      const engine = await factory(config)
      
      const gameInstance: GameInstance = {
        gameId: config.gameId,
        gameType: config.gameType,
        engine,
        status: 'waiting',
        createdAt: Date.now(),
        players: engine.getGameState().players.map(p => ({
          id: p.id,
          name: p.name,
          isAI: p.isAI || !p.isPlayer,
          status: p.status === 'alive' ? 'active' : p.status === 'dead' ? 'eliminated' : p.status
        }))
      }

      this.games.set(config.gameId, gameInstance)
      
      // 监听游戏事件
      this.setupGameEventListeners(gameInstance)
      
      console.log(`🎮 创建${config.gameType}游戏成功: ${config.gameId}`)
      return config.gameId
    } catch (error) {
      console.error(`创建游戏失败:`, error)
      throw error
    }
  }

  // 便捷方法：创建狼人杀游戏
  async createWerewolfGame(
    gameId: string = `werewolf_${Date.now()}`, 
    playerCount: number = 9, 
    aiPlayerCount: number = 8,
    aiProvider: AIProvider = 'openai'
  ): Promise<string> {
    return this.createGame({
      gameType: 'werewolf',
      gameId,
      playerCount,
      aiPlayerCount,
      aiProvider
    })
  }

  // 开始游戏
  async startGame(gameId: string): Promise<void> {
    const gameInstance = this.games.get(gameId)
    if (!gameInstance) {
      throw new Error(`游戏不存在: ${gameId}`)
    }

    if (gameInstance.status === 'playing') {
      throw new Error(`游戏 ${gameId} 状态异常，无法开始`)
    }

    try {
      // 在开始游戏前确认AI客户端设置完成
      if (gameInstance.status === 'waiting') {
        await gameInstance.engine.startGame()
        gameInstance.status = 'playing'
        console.log(`🚀 游戏开始: ${gameId}`)
      } else {
        console.warn(`⚠️ 游戏 ${gameId} 已经处于 ${gameInstance.status} 状态，跳过启动`)
      }
    } catch (error) {
      console.error(`启动游戏失败:`, error)
      throw error
    }
  }

  // 结束游戏
  async endGame(gameId: string, winner?: string): Promise<void> {
    const gameInstance = this.games.get(gameId)
    if (!gameInstance) {
      throw new Error(`游戏不存在: ${gameId}`)
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

  // 执行玩家行动
  async executePlayerAction(gameId: string, playerId: string, action: any): Promise<void> {
    const gameInstance = this.games.get(gameId)
    if (!gameInstance) {
      throw new Error(`游戏不存在: ${gameId}`)
    }

    if (gameInstance.status !== 'playing') {
      throw new Error(`游戏 ${gameId} 未激活`)
    }

    try {
      await gameInstance.engine.processPlayerAction(playerId, action)
    } catch (error) {
      console.error(`执行玩家行动失败:`, error)
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

  // 删除游戏
  removeGame(gameId: string): boolean {
    const gameInstance = this.games.get(gameId)
    if (gameInstance) {
      gameInstance.engine.destroy()
      this.games.delete(gameId)
      console.log(`🗑️ 删除游戏: ${gameId}`)
      return true
    }
    return false
  }

  // 清理所有游戏
  clearAllGames(): void {
    for (const [, gameInstance] of this.games) {
      gameInstance.engine.destroy()
    }
    this.games.clear()
    console.log('🧹 清理所有游戏')
  }

  // 获取游戏统计
  getGameStats(): {
    totalGames: number
    activeGames: number
    werewolfGames: number
  } {
    const totalGames = this.games.size
    const activeGames = Array.from(this.games.values()).filter(
      game => game.status === 'playing'
    ).length
    const werewolfGames = Array.from(this.games.values()).filter(
      game => game.gameType === 'werewolf'
    ).length

    return { totalGames, activeGames, werewolfGames }
  }

  // 创建狼人杀玩家列表
  private createWerewolfPlayers(config: GameConfig): any[] {
    const players: any[] = []
    
    // 统一玩家命名格式 - 让AI无法区分人类和AI玩家
    const totalPlayers = config.playerCount
    const humanPlayerCount = config.playerCount - config.aiPlayerCount
    
    // 创建所有玩家，使用统一的命名格式
    for (let i = 0; i < totalPlayers; i++) {
      const playerId = `player_${i + 1}`
      const playerName = `玩家${i + 1}`
      const isHuman = i < humanPlayerCount // 前面的玩家是人类，后面的是AI
      
      players.push({
        id: playerId,
        name: playerName,
        avatar: '',
        role: 'villager',
        camp: 'villager',
        status: 'active',
        isPlayer: isHuman,
        isAI: !isHuman,
        votesReceived: 0,
        hasVoted: false,
        hasUsedSkill: false,
        isProtected: false,
        isPoisoned: false,
        isSaved: false
      })
    }
    
    console.log(`🎭 创建玩家列表 - 总数:${totalPlayers}, 人类:${humanPlayerCount}, AI:${config.aiPlayerCount}`)
    console.log(`🎭 玩家详情:`, players.map(p => `${p.name}(${p.isPlayer ? 'Human' : 'AI'})`))
    
    return players
  }

  // 为AI玩家设置客户端
  private async setupAIClients(engine: GameEngine, config: GameConfig): Promise<void> {
    const gameState = engine.getGameState()
    const aiPlayers = gameState.players.filter(p => p.isAI)
    const provider = config.aiProvider || 'openai'
    
    if (!hasValidAPIConfig(provider)) {
      console.warn(`⚠️ 没有找到 ${provider} 的有效API密钥，AI客户端将无法正常工作`)
      throw new Error(`AI服务配置无效：没有找到有效的${provider}密钥，请先配置API密钥`)
    }
    
    let successCount = 0
    const totalCount = aiPlayers.length
    
    for (const player of aiPlayers) {
      try {
        // 使用createFromConfig优先从localStorage读取配置
        const aiClient = AIClientFactory.createFromConfig(provider)
        engine.registerAIClient(player.id, aiClient)
        successCount++
        console.log(`✅ 为AI玩家 ${player.id} 设置 ${provider} 客户端成功`)
      } catch (error) {
        console.warn(`⚠️ 为AI玩家 ${player.id} 设置AI客户端失败:`, error)
        const gameState = engine.getGameState()
        const playerIndex = gameState.players.findIndex(p => p.id === player.id)
        if (playerIndex !== -1) {
          gameState.players[playerIndex].status = 'inactive'
        }
      }
    }
    
    if (successCount === 0 && totalCount > 0) {
      console.warn(`⚠️ 所有AI客户端设置失败，游戏将无法正常运行`)
      throw new Error('AI服务不可用，请检查API配置')
    } else if (successCount < totalCount) {
      console.warn(`⚠️ 只有 ${successCount}/${totalCount} 个AI客户端设置成功`)
    } else if (successCount > 0) {
      console.log(`🤖 成功设置 ${successCount} 个 ${provider} AI客户端`)
    }
  }

  // 设置游戏事件监听器
  private setupGameEventListeners(gameInstance: GameInstance): void {
    const { engine, gameId } = gameInstance
    
    engine.on('game_ended', () => {
      gameInstance.status = 'finished'
      console.log(`🏁 游戏 ${gameId} 结束`)
    })
    
    engine.on('state_updated', () => {
      console.log(`📊 游戏 ${gameId} 状态更新`)
    })
  }
} 