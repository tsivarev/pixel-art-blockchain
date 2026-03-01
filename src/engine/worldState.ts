import {
  BASE_ZOOM,
  BLOCK_BUILD_TIME_SEC,
  COURIER_SPEED_TILES_PER_SEC,
  TX_RATE_WINDOW_MS,
  VALIDATOR_ANIM_SEC,
  WORLD_COLS,
  WORLD_ROWS,
} from '../constants'
import type {
  BlockBuilding,
  BlockEvent,
  Courier,
  ShardArea,
  StatsSnapshot,
  TileType,
  TxEvent,
  Validator,
  Vec2,
} from '../types'
import { TileType as TileKind } from '../types'
import { bfsPath } from './pathfinding'

type StatsListener = (stats: StatsSnapshot) => void

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function tileCenter(tileX: number, tileY: number): Vec2 {
  return { x: tileX * 16, y: tileY * 16 }
}

export class WorldState {
  tileMap: TileType[][] = []
  shards = new Map<string, ShardArea>()
  blocks: BlockBuilding[] = []
  couriers: Courier[] = []
  validators: Validator[] = []
  roads = new Set<string>()

  camera = { x: 0, y: 0, zoom: BASE_ZOOM }

  lastBlockSeqno = 0
  shardCount = 0
  isLive = false

  private txTimestamps: number[] = []
  private readonly onStats: StatsListener

  constructor(onStats: StatsListener) {
    this.onStats = onStats
    this.resetLayout()
    this.seedWorld()
    this.pushStats()
  }

  resetLayout(): void {
    this.tileMap = Array.from({ length: WORLD_ROWS }, (_, y) =>
      Array.from({ length: WORLD_COLS }, (_, x) =>
        (x + y) % 2 === 0 ? TileKind.GrassA : TileKind.GrassB,
      ),
    )
    this.shards.clear()
    this.roads.clear()

    const centerX = Math.floor(WORLD_COLS / 2)
    const centerY = Math.floor(WORLD_ROWS / 2)
    this.paintRoad(centerX - 2, centerY - 1, 5, 3)

    const shardDefs: Array<{ id: string; x: number; y: number }> = [
      { id: '0:top', x: centerX - 4, y: centerY - 11 },
      { id: '0:right', x: centerX + 10, y: centerY - 3 },
      { id: '0:bottom', x: centerX - 4, y: centerY + 6 },
      { id: '0:left', x: centerX - 18, y: centerY - 3 },
    ]

    for (const def of shardDefs) {
      this.addShard(def.id, def.x, def.y, 8, 6)
      this.connectRoad(centerX, centerY, def.x + 4, def.y + 3)
    }

    this.shardCount = this.shards.size
  }

  rebuildLayout(shardIds: string[]): void {
    this.resetLayout()
    const ids = shardIds.length > 0 ? shardIds.slice(0, 8) : ['0:top', '0:right', '0:bottom', '0:left']
    const centerX = Math.floor(WORLD_COLS / 2)
    const centerY = Math.floor(WORLD_ROWS / 2)
    const radiusX = 14
    const radiusY = 9

    this.shards.clear()
    for (let i = 0; i < ids.length; i += 1) {
      const angle = (Math.PI * 2 * i) / ids.length
      const x = Math.round(centerX + Math.cos(angle) * radiusX) - 4
      const y = Math.round(centerY + Math.sin(angle) * radiusY) - 3
      this.addShard(ids[i], x, y, 8, 6)
      this.connectRoad(centerX, centerY, x + 4, y + 3)
    }
    this.shardCount = this.shards.size
    this.pushStats()
  }

  handleNewBlock(event: BlockEvent): void {
    this.isLive = true
    this.lastBlockSeqno = Math.max(this.lastBlockSeqno, event.seqno)
    if (event.shardCount && event.shardCount > 0 && event.shardCount !== this.shardCount) {
      const generated = Array.from({ length: event.shardCount }, (_, idx) => `0:${idx}`)
      this.rebuildLayout(generated)
    }

    const shardList = Array.from(this.shards.values())
    const shard = randomFrom(shardList)
    const x = shard.x + 1 + Math.floor(Math.random() * Math.max(1, shard.w - 2))
    const y = shard.y + 1 + Math.floor(Math.random() * Math.max(1, shard.h - 2))
    const id = `block-${event.seqno}`
    this.blocks.push({
      id,
      shardId: shard.id,
      x,
      y,
      progress: 0,
      variant: Math.floor(Math.random() * 4),
      createdAt: Date.now(),
    })
    this.validators.push({
      id: `validator-${id}`,
      x: x - 1,
      y: y + 1,
      frame: 0,
      frameTime: 0,
    })
    this.pushStats()
  }

