import { CoreMessage } from 'ai'
import { aiLogStore } from '@/store/werewolf/aiLogStore'
import { GamePhase, Player, GameState } from '@/store/werewolf/types'

export interface LoggedAIRequest {
  playerId: string
  playerName: string
  gamePhase: GamePhase
  round: number
  actionType: string
  gameState: GameState
  additionalContext?: string
  availableTargets?: string[]
}

/**
 * AI请求日志记录器
 * 自动记录所有AI请求的上下文、提示词和响应
 */
export class AILogger {
  
  /**
   * 记录AI请求开始
   * 返回日志ID，用于后续更新响应信息
   */
  static logRequest(
    request: LoggedAIRequest,
    messages: CoreMessage[],
    fullPrompt: string
  ): string {
    // 构建上下文信息
    const contextInfo = {
      systemPrompt: this.extractSystemPrompt(messages),
      gameContext: this.buildGameContext(request.gameState, request.playerId),
      speechHistory: this.buildSpeechHistory(request.gameState),
      eventHistory: this.buildEventHistory(request.gameState),
      reasoningMemory: this.buildReasoningMemory(request.gameState, request.playerId),
      availableTargets: request.availableTargets,
      additionalContext: request.additionalContext
    }

    // 创建日志条目
    const logEntry = {
      playerId: request.playerId,
      playerName: request.playerName,
      gamePhase: request.gamePhase,
      round: request.round,
      actionType: request.actionType,
      contextInfo,
      fullPrompt
    }

    return aiLogStore.addLog(logEntry)
  }

  /**
   * 记录AI响应
   */
  static logResponse(
    logId: string,
    rawResponse: string,
    parsedResponse: any,
    processingTime: number
  ): void {
    aiLogStore.updateLogResponse(logId, {
      rawResponse,
      parsedResponse,
      processingTime
    })
  }

  /**
   * 记录AI请求错误
   */
  static logError(logId: string, error: Error): void {
    aiLogStore.updateLogError(logId, {
      message: error.message,
      stack: error.stack
    })
  }

  /**
   * 提取系统提示词
   */
  private static extractSystemPrompt(messages: CoreMessage[]): string {
    const systemMessage = messages.find(msg => msg.role === 'system')
    return systemMessage?.content?.toString() || ''
  }

  /**
   * 构建游戏上下文
   */
  private static buildGameContext(gameState: GameState, playerId: string): string {
    const player = gameState.players.find(p => p.id === playerId)
    if (!player) return ''

    const alivePlayers = gameState.players.filter(p => p.status === 'active')
    const deadPlayers = gameState.players.filter(p => p.status === 'eliminated')

    return `游戏状态:
- 当前玩家: ${player.name} (${player.role})
- 当前轮数: ${gameState.currentRound}
- 当前阶段: ${gameState.currentPhase}
- 存活玩家: ${alivePlayers.map(p => `${p.name}(${p.id})`).join(', ')}
- 死亡玩家: ${deadPlayers.map(p => `${p.name}(${p.id})`).join(', ')}
- 总玩家数: ${gameState.players.length}`
  }

  /**
   * 构建发言历史
   */
  private static buildSpeechHistory(gameState: GameState): string {
    if (!gameState.playerSpeeches || gameState.playerSpeeches.length === 0) {
      return '暂无发言记录'
    }

    const recentSpeeches = gameState.playerSpeeches
      .filter(speech => speech.isVisible)
      .slice(-10) // 最近10条发言
      .map(speech => {
        const player = gameState.players.find(p => p.id === speech.playerId)
        const playerName = player?.name || '未知玩家'
        const timeStr = new Date(speech.timestamp).toLocaleTimeString()
        return `[${timeStr}] ${playerName}: ${speech.content}`
      })

    return recentSpeeches.length > 0 ? recentSpeeches.join('\n') : '暂无发言记录'
  }

  /**
   * 构建事件历史
   */
  private static buildEventHistory(gameState: GameState): string {
    if (!gameState.gameLogs || gameState.gameLogs.length === 0) {
      return '暂无游戏事件'
    }

    const recentEvents = gameState.gameLogs
      .filter(log => log.isPublic)
      .slice(-8) // 最近8个事件
      .map(log => {
        const timeStr = new Date(log.timestamp).toLocaleTimeString()
        return `[${timeStr}] 第${log.round}轮 ${log.phase}: ${log.action}`
      })

    return recentEvents.length > 0 ? recentEvents.join('\n') : '暂无游戏事件'
  }

  /**
   * 构建推理记忆
   */
  private static buildReasoningMemory(gameState: GameState, playerId: string): string {
    // 查找该玩家的推理记忆
    if (!gameState.aiReasoningMemories) {
      return ''
    }

    const memory = gameState.aiReasoningMemories.find(m => m.playerId === playerId)
    if (!memory) {
      return ''
    }

    const inferences = memory.inferences.map(inf => 
      `${inf.playerName}: 怀疑度${(inf.suspicionLevel * 100).toFixed(0)}% - ${inf.keyObservations.slice(-2).join(', ')}`
    ).join('\n')

    return `推理记忆:
当前策略: ${memory.gameStrategy}
对其他玩家的推断:
${inferences}
个人笔记: ${memory.personalNotes.slice(-3).join('; ')}`
  }

  /**
   * 获取当前日志统计
   */
  static getLogStats() {
    return aiLogStore.getLogStats()
  }

  /**
   * 清除所有日志
   */
  static clearAllLogs(): void {
    aiLogStore.clearLogs()
  }

  /**
   * 导出日志
   */
  static exportLogs(): string {
    return aiLogStore.exportLogs()
  }

  /**
   * 添加测试日志，用于验证日志系统
   */
  static addTestLog(): void {
    const testRequest: LoggedAIRequest = {
      playerId: 'test_player',
      playerName: '测试AI玩家',
      gamePhase: 'day_discussion' as GamePhase,
      round: 1,
      actionType: 'test_speech',
      gameState: {} as GameState,
      additionalContext: '这是一个测试日志'
    }

    const testMessages: CoreMessage[] = [
      { role: 'system', content: '测试系统提示词' },
      { role: 'user', content: '测试用户消息' }
    ]

    const logId = this.logRequest(testRequest, testMessages, '测试完整提示词')
    
    // 模拟AI响应
    setTimeout(() => {
      this.logResponse(logId, '测试AI响应', { message: '测试消息' }, 1000)
    }, 100)

    console.log('🧪 已添加测试日志，ID:', logId)
  }
} 