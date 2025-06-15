# LLM-Werewolf 游戏流程详解

## 📋 流程概述

本文档详细描述LLM-Werewolf项目的完整游戏流程，包括每个阶段的具体实现、状态管理、AI调用时机等关键细节。

## 🎮 游戏初始化流程

### 1. 游戏创建
```javascript
// 创建新游戏
function createNewGame() {
  const gameState = {
    round_id: 1,
    phase: 'preparation',
    players: createPlayers(),
    night_actions: [],
    day_votes: [],
    game_logs: []
  }
  
  // 随机分配角色
  assignRoles(gameState.players)
  
  // 初始化AI状态
  initializeAI(gameState.players)
  
  return gameState
}
```

### 2. 角色分配逻辑
```javascript
function assignRoles(players) {
  const roles = ['狼人', '狼人', '狼人', '预言家', '女巫', '猎人', '村民', '村民', '村民']
  
  // 洗牌算法
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]]
  }
  
  // 分配角色
  players.forEach((player, index) => {
    player.role = roles[index]
    player.camp = roles[index] === '狼人' ? 'werewolf' : 'villager'
  })
}
```

### 3. 玩家初始化
```javascript
function createPlayers() {
  const players = []
  const nicknames = ['灰太狼', '美羊羊', '慢羊羊', '喜羊羊', '懒羊羊', '红太狼', '沸羊羊', '暖羊羊', '背锅侠']
  
  for (let i = 1; i <= 9; i++) {
    players.push({
      id: i,
      nickname: nicknames[i - 1],
      role: '',
      is_human: i === 1, // 1号默认为真实玩家
      died: false,
      died_cause: '',
      died_round: 0,
      speak_history: [],
      vote_history: [],
      action_history: []
    })
  }
  
  return players
}
```

## 🌙 夜晚阶段流程

### 1. 夜晚阶段开始
```javascript
async function startNightPhase() {
  updateGamePhase('night')
  
  // 清空夜晚行动记录
  clearNightActions()
  
  // 按顺序执行夜晚行动
  await executeWerewolfActions()    // 狼人击杀
  await executeSeersActions()       // 预言家查验  
  await executeWitchActions()       // 女巫用药
  await executeGuardActions()       // 守卫保护（如果有）
  
  // 结算夜晚结果
  await resolveNightResults()
  
  // 转入白天阶段
  await startDayPhase()
}
```

### 2. 狼人夜晚协商
```javascript
async function executeWerewolfActions() {
  const wolves = getAlivePlayers().filter(p => p.role === '狼人')
  const strategies = []
  
  // 串行收集各狼人策略
  for (const wolf of wolves) {
    const prompt = buildWerewolfNightPrompt(wolf, getGameInfo(), getWolfTeammates(wolf), strategies)
    const response = await callAI(prompt)
    const parsed = parseAIResponse(response)
    
    strategies.push({
      playerId: wolf.id,
      targetId: parsed.kill_player,
      strategy: parsed.my_strategy
    })
    
    // 记录狼人内部讨论
    addGameLog({
      round_id: getCurrentRound(),
      type: 'wolf_discussion',
      content: `${wolf.id}号狼人策略：${parsed.my_strategy}`,
      is_public: false
    })
  }
  
  // 确定最终击杀目标（多数决或第一个）
  const finalTarget = decideFinalTarget(strategies)
  
  // 记录击杀行动
  addNightAction({
    player_id: 'werewolf_team',
    action_type: 'kill',
    target_id: finalTarget,
    success: true
  })
}
```

