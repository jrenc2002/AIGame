import React, { useState } from 'react'
import { X, RefreshCw, AlertTriangle, Copy } from 'lucide-react'

interface AIRequestError {
  error: Error
  playerId: string
  phase: string
  logs: string[]
  originalRequest: any
}

interface AIRequestErrorModalProps {
  isOpen: boolean
  onClose: () => void
  errorInfo: AIRequestError | null
  onRetry: (originalRequest: any) => Promise<void>
}

export const AIRequestErrorModal: React.FC<AIRequestErrorModalProps> = ({
  isOpen,
  onClose,
  errorInfo,
  onRetry
}) => {
  const [isRetrying, setIsRetrying] = useState(false)
  const [showFullLogs, setShowFullLogs] = useState(false)

  if (!isOpen || !errorInfo) return null

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry(errorInfo.originalRequest)
      onClose()
    } catch (error) {
      console.error('重试失败:', error)
    } finally {
      setIsRetrying(false)
    }
  }

  const copyLogsToClipboard = () => {
    const logText = errorInfo.logs.join('\n')
    navigator.clipboard.writeText(logText).then(() => {
      alert('日志已复制到剪贴板')
    })
  }

  const getPlayerName = () => {
    // 从playerId获取玩家名称，这里简化处理
    return errorInfo.playerId
  }

  const getPhaseDisplayName = (phase: string) => {
    const phaseNames: Record<string, string> = {
      'night': '夜晚阶段',
      'day_voting': '投票阶段',
      'day_discussion': '讨论阶段'
    }
    return phaseNames[phase] || phase
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-red-50">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">
                AI请求失败
              </h3>
              <p className="text-sm text-red-600">
                玩家 {getPlayerName()} 在{getPhaseDisplayName(errorInfo.phase)}的AI请求失败
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="关闭"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-96">
          {/* 错误摘要 */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">错误信息</h4>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{errorInfo.error.message}</p>
            </div>
          </div>

          {/* 详细日志 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">
                详细日志 ({errorInfo.logs.length} 条)
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={copyLogsToClipboard}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <Copy className="h-3 w-3" />
                  <span>复制</span>
                </button>
                <button
                  onClick={() => setShowFullLogs(!showFullLogs)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showFullLogs ? '收起' : '展开'}
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg">
              <div className="p-4 font-mono text-xs overflow-x-auto">
                {(showFullLogs ? errorInfo.logs : errorInfo.logs.slice(-5)).map((log, index) => (
                  <div
                    key={index}
                    className={`mb-1 ${
                      log.includes('❌') ? 'text-red-600' :
                      log.includes('✅') ? 'text-green-600' :
                      log.includes('⚠️') ? 'text-yellow-600' :
                      log.includes('🔍') ? 'text-blue-600' :
                      'text-gray-600'
                    }`}
                  >
                    {log}
                  </div>
                ))}
                {!showFullLogs && errorInfo.logs.length > 5 && (
                  <div className="text-gray-400 text-center mt-2">
                    ... 还有 {errorInfo.logs.length - 5} 条日志
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 请求详情 */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">请求详情</h4>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">玩家ID:</span>
                  <span className="ml-2 text-gray-900">{errorInfo.playerId}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">阶段:</span>
                  <span className="ml-2 text-gray-900">{getPhaseDisplayName(errorInfo.phase)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">可选行动:</span>
                  <span className="ml-2 text-gray-900">
                    {errorInfo.originalRequest?.availableActions?.join(', ') || '无'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">重试次数:</span>
                  <span className="ml-2 text-gray-900">3次</span>
                </div>
              </div>
            </div>
          </div>

          {/* 建议 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">建议</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 检查AI配置是否正确</li>
              <li>• 确认网络连接稳定</li>
              <li>• 点击重试按钮再次尝试</li>
              <li>• 如果问题持续，请联系技术支持</li>
            </ul>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>重试中...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>重试</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 