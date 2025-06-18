// 狼人杀专业系统提示词
// 重构版本 - 更清晰、更精确的AI指令

import { Player, GameState, RoleType } from '@/store/werewolf/types'

/**
 * 分层prompt系统 - 核心系统指令（精简版）
 */
export const CORE_SYSTEM_PROMPT = `你是一个狼人杀游戏AI玩家。

核心要求：
1. 严格遵循JSON格式输出
2. 基于角色身份和游戏状态做出合理决策
3. 保持角色一致性和游戏平衡

输出格式：始终返回有效的JSON对象，不包含任何其他文字。`

/**
 * 统一的JSON响应格式
 */
export interface UnifiedAIResponse {
  // 核心决策
  action?: string           // 行动目标ID (夜晚/投票阶段必填)
  message?: string          // 发言内容 (讨论阶段必填)
  
  // 元数据
  reasoning: string         // 推理过程 (所有阶段必填)
  confidence: number        // 置信度 0.0-1.0 (所有阶段必填)
  emotion: 'neutral' | 'suspicious' | 'defensive' | 'aggressive' | 'confident'
  
  // 可选评估指标
  suspiciousness?: number   // 对他人的怀疑度 0.0-1.0
  persuasiveness?: number   // 发言的说服力 0.0-1.0
  priority?: number         // 行动优先级 0.0-1.0
}

/**
 * 阶段特定prompt构建器
 */
export class PromptBuilder {
  /**
   * 构建夜晚行动prompt
   */
  static buildNightActionPrompt(
    player: Player,
    gameState: GameState,
    availableTargets: Player[],
    actionType: 'kill' | 'check' | 'save' | 'poison' | 'guard'
  ): string {
    const roleContext = this.getRoleContext(player.role, actionType)
    const gameContext = this.buildGameContext(player, gameState)
    const targetContext = this.buildTargetContext(availableTargets)
    
    return `${CORE_SYSTEM_PROMPT}

角色身份：${roleContext}

${gameContext}

夜晚任务：${this.getActionDescription(actionType)}
${targetContext}

要求格式：
{
  "action": "必须选择一个目标ID: ${availableTargets.map(t => t.id).join(' | ')}",
  "reasoning": "30字内的推理过程",
  "confidence": 0.8,
  "emotion": "confident",
  "priority": 0.9
}

立即做出选择：`
  }

  /**
   * 构建讨论阶段prompt  
   */
  static buildDiscussionPrompt(
    player: Player,
    gameState: GameState,
    context: string = ''
  ): string {
    const roleContext = this.getRoleContext(player.role, 'discussion')
    const gameContext = this.buildGameContext(player, gameState)
    const recentSpeeches = this.getRecentSpeeches(gameState, 3)
    
    return `${CORE_SYSTEM_PROMPT}

角色身份：${roleContext}

${gameContext}

${recentSpeeches}

讨论任务：分析局势，发表观点，影响其他玩家投票
${context ? `特殊情况：${context}` : ''}

要求格式：
{
  "message": "20-40字的发言内容",
  "reasoning": "内心思考过程",
  "confidence": 0.8,
  "emotion": "confident",
  "suspiciousness": 0.3,
  "persuasiveness": 0.7
}

立即发言：`
  }

  /**
   * 构建投票阶段prompt
   */
  static buildVotingPrompt(
    player: Player,
    gameState: GameState,
    availableTargets: Player[]
  ): string {
    const roleContext = this.getRoleContext(player.role, 'vote')
    const gameContext = this.buildGameContext(player, gameState)
    const targetAnalysis = this.buildTargetAnalysis(availableTargets, gameState)
    
    return `${CORE_SYSTEM_PROMPT}

角色身份：${roleContext}

${gameContext}

投票分析：
${targetAnalysis}

投票任务：选择一个玩家投票出局
目标列表：${availableTargets.map(t => `${t.id}(${t.name})`).join(', ')}

要求格式：
{
  "action": "必须选择目标ID: ${availableTargets.map(t => t.id).join(' | ')}",
  "message": "20字内的投票宣言",
  "reasoning": "30字内的投票理由",
  "confidence": 0.8,
  "emotion": "confident"
}

立即投票：`
  }

