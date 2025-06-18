import { useEffect } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { gameStateAtom, timeManagerAtom, remainingTimeAtom, timeTickAtom } from '../store/werewolf/gameState'

export function useGameTimer() {
  const gameState = useAtomValue(gameStateAtom)
  const remainingTime = useAtomValue(remainingTimeAtom)
  const setTimeManager = useSetAtom(timeManagerAtom)
  const setTimeTick = useSetAtom(timeTickAtom)

  // 启动或停止计时器
  useEffect(() => {
    const manager = setTimeManager()
    
    if (gameState.isGameActive) {
      manager.start()
      console.log(`🕐 游戏计时器启动 - 当前阶段: ${gameState.currentPhase}，剩余时间: ${gameState.phaseTimeLimit}秒 (支持任务完成提前结束)`)
    } else {
      manager.stop()
      console.log('⏹️ 游戏计时器停止')
    }

    // 清理函数
    return () => {
      manager.stop()
    }
  }, [gameState.isGameActive, gameState.currentPhase, gameState.phaseTimeLimit, setTimeManager])

  // 当阶段变化时重置计时器
  useEffect(() => {
    if (gameState.isGameActive) {
      setTimeTick(0) // 重置时间触发器
      console.log(`⏰ 阶段切换到: ${gameState.currentPhase}，持续时间: ${gameState.phaseTimeLimit}秒`)
    }
  }, [gameState.isGameActive, gameState.currentPhase, gameState.phaseStartTime, gameState.phaseTimeLimit, setTimeTick])

  return {
    remainingTime,
    currentPhase: gameState.currentPhase,
    isActive: gameState.isGameActive
  }
} 