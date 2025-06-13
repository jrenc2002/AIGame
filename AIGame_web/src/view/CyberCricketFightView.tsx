import { type FC, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CricketCard } from '@/components/cricket/CricketCard'
import { BattleArena } from '@/components/cricket/BattleArena'
import { GameControls } from '@/components/cricket/GameControls'
import { BattleResults } from '@/components/cricket/BattleResults'

// 蛐蛐数据类型定义
export interface Cricket {
  id: string
  name: string
  level: number
  hp: number
  maxHp: number
  attack: number
  defense: number
  speed: number
  skill: string
  element: 'fire' | 'water' | 'earth' | 'thunder' | 'wind'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  wins: number
  losses: number
}

// 战斗状态
export interface BattleState {
  isActive: boolean
  currentRound: number
  totalRounds: number
  playerCricket: Cricket | null
  enemyCricket: Cricket | null
  winner: Cricket | null
  battleLog: string[]
}

const CyberCricketFightView: FC = () => {
  const [playerCricket, setPlayerCricket] = useState<Cricket | null>(null)
  const [enemyCricket, setEnemyCricket] = useState<Cricket | null>(null)
  const [battleState, setBattleState] = useState<BattleState>({
    isActive: false,
    currentRound: 0,
    totalRounds: 0,
    playerCricket: null,
    enemyCricket: null,
    winner: null,
    battleLog: []
  })

  // 生成随机蛐蛐
  const generateRandomCricket = (isPlayer: boolean = true): Cricket => {
    const names = [
      '雷霆战神', '烈焰君主', '冰霜刺客', '狂风战士', '大地守护者',
      '电光之影', '炽焰之心', '寒冰之刃', '疾风之翼', '岩石之盾'
    ]
    const skills = [
      '雷鸣一击', '烈焰冲锋', '冰霜护盾', '疾风连斩', '大地震击',
      '闪电链', '火焰风暴', '极冰之矛', '龙卷风', '山崩地裂'
    ]
    const elements: Cricket['element'][] = ['fire', 'water', 'earth', 'thunder', 'wind']
    const rarities: Cricket['rarity'][] = ['common', 'rare', 'epic', 'legendary']
    
    const level = Math.floor(Math.random() * 10) + 1
    const baseHp = Math.floor(Math.random() * 200) + 150
    const attack = Math.floor(Math.random() * 80) + 40
    const defense = Math.floor(Math.random() * 60) + 30
    const speed = Math.floor(Math.random() * 50) + 25
    
    return {
      id: Math.random().toString(36).substring(2, 9),
      name: names[Math.floor(Math.random() * names.length)],
      level,
      hp: baseHp,
      maxHp: baseHp,
      attack,
      defense,
      speed,
      skill: skills[Math.floor(Math.random() * skills.length)],
      element: elements[Math.floor(Math.random() * elements.length)],
      rarity: rarities[Math.floor(Math.random() * rarities.length)],
      wins: Math.floor(Math.random() * 20),
      losses: Math.floor(Math.random() * 10)
    }
  }

  // 初始化蛐蛐
  useEffect(() => {
    setPlayerCricket(generateRandomCricket(true))
    setEnemyCricket(generateRandomCricket(false))
  }, [])

  // 开始战斗
  const startBattle = () => {
    if (!playerCricket || !enemyCricket) return
    
    setBattleState({
      isActive: true,
      currentRound: 1,
      totalRounds: 0,
      playerCricket: { ...playerCricket, hp: playerCricket.maxHp },
      enemyCricket: { ...enemyCricket, hp: enemyCricket.maxHp },
      winner: null,
      battleLog: ['战斗开始！']
    })
  }

  // 重新生成蛐蛐
  const regenerateCricket = (isPlayer: boolean) => {
    const newCricket = generateRandomCricket(isPlayer)
    if (isPlayer) {
      setPlayerCricket(newCricket)
    } else {
      setEnemyCricket(newCricket)
    }
  }

  return (
    <div className="flex max-h-screen flex-col pt-6 md:pt-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* 游戏标题 */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4"
          >
            赛博斗蛐蛐 ⚡
          </motion.h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            未来世界的AI蛐蛐格斗竞技场
          </p>
        </div>

        {/* 主游戏区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 玩家蛐蛐 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-cyan-400 text-center">玩家战士</h2>
            {playerCricket && (
              <CricketCard 
                cricket={playerCricket} 
                isPlayer={true}
                onRegenerate={() => regenerateCricket(true)}
              />
            )}
          </div>

          {/* 战斗竞技场 */}
          <div className="space-y-4">
            <BattleArena 
              battleState={battleState}
              setBattleState={setBattleState}
            />
            <GameControls 
              onStartBattle={startBattle}
              battleState={battleState}
              playerCricket={playerCricket}
              enemyCricket={enemyCricket}
            />
          </div>

          {/* 敌方蛐蛐 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-pink-400 text-center">敌方战士</h2>
            {enemyCricket && (
              <CricketCard 
                cricket={enemyCricket} 
                isPlayer={false}
                onRegenerate={() => regenerateCricket(false)}
              />
            )}
          </div>
        </div>

        {/* 战斗结果 */}
        <AnimatePresence>
          {battleState.winner && (
            <BattleResults 
              winner={battleState.winner}
              battleLog={battleState.battleLog}
              onClose={() => setBattleState(prev => ({ ...prev, winner: null }))}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default CyberCricketFightView 