### 3. 预言家查验
```javascript
async function executeSeersActions() {
  const seer = getAlivePlayers().find(p => p.role === '预言家')
  if (!seer) return
  
  if (seer.is_human) {
    // 真实玩家：等待用户选择
    await waitForPlayerAction(seer.id, 'check')
  } else {
    // AI玩家：自动查验
    const prompt = buildSeerCheckPrompt(seer, getGameInfo())
    const response = await callAI(prompt)
    const parsed = parseAIResponse(response)
    
    const checkResult = {
      target_id: parseInt(parsed.check_ids),
      is_wolf: checkPlayerIsWolf(parsed.check_ids),
      reason: parsed.check_cause
    }
    
    // 记录查验结果
    seer.action_history.push({
      round_id: getCurrentRound(),
      target_id: checkResult.target_id,
      strategy: checkResult.reason,
      is_wolf: checkResult.is_wolf
    })
    
    addNightAction({
      player_id: seer.id,
      action_type: 'check',
      target_id: checkResult.target_id,
      success: true,
      result: checkResult.is_wolf ? 'werewolf' : 'villager'
    })
  }
}
```

### 4. 女巫用药
```javascript
async function executeWitchActions() {
  const witch = getAlivePlayers().find(p => p.role === '女巫')
  if (!witch) return
  
  const killedPlayer = getKilledPlayerTonight()
  
  if (getCurrentRound() === 1) {
    // 第一夜必须救人
    await witchSaveAction(witch, killedPlayer)
  } else {
    // 后续夜晚可选择用毒
    await witchPoisonAction(witch)
  }
}

async function witchSaveAction(witch, killedPlayer) {
  if (witch.is_human) {
    // 真实玩家操作
    await waitForPlayerAction(witch.id, 'save')
  } else {
    // AI自动救人
    const prompt = buildWitchSavePrompt(witch, getGameInfo(), killedPlayer)
    const response = await callAI(prompt)
    const parsed = parseAIResponse(response)
    
    addNightAction({
      player_id: witch.id,
      action_type: 'save',
      target_id: parseInt(parsed.save_ids),
      success: true
    })
  }
}

async function witchPoisonAction(witch) {
  if (witch.is_human) {
    await waitForPlayerAction(witch.id, 'poison')
  } else {
    const prompt = buildWitchPoisonPrompt(witch, getGameInfo())
    const response = await callAI(prompt)
    const parsed = parseAIResponse(response)
    
    if (parsed.yes_or_no === 'yes' && parsed.kill_ids) {
      addNightAction({
        player_id: witch.id,
        action_type: 'poison',
        target_id: parseInt(parsed.kill_ids),
        success: true
      })
    }
  }
}
```

### 5. 夜晚结果结算
```javascript
async function resolveNightResults() {
  const killedByWerewolf = getNightAction('kill')?.target_id
  const savedByWitch = getNightAction('save')?.target_id
  const poisonedByWitch = getNightAction('poison')?.target_id
  const guardedPlayer = getNightAction('guard')?.target_id
  
  // 计算最终死亡列表
  const deaths = []
  
  // 狼人击杀（可能被救或被守护）
  if (killedByWerewolf && 
      killedByWerewolf !== savedByWitch && 
      killedByWerewolf !== guardedPlayer) {
    deaths.push({
      player_id: killedByWerewolf,
      cause: '狼人'
    })
  }
  
  // 女巫毒杀
  if (poisonedByWitch) {
    deaths.push({
      player_id: poisonedByWitch,
      cause: '女巫'
    })
  }
  
  // 执行死亡
  deaths.forEach(death => {
    killPlayer(death.player_id, death.cause)
    addGameLog({
      round_id: getCurrentRound(),
      type: 'death',
      content: `${death.player_id}号${getPlayerNickname(death.player_id)}死亡，死因：${death.cause}`,
      is_public: true
    })
  })
  
  // 特殊技能触发（猎人开枪）
  await handleSpecialSkills(deaths)
}
```

## ☀️ 白天阶段流程

### 1. 白天阶段开始
```javascript
async function startDayPhase() {
  updateGamePhase('day_speech')
  
  // 公布夜晚结果
  await announceNightResults()
  
  // 检查游戏是否结束
  if (checkGameEnd()) {
    await endGame()
    return
  }
  
  // 开始发言环节
  await executeDaySpeeches()
  
  // 转入投票环节
  await startVotingPhase()
}
```

