import { Player, GamePhase } from './types'
import { atom } from 'jotai'

// 对话类型
export type ChatType = 
  | 'public'      // 公开聊天（所有人可见）
  | 'private'     // 私聊（一对一）
  | 'werewolf'    // 狼人阵营聊天
  | 'dead'        // 死亡玩家聊天
  | 'system'      // 系统消息

// 消息接口
export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  chatType: ChatType
  targetId?: string // 私聊目标ID
  timestamp: number
  isAI: boolean
  emotion?: 'neutral' | 'suspicious' | 'defensive' | 'aggressive' | 'confident'
  confidence?: number
  phase: GamePhase
  round: number
  isVisible?: boolean // 是否对当前玩家可见
}

// 对话频道
export interface ChatChannel {
  id: string
  name: string
  type: ChatType
  participants: string[] // 参与者ID列表
  isActive: boolean
  description: string
  icon: string
}

// 对话系统类
export class ChatSystem {
  private messages: ChatMessage[] = []
  private channels: Map<string, ChatChannel> = new Map()
  private currentPlayerId: string = ''
  private messageListeners: ((message: ChatMessage) => void)[] = []
  private getPlayerById: (playerId: string) => Player | null = () => null

  constructor() {
    this.initializeChannels()
  }

  // 初始化对话频道
  private initializeChannels(): void {
    const defaultChannels: ChatChannel[] = [
      {
        id: 'public',
        name: '公开讨论',
        type: 'public',
        participants: [],
        isActive: true,
        description: '所有存活玩家可见的公开讨论',
        icon: '💬'
      },
      {
        id: 'werewolf',
        name: '狼人密谈',
        type: 'werewolf',
        participants: [],
        isActive: false,
        description: '狼人阵营内部交流',
        icon: '🐺'
      },
      {
        id: 'dead',
        name: '天国聊天室',
        type: 'dead',
        participants: [],
        isActive: false,
        description: '死亡玩家的聊天频道',
        icon: '👻'
      }
    ]

    defaultChannels.forEach(channel => {
      this.channels.set(channel.id, channel)
    })
  }

  // 设置当前玩家
  setCurrentPlayer(playerId: string): void {
    this.currentPlayerId = playerId
  }

  // 更新频道参与者
  updateChannelParticipants(players: Player[]): void {
    const alivePlayers = players.filter(p => p.status === 'alive')
    const deadPlayers = players.filter(p => p.status === 'dead')
    const werewolfPlayers = alivePlayers.filter(p => p.camp === 'werewolf')

    // 更新公开频道
    const publicChannel = this.channels.get('public')!
    publicChannel.participants = alivePlayers.map(p => p.id)

    // 更新狼人频道
    const werewolfChannel = this.channels.get('werewolf')!
    werewolfChannel.participants = werewolfPlayers.map(p => p.id)
    werewolfChannel.isActive = werewolfPlayers.length > 0

    // 更新死亡频道
    const deadChannel = this.channels.get('dead')!
    deadChannel.participants = deadPlayers.map(p => p.id)
    deadChannel.isActive = deadPlayers.length > 0
  }

  // 发送消息
  sendMessage(
    senderId: string,
    content: string,
    chatType: ChatType = 'public',
    targetId?: string,
    phase: GamePhase = 'day_discussion',
    round: number = 1,
    isAI: boolean = false,
    emotion?: ChatMessage['emotion'],
    confidence?: number
  ): ChatMessage {
    const player = this.getPlayerById(senderId)
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId,
      senderName: player?.name || 'Unknown',
      senderAvatar: player?.avatar || '👤',
      content,
      chatType,
      targetId,
      timestamp: Date.now(),
      isAI,
      emotion,
      confidence,
      phase,
      round
    }

    this.messages.push(message)
    
    // 通知监听器
    this.messageListeners.forEach(listener => listener(message))
    
