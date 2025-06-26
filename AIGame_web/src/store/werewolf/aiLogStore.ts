import { AIPromptLog, GamePhase } from './types'
import { v4 as uuidv4 } from 'uuid'

/**
 * AI日志存储管理器
 * 全局单例，用于记录所有AI请求的提示词和上下文信息
 */
export class AILogStore {
  private static instance: AILogStore
  private logs: AIPromptLog[] = []
  private maxLogs: number = 1000 // 最大保留日志数量

  private constructor() {}

  static getInstance(): AILogStore {
    if (!AILogStore.instance) {
      AILogStore.instance = new AILogStore()
    }
    return AILogStore.instance
  }

  /**
   * 添加AI请求日志
   */
  addLog(log: Omit<AIPromptLog, 'id' | 'timestamp'>): string {
    const logId = uuidv4()
    const newLog: AIPromptLog = {
      ...log,
      id: logId,
      timestamp: Date.now()
    }

    this.logs.unshift(newLog) // 最新的日志在前面

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    console.log(`📝 AI日志记录: ${log.playerName} - ${log.actionType}`)
    return logId
  }

  /**
   * 更新日志的AI响应部分
   */
  updateLogResponse(logId: string, response: {
    rawResponse: string
    parsedResponse: any
    processingTime: number
  }): void {
    const log = this.logs.find(l => l.id === logId)
    if (log) {
      log.aiResponse = response
      console.log(`✅ AI日志响应更新: ${logId}`)
    }
  }

  /**
   * 记录错误信息
   */
  updateLogError(logId: string, error: {
    message: string
    stack?: string
  }): void {
    const log = this.logs.find(l => l.id === logId)
    if (log) {
      log.error = error
      console.log(`❌ AI日志错误记录: ${logId} - ${error.message}`)
    }
  }

  /**
   * 获取所有日志
   */
  getAllLogs(): AIPromptLog[] {
    return [...this.logs]
  }

  /**
   * 按条件筛选日志
   */
  getFilteredLogs(filters: {
    playerId?: string
    gamePhase?: GamePhase
    actionType?: string
    hasError?: boolean
  }): AIPromptLog[] {
    return this.logs.filter(log => {
      if (filters.playerId && log.playerId !== filters.playerId) return false
      if (filters.gamePhase && log.gamePhase !== filters.gamePhase) return false
      if (filters.actionType && log.actionType !== filters.actionType) return false
      if (filters.hasError !== undefined && Boolean(log.error) !== filters.hasError) return false
      return true
    })
  }

  /**
   * 清除所有日志
   */
  clearLogs(): void {
    this.logs = []
    console.log('🗑️ AI日志已清空')
  }

  /**
   * 获取日志统计信息
   */
  getLogStats() {
    const total = this.logs.length
    const errors = this.logs.filter(log => log.error).length
    const players = new Set(this.logs.map(log => log.playerId)).size
    const phases = new Set(this.logs.map(log => log.gamePhase)).size

    return {
      total,
      errors,
      success: total - errors,
      players,
      phases,
      avgResponseTime: this.logs
        .filter(log => log.aiResponse?.processingTime)
        .reduce((sum, log) => sum + (log.aiResponse?.processingTime || 0), 0) / 
        Math.max(1, this.logs.filter(log => log.aiResponse?.processingTime).length)
    }
  }

  /**
   * 导出日志为JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * 从JSON导入日志
   */
  importLogs(jsonData: string): void {
    try {
      const importedLogs = JSON.parse(jsonData) as AIPromptLog[]
      this.logs = [...importedLogs, ...this.logs]
      
      // 限制总数量
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(0, this.maxLogs)
      }
      
      console.log(`📥 AI日志导入成功: ${importedLogs.length} 条`)
    } catch (error) {
      console.error('❌ AI日志导入失败:', error)
      throw new Error('日志格式无效')
    }
  }
}

// 导出全局实例
export const aiLogStore = AILogStore.getInstance() 