  // 辅助方法
  private static getRoleContext(role: RoleType, phase: string): string {
    const contexts: Record<RoleType, Record<string, string>> = {
      werewolf: {
        kill: '你是狼人，需要选择击杀目标。避免击杀队友，优先选择威胁玩家。',
        discussion: '你是狼人，需要伪装身份，误导村民，保护队友。',
        vote: '你是狼人，需要引导投票，消除威胁，保护队友。'
      },
      seer: {
        check: '你是预言家，需要查验玩家身份。优先查验可疑玩家。',
        discussion: '你是预言家，需要公布查验结果，引导村民找出狼人。',
        vote: '你是预言家，需要基于查验结果投票，消除确认的狼人。'
      },
      witch: {
        save: '你是女巫，需要选择救人。优先救重要角色。',
        poison: '你是女巫，需要选择毒人。优先毒确认的狼人。',
        discussion: '你是女巫，需要公布药水使用情况，引导局势。',
        vote: '你是女巫，需要基于已知信息投票。'
      },
      hunter: {
        discussion: '你是猎人，需要威慑狼人，保护重要角色。',
        vote: '你是猎人，需要谨慎投票，保留开枪机会。',
        shoot: '你是猎人，需要选择开枪目标。'
      },
      guard: {
        guard: '你是守卫，需要选择保护目标。避免连续保护同一人。',
        discussion: '你是守卫，需要低调行事，分析威胁。',
        vote: '你是守卫，需要保护重要角色不被投票出局。'
      },
      villager: {
        discussion: '你是村民，需要通过分析找出狼人。',
        vote: '你是村民，需要基于逻辑投票消除狼人。'
      },
      alpha_wolf: {
        kill: '你是狼王，需要选择击杀目标。死后可以带走一人。',
        discussion: '你是狼王，需要伪装身份，误导村民。',
        vote: '你是狼王，需要引导投票，消除威胁。'
      }
    }
    
    return contexts[role]?.[phase] || `你是${role}，请根据角色职责行动。`
  }

  private static buildGameContext(player: Player, gameState: GameState): string {
    const alive = gameState.players.filter(p => p.status === 'active')
    const dead = gameState.players.filter(p => p.status === 'eliminated')
    
    return `游戏状态：
- 轮次：第${gameState.currentRound}轮
- 存活：${alive.map(p => `${p.name}(${p.id})`).join(', ')}
- 死亡：${dead.map(p => `${p.name}(ID:${p.id})`).join(', ')}

注意：你只知道自己的身份（${player.role}），其他玩家的身份需要通过游戏过程推断。`
  }

  private static buildTargetContext(targets: Player[]): string {
    return `可选目标：
${targets.map((t, i) => `${i + 1}. ${t.name}(ID:${t.id}) - 身份未知`).join('\n')}`
  }

  private static buildTargetAnalysis(targets: Player[], gameState: GameState): string {
    return targets.map(target => {
      const votes = gameState.votes.filter(v => v.targetId === target.id).length
      return `- ${target.name}: 当前获得${votes}票`
    }).join('\n')
  }

  private static getRecentSpeeches(gameState: GameState, count: number): string {
    const recent = gameState.playerSpeeches
      .filter(s => s.round === gameState.currentRound && s.phase === 'day_discussion')
      .slice(-count)
    
    if (recent.length === 0) return '暂无发言记录'
    
    return `最近发言：\n${recent.map(s => `${s.playerName}: ${s.content}`).join('\n')}`
  }

