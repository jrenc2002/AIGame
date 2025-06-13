import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { getAIConfig, validateAIConfig } from './aiConfig'
import { Player, GameState, GamePhase, RoleType } from '@/store/werewolf/types'

// AI 决策结果
export interface AIDecisionResult {
  action: 'vote' | 'skill' | 'discussion'
  target?: string
  reasoning: string
  confidence: number
  message: string
}

// AI 对话生成结果
export interface AISpeechResult {
  message: string
  emotion: 'neutral' | 'suspicious' | 'defensive' | 'aggressive' | 'confident'
  confidence: number
}

class AIGameService {
  private config = getAIConfig()
  private isConfigValid = false

  constructor() {
    this.isConfigValid = validateAIConfig(this.config)
  }

  // 检查AI是否可用
  isAIEnabled(): boolean {
    return this.isConfigValid
  }

  // 生成AI角色的发言
  async generateAISpeech(
    player: Player,
    gameState: GameState,
    context: string = ''
  ): Promise<AISpeechResult> {
    // 检查是否有真实的API密钥
    const hasRealAPI = this.config.openaiApiKey !== 'fallback_ai_mode' && 
                       this.config.openaiApiKey !== 'your_openai_api_key_here' && 
                       this.config.openaiApiKey.length > 10

    if (!this.isAIEnabled()) {
      return this.getIntelligentFallbackSpeech(player, gameState, context)
    }

    if (!hasRealAPI) {
      // 使用智能fallback而不是调用API
      return this.getIntelligentFallbackSpeech(player, gameState, context)
    }

    try {
      const prompt = this.buildSpeechPrompt(player, gameState, context)
      
      const { text } = await generateText({
        model: openai(this.config.openaiModel, {
          apiKey: this.config.openaiApiKey,
          baseURL: this.config.openaiBaseUrl,
        }),
        prompt,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      })

      return this.parseSpeechResponse(text)
    } catch (error) {
      console.error('AI语音生成失败，使用智能fallback:', error)
      return this.getIntelligentFallbackSpeech(player, gameState, context)
    }
  }

  // 生成AI的游戏决策
  async generateAIDecision(
    player: Player,
    gameState: GameState,
    availableTargets: Player[]
  ): Promise<AIDecisionResult> {
    // 检查是否有真实的API密钥
    const hasRealAPI = this.config.openaiApiKey !== 'fallback_ai_mode' && 
                       this.config.openaiApiKey !== 'your_openai_api_key_here' && 
                       this.config.openaiApiKey.length > 10

    if (!this.isAIEnabled()) {
      return this.getIntelligentFallbackDecision(player, gameState, availableTargets)
    }

    if (!hasRealAPI) {
      // 使用智能fallback而不是调用API
      return this.getIntelligentFallbackDecision(player, gameState, availableTargets)
    }

    try {
      const prompt = this.buildDecisionPrompt(player, gameState, availableTargets)
      
      const { text } = await generateText({
        model: openai(this.config.openaiModel, {
          apiKey: this.config.openaiApiKey,
          baseURL: this.config.openaiBaseUrl,
        }),
        prompt,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      })

      return this.parseDecisionResponse(text, availableTargets)
    } catch (error) {
      console.error('AI决策生成失败，使用智能fallback:', error)
      return this.getIntelligentFallbackDecision(player, gameState, availableTargets)
    }
  }

  // 构建发言提示词
  private buildSpeechPrompt(player: Player, gameState: GameState, context: string): string {
    const roleDescription = this.getRoleDescription(player.role)
    const phaseDescription = this.getPhaseDescription(gameState.currentPhase)
    const personalityTrait = this.getPersonalityTrait(player.aiPersonality)
    
    return `你是一名AI狼人杀玩家，以下是你的角色信息：

角色身份：${roleDescription}
性格特征：${personalityTrait}
当前阶段：${phaseDescription}
当前回合：第${gameState.currentRound}轮
存活玩家：${gameState.players.filter(p => p.status === 'alive').length}人
上下文：${context}

请根据你的身份和性格，生成一段简短的发言（30字以内）。发言应该：
1. 符合你的角色身份和目标
2. 体现你的性格特征
3. 适合当前游戏阶段
4. 不要直接暴露你的真实身份（除非是特殊情况）

请用以下格式回复：
MESSAGE: [你的发言内容]
EMOTION: [neutral/suspicious/defensive/aggressive/confident]
CONFIDENCE: [0.1-1.0之间的数字]`
  }