    return message
  }

  // 获取可见消息
  getVisibleMessages(playerId: string, chatType?: ChatType): ChatMessage[] {
    return this.messages.filter(message => {
      // 过滤聊天类型
      if (chatType && message.chatType !== chatType) {
        return false
      }

      return this.isMessageVisible(message, playerId)
    }).sort((a, b) => a.timestamp - b.timestamp)
  }

  // 判断消息是否对特定玩家可见
  private isMessageVisible(message: ChatMessage, playerId: string): boolean {
    const player = this.getPlayerById(playerId)
    if (!player) return false

    switch (message.chatType) {
      case 'public':
        // 公开消息：存活玩家可见
        return player.status === 'alive'

      case 'private':
        // 私聊消息：发送者或接收者可见
        return message.senderId === playerId || message.targetId === playerId

      case 'werewolf':
        // 狼人消息：狼人阵营可见
        return player.camp === 'werewolf'

      case 'dead':
        // 死亡消息：死亡玩家可见
        return player.status === 'dead'

      case 'system':
        // 系统消息：所有人可见
        return true

      default:
        return false
    }
  }

  // 获取可用的聊天频道
  getAvailableChannels(playerId: string): ChatChannel[] {
    const player = this.getPlayerById(playerId)
    if (!player) return []

    const availableChannels: ChatChannel[] = []

    this.channels.forEach(channel => {
      if (this.canAccessChannel(channel, player)) {
        availableChannels.push(channel)
      }
    })

    return availableChannels
  }

  // 判断玩家是否可以访问频道
  private canAccessChannel(channel: ChatChannel, player: Player): boolean {
    switch (channel.type) {
      case 'public':
        return player.status === 'alive'

      case 'werewolf':
        return player.camp === 'werewolf' && player.status === 'alive'

      case 'dead':
        return player.status === 'dead'

      case 'system':
        return true

      default:
        return false
    }
  }

  // 创建私聊频道
  createPrivateChannel(player1Id: string, player2Id: string): ChatChannel {
    const channelId = `private_${Math.min(player1Id, player2Id)}_${Math.max(player1Id, player2Id)}`
    
    if (this.channels.has(channelId)) {
      return this.channels.get(channelId)!
    }

    const player1 = this.getPlayerById(player1Id)
    const player2 = this.getPlayerById(player2Id)

    const channel: ChatChannel = {
      id: channelId,
      name: `${player1?.name} & ${player2?.name}`,
      type: 'private',
      participants: [player1Id, player2Id],
      isActive: true,
      description: '私人对话',
      icon: '🔒'
    }

    this.channels.set(channelId, channel)
    return channel
  }

  // 获取频道消息统计
  getChannelStats(channelId: string): {
    totalMessages: number
    lastMessage?: ChatMessage
    unreadCount: number
  } {
    const channelMessages = this.messages.filter(m => 
      (m.chatType === 'private' && m.targetId && this.getPrivateChannelId(m.senderId, m.targetId) === channelId) ||
      (m.chatType !== 'private' && channelId === m.chatType)
    )

    return {
      totalMessages: channelMessages.length,
      lastMessage: channelMessages[channelMessages.length - 1],
      unreadCount: 0 // TODO: 实现未读消息计数
    }
  }

  // 获取私聊频道ID
  private getPrivateChannelId(player1Id: string, player2Id: string): string {
    return `private_${Math.min(player1Id, player2Id)}_${Math.max(player1Id, player2Id)}`
  }

  // 添加消息监听器
  addMessageListener(listener: (message: ChatMessage) => void): void {
    this.messageListeners.push(listener)
  }

  // 移除消息监听器
  removeMessageListener(listener: (message: ChatMessage) => void): void {
    const index = this.messageListeners.indexOf(listener)
    if (index > -1) {
      this.messageListeners.splice(index, 1)
    }
  }

  // 系统消息快捷方法
  sendSystemMessage(content: string, phase: GamePhase, round: number): ChatMessage {
    return this.sendMessage(
      'system',
      content,
      'system',
      undefined,
      phase,
      round,
      false
    )
  }

  // 发送狼人夜晚交流消息
  sendWerewolfNightMessage(senderId: string, content: string, round: number): ChatMessage {
    return this.sendMessage(
      senderId,
      content,
      'werewolf',
      undefined,
      'night',
      round,
      false
    )
  }

  // 清空消息历史
  clearMessages(): void {
    this.messages = []
  }

  // 设置玩家数据获取方法
  setPlayerDataProvider(provider: (playerId: string) => Player | null): void {
    this.getPlayerById = provider
  }
}

// 创建全局聊天系统实例
export const chatSystem = new ChatSystem()

// Jotai atoms for React integration
export const chatMessagesAtom = atom<ChatMessage[]>([])
export const currentChatTypeAtom = atom<ChatType>('public')
export const availableChannelsAtom = atom<ChatChannel[]>([])

// 聊天系统状态更新器
export const updateChatMessages = (messages: ChatMessage[]) => {
  // 这个函数将在组件中使用来更新消息状态
} 