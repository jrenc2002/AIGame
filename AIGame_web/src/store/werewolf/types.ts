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
  | 'guard_protect' // 守卫保护

// 玩家状态
export type PlayerStatus = 'alive' | 'dead' | 'eliminated'

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
  voterId: string
  targetId: string
  timestamp: number
}

// 游戏日志接口
export interface GameLog {
  id: string
  round: number
  phase: GamePhase
  action: string
  playerId?: string
  targetId?: string
  timestamp: number
  isPublic: boolean // 是否对所有玩家可见
}

// 游戏状态接口
export interface GameState {
  // 基础信息
  gameId: string
  currentRound: number
  currentPhase: GamePhase
  isGameActive: boolean
  winner?: CampType
  
  // 玩家信息
  players: Player[]
  deadPlayers: Player[]
  
  // 夜晚行动
  nightActions: NightAction[]
  
  // 投票信息
  votes: Vote[]
  votingDeadline?: number
  
  // 游戏日志
  gameLogs: GameLog[]
  
  // 时间控制
  phaseStartTime: number
  phaseTimeLimit: number
  
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
  playerId: string
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