  // 构建决策提示词
  private buildDecisionPrompt(player: Player, gameState: GameState, availableTargets: Player[]): string {
    const roleDescription = this.getRoleDescription(player.role)
    const targetList = availableTargets.map(t => `${t.name}(${t.id})`).join(', ')
    
    return `你是一名AI狼人杀玩家，需要做出游戏决策：

角色身份：${roleDescription}
当前阶段：${this.getPhaseDescription(gameState.currentPhase)}
可选目标：${targetList}
当前回合：第${gameState.currentRound}轮

根据你的身份和当前局势，选择一个最佳的行动目标。考虑因素：
1. 你的角色目标和获胜条件
2. 当前的威胁评估
3. 隐藏身份的需要
4. 推理和逻辑分析

请用以下格式回复：
ACTION: vote
TARGET: [目标玩家ID]
REASONING: [你的推理过程，50字以内]
CONFIDENCE: [0.1-1.0之间的数字]
MESSAGE: [向其他玩家解释你选择的理由，30字以内]`
  }

  // 解析AI发言响应
  private parseSpeechResponse(response: string): AISpeechResult {
    const lines = response.split('\n').filter(line => line.trim())
    let message = '我需要仔细观察...'
    let emotion: AISpeechResult['emotion'] = 'neutral'
    let confidence = 0.5

    for (const line of lines) {
      if (line.startsWith('MESSAGE:')) {
        message = line.replace('MESSAGE:', '').trim()
      } else if (line.startsWith('EMOTION:')) {
        const emotionStr = line.replace('EMOTION:', '').trim()
        if (['neutral', 'suspicious', 'defensive', 'aggressive', 'confident'].includes(emotionStr)) {
          emotion = emotionStr as AISpeechResult['emotion']
        }
      } else if (line.startsWith('CONFIDENCE:')) {
        confidence = parseFloat(line.replace('CONFIDENCE:', '').trim()) || 0.5
      }
    }

    return { message, emotion, confidence }
  }

  // 解析AI决策响应
  private parseDecisionResponse(response: string, availableTargets: Player[]): AIDecisionResult {
    const lines = response.split('\n').filter(line => line.trim())
    let action: AIDecisionResult['action'] = 'vote'
    let target = availableTargets[0]?.id
    let reasoning = '基于当前局势的判断'
    let confidence = 0.5
    let message = '我选择这个目标'

    for (const line of lines) {
      if (line.startsWith('TARGET:')) {
        const targetId = line.replace('TARGET:', '').trim()
        if (availableTargets.some(t => t.id === targetId)) {
          target = targetId
        }
      } else if (line.startsWith('REASONING:')) {
        reasoning = line.replace('REASONING:', '').trim()
      } else if (line.startsWith('CONFIDENCE:')) {
        confidence = parseFloat(line.replace('CONFIDENCE:', '').trim()) || 0.5
      } else if (line.startsWith('MESSAGE:')) {
        message = line.replace('MESSAGE:', '').trim()
      }
    }

    return { action, target, reasoning, confidence, message }
  }

  // 获取角色描述
  private getRoleDescription(role: RoleType): string {
    const descriptions = {
      villager: '村民 - 寻找并投票淘汰狼人',
      seer: '预言家 - 每晚可以查验一名玩家身份',
      witch: '女巫 - 拥有救人药和毒药',
      hunter: '猎人 - 被投票出局时可以开枪',
      guard: '守卫 - 每晚可以保护一名玩家',
      werewolf: '狼人 - 每晚杀死一名村民，需要隐藏身份',
      alpha_wolf: '狼王 - 狼人首领，被投票出局时可以开枪'
    }
    return descriptions[role] || '未知角色'
  }

