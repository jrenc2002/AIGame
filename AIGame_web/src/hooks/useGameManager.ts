import { useState, useEffect, useCallback, useRef } from 'react'
import { gameManager, GameInstance, GameType, createWerewolfGame, startWerewolfGame } from '../core/GameManager'
import { GameState, GamePlayer } from '../core/game/GameEngine'
import { StreamingAIResponse } from '../core/ai/AIClient'

// Hook返回类型
export interface UseGameManagerReturn {
  // 游戏状态
  currentGame: GameInstance | null
  gameState: GameState | null
  isLoading: boolean
  error: string | null
  
  // AI流式响应
  aiThinking: Map<string, string>
  aiStreamingActive: boolean
  
  // 游戏操作
  createGame: (gameType: GameType, config?: any) => Promise<string>
  startGame: (gameId: string) => Promise<void>
  endGame: (gameId: string, winner?: string) => Promise<void>
  joinGame: (gameId: string, player: Omit<GamePlayer, 'aiClient'>) => Promise<void>
  leaveGame: (gameId: string, playerId: string) => Promise<void>
  executeAction: (gameId: string, playerId: string, action: any) => Promise<void>
  
  // 游戏查询
  getGame: (gameId: string) => GameInstance | null
  getAllGames: () => GameInstance[]
  getGamesByType: (gameType: GameType) => GameInstance[]
  
  // 实用功能
  refreshGameState: () => void
  clearError: () => void
}