### 2. 夜晚结果公布
```javascript
async function announceNightResults() {
  const deathsLastNight = getPlayersWhoDeadInRound(getCurrentRound())
  
  if (deathsLastNight.length === 0) {
    addGameLog({
      round_id: getCurrentRound(),
      type: 'announcement',
      content: '昨晚是平安夜，没有玩家死亡',
      is_public: true
    })
  } else {
    deathsLastNight.forEach(player => {
      addGameLog({
        round_id: getCurrentRound(),
        type: 'announcement',
        content: `昨晚${player.id}号${player.nickname}死亡，死因：${player.died_cause}`,
        is_public: true
      })
    })
  }
  
  // 显示结果给玩家
  await displayNightResults(deathsLastNight)
}
```

### 3. 白天发言环节
```javascript
async function executeDaySpeeches() {
  const alivePlayers = getAlivePlayers()
  
  // 按座位号顺序发言
  for (let i = 1; i <= 9; i++) {
    const player = alivePlayers.find(p => p.id === i)
    if (!player) continue // 死亡玩家跳过
    
    await executePlayerSpeech(player, getSpeakOrder(i, alivePlayers))
  }
}

async function executePlayerSpeech(player, speakOrder) {
  if (player.is_human) {
    // 真实玩家发言
    await waitForPlayerSpeech(player.id)
  } else {
    // AI玩家发言
    await executeAISpeech(player, speakOrder)
  }
}

async function executeAISpeech(player, speakOrder) {
  // 显示思考状态
  showPlayerThinking(player.id)
  
  const prompt = buildSpeechPrompt(player, speakOrder, getGameInfo())
  const response = await callAI(prompt)
  const parsed = parseAIResponse(response)
  
  // 记录发言
  addSpeakHistory(player.id, parsed.my_speech)
  
  // 显示发言（打字机效果）
  await displayPlayerSpeech(player.id, parsed.my_speech)
  
  // 记录推理过程（仅供调试）
  addGameLog({
    round_id: getCurrentRound(),
    type: 'reasoning',
    content: `${player.id}号推理：${parsed.reasoning_process}`,
    is_public: false
  })
}
```

### 4. 构建发言Prompt
```javascript
function buildSpeechPrompt(player, speakOrder, gameInfo) {
  switch (player.role) {
    case '村民':
      return buildVillagerSpeechPrompt(player, speakOrder, gameInfo)
    
    case '预言家':
      const checkResult = getLastCheckResult(player.id)
      return buildSeerSpeechPrompt(player, speakOrder, gameInfo, checkResult)
    
    case '女巫':
      const actionHistory = getWitchActionHistory(player.id)
      return buildWitchSpeechPrompt(player, speakOrder, gameInfo, actionHistory)
    
    case '猎人':
      return buildHunterSpeechPrompt(player, speakOrder, gameInfo)
    
    case '狼人':
      const teammates = getWolfTeammates(player.id)
      const lastTarget = getLastNightTarget()
      return buildWerewolfSpeechPrompt(player, speakOrder, gameInfo, teammates, lastTarget)
    
    default:
      throw new Error(`Unknown role: ${player.role}`)
  }
}
```

## 🗳️ 投票阶段流程

### 1. 投票阶段开始
```javascript
async function startVotingPhase() {
  updateGamePhase('day_vote')
  
  // 清空投票记录
  clearDayVotes()
  
  // 执行投票
  await executeVoting()
  
  // 统计投票结果
  await resolveVoting()
  
  // 检查游戏结束
  if (checkGameEnd()) {
    await endGame()
    return
  }
  
  // 进入下一轮
  nextRound()
  await startNightPhase()
}
```

