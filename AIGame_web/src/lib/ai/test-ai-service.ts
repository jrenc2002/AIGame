// AI服务测试脚本
import { WerewolfAIService } from './WerewolfAIService'
import { GameAIServiceFactory } from './GameAIServiceFactory'
import { Player, GameState } from '@/store/werewolf/types'

// 创建测试数据
const createTestPlayer = (): Player => ({
  id: '1',
  name: '测试AI',
  avatar: '🤖',
  role: 'werewolf',
  camp: 'werewolf',
  status: 'alive',
  isPlayer: false,
  aiDifficulty: 'medium',
  aiPersonality: 'logical',
  votesReceived: 0,
  hasVoted: false,
  hasUsedSkill: false,
  isProtected: false,
  isPoisoned: false,
  isSaved: false
})

const createTestGameState = (): GameState => ({
  gameId: 'test-game',
  currentRound: 1,
  currentPhase: 'day_discussion',
  isGameActive: true,
  players: [
    createTestPlayer(),
    {
      ...createTestPlayer(),
      id: '2',
      name: '玩家2',
      role: 'villager',
      camp: 'villager'
    }
  ],
  deadPlayers: [],
  nightActions: [],
  votes: [],
  gameLogs: [
    {
      id: '1',
      round: 1,
      phase: 'day_discussion',
      action: '发言: 我觉得有些玩家很可疑',
      playerId: '2',
      timestamp: Date.now(),
      isPublic: true
    }
  ],
  phaseStartTime: Date.now(),
  phaseTimeLimit: 180,
  settings: {
    totalPlayers: 2,
    werewolfCount: 1,
    specialRoles: [],
    timeLimit: {
      discussion: 180,
      voting: 60,
      night: 120
    },
    aiSettings: {
      difficulty: 'medium',
      personalityDistribution: {
        logical: 1,
        intuitive: 0,
        aggressive: 0,
        conservative: 0,
        leader: 0,
        follower: 0
      }
    }
  }
})

// 测试函数
export class AIServiceTester {
  private werewolfAI: WerewolfAIService

  constructor() {
    this.werewolfAI = GameAIServiceFactory.getGameAIService('werewolf') as WerewolfAIService
  }

  // 测试AI配置
  async testConfiguration(): Promise<boolean> {
    console.log('🔧 测试AI配置...')
    
    const isEnabled = this.werewolfAI.isAIEnabled()
    console.log(`AI服务状态: ${isEnabled ? '✅ 可用' : '❌ 不可用'}`)
    
    return isEnabled
  }

  // 测试非流式AI发言
  async testBasicSpeech(): Promise<void> {
    console.log('💬 测试基础AI发言...')
    
    try {
      const player = createTestPlayer()
      const gameState = createTestGameState()
      
      console.log('发送AI请求...')
      const speech = await this.werewolfAI.generateSpeech(
        player, 
        gameState, 
        '请分析当前局势并发言'
      )
      
      console.log('✅ AI发言成功:')
      console.log(`  内容: ${speech.message}`)
      console.log(`  情感: ${speech.emotion}`)
      console.log(`  可信度: ${speech.confidence}`)
      console.log(`  可疑度: ${speech.suspiciousness}`)
      
    } catch (error) {
      console.error('❌ AI发言测试失败:', error)
    }
  }

  // 测试流式AI发言
  async testStreamSpeech(): Promise<void> {
    console.log('🌊 测试流式AI发言...')
    
    try {
      const player = createTestPlayer()
      const gameState = createTestGameState()
      
      console.log('开始流式请求...')
      const speechStream = this.werewolfAI.generateSpeechStream(
        player, 
        gameState, 
        '请分析当前局势并发言'
      )
      
      let finalContent = ''
      for await (const chunk of speechStream) {
        if (chunk.delta) {
          process.stdout.write(chunk.delta) // 实时显示增量内容
        }
        finalContent = chunk.message
      }
      
      console.log('\n✅ 流式AI发言完成:')
      console.log(`  最终内容: ${finalContent}`)
      
    } catch (error) {
      console.error('❌ 流式AI发言测试失败:', error)
    }
  }

  // 测试AI决策
  async testDecision(): Promise<void> {
    console.log('🎯 测试AI决策...')
    
    try {
      const player = createTestPlayer()
      const gameState = createTestGameState()
      const targets = gameState.players.filter(p => p.id !== player.id)
      
      console.log('生成AI投票决策...')
      const decision = await this.werewolfAI.generateDecision(
        player,
        gameState,
        targets,
        'vote'
      )
      
      console.log('✅ AI决策成功:')
      console.log(`  行动: ${decision.action}`)
      console.log(`  目标: ${decision.target}`)
      console.log(`  理由: ${decision.reasoning}`)
      console.log(`  信心: ${decision.confidence}`)
      console.log(`  消息: ${decision.message}`)
      
    } catch (error) {
      console.error('❌ AI决策测试失败:', error)
    }
  }

  // 运行所有测试
  async runAllTests(): Promise<void> {
    console.log('🚀 开始AI服务完整测试\n')
    
    // 1. 配置测试
    const configOk = await this.testConfiguration()
    if (!configOk) {
      console.log('⚠️ AI配置无效，跳过其他测试')
      return
    }
    
    console.log('\n' + '='.repeat(50) + '\n')
    
    // 2. 基础发言测试
    await this.testBasicSpeech()
    
    console.log('\n' + '='.repeat(50) + '\n')
    
    // 3. 流式发言测试
    await this.testStreamSpeech()
    
    console.log('\n' + '='.repeat(50) + '\n')
    
    // 4. 决策测试
    await this.testDecision()
    
    console.log('\n✨ 所有测试完成!')
  }
}

// 导出测试实例
export const aiTester = new AIServiceTester()

// 如果直接运行此文件
if (typeof window === 'undefined') {
  aiTester.runAllTests().catch(console.error)
} 