  handleNewTransaction(event: TxEvent): void {
    const count = Math.max(1, Math.min(6, event.count))
    const settledBuildings = this.blocks.filter((b) => b.progress >= 0.95)
    if (settledBuildings.length < 2) return

    for (let i = 0; i < count; i += 1) {
      const from = randomFrom(settledBuildings)
      let to = randomFrom(settledBuildings)
      if (to.id === from.id) to = randomFrom(settledBuildings)
      const pathTiles = bfsPath(
        this.buildWalkableMap(),
        from.x,
        from.y,
        to.x,
        to.y,
      )
      if (pathTiles.length < 2) continue
      this.couriers.push({
        id: `tx-${Date.now()}-${i}`,
        x: from.x * 16,
        y: from.y * 16,
        path: pathTiles.map((p) => tileCenter(p.x, p.y)),
        pathIndex: 1,
        speed: COURIER_SPEED_TILES_PER_SEC * 16,
        direction: 'down',
        frameTime: 0,
        frame: 0,
        createdAt: Date.now(),
      })
      this.txTimestamps.push(Date.now())
    }

    this.pushStats()
  }

  update(dt: number): void {
    const now = Date.now()
    this.txTimestamps = this.txTimestamps.filter((ts) => now - ts <= TX_RATE_WINDOW_MS)

    this.blocks = this.blocks.map((block) => {
      if (block.progress >= 1) return block
      return {
        ...block,
        progress: Math.min(1, block.progress + dt / BLOCK_BUILD_TIME_SEC),
      }
    })

    this.validators = this.validators.filter((validator) => {
      const relatedBlock = this.blocks.find((block) => validator.id === `validator-${block.id}`)
      if (!relatedBlock) return false
      if (relatedBlock.progress >= 1) return false
      validator.frameTime += dt
      if (validator.frameTime >= VALIDATOR_ANIM_SEC) {
        validator.frameTime = 0
        validator.frame = validator.frame === 0 ? 1 : 0
      }
      return true
    })

    this.couriers = this.couriers.filter((courier) => {
      if (courier.pathIndex >= courier.path.length) return false
      courier.frameTime += dt
      if (courier.frameTime >= 0.12) {
        courier.frameTime = 0
        courier.frame = (courier.frame + 1) % 4
      }

      const target = courier.path[courier.pathIndex]
      const dx = target.x - courier.x
      const dy = target.y - courier.y
      const dist = Math.hypot(dx, dy)
      const step = courier.speed * dt
      if (dist <= step) {
        courier.x = target.x
        courier.y = target.y
        courier.pathIndex += 1
      } else if (dist > 0) {
        courier.x += (dx / dist) * step
        courier.y += (dy / dist) * step
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        courier.direction = dx >= 0 ? 'right' : 'left'
      } else {
        courier.direction = dy >= 0 ? 'down' : 'up'
      }

      return courier.pathIndex < courier.path.length
    })

    this.pushStats()
  }

  private pushStats(): void {
    this.onStats({
      lastBlockSeqno: this.lastBlockSeqno,
      shardCount: this.shardCount,
      tps: Number((this.txTimestamps.length / (TX_RATE_WINDOW_MS / 1000)).toFixed(1)),
      isLive: this.isLive,
    })
  }

  private seedWorld(): void {
    const centerX = Math.floor(WORLD_COLS / 2)
    const centerY = Math.floor(WORLD_ROWS / 2)
    this.blocks.push({
      id: 'masterchain',
      shardId: 'masterchain',
      x: centerX,
      y: centerY,
      progress: 1,
      variant: 0,
      createdAt: Date.now(),
      isMaster: true,
    })
    this.lastBlockSeqno = 0
  }

  private paintRoad(x: number, y: number, w: number, h: number): void {
    for (let row = y; row < y + h; row += 1) {
      for (let col = x; col < x + w; col += 1) {
        this.setTile(col, row, TileKind.Road)
      }
    }
  }

  private connectRoad(x1: number, y1: number, x2: number, y2: number): void {
    let x = x1
    let y = y1
    while (x !== x2) {
      this.setTile(x, y, TileKind.Road)
      x += x < x2 ? 1 : -1
    }
    while (y !== y2) {
      this.setTile(x, y, TileKind.Road)
      y += y < y2 ? 1 : -1
    }
    this.setTile(x2, y2, TileKind.Road)
  }

  private setTile(x: number, y: number, tile: TileType): void {
    if (x < 0 || y < 0 || x >= WORLD_COLS || y >= WORLD_ROWS) return
    this.tileMap[y][x] = tile
    if (tile === TileKind.Road) this.roads.add(`${x},${y}`)
  }

  private addShard(id: string, x: number, y: number, w: number, h: number): void {
    this.shards.set(id, { id, x, y, w, h })
    for (let row = y; row < y + h; row += 1) {
      for (let col = x; col < x + w; col += 1) {
        const checker = (row + col) % 2 === 0
        this.setTile(col, row, checker ? TileKind.Stone : TileKind.GrassA)
      }
    }
  }

  private buildWalkableMap(): boolean[][] {
    return this.tileMap.map((row) => row.map((tile) => tile !== TileKind.Water && tile !== TileKind.Dark))
  }
}