### 2. 执行投票
```javascript
async function executeVoting() {
  const alivePlayers = getAlivePlayers()
  
  // 可以并行投票（但为了体验，通常串行）
  for (const player of alivePlayers) {
    await executePlayerVote(player)
  }
}

async function executePlayerVote(player) {
  if (player.is_human) {
    // 真实玩家投票
    await waitForPlayerVote(player.id)
  } else {
    // AI投票
    await executeAIVote(player)
  }
}

async function executeAIVote(player) {
  const prompt = buildVotePrompt(player, getGameInfo())
  const response = await callAI(prompt)
  const parsed = parseAIResponse(response)
  
  const targetId = parseInt(parsed.vote)
  
  // 记录投票
  addVoteHistory(player.id, targetId)
  addDayVote(player.id, targetId)
  
  // 显示投票结果
  displayPlayerVote(player.id, targetId, parsed.vote_cause)
}
```

### 3. 投票结果统计
```javascript
async function resolveVoting() {
  const votes = getDayVotes()
  const voteCount = {}
  
  // 统计票数
  votes.forEach(vote => {
    voteCount[vote.target_id] = (voteCount[vote.target_id] || 0) + 1
  })
  
  // 找出得票最多的玩家
  const maxVotes = Math.max(...Object.values(voteCount))
  const candidates = Object.keys(voteCount).filter(id => voteCount[id] === maxVotes)
  
  if (candidates.length === 1) {
    // 唯一出局者
    const eliminatedId = parseInt(candidates[0])
    await eliminatePlayer(eliminatedId)
  } else {
    // 平票处理（可以实现PK机制或随机选择）
    const eliminatedId = handleTieVote(candidates)
    await eliminatePlayer(eliminatedId)
  }
}

async function eliminatePlayer(playerId) {
  const player = getPlayer(playerId)
  
  // 设置死亡状态
  killPlayer(playerId, '投票')
  
  // 记录游戏日志
  addGameLog({
    round_id: getCurrentRound(),
    type: 'elimination',
    content: `${playerId}号${player.nickname}被投票出局`,
    is_public: true
  })
  
  // 遗言环节
  await executeLastWords(playerId)
  
  // 特殊技能触发（猎人开枪）
  if (player.role === '猎人') {
    await executeHunterShoot(playerId)
  }
}
```

### 4. 遗言环节
```javascript
async function executeLastWords(playerId) {
  const player = getPlayer(playerId)
  
  if (player.is_human) {
    // 真实玩家遗言
    await waitForPlayerLastWords(playerId)
  } else {
    // AI遗言
    const prompt = buildLastWordsPrompt(player, getGameInfo())
    const response = await callAI(prompt)
    const parsed = parseAIResponse(response)
    
    // 显示遗言
    await displayPlayerLastWords(playerId, parsed.last_words)
    
    // 记录遗言
    addSpeakHistory(playerId, parsed.last_words)
  }
}
```

## 🎯 胜负判定

### 1. 游戏结束检查
```javascript
function checkGameEnd() {
  const alivePlayers = getAlivePlayers()
  const aliveWerewolves = alivePlayers.filter(p => p.role === '狼人')
  const aliveVillagers = alivePlayers.filter(p => p.role !== '狼人')
  const aliveGods = alivePlayers.filter(p => ['预言家', '女巫', '猎人'].includes(p.role))
  const aliveCivilians = alivePlayers.filter(p => p.role === '村民')
  
  // 狼人获胜条件
  if (aliveWerewolves.length >= aliveVillagers.length) {
    setGameResult('werewolf', '狼人数量大于等于好人数量')
    return true
  }
  
  if (aliveGods.length === 0) {
    setGameResult('werewolf', '所有神职死亡')
    return true
  }
  
  if (aliveCivilians.length === 0) {
    setGameResult('werewolf', '所有村民死亡')
    return true
  }
  
  // 好人获胜条件
  if (aliveWerewolves.length === 0) {
    setGameResult('villager', '所有狼人死亡')
    return true
  }
  
  return false
}
```

