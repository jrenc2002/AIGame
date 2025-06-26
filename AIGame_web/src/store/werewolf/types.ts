// 狼人杀游戏核心数据类型定义

// 角色类型枚举
export type RoleType = 
  | 'villager'      // 村民
  | 'seer'          // 预言家
  | 'witch'         // 女巫
  | 'hunter'        // 猎人
  | 'guard'         // 守卫
  | 'werewolf'      // 狼人
  | 'alpha_wolf'    // 狼王

// 阵营类型
export type CampType = 'villager' | 'werewolf' | 'neutral'

// AI难度等级
export type AIDifficulty = 'easy' | 'medium' | 'hard'

// AI性格类型
export type AIPersonality = 
  | 'logical'       // 逻辑型
  | 'intuitive'     // 直觉型
  | 'aggressive'    // 激进型
  | 'conservative'  // 保守型
  | 'leader'        // 领袖型
  | 'follower'      // 跟风型

// 游戏阶段
export type GamePhase = 
  | 'preparation'   // 准备阶段
  | 'night'         // 夜晚阶段
  | 'day_discussion'// 白天讨论
  | 'day_voting'    // 白天投票
  | 'game_over'     // 游戏结束

// 夜晚行动类型
export type NightActionType = 
  | 'werewolf_kill' // 狼人杀人
  | 'seer_check'    // 预言家查验
  | 'witch_save'    // 女巫救人
  | 'witch_poison'  // 女巫毒人
  | 'witch_skip'    // 女巫跳过行动
  | 'guard_protect' // 守卫保护

// 玩家状态 - 修复状态枚举
export type PlayerStatus = 'active' | 'eliminated' | 'inactive'

// 游戏系统事件类型
export type GameEventType = 
  | 'phase_start'     // 阶段开始
  | 'phase_end'       // 阶段结束
  | 'player_death'    // 玩家死亡
  | 'voting_result'   // 投票结果
  | 'night_result'    // 夜晚行动结果
  | 'game_start'      // 游戏开始
  | 'game_end'        // 游戏结束
  | 'skill_used'      // 技能使用
  | 'system_action'   // 系统行为
  | 'werewolf_kill'   // 狼人杀人
  | 'witch_save'      // 女巫救人
  | 'witch_poison'    // 女巫毒人
  | 'peaceful_night'  // 平安夜

// 发言情感类型
export type SpeechEmotion = 
  | 'neutral'      // 中性
  | 'suspicious'   // 怀疑
  | 'defensive'    // 防御
  | 'aggressive'   // 激进
  | 'confident'    // 自信
  | 'nervous'      // 紧张
  | 'calm'         // 冷静

// 玩家数据接口
export interface Player {
  id: string
  name: string
  avatar: string
  role: RoleType
  camp: CampType
  status: PlayerStatus
  isPlayer: boolean // 是否为真人玩家
  
  // AI相关属性
  aiDifficulty?: AIDifficulty
  aiPersonality?: AIPersonality
  suspicionLevels?: Map<string, number> // 对其他玩家的怀疑度
  
  // AI推理记忆系统
  reasoningMemory?: AIReasoningMemory
  
  // 游戏统计
  votesReceived: number
  hasVoted: boolean
  votedFor?: string
  
  // 角色特殊状态
  hasUsedSkill: boolean
  isProtected: boolean
  isPoisoned: boolean
  isSaved: boolean
}

// 夜晚行动接口
export interface NightAction {
  id: string
  playerId: string
  actionType: NightActionType
  targetId?: string
  timestamp: number
}

// 投票信息接口
export interface Vote {
  id: string
  voterId: string
  targetId: string
  timestamp: number
}

// 游戏日志接口 - 仅记录系统事件
export interface GameLog {
  id: string
  round: number
  phase: GamePhase
  eventType: GameEventType
  description: string // 事件描述
  action?: string // 保持向后兼容性
  playerId?: string // 相关玩家ID
  targetId?: string // 目标玩家ID
  timestamp: number
  isPublic: boolean // 是否对所有玩家可见
  data?: any // 额外数据
}

// 玩家发言记录接口 - 记录所有对话内容
export interface PlayerSpeech {
  id: string
  playerId: string
  playerName: string
  content: string // 发言内容
  emotion: SpeechEmotion
  round: number
  phase: GamePhase
  timestamp: number
  isAI: boolean
  
