import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { getAPIConfig, hasValidAPIConfig } from '@/lib/apiConfig'
import { enhancedAIWerewolfService } from '@/lib/enhancedAIService'
import toast from 'react-hot-toast'

export const LLMTestPanel: React.FC = () => {
  const [isTestingLLM, setIsTestingLLM] = useState(false)
  const [llmTestResult, setLlmTestResult] = useState<string>('')
  
  const config = getAPIConfig()

  const testLLMConnection = async () => {
    setIsTestingLLM(true)
    setLlmTestResult('')
    
    try {
      // 检查API配置
      if (!hasValidAPIConfig('openai')) {
        throw new Error('未配置有效的API Key')
      }

      // 模拟一个简单的狼人杀玩家和游戏状态进行测试
      const testPlayer = {
        id: 'test_player',
        name: '测试玩家',
        avatar: '',
        role: 'villager' as const,
        camp: 'villager' as const,
        status: 'alive' as const,
        isPlayer: false,
        votesReceived: 0,
        hasVoted: false,
        hasUsedSkill: false,
        isProtected: false,
        isPoisoned: false,
        isSaved: false
      }

      const testGameState = {
        gameId: 'test_game',
        currentRound: 1,
        currentPhase: 'day_discussion' as const,
        isGameActive: true,
        players: [testPlayer],
        deadPlayers: [],
        nightActions: [],
        votes: [],
        gameLogs: [],
        phaseStartTime: Date.now(),
        phaseTimeLimit: 180,
        settings: {
          totalPlayers: 8,
          werewolfCount: 2,
          specialRoles: [] as any[],
          timeLimit: { discussion: 180, voting: 60, night: 120 },
          aiSettings: { 
            difficulty: 'medium' as const, 
            personalityDistribution: {
              logical: 0.2,
              intuitive: 0.2,
              aggressive: 0.1,
              conservative: 0.2,
              leader: 0.15,
              follower: 0.15
            }
          }
        }
      }

      const result = await enhancedAIWerewolfService.generateEnhancedAISpeech(
        testPlayer, 
        testGameState, 
        '这是一个LLM连接测试'
      )
      
      setLlmTestResult(`✅ LLM连接成功！\n响应: ${result.message}\n置信度: ${result.confidence}`)
      toast.success('LLM连接测试成功！')
    } catch (error: any) {
      setLlmTestResult(`❌ LLM连接失败: ${error.message}`)
      toast.error(`LLM连接失败: ${error.message}`)
    } finally {
      setIsTestingLLM(false)
    }
  }

  const hasApiKey = hasValidAPIConfig('openai')

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-300 dark:border-zinc-600 shadow-lg">
      {/* LLM测试面板标题 */}
      <div className="p-4 border-b border-gray-200 dark:border-zinc-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              🧪 LLM连接测试
            </h3>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 配置状态 */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>API Key:</span>
            <span className={hasApiKey ? 'text-green-600' : 'text-red-600'}>
              {hasApiKey ? '✅ 已配置' : '❌ 未配置'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>AI服务状态:</span>
            <span className={hasValidAPIConfig('openai') ? 'text-green-600' : 'text-red-600'}>
              {hasValidAPIConfig('openai') ? '✅ 已启用' : '❌ 未启用'}
            </span>
          </div>
        </div>

        {/* 测试按钮 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={testLLMConnection}
          disabled={isTestingLLM || !hasApiKey}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
            isTestingLLM || !hasApiKey
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {isTestingLLM ? '⏳ 正在测试连接...' : '🧪 测试LLM连接'}
        </motion.button>

        {/* 警告信息 */}
        {!hasApiKey && (
          <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
            ⚠️ 请先在AI配置面板中设置OpenAI API Key
          </div>
        )}

        {/* 测试结果 */}
        {llmTestResult && (
          <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border text-sm whitespace-pre-line">
            {llmTestResult}
          </div>
        )}
      </div>
    </div>
  )
} 