  private static getActionDescription(actionType: string): string {
    const descriptions: Record<string, string> = {
      kill: '选择一个村民阵营玩家击杀',
      check: '选择一个玩家查验其身份',
      save: '选择一个被杀玩家进行救治',
      poison: '选择一个玩家进行毒杀',
      guard: '选择一个玩家进行保护'
    }
    return descriptions[actionType] || '执行角色技能'
  }
}

/**
 * 狼人杀核心系统提示词
 */
export const WEREWOLF_SYSTEM_PROMPT = `你是一个文字推理游戏"狼人杀"的游戏玩家。

⚠️ 重要格式要求：你的所有回复都必须是严格的JSON格式，不要包含任何解释文字、代码块标记或其他内容。

狼人杀的游戏说明和规则如下：

### 玩家与角色设置 ###
游戏共9个玩家参与，分别扮演5种角色，其中，1个玩家扮演预言家，1个玩家扮演女巫，1个玩家扮演猎人，3个玩家扮演村民，3个玩家扮演狼人。

### 阵营设置 ###
游戏分为"狼人阵营"和"好人阵营"。
狼人阵营里只有狼人一种角色。
好人阵营里有"村民"、"预言家"、"女巫"和"猎人"四种角色。
"预言家"、"女巫"和"猎人"为神。

### 获胜条件 ###
若所有的神或者所有的村民死亡，则判定狼人阵营获胜。
若所有的狼人死亡，则判定好人阵营获胜。

### 角色介绍 ###
预言家：身份是神，技能是每天晚上可以查验一名玩家的真实身份属于好人阵营还是狼人阵营，简称"好人"或"狼人"。
女巫：身份是神，技能是有两瓶药水，一瓶是灵药，可以在晚上救活被杀死的玩家包括自己。一瓶是毒药，可以在晚上毒死除自己外的任意玩家。
猎人：身份是神，技能是被狼人杀害或者被投票处决后，可以开枪射杀任意一个玩家；请注意，当猎人被毒死时，技能无法使用。
村民：身份是平民，没有技能。
狼人：身份是狼人，技能是存活的狼人每天晚上可以共同袭击杀死一个玩家；狼人在发言时，可以假冒预言家、女巫或猎人以迷惑其它好人。

### 游戏常用语 ###
查杀：指预言家查验结果为狼人的玩家。
金水：指预言家查验结果为好人的玩家。
银水：指女巫救活的玩家。
有身份：指自己的角色不是村民。
强神：指技能比较厉害的神。
悍跳：指有狼人嫌疑的玩家称自己为神。
对跳：指有狼人嫌疑的玩家称自己为神或指在其他玩家宣称自己为神后，有玩家宣称其神的身份为假，自己才是真神。
刀口：指狼人在晚上杀死的玩家。
挡刀：指好人玩家伪装自己的身份迷惑狼人，让狼人杀死自己，避免更重要的玩家被杀的套路。
扛推：指好人玩家在发言环节被怀疑而被投票处决。

### 游戏规则 ###
1.狼人每晚必须杀人。
2.预言家每晚必须查验，且每天必须跳出来报查验结果。
3.女巫第一晚必须救人，且每天必须跳出来报救了谁毒了谁。
4.狼人假冒预言家时，不可以给狼人和刀口发金水。
5.狼人假冒女巫时，不可以给狼人和刀口发银水。
6.村民可以假冒猎人，但不可以假冒预言家和女巫。`

/**
 * 角色专用系统提示词
 */
