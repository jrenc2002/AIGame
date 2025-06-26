import React, { useState, useMemo } from 'react'
import { AIPromptLog } from '@/store/werewolf/types'

// 格式化行动类型显示名称
const getActionTypeDisplayName = (actionType: string): string => {
  const actionTypeMap: Record<string, string> = {
    'speech': '💬 发言',
    'speech_stream': '💬 流式发言',
    'decision_kill': '🐺 杀人决策',
    'decision_check': '🔮 查验决策', 
    'decision_witch_action': '💊 女巫决策',
    'decision_guard': '🛡️ 守卫决策',
    'decision_shoot': '🔫 猎人决策',
    'decision_vote': '🗳️ 投票决策',
    'decision_night': '🌙 夜晚行动',
    'test_speech': '🧪 测试发言'
  }
  
  return actionTypeMap[actionType] || `📋 ${actionType}`
}

interface AIPromptLogViewerProps {
  logs: AIPromptLog[]
  isOpen: boolean
  onClose: () => void
}

export const AIPromptLogViewer: React.FC<AIPromptLogViewerProps> = ({
  logs,
  isOpen,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPhase, setSelectedPhase] = useState<string>('all')
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all')
  const [selectedActionType, setSelectedActionType] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<AIPromptLog | null>(null)
  const [activeTab, setActiveTab] = useState<'context' | 'prompt' | 'response' | 'raw'>('context')

  // 筛选和搜索日志
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.contextInfo.systemPrompt.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesPhase = selectedPhase === 'all' || log.gamePhase === selectedPhase
      const matchesPlayer = selectedPlayer === 'all' || log.playerId === selectedPlayer
      const matchesActionType = selectedActionType === 'all' || log.actionType === selectedActionType
      
      return matchesSearch && matchesPhase && matchesPlayer && matchesActionType
    })
  }, [logs, searchTerm, selectedPhase, selectedPlayer, selectedActionType])

  // 获取所有阶段和玩家选项
  const phases = useMemo(() => [...new Set(logs.map(log => log.gamePhase))], [logs])
  const players = useMemo(() => [...new Set(logs.map(log => ({ id: log.playerId, name: log.playerName })))], [logs])
  const actionTypes = useMemo(() => [...new Set(logs.map(log => log.actionType))], [logs])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[95vw] h-[95vh] flex flex-col max-h-screen">
        {/* 头部 */}
        <div className="flex-shrink-0 p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">🤖 AI提示词和上下文日志</h2>
          <button 
            onClick={onClose} 
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            关闭
          </button>
        </div>

        {/* 筛选器 */}
        <div className="flex-shrink-0 p-4 border-b grid grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="搜索玩家、行动类型或提示词内容..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          
          <select
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            title="选择游戏阶段"
          >
            <option value="all">所有阶段</option>
            {phases.map(phase => (
              <option key={phase} value={phase}>{phase}</option>
            ))}
          </select>
          
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            title="选择玩家"
          >
            <option value="all">所有玩家</option>
            {players.map(player => (
              <option key={player.id} value={player.id}>{player.name}</option>
            ))}
          </select>

          <select
            value={selectedActionType}
            onChange={(e) => setSelectedActionType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            title="选择行动类型"
          >
            <option value="all">所有行动</option>
            {actionTypes.map(actionType => (
              <option key={actionType} value={actionType}>
                {getActionTypeDisplayName(actionType)}
              </option>
            ))}
          </select>
          
          <div className="text-sm text-gray-600 flex items-center justify-center">
            共 {filteredLogs.length} 条日志
          </div>
        </div>

        {/* 主要内容 */}
        <div className="flex-1 flex min-h-0">
          {/* 左侧日志列表 */}
          <div className="w-1/3 border-r flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-2">
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-4xl mb-4">📝</div>
                    <div className="text-lg font-medium mb-2">暂无AI日志</div>
                    <div className="text-sm">
                      {logs.length === 0 
                        ? '还没有任何AI请求日志。点击🧪按钮添加测试日志。'
                        : '没有符合筛选条件的日志。请调整筛选条件。'
                      }
                    </div>
                    <div className="mt-4 text-xs text-gray-400">
                      总日志数: {logs.length}
                    </div>
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedLog?.id === log.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900">{log.playerName}</div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          log.error ? 'bg-red-100 text-red-800' : 
                          log.actionType.startsWith('decision_') ? 'bg-blue-100 text-blue-800' :
                          log.actionType === 'speech' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {getActionTypeDisplayName(log.actionType)}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>第{log.round}轮 - {log.gamePhase}</div>
                        <div>{new Date(log.timestamp).toLocaleString()}</div>
                        {log.aiResponse && (
                          <div className="text-green-600">
                            耗时: {log.aiResponse.processingTime}ms
                          </div>
                        )}
                        {log.error && (
                          <div className="text-red-600">
                            错误: {log.error.message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 右侧详细内容 */}
          <div className="flex-1 flex flex-col min-h-0">
            {selectedLog ? (
              <>
                {/* 标签页 */}
                <div className="flex-shrink-0 flex border-b">
                  {[
                    { key: 'context', label: '上下文信息' },
                    { key: 'prompt', label: '完整Prompt' },
                    { key: 'response', label: 'AI响应' },
                    { key: 'raw', label: '原始数据' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as any)}
                      className={`px-4 py-2 border-r transition-colors ${
                        activeTab === key 
                          ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                
                {/* 标签页内容 */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                    {activeTab === 'context' && (
                      <div className="space-y-4">
                        <div className="border rounded-lg">
                          <div className="p-3 text-blue-500 bg-gray-50 border-b font-semibold">🌍 游戏上下文</div>
                          <div className="p-3">
                            <pre className="whitespace-pre-wrap text-blue-500 text-sm">
                              {selectedLog.contextInfo.gameContext}
                            </pre>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg">
                          <div className="p-3 text-blue-500 bg-gray-50 border-b font-semibold">📋 系统提示词</div>
                          <div className="p-3">
                            <pre className="whitespace-pre-wrap text-blue-500 text-sm">
                              {selectedLog.contextInfo.systemPrompt}
                            </pre>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg">
                          <div className="p-3 text-blue-500 bg-gray-50 border-b font-semibold">💬 发言历史</div>
                          <div className="p-3">
                            <pre className="whitespace-pre-wrap text-blue-500 text-sm">
                              {selectedLog.contextInfo.speechHistory}
                            </pre>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg">
                          <div className="p-3 text-blue-500 bg-gray-50 border-b font-semibold">📖 事件历史</div>
                          <div className="p-3">
                            <pre className="whitespace-pre-wrap text-blue-500 text-sm">
                              {selectedLog.contextInfo.eventHistory}
                            </pre>
                          </div>
                        </div>
                        
                        {selectedLog.contextInfo.reasoningMemory && (
                          <div className="border rounded-lg">
                            <div className="p-3 text-blue-500 bg-gray-50 border-b font-semibold">🧠 推理记忆</div>
                            <div className="p-3">
                              <pre className="whitespace-pre-wrap text-blue-500 text-sm">
                                {selectedLog.contextInfo.reasoningMemory}
                              </pre>
                            </div>
                          </div>
                        )}
                        
                        {selectedLog.contextInfo.availableTargets?.length > 0 && (
                          <div className="border rounded-lg">
                            <div className="p-3 text-blue-500 bg-gray-50 border-b font-semibold">🎯 可选目标</div>
                            <div className="p-3">
                              <div className="flex flex-wrap gap-2">
                                {selectedLog.contextInfo.availableTargets.map((target, index) => (
                                  <span key={index} className="px-2 py-1 text-blue-500 bg-blue-100 text-blue-800 rounded text-sm">
                                    {target}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'prompt' && (
                      <div className="border rounded-lg">
                        <div className="p-3 text-blue-500 bg-gray-50 border-b font-semibold">📝 完整PROMPT</div>
                        <div className="p-3">
                          <pre className="whitespace-pre-wrap text-blue-500 text-sm bg-gray-50 p-4 rounded">
                            {selectedLog.fullPrompt}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {activeTab === 'response' && (
                      <div className="space-y-4">
                        {selectedLog.aiResponse ? (
                          <>
                            <div className="border rounded-lg">
                                <div className="p-3 text-blue-500 bg-gray-50 border-b font-semibold">
                                🤖 AI原始响应 (耗时: {selectedLog.aiResponse.processingTime}ms)
                              </div>
                              <div className="p-3">
                                <pre className="whitespace-pre-wrap text-blue-500 text-sm bg-gray-50 p-4 rounded">
                                  {selectedLog.aiResponse.rawResponse}
                                </pre>
                              </div>
                            </div>
                            
                            <div className="border rounded-lg">
                              <div className="p-3 text-blue-500 bg-gray-50 border-b font-semibold">📊 解析结果</div>
                              <div className="p-3">
                                {selectedLog.actionType.startsWith('decision_') ? (
                                  // 决策类型的特殊展示
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <span className="font-medium text-gray-700">选择的行动：</span>
                                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                          {selectedLog.aiResponse.parsedResponse?.action || '无'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-700">目标：</span>
                                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                                          {selectedLog.aiResponse.parsedResponse?.target || '无目标'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-700">置信度：</span>
                                        <span className="ml-2 text-gray-900">
                                          {((selectedLog.aiResponse.parsedResponse?.confidence || 0) * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-700">情感：</span>
                                        <span className="ml-2 text-gray-900">
                                          {selectedLog.aiResponse.parsedResponse?.emotion || '中性'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {selectedLog.aiResponse.parsedResponse?.reasoning && (
                                      <div>
                                        <div className="font-medium text-gray-700 mb-2">推理过程：</div>
                                        <div className="bg-blue-50 p-3 rounded text-sm text-gray-800">
                                          {selectedLog.aiResponse.parsedResponse.reasoning}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {selectedLog.aiResponse.parsedResponse?.message && (
                                      <div>
                                        <div className="font-medium text-gray-700 mb-2">附加消息：</div>
                                        <div className="bg-green-50 p-3 rounded text-sm text-gray-800">
                                          {selectedLog.aiResponse.parsedResponse.message}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  // 非决策类型的通用展示
                                  <pre className="whitespace-pre-wrap text-blue-500 text-sm bg-gray-50 p-4 rounded">
                                    {JSON.stringify(selectedLog.aiResponse.parsedResponse, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            无AI响应数据
                          </div>
                        )}
                        
                        {selectedLog.error && (
                          <div className="border border-red-200 rounded-lg">
                            <div className="p-3 text-blue-500 bg-red-50 border-b font-semibold text-red-600">❌ 错误信息</div>
                            <div className="p-3">
                              <div className="text-red-600">
                                <div className="font-medium mb-2">{selectedLog.error.message}</div>
                                {selectedLog.error.stack && (
                                  <pre className="text-blue-500 text-xs whitespace-pre-wrap bg-red-50 p-4 rounded">
                                    {selectedLog.error.stack}
                                  </pre>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'raw' && (
                      <div className="border rounded-lg">
                            <div className="p-3 text-blue-500 bg-gray-50 border-b font-semibold">🔍 原始日志数据</div>
                        <div className="p-3">
                          <pre className="whitespace-pre-wrap text-blue-500 text-sm bg-gray-50 p-4 rounded">  
                            {JSON.stringify(selectedLog, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                选择左侧的日志条目查看详细信息
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 