import React, { useState, useEffect } from 'react'
import { useWerewolfGame, useAIStatus } from '../../hooks/useGameManager'
import { GamePlayer } from '../../core/game/GameEngine'
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
    currentGame,
    gameState,
    isLoading,
    error,
    aiThinking,
    aiStreamingActive,
    createWerewolfGame,
    quickStartWerewolf,
    startGame,
    joinGame,
    executeAction,
    clearError
  } = useWerewolfGame(gameId)

  const { aiHealth, isChecking, checkAIHealth } = useAIStatus(gameId)

  // 创建游戏
  const handleCreateGame = async () => {
    try {
      const newGameId = await createWerewolfGame(gameConfig)
      setGameId(newGameId)
      onGameCreated?.(newGameId)
      
      // 自动加入游戏
      await joinGame(newGameId, {
        id: 'human_1',
        name: playerName,
        isAI: false,
        status: 'active'
      })
    } catch (err) {
      console.error('创建游戏失败:', err)
    }
  }

  // 快速开始游戏
  const handleQuickStart = async () => {
    try {
      const newGameId = await quickStartWerewolf(gameConfig)
      setGameId(newGameId)
      onGameCreated?.(newGameId)
    } catch (err) {
      console.error('快速开始失败:', err)
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

  // 执行玩家行动
  const handlePlayerAction = async (action: any) => {
    if (!gameId) return
    try {
      await executeAction(gameId, 'human_1', action)
    } catch (err) {
      console.error('执行行动失败:', err)
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
        
        <button
          onClick={handleQuickStart}
          disabled={isLoading}
          className="flex-1 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '启动中...' : '快速开始'}
        </button>
      </div>
    </div>
  )

  // 渲染游戏状态
  const renderGameStatus = () => {
    if (!currentGame || !gameState) return null

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">游戏状态</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-sm text-gray-600">游戏ID:</span>
            <p className="font-mono text-sm">{currentGame.gameId}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">状态:</span>
            <p className={`font-semibold ${
              currentGame.status === 'playing' ? 'text-green-600' :
              currentGame.status === 'waiting' ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              {currentGame.status === 'playing' ? '进行中' :
               currentGame.status === 'waiting' ? '等待中' : '已结束'}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">当前阶段:</span>
            <p className="font-semibold">{gameState.currentPhase}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">回合数:</span>
            <p className="font-semibold">{gameState.currentRound}</p>
          </div>
        </div>
        
        {currentGame.status === 'waiting' && (
          <button
            onClick={handleStartGame}
            disabled={isLoading}
            className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? '启动中...' : '开始游戏'}
          </button>
        )}
      </div>
    )
  }

  // 渲染玩家列表
  const renderPlayerList = () => {
    if (!gameState) return null

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">玩家列表</h3>
        
        <div className="space-y-2">
          {gameState.players.map((player) => (
            <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  player.status === 'active' ? 'bg-green-500' :
                  player.status === 'inactive' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="font-medium">{player.name}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  player.isAI ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                }`}>
                  {player.isAI ? 'AI' : '人类'}
                </span>
              </div>
              
              {player.isAI && aiHealth.has(player.id) && (
                <div className={`text-xs px-2 py-1 rounded ${
                  aiHealth.get(player.id) ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {aiHealth.get(player.id) ? '健康' : '异常'}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            总计: {gameState.players.length} 人 (AI: {gameState.players.filter(p => p.isAI).length})
          </span>
          <button
            onClick={checkAIHealth}
            disabled={isChecking}
            className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            {isChecking ? '检查中...' : '检查AI状态'}
          </button>
        </div>
      </div>
    )
  }

  // 渲染AI思考状态
  const renderAIThinking = () => {
    if (!aiStreamingActive && aiThinking.size === 0) return null

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">AI思考中...</h3>
        
        {Array.from(aiThinking.entries()).map(([playerId, content]) => (
          <div key={playerId} className="mb-3 p-3 bg-blue-50 rounded-md">
            <div className="text-sm font-medium text-blue-600 mb-1">
              {gameState?.players.find(p => p.id === playerId)?.name || playerId}
            </div>
            <div className="text-sm text-gray-700">
              {content || '正在思考...'}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 渲染错误信息
  const renderError = () => {
    if (!error) return null

    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-red-800 font-medium">错误</h4>
            <p className="text-red-700 text-sm mt-1">{error}</p>
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">AI狼人杀游戏</h2>
      
      {renderError()}
      {renderGameConfig()}
      {renderGameStatus()}
      {renderPlayerList()}
      {renderAIThinking()}
      
      {/* 调试信息 */}
      {process.env.NODE_ENV === 'development' && gameState && (
        <div className="bg-gray-100 rounded-lg p-4 mt-6">
          <h4 className="font-medium mb-2">调试信息</h4>
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify(gameState, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default NewWerewolfGame 