export type Vec2 = {
  x: number
  y: number
}

export type StatsSnapshot = {
  lastBlockSeqno: number
  shardCount: number
  tps: number
  isLive: boolean
}

export const TileType = {
  GrassA: 0,
  GrassB: 1,
  Road: 2,
  Stone: 3,
  Water: 4,
  Dark: 5,
} as const

export type TileType = (typeof TileType)[keyof typeof TileType]

export type BlockBuilding = {
  id: string
  shardId: string
  x: number
  y: number
  progress: number
  variant: number
  createdAt: number
  isMaster?: boolean
}

export type Courier = {
  id: string
  x: number
  y: number
  path: Vec2[]
  pathIndex: number
  speed: number
  direction: 'up' | 'down' | 'left' | 'right'
  frameTime: number
  frame: number
  createdAt: number
}

export type Validator = {
  id: string
  x: number
  y: number
  frameTime: number
  frame: number
}

export type ShardArea = {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export type FrameRect = {
  x: number
  y: number
  w: number
  h: number
}

export type BlockEvent = {
  seqno: number
  shardCount?: number
}

export type TxEvent = {
  count: number
}