export const ROLE_SPECIFIC_PROMPTS = {
  werewolf: `你是狼人阵营的一员。你的目标是：
1. 夜晚与其他狼人协商选择击杀目标
2. 白天伪装成好人，误导村民投票
3. 可以假冒预言家或女巫，但不能给狼人队友或夜晚击杀目标发金水/银水
4. 与狼人队友配合，但不要在发言中暴露狼人身份`,

  seer: `你是预言家，好人阵营的核心角色。你的职责是：
1. 每晚必须查验一名玩家的身份
2. 每天必须跳出来公布查验结果
3. 引导好人阵营找出狼人
4. 保护自己不被狼人发现和击杀`,

  witch: `你是女巫，拥有强大的药水技能。你需要：
1. 第一晚必须救人（通常救当晚被杀的玩家）
2. 每天必须跳出来报告使用药水的情况
3. 合理使用解药和毒药
4. 在关键时刻救人或毒狼`,

  hunter: `你是猎人，拥有开枪反杀的能力。注意：
1. 被狼人杀死或被投票出局时可以开枪
2. 被女巫毒死时无法开枪
3. 择机选择最佳的开枪目标
4. 在必要时暴露身份威慑狼人`,

  villager: `你是村民，没有特殊技能但同样重要。你应该：
1. 仔细分析每个人的发言
2. 可以假冒猎人迷惑狼人
3. 不可以假冒预言家和女巫
4. 通过推理帮助好人阵营获胜`,

  guard: `你是守卫，可以保护其他玩家。你需要：
1. 每晚选择一名玩家进行守护
2. 不能连续两晚守护同一人
3. 不能守护自己
4. 合理分析并守护关键角色`
}

/**
 * 性格化提示词
 */
export const PERSONALITY_PROMPTS = {
  logical: '你是逻辑型玩家，重视事实和推理，发言要有条理，基于证据做判断。',
  intuitive: '你是直觉型玩家，相信第一感觉，善于察言观色，用感性的方式表达观点。',
  aggressive: '你是激进型玩家，容易怀疑他人，敢于提出质疑，投票果断。',
  conservative: '你是保守型玩家，谨慎小心，不轻易下结论，倾向于稳妥的选择。',
  leader: '你是领袖型玩家，善于引导讨论，组织分析，影响他人的决策。',
  follower: '你是跟随型玩家，更愿意听取他人意见，支持主流观点。'
}

/**
 * 构建游戏状态描述 - 修复身份信息泄露问题
 */
function buildGameStateContext(player: Player, gameState: GameState): string {
  const alivePlayers = gameState.players.filter(p => p.status === 'active')
  const deadPlayers = gameState.players.filter(p => p.status === 'eliminated')
  
  return `
### 当前游戏状态 ###
- 你是：${player.name}（${player.role}，${player.camp}阵营）
- 第${gameState.currentRound}轮，${gameState.currentPhase}阶段
- 存活玩家：${alivePlayers.length}人
- 死亡玩家：${deadPlayers.length}人

存活玩家详情：
${alivePlayers.map(p => `- ${p.name}(ID:${p.id}) - 身份未知`).join('\n')}

${deadPlayers.length > 0 ? `死亡玩家详情：
${deadPlayers.map(p => `- ${p.name}(ID:${p.id}) - 已出局`).join('\n')}` : ''}

注意：你只知道自己的身份信息，其他玩家的身份需要通过游戏过程推断。
  `
}

/**
 * 构建精确的行动选择prompt - 明确列出所有可选项
 */