// 游戏管理器Hook
export function useGameManager(gameId?: string): UseGameManagerReturn {
  const [currentGame, setCurrentGame] = useState<GameInstance | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiThinking, setAiThinking] = useState<Map<string, string>>(new Map())
  const [aiStreamingActive, setAiStreamingActive] = useState(false)
  
  const gameStateUpdateInterval = useRef<NodeJS.Timeout | null>(null)

  // 初始化游戏状态
  useEffect(() => {
    if (gameId) {
      refreshGameState()
      
      // 设置定期更新游戏状态 (降低刷新频率)
      gameStateUpdateInterval.current = setInterval(() => {
        refreshGameState()
      }, 3000) // 每3秒更新一次，减少无必要的重渲染
      
      return () => {
        if (gameStateUpdateInterval.current) {
          clearInterval(gameStateUpdateInterval.current)
        }
      }
    }
  }, [gameId])

  // 刷新游戏状态
  const refreshGameState = useCallback(() => {
    if (!gameId) {
      console.log('🔄 refreshGameState: gameId为空，跳过刷新')
      return
    }
    
    console.log(`🔄 refreshGameState: 刷新游戏状态 ${gameId}`)
    const game = gameManager.getGame(gameId)
    
    if (game !== currentGame) {
      console.log(`🔄 refreshGameState: 游戏实例变化`, {
        old: currentGame?.gameId || 'null',
        new: game?.gameId || 'null'
      })
      setCurrentGame(game)
    }
    
    if (game) {
      try {
        const newState = game.engine.getGameState()
        console.log(`🔄 refreshGameState: 获取到新状态`, {
          gameId: newState.gameId,
          phase: newState.currentPhase,
          round: newState.currentRound,
          players: newState.players?.length || 0
        })
        
        // 只在状态真正变化时更新（简单的深度比较）
        setGameState(prevState => {
          if (!prevState || 
              prevState.gameId !== newState.gameId ||
              prevState.currentPhase !== newState.currentPhase ||
              prevState.currentRound !== newState.currentRound ||
              prevState.players?.length !== newState.players?.length) {
            console.log('🔄 refreshGameState: 状态已更新')
            return newState
          }
          console.log('🔄 refreshGameState: 状态无变化，跳过更新')
          return prevState
        })
      } catch (error) {
        console.error('🔄 refreshGameState: 获取游戏状态失败', error)
      }
    } else {
      console.log('🔄 refreshGameState: 游戏实例为null')
      setGameState(null)
    }
  }, [gameId, currentGame])

  // 创建游戏
  const createGame = useCallback(async (gameType: GameType, config?: any): Promise<string> => {
    setIsLoading(true)
    setError(null)
    
    try {
      let newGameId: string
      
      switch (gameType) {
        case 'werewolf':
          newGameId = await createWerewolfGame(
            config?.gameId || `werewolf_${Date.now()}`,
            config?.playerCount || 8,
            config?.aiPlayerCount || 7,
            config?.aiProvider || 'openai'
          )
          break
        default:
          throw new Error(`Unsupported game type: ${gameType}`)
      }
      
      // 设置AI流式响应监听
      setupAIStreamingListeners(newGameId)
      
      return newGameId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 开始游戏
  const startGame = useCallback(async (gameId: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    
    try {
      await gameManager.startGame(gameId)
      refreshGameState()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [refreshGameState])

  // 结束游戏
  const endGame = useCallback(async (gameId: string, winner?: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    
    try {
      await gameManager.endGame(gameId, winner)
      refreshGameState()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [refreshGameState])

  // 加入游戏
  const joinGame = useCallback(async (gameId: string, player: Omit<GamePlayer, 'aiClient'>): Promise<void> => {
    setIsLoading(true)
    setError(null)
    
    try {
      await gameManager.joinGame(gameId, player)
      refreshGameState()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [refreshGameState])

  // 离开游戏
  const leaveGame = useCallback(async (gameId: string, playerId: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    
    try {
      await gameManager.leaveGame(gameId, playerId)
      refreshGameState()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [refreshGameState])

  // 执行玩家行动
  const executeAction = useCallback(async (gameId: string, playerId: string, action: any): Promise<void> => {
    setIsLoading(true)
    setError(null)
    
    try {
      await gameManager.executePlayerAction(gameId, playerId, action)
      refreshGameState()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [refreshGameState])

  // 获取游戏
  const getGame = useCallback((gameId: string): GameInstance | null => {
    return gameManager.getGame(gameId)
  }, [])

  // 获取所有游戏
  const getAllGames = useCallback((): GameInstance[] => {
    return gameManager.getAllGames()
  }, [])

  // 获取指定类型的游戏
  const getGamesByType = useCallback((gameType: GameType): GameInstance[] => {
    return gameManager.getGamesByType(gameType)
  }, [])

  // 清除错误
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 设置AI流式响应监听器
  const setupAIStreamingListeners = useCallback((gameId: string) => {
    const game = gameManager.getGame(gameId)
    if (!game) return

    // 监听AI流式响应（这里需要扩展GameEngine来支持流式响应事件）
    game.engine.on('ai_streaming_start', (event) => {
      setAiStreamingActive(true)
      setAiThinking(prev => new Map(prev.set(event.playerId || '', '')))
    })

    game.engine.on('ai_streaming_chunk', (event) => {
      const { playerId, chunk } = event.data as { playerId: string, chunk: StreamingAIResponse }
      setAiThinking(prev => new Map(prev.set(playerId, chunk.content)))
    })

    game.engine.on('ai_streaming_end', (event) => {
      setAiStreamingActive(false)
      const { playerId } = event.data as { playerId: string }
      setAiThinking(prev => {
        const newMap = new Map(prev)
        newMap.delete(playerId)
        return newMap
      })
    })
  }, [])

  return {
    // 状态
    currentGame,
    gameState,
    isLoading,
    error,
    aiThinking,
    aiStreamingActive,
    
    // 操作
    createGame,
    startGame,
    endGame,
    joinGame,
    leaveGame,
    executeAction,
    
    // 查询
    getGame,
    getAllGames,
    getGamesByType,
    
    // 工具
    refreshGameState,
    clearError
  }
}

// 狼人杀专用Hook
export function useWerewolfGame(gameId?: string) {
  const gameManager = useGameManager(gameId)
  
  // 创建狼人杀游戏的便捷方法
  const createWerewolfGameEasy = useCallback(async (config?: {
    playerCount?: number
    aiPlayerCount?: number
    aiProvider?: 'openai' | 'qianfan' | 'local'
  }) => {
    const gameId = `werewolf_${Date.now()}`
    await gameManager.createGame('werewolf', {
      gameId,
      playerCount: config?.playerCount || 8,
      aiPlayerCount: config?.aiPlayerCount || 7,
      aiProvider: config?.aiProvider || 'openai'
    })
    return gameId
  }, [gameManager])

  // 快速开始狼人杀游戏
  const quickStartWerewolf = useCallback(async (config?: {
    playerCount?: number
    aiPlayerCount?: number
    aiProvider?: 'openai' | 'qianfan' | 'local'
  }) => {
    const gameId = await createWerewolfGameEasy(config)
    await gameManager.startGame(gameId)
    return gameId
  }, [createWerewolfGameEasy, gameManager])

  return {
    ...gameManager,
    createWerewolfGame: createWerewolfGameEasy,
    quickStartWerewolf
  }
}

// AI状态Hook
export function useAIStatus(gameId?: string) {
  const [aiHealth, setAiHealth] = useState<Map<string, boolean>>(new Map())
  const [isChecking, setIsChecking] = useState(false)

  const checkAIHealth = useCallback(async () => {
    if (!gameId) return
    
    setIsChecking(true)
    try {
      const game = gameManager.getGame(gameId)
      if (game) {
        const health = await game.engine.checkAIHealth()
        setAiHealth(health)
      }
    } catch (error) {
      console.error('AI健康检查失败:', error)
    } finally {
      setIsChecking(false)
    }
  }, [gameId])

  useEffect(() => {
    if (gameId) {
      checkAIHealth()
      
      // 定期检查AI健康状态
      const interval = setInterval(checkAIHealth, 30000) // 30秒检查一次
      return () => clearInterval(interval)
    }
  }, [gameId, checkAIHealth])

  return {
    aiHealth,
    isChecking,
    checkAIHealth
  }
} 