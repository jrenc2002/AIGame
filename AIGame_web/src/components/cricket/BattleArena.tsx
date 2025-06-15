import { type FC, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BattleState } from '@/view/CyberCricketFightView'

interface BattleArenaProps {
  battleState: BattleState
  setBattleState: React.Dispatch<React.SetStateAction<BattleState>>
}

export const BattleArena: FC<BattleArenaProps> = ({ battleState, setBattleState }) => {
  const logRef = useRef<HTMLDivElement>(null)

  // 自动滚动到最新日志
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [battleState.battleLog])

  // 战斗逻辑
  useEffect(() => {
    if (!battleState.isActive || !battleState.playerCricket || !battleState.enemyCricket || battleState.winner) {
      return
    }

    const timer = setTimeout(() => {
      const player = battleState.playerCricket!
      const enemy = battleState.enemyCricket!
      
      // 计算伤害
      const calculateDamage = (attacker: any, defender: any) => {
        const baseDamage = Math.max(1, attacker.attack - defender.defense * 0.5)
        const randomFactor = 0.8 + Math.random() * 0.4 // 80%-120%
        return Math.floor(baseDamage * randomFactor)
      }

      // 判断先手（速度高的先攻击）
      const newPlayer = { ...player }
      const newEnemy = { ...enemy }
      const newLog = [...battleState.battleLog]

      const playerFirst = player.speed >= enemy.speed

      if (playerFirst) {
        // 玩家先攻击
        const damage = calculateDamage(player, enemy)
        newEnemy.hp = Math.max(0, newEnemy.hp - damage)
        newLog.push(`${player.name} 使用 ${player.skill} 对 ${enemy.name} 造成 ${damage} 点伤害！`)
        
        if (newEnemy.hp > 0) {
          // 敌人反击
          const enemyDamage = calculateDamage(enemy, player)
          newPlayer.hp = Math.max(0, newPlayer.hp - enemyDamage)
          newLog.push(`${enemy.name} 使用 ${enemy.skill} 对 ${player.name} 造成 ${enemyDamage} 点伤害！`)
        }
      } else {
        // 敌人先攻击
        const damage = calculateDamage(enemy, player)
        newPlayer.hp = Math.max(0, newPlayer.hp - damage)
        newLog.push(`${enemy.name} 使用 ${enemy.skill} 对 ${player.name} 造成 ${damage} 点伤害！`)
        
        if (newPlayer.hp > 0) {
          // 玩家反击
          const playerDamage = calculateDamage(player, enemy)
          newEnemy.hp = Math.max(0, newEnemy.hp - playerDamage)
          newLog.push(`${player.name} 使用 ${player.skill} 对 ${enemy.name} 造成 ${playerDamage} 点伤害！`)
        }
      }

      // 检查胜负
      let winner = null
      if (newPlayer.hp <= 0 && newEnemy.hp <= 0) {
        winner = player.speed >= enemy.speed ? player : enemy // 速度快的获胜
        newLog.push(`双方同时倒下！${winner.name} 凭借速度优势获胜！`)
      } else if (newPlayer.hp <= 0) {
        winner = enemy
        newLog.push(`${enemy.name} 获得胜利！`)
      } else if (newEnemy.hp <= 0) {
        winner = player
        newLog.push(`${player.name} 获得胜利！`)
      }

      setBattleState(prev => ({
        ...prev,
        currentRound: prev.currentRound + 1,
        playerCricket: newPlayer,
        enemyCricket: newEnemy,
        battleLog: newLog,
        winner,
        isActive: !winner
      }))
    }, 2000) // 2秒间隔

    return () => clearTimeout(timer)
  }, [battleState, setBattleState])

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-cyan-500/30 p-4 shadow-xl">
      <h2 className="text-xl font-bold text-center mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
        ⚔️ 战斗竞技场 ⚔️
      </h2>
      
      {/* 战斗状态显示 */}
      <div className="mb-4 text-center">
        {battleState.isActive ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="text-yellow-400 font-semibold"
          >
            🔥 激战进行中... 第 {battleState.currentRound} 回合
          </motion.div>
        ) : (
          <div className="text-gray-400">等待战斗开始...</div>
        )}
      </div>

      {/* 对战双方血量显示 */}
      {battleState.playerCricket && battleState.enemyCricket && (
        <div className="mb-4 space-y-3">
          {/* 玩家血量 */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-cyan-400">{battleState.playerCricket.name}</span>
              <span className="text-gray-300">
                {battleState.playerCricket.hp}/{battleState.playerCricket.maxHp}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                initial={{ width: '100%' }}
                animate={{ 
                  width: `${(battleState.playerCricket.hp / battleState.playerCricket.maxHp) * 100}%` 
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* VS 标识 */}
          <div className="text-center">
            <motion.span 
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-2xl font-bold bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent"
            >
              ⚡VS⚡
            </motion.span>
          </div>

          {/* 敌方血量 */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-pink-400">{battleState.enemyCricket.name}</span>
              <span className="text-gray-300">
                {battleState.enemyCricket.hp}/{battleState.enemyCricket.maxHp}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div 
                className="bg-gradient-to-r from-pink-500 to-red-500 h-2 rounded-full"
                initial={{ width: '100%' }}
                animate={{ 
                  width: `${(battleState.enemyCricket.hp / battleState.enemyCricket.maxHp) * 100}%` 
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 战斗日志 */}
      <div className="bg-black/50 rounded-lg p-3 border border-gray-700">
        <div className="text-sm text-gray-300 mb-2 font-semibold">战斗日志</div>
        <div 
          ref={logRef}
          className="h-32 overflow-y-auto text-sm space-y-1 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600"
        >
          <AnimatePresence>
            {battleState.battleLog.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-gray-300"
              >
                <span className="text-gray-500">[{String(index + 1).padStart(2, '0')}]</span> {log}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* 战斗特效 */}
      <AnimatePresence>
        {battleState.isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* 战斗光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-pink-500/5 animate-pulse" />
            
            {/* 火花效果 */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360] 
              }}
              transition={{ 
                duration: 1, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl"
            >
              ⚡
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 