export function buildPreciseActionPrompt(
  player: Player,
  gameState: GameState,
  availableTargets: Player[],
  actionType: 'vote' | 'kill' | 'check' | 'save' | 'poison' | 'guard' | 'shoot',
  context: string = ''
): string {
  const rolePrompt = ROLE_SPECIFIC_PROMPTS[player.role as keyof typeof ROLE_SPECIFIC_PROMPTS] || ''
  const personalityPrompt = PERSONALITY_PROMPTS[player.aiPersonality as keyof typeof PERSONALITY_PROMPTS] || ''
  const gameStateContext = buildGameStateContext(player, gameState)
  
  const actionDescriptions: Record<string, string> = {
    vote: '投票出局一名玩家',
    kill: '杀死一名玩家',
    check: '查验一名玩家的真实身份',
    save: '救活被杀的玩家',
    poison: '毒死一名玩家',
    guard: '保护一名玩家',
    shoot: '射杀一名玩家'
  }
  
  // 特殊处理女巫的行动选项 - 如果availableTargets实际上是行动选项数组
  if (player.role === 'witch' && availableTargets.length > 0) {
    // 检查是否是新的女巫行动格式（包含save_xxx, poison_xxx, skip等）
    const firstTarget = availableTargets[0] as any
    if (typeof firstTarget === 'string' && (firstTarget.startsWith('save_') || firstTarget.startsWith('poison_') || firstTarget === 'skip')) {
      // 这是新的女巫行动格式
      const actionOptions = availableTargets as unknown as string[]
      
      const optionsList = actionOptions.map((option, index) => {
        if (option === 'skip') {
          return `选项${index + 1}: skip - 什么都不做`
        } else if (option.startsWith('save_')) {
          const targetId = option.replace('save_', '')
          const targetPlayer = gameState.players.find(p => p.id === targetId)
          return `选项${index + 1}: ${option} - 救活${targetPlayer?.name || targetId}`
        } else if (option.startsWith('poison_')) {
          const targetId = option.replace('poison_', '')
          const targetPlayer = gameState.players.find(p => p.id === targetId)
          return `选项${index + 1}: ${option} - 毒死${targetPlayer?.name || targetId}`
        }
        return `选项${index + 1}: ${option}`
      }).join('\n')
      
      return `${WEREWOLF_SYSTEM_PROMPT}

${rolePrompt}

${personalityPrompt}

${gameStateContext}

### 当前任务 ###
你需要作为女巫选择夜晚行动。

${context ? `\n### 额外信息 ###\n${context}` : ''}

### 可选行动列表 ###
你必须从以下行动中选择一个：
${optionsList}

### 重要指令 ###
1. 你必须选择一个行动
2. target字段只能填写以下选项之一：${actionOptions.join(', ')}
3. 严格按照行动格式选择（save_xxx表示救人，poison_xxx表示毒人，skip表示跳过）
4. 必须严格按照JSON格式回复

### 输出格式要求 ###
严格按照以下JSON格式回复，不要包含任何其他内容：

{
  "target": "行动选项（必须是：${actionOptions.join(' 或 ')}）",
  "reasoning": "你的推理过程（30字以内）",
  "confidence": 0.8,
  "message": "公开发言（20字以内）",
  "emotion": "confident"
}

### 示例格式 ###
{
  "target": "${actionOptions[0] || 'skip'}",
  "reasoning": "基于逻辑分析的选择",
  "confidence": 0.8,
  "message": "我选择这个行动",
  "emotion": "confident"
}

请现在做出选择：`
    }
  }
  
  // 原有的常规处理逻辑
  // 构建选项列表，每个选项都有明确的ID和描述，但不暴露身份信息
  const optionsList = availableTargets.map((target, index) => {
    // 只显示基本信息，不暴露身份
    return `选项${index + 1}: 选择 ${target.id} - ${target.name}`
  }).join('\n')
  
  const targetIds = availableTargets.map(t => t.id)
  
  console.log(`🎯 为${player.name}(${player.role})构建${actionType}prompt，可选目标:`, targetIds)
  
  return `${WEREWOLF_SYSTEM_PROMPT}

${rolePrompt}

${personalityPrompt}

${gameStateContext}

### 当前任务 ###
你需要执行：${actionDescriptions[actionType]}

${context ? `\n### 额外信息 ###\n${context}` : ''}

### 可选目标列表（实时更新）###
当前可选的目标ID列表：${targetIds.join(', ')}

你必须从以下选项中选择一个：
${optionsList}

### 重要指令 ###
1. 你必须选择一个目标
2. target字段只能填写以下ID之一：${targetIds.join(', ')}
3. 绝对不要选择不在列表中的ID（如ai_4等不存在的ID）
4. 目标列表是实时更新的，只包含当前有效的目标
5. 必须严格按照JSON格式回复

### 输出格式要求 ###
严格按照以下JSON格式回复，不要包含任何其他内容：

{
  "target": "目标ID（必须是：${targetIds.join(' 或 ')}）",
  "reasoning": "你的推理过程（30字以内）",
  "confidence": 0.8,
  "message": "公开发言（20字以内）",
  "emotion": "confident"
}

### 示例格式 ###
{
  "target": "${targetIds[0] || 'ERROR_NO_TARGETS'}",
  "reasoning": "基于逻辑分析的选择",
  "confidence": 0.8,
  "message": "我选择这个目标",
  "emotion": "confident"
}

请现在做出选择：`
}

/**
 * 构建发言prompt（用于讨论阶段）
 */
export function buildSpeechPrompt(
  player: Player,
  gameState: GameState,
  context: string = ''
): string {
  const rolePrompt = ROLE_SPECIFIC_PROMPTS[player.role as keyof typeof ROLE_SPECIFIC_PROMPTS] || ''
  const personalityPrompt = PERSONALITY_PROMPTS[player.aiPersonality as keyof typeof PERSONALITY_PROMPTS] || ''
  const gameStateContext = buildGameStateContext(player, gameState)
  
  return `${WEREWOLF_SYSTEM_PROMPT}

${rolePrompt}

${personalityPrompt}

${gameStateContext}

### 当前任务 ###
现在是讨论阶段，请发表你的观点和分析。

${context ? `\n### 额外信息 ###\n${context}` : ''}

### 输出格式要求 ###
严格按照以下JSON格式回复：

{
  "message": "你的发言内容（20-40字，符合角色设定）",
  "emotion": "confident",
  "confidence": 0.8,
  "suspiciousness": 0.3,
  "persuasiveness": 0.7,
  "reasoning": "你的内心想法和推理过程（20字以内）"
}

注意：
1. emotion可选值：neutral, suspicious, defensive, aggressive, confident
2. confidence, suspiciousness, persuasiveness都是0.0-1.0之间的数字
3. 只返回JSON对象，不要包含其他解释文字或代码块标记`
}

/**
 * 增强版JSON解析器 - 专门处理AI响应
 */
export function parseAIResponse(response: string): {
  target?: string
  reasoning?: string
  confidence?: number
  message?: string
  emotion?: string
  suspiciousness?: number
  persuasiveness?: number
} {
  try {
    // 预处理响应内容
    let cleanResponse = response.trim()
    
    // 移除常见的非JSON内容
    cleanResponse = cleanResponse.replace(/^[^{]*/, '').replace(/[^}]*$/, '')
    
    // 如果响应包含代码块标记，提取JSON部分
    if (cleanResponse.includes('```json')) {
      const match = cleanResponse.match(/```json\s*([\s\S]*?)\s*```/)
      if (match) {
        cleanResponse = match[1].trim()
      }
    } else if (cleanResponse.includes('```')) {
      const match = cleanResponse.match(/```\s*([\s\S]*?)\s*```/)
      if (match) {
        cleanResponse = match[1].trim()
      }
    }
    
    // 查找JSON对象
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanResponse = jsonMatch[0]
    }
    
    console.log('🔍 清理后的AI响应:', cleanResponse)
    
    // 尝试解析JSON
    const parsed = JSON.parse(cleanResponse)
    
    // 确保target字段保持为字符串格式，不进行数字转换
    let targetId = parsed.target
    if (targetId !== undefined) {
      // 强制转换为字符串，避免数字转换问题
      targetId = String(targetId)
      console.log('🎯 解析的目标ID:', targetId, '类型:', typeof targetId)
    }
    
    // 验证并返回结果
    const result = {
      target: targetId,
      reasoning: parsed.reasoning?.toString() || undefined,
      confidence: typeof parsed.confidence === 'number' ? Math.max(0.1, Math.min(1.0, parsed.confidence)) : 0.5,
      message: parsed.message?.toString() || undefined,
      emotion: parsed.emotion?.toString() || 'neutral',
      suspiciousness: typeof parsed.suspiciousness === 'number' ? Math.max(0.0, Math.min(1.0, parsed.suspiciousness)) : undefined,
      persuasiveness: typeof parsed.persuasiveness === 'number' ? Math.max(0.0, Math.min(1.0, parsed.persuasiveness)) : undefined
    }
    
    console.log('✅ AI响应解析结果:', result)
    return result
  } catch (error) {
    console.warn('JSON解析失败，尝试文本格式解析:', error)
    
    // 后备解析：支持原有的文本格式
    const lines = response.split('\n').filter(line => line.trim())
    const result: any = {}
    
    for (const line of lines) {
      const cleanLine = line.trim()
      if (cleanLine.startsWith('TARGET:')) {
        // 确保目标ID保持字符串格式
        result.target = String(cleanLine.replace('TARGET:', '').trim())
      } else if (cleanLine.startsWith('REASONING:')) {
        result.reasoning = cleanLine.replace('REASONING:', '').trim()
      } else if (cleanLine.startsWith('CONFIDENCE:')) {
        result.confidence = parseFloat(cleanLine.replace('CONFIDENCE:', '').trim()) || 0.5
      } else if (cleanLine.startsWith('MESSAGE:')) {
        result.message = cleanLine.replace('MESSAGE:', '').trim()
      } else if (cleanLine.startsWith('EMOTION:')) {
        result.emotion = cleanLine.replace('EMOTION:', '').trim()
      }
    }
    
    console.log('✅ 文本格式解析结果:', result)
    return result
  }
}