### 2. 游戏结束处理
```javascript
async function endGame() {
  updateGamePhase('game_over')
  
  const result = getGameResult()
  
  // 显示游戏结果
  await displayGameResult(result)
  
  // 揭示所有角色
  await revealAllRoles()
  
  // 游戏统计
  await displayGameStatistics()
  
  // 清理游戏状态
  cleanupGame()
}
```

## 🔧 状态管理

### 1. 游戏状态更新
```javascript
// 全局游戏状态
let gameState = {
  round_id: 1,
  phase: 'preparation',
  players: [],
  night_actions: [],
  day_votes: [],
  game_logs: [],
  game_result: null
}

// 状态更新函数
function updateGameState(updates) {
  gameState = { ...gameState, ...updates }
  notifyStateChange()
}

function updateGamePhase(newPhase) {
  updateGameState({ phase: newPhase })
  emitPhaseChange(newPhase)
}

function nextRound() {
  updateGameState({ 
    round_id: gameState.round_id + 1,
    night_actions: [],
    day_votes: []
  })
}
```

### 2. 事件系统
```javascript
const eventEmitter = new EventEmitter()

// 事件监听
eventEmitter.on('phase_changed', (phase) => {
  console.log(`游戏阶段变更：${phase}`)
  updateUI()
})

eventEmitter.on('player_died', (playerId, cause) => {
  console.log(`玩家死亡：${playerId}，原因：${cause}`)
  updatePlayerStatus(playerId)
})

eventEmitter.on('game_ended', (result) => {
  console.log(`游戏结束：${result.winner}获胜`)
  showGameResult(result)
})
```

### 3. 数据持久化
```javascript
// 保存游戏状态
function saveGameState() {
  localStorage.setItem('werewolf_game_state', JSON.stringify(gameState))
}

// 加载游戏状态
function loadGameState() {
  const saved = localStorage.getItem('werewolf_game_state')
  if (saved) {
    gameState = JSON.parse(saved)
    return true
  }
  return false
}

// 清理游戏数据
function cleanupGame() {
  localStorage.removeItem('werewolf_game_state')
  gameState = createInitialState()
}
```

## 📊 性能优化

### 1. AI请求优化
```javascript
// 请求队列管理
class AIRequestQueue {
  constructor() {
    this.queue = []
    this.processing = false
    this.maxConcurrent = 3
  }
  
  async addRequest(prompt) {
    return new Promise((resolve, reject) => {
      this.queue.push({ prompt, resolve, reject })
      this.processQueue()
    })
  }
  
  async processQueue() {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    const batch = this.queue.splice(0, this.maxConcurrent)
    
    try {
      const responses = await Promise.all(
        batch.map(req => callAI(req.prompt))
      )
      
      batch.forEach((req, index) => {
        req.resolve(responses[index])
      })
    } catch (error) {
      batch.forEach(req => req.reject(error))
    }
    
    this.processing = false
    
    // 继续处理剩余请求
    if (this.queue.length > 0) {
      this.processQueue()
    }
  }
}
```

### 2. UI更新优化
```javascript
// 防抖更新
const updateUI = debounce(() => {
  renderGameBoard()
  renderPlayerList()
  renderGameLogs()
}, 100)

// 虚拟滚动（游戏日志）
class VirtualGameLog {
  constructor(container, itemHeight = 50) {
    this.container = container
    this.itemHeight = itemHeight
    this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2
  }
  
  render(logs) {
    const startIndex = Math.floor(this.container.scrollTop / this.itemHeight)
    const visibleLogs = logs.slice(startIndex, startIndex + this.visibleItems)
    
    this.container.innerHTML = visibleLogs.map((log, index) => 
      `<div class="log-item" style="top: ${(startIndex + index) * this.itemHeight}px">
        ${log.content}
      </div>`
    ).join('')
  }
}
```

---

**文档版本**: v1.0  
**创建时间**: 2024年12月  
**作者**: AIGame开发团队 