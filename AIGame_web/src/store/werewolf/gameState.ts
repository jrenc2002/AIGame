import { atom } from 'jotai'
import { GameState, Player, GameSettings, GamePhase, RoleType, CampType, GameLog, Vote, NightAction } from './types'

// 默认游戏设置
const defaultGameSettings: GameSettings = {
  totalPlayers: 8,
  werewolfCount: 2,
  specialRoles: ['seer', 'witch', 'hunter', 'guard'],
  timeLimit: {
    discussion: 180, // 3分钟讨论
    voting: 60,      // 1分钟投票
    night: 120       // 2分钟夜晚
  },
  aiSettings: {
    difficulty: 'medium',
    personalityDistribution: {
      logical: 0.2,
      intuitive: 0.15,
      aggressive: 0.15,
      conservative: 0.2,
      leader: 0.15,
      follower: 0.15
    }
  }
}

// 初始游戏状态
const initialGameState: GameState = {
  gameId: '',
  currentRound: 0,
  currentPhase: 'preparation',
  isGameActive: false,
  players: [],
  deadPlayers: [],
  nightActions: [],
  votes: [],
  gameLogs: [],
  phaseStartTime: 0,
  phaseTimeLimit: 0,
  settings: defaultGameSettings
}

// 主要游戏状态原子
export const gameStateAtom = atom<GameState>(initialGameState)

// 当前玩家原子（真人玩家）
export const currentPlayerAtom = atom<Player | null>(null)

// 游戏设置原子
export const gameSettingsAtom = atom<GameSettings>(defaultGameSettings)

// 当前阶段原子
export const currentPhaseAtom = atom<GamePhase>(
  (get) => get(gameStateAtom).currentPhase,
  (get, set, newPhase: GamePhase) => {
    const gameState = get(gameStateAtom)
    set(gameStateAtom, {
      ...gameState,
      currentPhase: newPhase,
      phaseStartTime: Date.now()
    })
  }
)

// 活跃玩家原子（存活的玩家）
export const alivePlayersAtom = atom<Player[]>((get) => {
  const gameState = get(gameStateAtom)
  return gameState.players.filter(player => player.status === 'alive')
})

// 狼人玩家原子
export const werewolfPlayersAtom = atom<Player[]>((get) => {
  const alivePlayers = get(alivePlayersAtom)
  return alivePlayers.filter(player => 
    player.role === 'werewolf' || player.role === 'alpha_wolf'
  )
})

// 村民阵营玩家原子
export const villagerPlayersAtom = atom<Player[]>((get) => {
  const alivePlayers = get(alivePlayersAtom)
  return alivePlayers.filter(player => player.camp === 'villager')
})

// 当前回合投票原子
export const currentVotesAtom = atom<Vote[]>((get) => {
  const gameState = get(gameStateAtom)
  return gameState.votes
})

// 投票结果统计原子
export const voteResultsAtom = atom<Record<string, number>>((get) => {
  const votes = get(currentVotesAtom)
  const results: Record<string, number> = {}
  
  votes.forEach(vote => {
    results[vote.targetId] = (results[vote.targetId] || 0) + 1
  })
  
  return results
})

// 游戏胜负判定原子
export const gameWinnerAtom = atom<CampType | null>((get) => {
  const alivePlayers = get(alivePlayersAtom)
  const werewolves = alivePlayers.filter(p => p.camp === 'werewolf')
  const villagers = alivePlayers.filter(p => p.camp === 'villager')
  
  if (werewolves.length === 0) {
    return 'villager' // 村民获胜
  }
  
  if (werewolves.length >= villagers.length) {
    return 'werewolf' // 狼人获胜
  }
  
  return null // 游戏继续
})

// 游戏日志原子（仅显示公开日志）
export const publicGameLogsAtom = atom<GameLog[]>((get) => {
  const gameState = get(gameStateAtom)
  return gameState.gameLogs.filter(log => log.isPublic)
})

// 剩余时间原子
export const remainingTimeAtom = atom<number>((get) => {
  const gameState = get(gameStateAtom)
  const now = Date.now()
  const elapsed = Math.floor((now - gameState.phaseStartTime) / 1000)
  return Math.max(0, gameState.phaseTimeLimit - elapsed)
})

// 是否可以投票原子
export const canVoteAtom = atom<boolean>((get) => {
  const gameState = get(gameStateAtom)
  const currentPlayer = get(currentPlayerAtom)
  
  return gameState.currentPhase === 'day_voting' && 
         currentPlayer?.status === 'alive' && 
         !currentPlayer?.hasVoted
})

// 角色配置常量
export const ROLE_CONFIGS = {
  villager: {
    role: 'villager' as RoleType,
    camp: 'villager' as CampType,
    name: '村民',
    description: '普通村民，白天参与投票，寻找狼人',
    abilities: ['投票'],
    winCondition: '消灭所有狼人',
    icon: '👨‍🌾',
    color: 'bg-blue-100 text-blue-600'
  },
  seer: {
    role: 'seer' as RoleType,
    camp: 'villager' as CampType,
    name: '预言家',
    description: '每晚可以查验一名玩家的身份',
    abilities: ['夜晚查验身份'],
    winCondition: '消灭所有狼人',
    icon: '🔮',
    color: 'bg-purple-100 text-purple-600'
  },
  witch: {
    role: 'witch' as RoleType,
    camp: 'villager' as CampType,
    name: '女巫',
    description: '拥有救人药和毒药各一瓶',
    abilities: ['救人药', '毒药'],
    winCondition: '消灭所有狼人',
    icon: '🧙‍♀️',
    color: 'bg-green-100 text-green-600'
  },
  hunter: {
    role: 'hunter' as RoleType,
    camp: 'villager' as CampType,
    name: '猎人',
    description: '被投票出局时可以开枪带走一名玩家',
    abilities: ['临死开枪'],
    winCondition: '消灭所有狼人',
    icon: '🏹',
    color: 'bg-orange-100 text-orange-600'
  },
  guard: {
    role: 'guard' as RoleType,
    camp: 'villager' as CampType,
    name: '守卫',
    description: '每晚可以守护一名玩家，防止其被狼人杀死',
    abilities: ['夜晚守护'],
    winCondition: '消灭所有狼人',
    icon: '🛡️',
    color: 'bg-cyan-100 text-cyan-600'
  },
  werewolf: {
    role: 'werewolf' as RoleType,
    camp: 'werewolf' as CampType,
    name: '狼人',
    description: '每晚可以杀死一名村民',
    abilities: ['夜晚杀人'],
    winCondition: '狼人数量≥村民数量',
    icon: '🐺',
    color: 'bg-red-100 text-red-600'
  },
  alpha_wolf: {
    role: 'alpha_wolf' as RoleType,
    camp: 'werewolf' as CampType,
    name: '狼王',
    description: '被投票出局时可以开枪带走一名玩家',
    abilities: ['夜晚杀人', '临死开枪'],
    winCondition: '狼人数量≥村民数量',
    icon: '👑🐺',
    color: 'bg-red-200 text-red-700'
  }
} 