// 兼容性函数
export function buildActionPrompt(
  player: Player,
  gameState: GameState,
  availableTargets: Player[],
  actionType: 'vote' | 'kill' | 'check' | 'save' | 'poison' | 'guard' | 'shoot',
  context: string = ''
): string {
  return buildPreciseActionPrompt(player, gameState, availableTargets, actionType, context)
}

export function buildWerewolfPrompt(
  player: Player,
  gameState: GameState,
  context: string = ''
): string {
  return buildSpeechPrompt(player, gameState, context)
}

export function buildNightActionPrompt(player: Player, gameState: GameState, availableTargets: Player[]): string {
  switch (player.role) {
    case 'werewolf':
      return buildPreciseActionPrompt(player, gameState, availableTargets, 'kill', '夜晚行动阶段')
      
    case 'seer':
      return buildPreciseActionPrompt(player, gameState, availableTargets, 'check', '夜晚行动阶段')
      
    case 'witch': {
      const deadTonight = gameState.players.filter(p => 
        p.status === 'eliminated' && !p.isSaved
      )
      if (deadTonight.length > 0 && !player.hasUsedSkill) {
        return buildPreciseActionPrompt(player, gameState, deadTonight, 'save', '女巫使用解药救人')
      } else {
        return buildPreciseActionPrompt(player, gameState, availableTargets, 'poison', '女巫使用毒药毒人')
      }
    }
      
    case 'guard':
      return buildPreciseActionPrompt(player, gameState, availableTargets, 'guard', '守卫选择守护目标')
      
    default:
      return buildSpeechPrompt(player, gameState, '你没有夜晚行动，请等待其他玩家完成行动。')
  }
}

export function buildVotingPrompt(player: Player, gameState: GameState, availableTargets: Player[]): string {
  return buildPreciseActionPrompt(player, gameState, availableTargets, 'vote', '白天投票阶段')
}

export function buildDecisionPrompt(
  player: Player,
  gameState: GameState,
  availableTargets: Player[],
  actionType: 'vote' | 'kill' | 'check' | 'save' | 'poison' | 'guard' | 'shoot'
): string {
  return buildPreciseActionPrompt(player, gameState, availableTargets, actionType)
}