  // 获取阶段描述
  private getPhaseDescription(phase: GamePhase): string {
    const descriptions = {
      preparation: '准备阶段',
      night: '夜晚阶段 - 特殊角色行动时间',
      day_discussion: '白天讨论 - 所有玩家发言讨论',
      day_voting: '投票阶段 - 选择要出局的玩家',
      game_over: '游戏结束'
    }
    return descriptions[phase] || '未知阶段'
  }

  // 获取性格特征描述
  private getPersonalityTrait(personality?: string): string {
    const traits = {
      logical: '逻辑型 - 重视事实和推理',
      intuitive: '直觉型 - 凭感觉判断',
      aggressive: '激进型 - 容易怀疑他人',
      conservative: '保守型 - 谨慎决策',
      leader: '领袖型 - 善于引导讨论',
      follower: '跟风型 - 容易被影响'
    }
    return traits[personality as keyof typeof traits] || '均衡型'
  }

  // 智能fallback发言系统
  private getIntelligentFallbackSpeech(player: Player, gameState: GameState, context: string = ''): AISpeechResult {
    const alivePlayers = gameState.players.filter(p => p.status === 'alive')
    const deadCount = gameState.players.length - alivePlayers.length
    const round = gameState.currentRound
    const personality = player.aiPersonality || 'logical'
    
    let message = ''
    let emotion: AISpeechResult['emotion'] = 'neutral'
    let confidence = 0.7
    
    switch (gameState.currentPhase) {
      case 'preparation':
        message = this.getPreparationMessage(personality)
        emotion = 'confident'
        break
        
      case 'day_discussion':
        const result = this.getDiscussionMessage(player, gameState, alivePlayers, deadCount, round, personality)
        message = result.message
        emotion = result.emotion
        confidence = result.confidence
        break
        
      case 'day_voting':
        message = this.getVotingMessage(personality, round)
        emotion = 'defensive'
        break
        
      case 'night':
        if (player.camp === 'werewolf') {
          message = this.getWerewolfNightMessage(personality)
          emotion = 'confident'
        } else {
          message = this.getVillagerNightMessage(personality)
          emotion = 'neutral'
        }
        break
        
      default:
        message = '让我仔细分析当前局势...'
    }
    
    return { message, emotion, confidence }
  }

  // 智能fallback决策系统
  private getIntelligentFallbackDecision(player: Player, gameState: GameState, availableTargets: Player[]): AIDecisionResult {
    if (availableTargets.length === 0) {
      return {
        action: 'vote',
        target: undefined,
        reasoning: '没有可投票的目标',
        confidence: 0.5,
        message: '无法做出选择'
      }
    }

    const personality = player.aiPersonality || 'logical'
    let target: Player
    let reasoning: string
    let message: string
    let confidence: number

    // 根据角色和性格选择目标
    if (player.camp === 'werewolf') {
      // 狼人优先选择威胁度高的村民
      target = this.selectWerewolfTarget(availableTargets, personality)
      reasoning = '选择对狼人阵营威胁最大的目标'
      message = '基于理性分析，我认为这个选择最合适'
      confidence = 0.8
    } else {
      // 村民根据推理选择可疑目标
      target = this.selectVillagerTarget(availableTargets, gameState, personality)
      reasoning = this.getVillagerReasoning(target, personality)
      message = `我怀疑${target.name}的行为，投票给他`
      confidence = 0.6
    }

    return {
      action: 'vote',
      target: target.id,
      reasoning,
      confidence,
      message
    }
  }

