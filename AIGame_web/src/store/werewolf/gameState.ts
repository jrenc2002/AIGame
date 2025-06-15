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
export const initialGameState: GameState = {
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

// 游戏日志原子
export const gameLogsAtom = atom<GameLog[]>([])

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
  const gameState = get(gameStateAtom)
  const alivePlayers = get(alivePlayersAtom)
  
  // 如果游戏未激活或没有玩家，不判断胜负
  if (!gameState.isGameActive || alivePlayers.length === 0) {
    return null
  }
  
  const werewolves = alivePlayers.filter(p => p.camp === 'werewolf')
  const villagers = alivePlayers.filter(p => p.camp === 'villager')
  
  // 必须有足够的玩家才能判断胜负
  if (alivePlayers.length < 3) {
    return null
  }
  
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

// 时间触发器原子 - 每秒更新一次
export const timeTickAtom = atom(0)

// 剩余时间原子 - 依赖时间触发器
export const remainingTimeAtom = atom<number>((get) => {
  get(timeTickAtom) // 依赖时间触发器，确保每秒更新
  const gameState = get(gameStateAtom)
  const now = Date.now()
  const elapsed = Math.floor((now - gameState.phaseStartTime) / 1000)
  return Math.max(0, gameState.phaseTimeLimit - elapsed)
})

// 时间管理器原子 - 负责启动和管理定时器
export const timeManagerAtom = atom(
  null,
  (get, set) => {
    let timer: NodeJS.Timeout | null = null
    
    const start = () => {
      if (timer) clearInterval(timer)
      timer = setInterval(() => {
        set(timeTickAtom, prev => prev + 1)
        
        // 检查是否需要自动转换阶段
        const gameState = get(gameStateAtom)
        const remainingTime = get(remainingTimeAtom)
        
        if (remainingTime <= 0 && gameState.isGameActive) {
          // 触发阶段转换
          set(phaseTransitionAtom)
        }
      }, 1000)
    }
    
    const stop = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
    
    return { start, stop }
  }
)

// 阶段转换原子
export const phaseTransitionAtom = atom(
  null,
  (get, set) => {
    const gameState = get(gameStateAtom)
    const currentPhase = gameState.currentPhase
    
    console.log(`🔄 状态机转换: ${currentPhase} -> ?`)
    
    let nextPhase: GamePhase
    let nextDuration: number
    
    switch (currentPhase) {
      case 'preparation':
        nextPhase = 'night'
        nextDuration = 30 // 30秒夜晚（调试用）
        console.log(`🔄 转换到: 夜晚阶段 (${nextDuration}秒)`)
        break
      case 'night': {
        nextPhase = 'day_discussion'
        nextDuration = 45 // 45秒讨论（调试用）
        console.log(`🔄 转换到: 白天讨论阶段 (${nextDuration}秒)`)
        break
      }
      case 'day_discussion': {
        nextPhase = 'day_voting'
        nextDuration = 30 // 30秒投票（调试用）
        console.log(`🔄 转换到: 投票阶段 (${nextDuration}秒)`)
        break
      }
      case 'day_voting': {
        // 处理投票结果
        const votes = gameState.votes
        const voteCount = new Map<string, number>()
        
        // 统计票数
        votes.forEach(vote => {
          voteCount.set(vote.targetId, (voteCount.get(vote.targetId) || 0) + 1)
        })
        
        // 找出得票最多的玩家
        let maxVotes = 0
        let eliminatedPlayerId = ''
        voteCount.forEach((count, playerId) => {
          if (count > maxVotes) {
            maxVotes = count
            eliminatedPlayerId = playerId
          }
        })
        
        // 更新游戏状态
        nextPhase = 'night'
        nextDuration = 30 // 30秒夜晚（调试用）
        
        set(gameStateAtom, {
          ...gameState,
          currentRound: gameState.currentRound + 1,
          currentPhase: nextPhase,
          phaseStartTime: Date.now(),
          phaseTimeLimit: nextDuration,
          players: gameState.players.map(p => 
            p.id === eliminatedPlayerId ? { ...p, status: 'dead' } : p
          ),
          deadPlayers: [...gameState.deadPlayers, ...gameState.players.filter(p => p.id === eliminatedPlayerId)],
          votes: [], // 清空投票
          nightActions: [], // 清空夜晚行动
          gameLogs: [...gameState.gameLogs, {
            id: Date.now().toString(),
            round: gameState.currentRound,
            phase: 'day_voting',
            action: eliminatedPlayerId ? 
              `投票结束，${gameState.players.find(p => p.id === eliminatedPlayerId)?.name} 被投票出局` :
              '投票结束，没有玩家被出局',
            timestamp: Date.now(),
            isPublic: true
          }]
        })
        
        console.log(`🔄 投票结束，进入新一轮: 夜晚阶段 (${nextDuration}秒)`)
        return
      }
      default:
        console.log(`🔄 未知阶段: ${currentPhase}`)
        return
    }
    
    set(gameStateAtom, {
      ...gameState,
      currentPhase: nextPhase,
      phaseStartTime: Date.now(),
      phaseTimeLimit: nextDuration
    })
  }
)

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