  // AI专用字段
  reasoning?: string // AI推理过程（不参与context构建）
  confidence?: number // AI置信度（0-1之间）
  
  // 可见性控制
  isVisible: boolean // 是否对其他玩家可见
}

// 游戏状态接口 - 扩展支持轮流发言
export interface GameState {
  // 基础信息
  gameId: string
  currentRound: number
  currentPhase: GamePhase
  isActive: boolean
  isGameActive: boolean
  isPaused?: boolean
  pauseReason?: string
  winner?: string
  
  // 玩家信息
  players: Player[]
  deadPlayers: Player[]
  
  // 夜晚行动
  nightActions: NightAction[]
  
  // 投票信息
  votes: Vote[]
  votingDeadline?: number
  
  // 游戏日志 - 仅系统事件
  gameLogs: GameLog[]
  
  // 玩家发言记录 - 单独管理，保存全部对话
  playerSpeeches: PlayerSpeech[]
  
  // AI推理记忆存储
  aiReasoningMemories: AIReasoningMemory[]
  
  // AI提示词和上下文日志
  aiPromptLogs: AIPromptLog[]
  
  // 时间控制
  phaseStartTime: number
  phaseTimeLimit: number
  
  // 轮流发言状态
  currentSpeakerIndex?: number
  speakingOrder?: string[]
  discussionComplete?: boolean
  
  // 游戏设置
  settings: GameSettings
}

// 游戏设置接口
export interface GameSettings {
  totalPlayers: number
  werewolfCount: number
  specialRoles: RoleType[]
  timeLimit: {
    discussion: number // 讨论时间（秒）
    voting: number     // 投票时间（秒）
    night: number      // 夜晚行动时间（秒）
  }
  aiSettings: {
    difficulty: AIDifficulty
    personalityDistribution: Record<AIPersonality, number>
  }
}

// AI决策结果接口
export interface AIDecision {
  actionType: 'vote' | 'skill' | 'discussion'
  target?: string
  reasoning: string
  confidence: number // 0-1之间的置信度
}

// 游戏结果接口
export interface GameResult {
  gameId: string
  winner: CampType
  duration: number
  rounds: number
  players: {
    id: string
    name: string
    role: RoleType
    camp: CampType
    status: PlayerStatus
    performance: {
      correctVotes: number
      wrongVotes: number
      skillUsage: number
    }
  }[]
  mvp?: string // 最佳玩家ID
}

// 角色配置接口
export interface RoleConfig {
  role: RoleType
  camp: CampType
  name: string
  description: string
  abilities: string[]
  winCondition: string
  icon: string
  color: string
}

// 玩家推理笔记接口
export interface PlayerInference {
  playerId: string
  playerName: string
  suspicionLevel: number // 0-1之间的怀疑度
  behaviorPattern: string[] // 行为模式记录
  keyObservations: string[] // 关键观察
  lastUpdated: number
}

// AI推理记忆系统
export interface AIReasoningMemory {
  playerId: string // AI玩家ID
  gameId: string
  round: number
  inferences: PlayerInference[] // 对其他玩家的推理
  gameStrategy: string // 当前游戏策略
  personalNotes: string[] // 个人笔记
  lastUpdated: number
}

// AI提示词和上下文日志
export interface AIPromptLog {
  id: string
  timestamp: number
  playerId: string
  playerName: string
  gamePhase: GamePhase
  round: number
  actionType: string // 'speech' | 'vote' | 'kill' | 'check' | 'save' | 'poison' | 'guard'
  
  // 上下文信息
  contextInfo: {
    systemPrompt: string // 系统提示词
    gameContext: string // 游戏状态上下文
    speechHistory: string // 发言历史
    eventHistory: string // 事件历史
    reasoningMemory?: string // 推理记忆
    availableTargets?: string[] // 可选目标
    additionalContext?: string // 额外上下文
  }
  
  // 完整prompt
  fullPrompt: string
  
  // AI响应
  aiResponse?: {
    rawResponse: string
    parsedResponse: any
    processingTime: number
  }
  
  // 错误信息
  error?: {
    message: string
    stack?: string
  }
} 