  // 获取准备阶段消息
  private getPreparationMessage(personality: string): string {
    const messages = {
      logical: ['让我理性分析这局游戏', '需要仔细观察每个人的行为', '逻辑推理是关键'],
      intuitive: ['我的直觉告诉我会很精彩', '感觉这局会很有趣', '凭感觉行动'],
      aggressive: ['我会找出所有狼人！', '不会放过任何可疑行为', '积极行动是王道'],
      conservative: ['谨慎观察，稳扎稳打', '不要急于下结论', '安全第一'],
      leader: ['大家跟着我的节奏来', '我来引导大家分析', '听我指挥'],
      follower: ['我会配合大家的决策', '跟随主流意见', '听从安排']
    }
    
    const messageArray = messages[personality] || messages.logical
    return messageArray[Math.floor(Math.random() * messageArray.length)]
  }

  // 获取讨论阶段消息
  private getDiscussionMessage(player: Player, gameState: GameState, alivePlayers: Player[], deadCount: number, round: number, personality: string) {
    const suspiciousMessages = {
      logical: [`根据逻辑分析，狼人很可能在${alivePlayers.length > 4 ? '隐藏' : '伪装'}`, '从发言模式看出了问题', '数据不对劲'],
      intuitive: ['我感觉有人在说谎', '直觉告诉我有问题', '这种感觉很强烈'],
      aggressive: ['肯定有狼人在装无辜！', '我不相信这种说辞', '狼人露马脚了'],
      conservative: ['需要更多证据才能确定', '不要轻易相信任何人', '保持警惕'],
      leader: ['大家注意分析发言逻辑', '我来总结一下线索', '跟我一起推理'],
      follower: ['我同意之前的分析', '赞成主流观点', '支持大家的判断']
    }

    const neutralMessages = {
      logical: ['目前信息还不够充分', '需要更多线索来推断', '逻辑链还不完整'],
      intuitive: ['暂时没有特别的感觉', '需要更多直觉判断', '感觉还不够明确'],
      aggressive: ['还没找到明确目标', '继续寻找可疑点', '不会放松警惕'],
      conservative: ['现在下结论还太早', '继续观察比较安全', '稳重行事'],
      leader: ['让我们系统分析局势', '大家都说说看法', '我们需要团队合作'],
      follower: ['等待更多人发言', '听听其他人的想法', '我会配合大家']
    }

    // 根据游戏情况选择消息类型
    let messageType = 'neutral'
    let confidence = 0.6

    if (deadCount > 0) {
      messageType = 'suspicious'
      confidence = 0.7
    }

    if (round > 2) {
      messageType = 'suspicious'
      confidence = 0.8
    }

    const messages = messageType === 'suspicious' ? suspiciousMessages : neutralMessages
    const messageArray = messages[personality] || messages.logical
    const message = messageArray[Math.floor(Math.random() * messageArray.length)]

    const emotion: AISpeechResult['emotion'] = messageType === 'suspicious' ? 'suspicious' : 'neutral'

    return { message, emotion, confidence }
  }

  // 获取投票阶段消息
  private getVotingMessage(personality: string, round: number): string {
    const messages = {
      logical: ['基于逻辑推理做出选择', '分析结果指向这个决定', '理性投票'],
      intuitive: ['跟随直觉的指引', '内心的声音这样告诉我', '凭感觉投票'],
      aggressive: ['必须淘汰可疑分子', '果断投票不犹豫', '坚决行动'],
      conservative: ['慎重考虑后的选择', '相对安全的决策', '保守投票'],
      leader: ['我来带头做出选择', '大家跟我投票', '相信我的判断'],
      follower: ['跟随大家的选择', '支持主流决定', '配合团队']
    }
    
    const messageArray = messages[personality] || messages.logical
    return messageArray[Math.floor(Math.random() * messageArray.length)]
  }

  // 获取狼人夜晚消息
  private getWerewolfNightMessage(personality: string): string {
    const messages = {
      logical: ['理性分析目标价值', '选择最优策略', '冷静执行计划'],
      intuitive: ['相信狼人的本能', '感受夜晚的力量', '直觉指引行动'],
      aggressive: ['是时候展现力量了', '主动出击', '狼性觉醒'],
      conservative: ['谨慎选择目标', '安全第一', '稳妥行事'],
      leader: ['统一狼群行动', '我来制定策略', '协调团队'],
      follower: ['配合狼群决策', '听从安排', '团队合作']
    }
    
    const messageArray = messages[personality] || messages.logical
    return messageArray[Math.floor(Math.random() * messageArray.length)]
  }

