// 狼人杀专业系统提示词
// 基于 LLM-Werewolf 项目的专业规则整合

import { Player, GameState, RoleType, GamePhase } from '@/store/werewolf/types'

/**
 * 狼人杀核心系统提示词
 * 采用9人全禁房规则，借鉴LLM-Werewolf项目的专业设定
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
 * 阶段专用提示词
 */
export const PHASE_SPECIFIC_PROMPTS = {
  preparation: '游戏即将开始，你需要准备分析其他玩家的行为模式。',
  
  night: `现在是夜晚阶段，根据你的身份执行相应行动：
- 狼人：与队友讨论击杀目标
- 预言家：选择查验目标
- 女巫：决定是否使用药水
- 守卫：选择守护目标
- 村民：等待夜晚结束`,

  day_discussion: `白天讨论阶段，你需要：
1. 分析夜晚发生的事情
2. 根据角色身份选择发言策略
3. 推理谁可能是狼人
4. 为投票做准备`,

  day_voting: `投票阶段，你需要：
1. 基于之前的分析选择投票目标
2. 说明你的投票理由
3. 考虑投票对局势的影响`,

  game_over: '游戏结束，总结这局游戏的得失。'
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
 * 构建完整的AI提示词
 */
export function buildWerewolfPrompt(
  player: Player,
  gameState: GameState,
  context: string = ''
): string {
  const rolePrompt = ROLE_SPECIFIC_PROMPTS[player.role as keyof typeof ROLE_SPECIFIC_PROMPTS] || ''
  const phasePrompt = PHASE_SPECIFIC_PROMPTS[gameState.currentPhase as keyof typeof PHASE_SPECIFIC_PROMPTS] || ''
  const personalityPrompt = PERSONALITY_PROMPTS[player.aiPersonality as keyof typeof PERSONALITY_PROMPTS] || ''
  
  // 构建游戏状态信息
  const alivePlayers = gameState.players.filter(p => p.status === 'alive')
  const deadPlayers = gameState.players.filter(p => p.status === 'dead')
  
  const gameInfo = `
当前游戏状态：
- 第${gameState.currentRound}轮
- 阶段：${gameState.currentPhase}
- 存活玩家：${alivePlayers.length}人
- 死亡玩家：${deadPlayers.length}人
- 存活玩家列表：${alivePlayers.map(p => `${p.name}(${p.id})`).join(', ')}
${deadPlayers.length > 0 ? `- 死亡玩家列表：${deadPlayers.map(p => `${p.name}(${p.id})`).join(', ')}` : ''}
  `
  
  return `${WEREWOLF_SYSTEM_PROMPT}

${rolePrompt}

${personalityPrompt}

${phasePrompt}

${gameInfo}

额外上下文：${context}

请根据以上信息，以你的角色身份和性格特征做出合适的反应。必须按照以下JSON格式回复：

{
  "message": "你的发言内容（20-40字，符合角色设定）",
  "emotion": "confident",
  "confidence": 0.8,
  "suspiciousness": 0.3,
  "persuasiveness": 0.7
}

注意：
1. emotion可选值：neutral, suspicious, defensive, aggressive, confident
2. confidence, suspiciousness, persuasiveness都是0.0-1.0之间的数字
3. 只返回JSON对象，不要包含其他解释文字`
}

/**
 * 构建决策专用提示词
 */
export function buildDecisionPrompt(
  player: Player,
  gameState: GameState,
  availableTargets: Player[],
  actionType: 'vote' | 'kill' | 'check' | 'save' | 'poison' | 'guard' | 'shoot'
): string {
  const basePrompt = buildWerewolfPrompt(player, gameState)
  const targetList = availableTargets.map(p => `${p.name}(ID:${p.id})`).join(', ')
  
  const actionPrompts = {
    vote: '现在是投票环节，你需要选择一个要出局的玩家。',
    kill: '狼人行动：选择今晚要击杀的目标。',
    check: '预言家行动：选择要查验身份的玩家。',
    save: '女巫行动：选择要救活的玩家（使用解药）。',
    poison: '女巫行动：选择要毒杀的玩家（使用毒药）。',
    guard: '守卫行动：选择要守护的玩家。',
    shoot: '猎人行动：选择要开枪射杀的玩家。'
  }
  
  return `${basePrompt}

${actionPrompts[actionType]}

可选目标：${targetList}

请做出决策并说明理由。必须按照以下JSON格式回复，不要包含任何其他内容：

{
  "target": "玩家ID（只填写数字，如: 3）",
  "reasoning": "推理过程（30字以内）",
  "confidence": 0.8,
  "message": "向其他玩家解释的话（20字以内）",
  "emotion": "confident"
}

重要注意事项：
1. target字段只能填写纯数字ID，不要包含玩家名称或括号
2. 可选目标ID：${availableTargets.map(p => p.id).join(', ')}
3. confidence必须是0.1-1.0之间的数字
4. emotion可选值：neutral, suspicious, defensive, aggressive, confident
5. 只返回标准JSON格式，不要添加任何解释文字或代码块标记

示例正确格式：
{
  "target": "3",
  "reasoning": "此玩家行为可疑",
  "confidence": 0.8,
  "message": "我觉得3号有问题",
  "emotion": "suspicious"
}`
}

/**
 * 生成角色特定的夜晚行动提示
 */
export function buildNightActionPrompt(player: Player, gameState: GameState): string {
  const basePrompt = buildWerewolfPrompt(player, gameState, '夜晚行动阶段')
  
  switch (player.role) {
    case 'werewolf': {
      const werewolfTargets = gameState.players.filter(p => 
        p.status === 'alive' && p.camp === 'villager'
      )
      return buildDecisionPrompt(player, gameState, werewolfTargets, 'kill')
    }
      
    case 'seer': {
      const seerTargets = gameState.players.filter(p => 
        p.status === 'alive' && p.id !== player.id
      )
      return buildDecisionPrompt(player, gameState, seerTargets, 'check')
    }
      
    case 'witch': {
      // 女巫的行动比较复杂，需要考虑救人和毒人
      const deadTonight = gameState.players.filter(p => 
        p.status === 'dead' && !p.isSaved
      )
      if (deadTonight.length > 0 && !player.hasUsedSkill) {
        return buildDecisionPrompt(player, gameState, deadTonight, 'save')
      } else {
        const poisonTargets = gameState.players.filter(p => 
          p.status === 'alive' && p.id !== player.id
        )
        return buildDecisionPrompt(player, gameState, poisonTargets, 'poison')
      }
    }
      
    case 'guard': {
      const guardTargets = gameState.players.filter(p => 
        p.status === 'alive' && p.id !== player.id
      )
      return buildDecisionPrompt(player, gameState, guardTargets, 'guard')
    }
      
    default:
      return basePrompt + '\n\n你没有夜晚行动，请等待其他玩家完成行动。'
  }
}

/**
 * 解析AI的JSON响应
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
    // 首先尝试直接解析JSON
    const cleanResponse = response.trim()
    let jsonStr = cleanResponse
    
    // 如果响应包含代码块标记，提取JSON部分
    if (cleanResponse.includes('```json')) {
      const match = cleanResponse.match(/```json\s*([\s\S]*?)\s*```/)
      if (match) {
        jsonStr = match[1].trim()
      }
    } else if (cleanResponse.includes('```')) {
      const match = cleanResponse.match(/```\s*([\s\S]*?)\s*```/)
      if (match) {
        jsonStr = match[1].trim()
      }
    }
    
    // 尝试解析JSON
    const parsed = JSON.parse(jsonStr)
    
    // 验证并返回结果
    return {
      target: parsed.target?.toString() || undefined,
      reasoning: parsed.reasoning?.toString() || undefined,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      message: parsed.message?.toString() || undefined,
      emotion: parsed.emotion?.toString() || 'neutral',
      suspiciousness: typeof parsed.suspiciousness === 'number' ? parsed.suspiciousness : undefined,
      persuasiveness: typeof parsed.persuasiveness === 'number' ? parsed.persuasiveness : undefined
    }
  } catch (error) {
    console.warn('JSON解析失败，尝试文本格式解析:', error)
    
    // 后备解析：支持原有的文本格式
    const lines = response.split('\n').filter(line => line.trim())
    const result: any = {}
    
    for (const line of lines) {
      if (line.startsWith('TARGET:')) {
        result.target = line.replace('TARGET:', '').trim()
      } else if (line.startsWith('REASONING:')) {
        result.reasoning = line.replace('REASONING:', '').trim()
      } else if (line.startsWith('CONFIDENCE:')) {
        result.confidence = parseFloat(line.replace('CONFIDENCE:', '').trim()) || 0.5
      } else if (line.startsWith('MESSAGE:')) {
        result.message = line.replace('MESSAGE:', '').trim()
      } else if (line.startsWith('EMOTION:')) {
        result.emotion = line.replace('EMOTION:', '').trim()
      }
    }
    
    return result
  }
} 