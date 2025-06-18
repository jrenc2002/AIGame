import React, { useState } from 'react'
import { useWerewolfGame } from '../../hooks/useGameManager'
import { AIProvider } from '../../core/ai/AIClientFactory'

interface NewWerewolfGameProps {
  onGameCreated?: (gameId: string) => void
}

export const NewWerewolfGame: React.FC<NewWerewolfGameProps> = ({ onGameCreated }) => {
  const [gameId, setGameId] = useState<string>('')
  const [playerName, setPlayerName] = useState('玩家1')
  const [gameConfig, setGameConfig] = useState({
    playerCount: 8,
    aiPlayerCount: 7,
    aiProvider: 'openai' as AIProvider
  })

  const {
    isLoading,
    error,
    createWerewolfGame,
    startGame,
    executeAction,
    clearError
  } = useWerewolfGame()

  // 创建游戏
  const handleCreateGame = async () => {
    try {
      const newGameId = await createWerewolfGame(
        gameConfig.playerCount,
        gameConfig.aiPlayerCount
      )
      setGameId(newGameId)
      onGameCreated?.(newGameId)
    } catch (err) {
      console.error('创建游戏失败:', err)
    }
  }

  // 开始游戏
  const handleStartGame = async () => {
    if (!gameId) return
    try {
      await startGame(gameId)
    } catch (err) {
      console.error('开始游戏失败:', err)
    }
  }

  // 渲染游戏配置
  const renderGameConfig = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">游戏配置</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            玩家姓名
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入你的姓名"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI提供商
          </label>
          <select
            value={gameConfig.aiProvider}
            onChange={(e) => setGameConfig(prev => ({ ...prev, aiProvider: e.target.value as AIProvider }))}
            aria-label="AI提供商选择"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="openai">OpenAI (NextAPI)</option>
            <option value="qianfan">千帆</option>
            <option value="local">本地模型</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            总玩家数: {gameConfig.playerCount}
          </label>
          <input
            type="range"
            min="6"
            max="12"
            value={gameConfig.playerCount}
            onChange={(e) => {
              const playerCount = parseInt(e.target.value)
              setGameConfig(prev => ({ 
                ...prev, 
                playerCount,
                aiPlayerCount: Math.min(prev.aiPlayerCount, playerCount - 1)
              }))
            }}
            aria-label={`总玩家数: ${gameConfig.playerCount}`}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI玩家数: {gameConfig.aiPlayerCount}
          </label>
          <input
            type="range"
            min="1"
            max={gameConfig.playerCount - 1}
            value={gameConfig.aiPlayerCount}
            onChange={(e) => setGameConfig(prev => ({ ...prev, aiPlayerCount: parseInt(e.target.value) }))}
            aria-label={`AI玩家数: ${gameConfig.aiPlayerCount}`}
            className="w-full"
          />
        </div>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={handleCreateGame}
          disabled={isLoading}
          className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '创建中...' : '创建游戏'}
        </button>
        
        {gameId && (
          <button
            onClick={handleStartGame}
            disabled={isLoading}
            className="flex-1 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '启动中...' : '开始游戏'}
          </button>
        )}
      </div>
    </div>
  )

  // 渲染错误信息
  const renderError = () => {
    if (!error) return null

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="text-red-400 mr-3">⚠️</div>
            <div>
              <h4 className="text-red-800 font-medium">出现错误</h4>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">创建狼人杀游戏</h2>
      
      {renderError()}
      {renderGameConfig()}
      
      {gameId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-green-400 mr-3">✅</div>
            <div>
              <h4 className="text-green-800 font-medium">游戏创建成功</h4>
              <p className="text-green-600 text-sm">游戏ID: {gameId}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewWerewolfGame 