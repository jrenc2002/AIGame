import { useState, useCallback } from 'react'
import { GameManager, GameInstance } from '../core/GameManager'
import { GameState } from '../core/game/GameEngine'

// Hook返回类型
export interface UseGameManagerReturn {
  // 状态
  isLoading: boolean
  error: string | null
  
  // 游戏操作
  createGame: (config?: any) => Promise<string>
  startGame: (gameId: string) => Promise<void>
  executeAction: (gameId: string, playerId: string, action: any) => Promise<void>
  
  // 实用功能
  getGame: (gameId: string) => GameInstance | null
  getGameState: (gameId: string) => GameState | null
  clearError: () => void
}

// 游戏管理器Hook - 专注于操作，不维护状态
export function useGameManager(): UseGameManagerReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const gameManager = GameManager.getInstance()

  // 创建游戏
  const createGame = useCallback(async (config?: any): Promise<string> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const newGameId = await gameManager.createWerewolfGame(
        config?.gameId || `werewolf_${Date.now()}`,
        config?.playerCount || 9,
        config?.aiPlayerCount || 8,
        config?.aiProvider || 'openai'
      )
      
      return newGameId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [gameManager])

  // 开始游戏
  const startGame = useCallback(async (gameId: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    
    try {
      await gameManager.startGame(gameId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [gameManager])

  // 执行玩家行动
  const executeAction = useCallback(async (gameId: string, playerId: string, action: any): Promise<void> => {
    setIsLoading(true)
    setError(null)
    
    try {
      await gameManager.executePlayerAction(gameId, playerId, action)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [gameManager])

  // 获取游戏实例
  const getGame = useCallback((gameId: string): GameInstance | null => {
    return gameManager.getGame(gameId)
  }, [gameManager])

  // 获取游戏状态
  const getGameState = useCallback((gameId: string): GameState | null => {
    return gameManager.getGameState(gameId)
  }, [gameManager])

  // 清除错误
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    createGame,
    startGame,
    executeAction,
    getGame,
    getGameState,
    clearError
  }
}

// 专用的狼人杀游戏Hook（保持向后兼容）
export function useWerewolfGame(gameId?: string) {
  const gameManager = useGameManager()
  
  // 专门用于狼人杀的便捷方法
  const createWerewolfGameInstance = useCallback(async (
    playerCount: number = 9,
    aiPlayerCount: number = 8
  ): Promise<string> => {
    return gameManager.createGame({
      playerCount,
      aiPlayerCount,
      gameId: `werewolf_${Date.now()}`
    })
  }, [gameManager])

  return {
    ...gameManager,
    createWerewolfGame: createWerewolfGameInstance
  }
} 