  // 获取村民夜晚消息
  private getVillagerNightMessage(personality: string): string {
    const messages = {
      logical: ['分析白天的信息', '推理可能的情况', '理性思考'],
      intuitive: ['感受夜晚的不安', '直觉有些担忧', '预感会发生什么'],
      aggressive: ['保持高度警惕', '准备明天的战斗', '不会放松'],
      conservative: ['希望平安度过', '谨慎等待天亮', '安全为上'],
      leader: ['思考明天的策略', '为团队考虑', '制定计划'],
      follower: ['相信村民团结', '等待指引', '配合大家']
    }
    
    const messageArray = messages[personality] || messages.logical
    return messageArray[Math.floor(Math.random() * messageArray.length)]
  }

  // 狼人选择目标
  private selectWerewolfTarget(availableTargets: Player[], personality: string): Player {
    // 过滤掉狼人
    const villagers = availableTargets.filter(p => p.camp !== 'werewolf')
    if (villagers.length === 0) return availableTargets[0]

    // 根据角色优先级选择
    const priorityRoles: RoleType[] = ['seer', 'witch', 'hunter', 'guard', 'villager']
    
    for (const role of priorityRoles) {
      const target = villagers.find(p => p.role === role)
      if (target) return target
    }
    
    // 根据性格选择
    if (personality === 'aggressive') {
      // 激进型选择最活跃的
      return villagers[0]
    } else if (personality === 'conservative') {
      // 保守型选择相对安全的
      return villagers[villagers.length - 1]
    }
    
    // 默认随机选择
    return villagers[Math.floor(Math.random() * villagers.length)]
  }

  // 村民选择目标
  private selectVillagerTarget(availableTargets: Player[], gameState: GameState, personality: string): Player {
    // 过滤掉自己
    const others = availableTargets.filter(p => !p.isPlayer)
    if (others.length === 0) return availableTargets[0]

    // 根据性格选择策略
    if (personality === 'aggressive') {
      // 激进型更容易怀疑
      return others[Math.floor(Math.random() * Math.min(2, others.length))]
    } else if (personality === 'logical') {
      // 逻辑型根据行为模式
      return others[Math.floor(Math.random() * others.length)]
    } else if (personality === 'follower') {
      // 跟风型选择得票多的
      return others[Math.floor(Math.random() * others.length)]
    }
    
    return others[Math.floor(Math.random() * others.length)]
  }

  // 获取村民推理
  private getVillagerReasoning(target: Player, personality: string): string {
    const reasonings = {
      logical: ['发言逻辑有漏洞', '行为模式可疑', '数据分析显示异常'],
      intuitive: ['直觉感觉不对', '有种说不出的感觉', '内心的警告'],
      aggressive: ['行为太可疑了', '肯定有问题', '不能放过'],
      conservative: ['相对来说比较可疑', '安全起见选择他', '谨慎的选择'],
      leader: ['综合分析得出结论', '带领大家做判断', '策略性选择'],
      follower: ['跟随大家的判断', '支持主流意见', '配合团队决策']
    }
    
    const reasoningArray = reasonings[personality] || reasonings.logical
    return reasoningArray[Math.floor(Math.random() * reasoningArray.length)]
  }

  // 保留旧方法用于兼容性
  private getFallbackSpeech(player: Player, phase: GamePhase): AISpeechResult {
    return this.getIntelligentFallbackSpeech(player, { currentPhase: phase, players: [], currentRound: 1 } as GameState)
  }

  private getFallbackDecision(player: Player, gameState: GameState, availableTargets: Player[]): AIDecisionResult {
    return this.getIntelligentFallbackDecision(player, gameState, availableTargets)
  }
}

// 导出单例实例
export const aiGameService = new AIGameService() 