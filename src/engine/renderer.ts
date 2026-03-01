import { TILE_SIZE, WORLD_COLS, WORLD_ROWS } from '../constants'
import { TileType } from '../types'
import type { WorldState } from './worldState'
import { getScaledSprite } from './spriteCache'

type FrameProvider = {
  getFrame: (name: string) => HTMLCanvasElement
}

type CameraState = {
  panX: number
  panY: number
  zoom: number
}

type Drawable = {
  z: number
  draw: (ctx: CanvasRenderingContext2D) => void
}

type RoadConnections = {
  n: boolean
  s: boolean
  w: boolean
  e: boolean
}

const walletBaseCache = new Map<'hot' | 'cold', HTMLCanvasElement>()
const droneSpriteCache = new Map<string, HTMLCanvasElement>()
const cartSpriteCache = new Map<string, HTMLCanvasElement>()
const repairBotCache = new Map<string, HTMLCanvasElement>()

function worldOffset(canvas: HTMLCanvasElement, camera: CameraState): { x: number; y: number } {
  const worldW = WORLD_COLS * TILE_SIZE * camera.zoom
  const worldH = WORLD_ROWS * TILE_SIZE * camera.zoom
  const x = Math.floor((canvas.width - worldW) / 2 + camera.panX)
  const y = Math.floor((canvas.height - worldH) / 2 + camera.panY)
  return { x, y }
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  world: WorldState,
  sprites: FrameProvider,
  camera: CameraState,
): void {
  const { width, height } = canvas
  ctx.clearRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = false

  const offset = worldOffset(canvas, camera)
  renderTiles(ctx, world, sprites, camera, offset.x, offset.y)
  renderEntities(ctx, world, sprites, camera, offset.x, offset.y)
}

function renderTiles(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  sprites: FrameProvider,
  camera: CameraState,
  offsetX: number,
  offsetY: number,
): void {
  const terrainFrame: Record<number, string> = {
    [TileType.GrassA]: 'terrain_grass_a',
    [TileType.GrassB]: 'terrain_grass_b',
    [TileType.Stone]: 'terrain_stone',
    [TileType.Water]: 'terrain_water',
    [TileType.Dark]: 'terrain_dark',
  }

  const s = Math.round(TILE_SIZE * camera.zoom)

  for (let y = 0; y < world.tileMap.length; y += 1) {
    for (let x = 0; x < world.tileMap[y].length; x += 1) {
      const tile = world.tileMap[y][x]
      const road = getRoadConnections(world, x, y)
      const preferredFrame = tile === TileType.Road ? resolveRoadFrame(road) : terrainFrame[tile]
      const frameName = safeTerrainFrame(sprites, preferredFrame, tile)
      const source = sprites.getFrame(frameName)
      const sx = Math.round(offsetX + x * s)
      const sy = Math.round(offsetY + y * s)
      ctx.drawImage(source, 0, 0, source.width, source.height, sx, sy, s + 1, s + 1)
      drawTileRelief(ctx, sx, sy, s, tile, x, y)
      drawAmbientDetail(ctx, sx, sy, s, tile, x, y)
      if (tile === TileType.Road) {
        drawRoadOrnament(ctx, sx, sy, s, road)
      }
    }
  }
}

function safeTerrainFrame(sprites: FrameProvider, preferredFrame: string, tile: TileType): string {
  try {
    sprites.getFrame(preferredFrame)
    return preferredFrame
  } catch {
    if (tile === TileType.Road) return 'terrain_road'
    if (tile === TileType.Stone) return 'terrain_stone'
    if (tile === TileType.Water) return 'terrain_water'
    if (tile === TileType.Dark) return 'terrain_dark'
    return 'terrain_grass_a'
  }
}

function tileAt(world: WorldState, x: number, y: number): TileType | null {
  if (y < 0 || y >= world.tileMap.length) return null
  if (x < 0 || x >= world.tileMap[y].length) return null
  return world.tileMap[y][x]
}

function getRoadConnections(world: WorldState, x: number, y: number): RoadConnections {
  if (tileAt(world, x, y) !== TileType.Road) {
    return { n: false, s: false, w: false, e: false }
  }
  return {
    n: tileAt(world, x, y - 1) === TileType.Road,
    s: tileAt(world, x, y + 1) === TileType.Road,
    w: tileAt(world, x - 1, y) === TileType.Road,
    e: tileAt(world, x + 1, y) === TileType.Road,
  }
}

function resolveRoadFrame(road: RoadConnections): string {
  const { n, s, w, e } = road
  if (n && s && w && e) return 'terrain_cross'
  if (n && s && e && !w) return 'terrain_t_right'
  if (n && s && w && !e) return 'terrain_t_left'
  if (e && w && n && !s) return 'terrain_t_up'
  if (e && w && s && !n) return 'terrain_t_down'
  if (n && e && !s && !w) return 'terrain_corner_ne'
  if (n && w && !s && !e) return 'terrain_corner_nw'
  if (s && e && !n && !w) return 'terrain_corner_se'
  if (s && w && !n && !e) return 'terrain_corner_sw'
  if ((n || s) && !w && !e) return 'terrain_road_v'
  if ((w || e) && !n && !s) return 'terrain_road'
  if (n || s) return 'terrain_road_v'
  return 'terrain_road'
}

function drawTileRelief(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  s: number,
  tile: TileType,
  x: number,
  y: number,
): void {
  const sun = ((x * 23 + y * 37) & 1) === 0
  const topAlpha = tile === TileType.Road ? 0.16 : tile === TileType.Stone ? 0.12 : 0.08
  const sideAlpha = tile === TileType.Road ? 0.22 : tile === TileType.Stone ? 0.18 : 0.1
  const topLight = sun ? topAlpha : topAlpha * 0.72
  const leftLight = sun ? topAlpha * 0.72 : topAlpha * 0.55

  ctx.fillStyle = `rgba(255,255,255,${topLight})`
  ctx.fillRect(sx, sy, s, 1)
  ctx.fillStyle = `rgba(255,255,255,${leftLight})`
  ctx.fillRect(sx, sy, 1, s)

  ctx.fillStyle = `rgba(7,10,16,${sideAlpha * 0.85})`
  ctx.fillRect(sx, sy + s - 1, s, 1)
  ctx.fillStyle = `rgba(7,10,16,${sideAlpha})`
  ctx.fillRect(sx + s - 1, sy, 1, s)
}

function drawRoadOrnament(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  s: number,
  road: RoadConnections,
): void {
  const cx = sx + Math.floor(s / 2)
  const cy = sy + Math.floor(s / 2)
  const rail = Math.max(1, Math.floor(s / 16))
  const node = Math.max(1, Math.floor(s / 10))
  const centerNode = Number(road.n) + Number(road.s) + Number(road.w) + Number(road.e) >= 3

  ctx.fillStyle = 'rgba(90,235,255,0.32)'
  if (road.n) ctx.fillRect(cx, sy + 2, rail, Math.max(1, cy - sy - 1))
  if (road.s) ctx.fillRect(cx, cy, rail, Math.max(1, sy + s - cy - 2))
  if (road.w) ctx.fillRect(sx + 2, cy, Math.max(1, cx - sx - 1), rail)
  if (road.e) ctx.fillRect(cx, cy, Math.max(1, sx + s - cx - 2), rail)

  ctx.fillStyle = centerNode ? 'rgba(255,196,104,0.56)' : 'rgba(148,240,255,0.45)'
  ctx.fillRect(cx - node + 1, cy - node + 1, node, node)
}

function drawAmbientDetail(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  s: number,
  tile: TileType,
  x: number,
  y: number,
): void {
  const seed = (x * 73856093) ^ (y * 19349663)
  const roll = Math.abs(seed) % 100
  if (tile === TileType.GrassA || tile === TileType.GrassB) {
    if (roll < 16) {
      const px = sx + 2 + (Math.abs(seed >> 4) % Math.max(1, s - 4))
      const py = sy + 2 + (Math.abs(seed >> 8) % Math.max(1, s - 4))
      ctx.fillStyle = roll % 2 === 0 ? 'rgba(250,205,120,0.9)' : 'rgba(186,230,255,0.9)'
      ctx.fillRect(px, py, 1, 1)
    } else if (roll >= 16 && roll < 24) {
      const px = sx + 2 + (Math.abs(seed >> 5) % Math.max(1, s - 4))
      const py = sy + 2 + (Math.abs(seed >> 9) % Math.max(1, s - 4))
      ctx.fillStyle = 'rgba(95,166,90,0.88)'
      ctx.fillRect(px, py, 2, 1)
    }
    return
  }
  if (tile === TileType.Stone && roll < 13) {
    const px = sx + 2 + (Math.abs(seed >> 6) % Math.max(1, s - 4))
    const py = sy + 2 + (Math.abs(seed >> 10) % Math.max(1, s - 4))
    ctx.fillStyle = roll < 7 ? 'rgba(128,235,255,0.45)' : 'rgba(90,110,130,0.45)'
    ctx.fillRect(px, py, 1, 1)
  }
}

function renderEntities(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  sprites: FrameProvider,
  camera: CameraState,
  offsetX: number,
  offsetY: number,
): void {
  const drawables: Drawable[] = []
  const s = Math.round(TILE_SIZE * camera.zoom)

  for (const block of world.blocks) {
    const frameName = resolveBuildingFrame(block.isMaster, block.progress, block.variant)
    const frame = getScaledSprite(sprites.getFrame(frameName), camera.zoom)
    const sx = Math.round(offsetX + block.x * s)
    const sy = Math.round(offsetY + block.y * s)
    drawables.push({
      z: block.y * 100 + 50,
      draw: (c) => {
        c.drawImage(
          frame,
          Math.round(sx + s / 2 - frame.width / 2),
          Math.round(sy + s - frame.height),
        )
      },
    })
  }

  for (const validator of world.validators) {
    const frameName = validator.frame === 0 ? 'char_validator_0' : 'char_validator_1'
    const frame = getScaledSprite(sprites.getFrame(frameName), camera.zoom)
    const sx = Math.round(offsetX + validator.x * s)
    const sy = Math.round(offsetY + validator.y * s)
    drawables.push({
      z: validator.y * 100 + 60,
      draw: (c) => {
        c.drawImage(
          frame,
          Math.round(sx + s / 2 - frame.width / 2),
          Math.round(sy + s - frame.height),
        )
      },
    })
  }

  for (const courier of world.couriers) {
    const frameName = `char_courier_${courier.direction}_${courier.frame}`
    const frame = getScaledSprite(sprites.getFrame(frameName), camera.zoom)
    const px = Math.round(offsetX + courier.x * camera.zoom)
    const py = Math.round(offsetY + courier.y * camera.zoom)
    drawables.push({
      z: (courier.y / TILE_SIZE) * 100 + 60,
      draw: (c) => {
        c.drawImage(
          frame,
          Math.round(px + s / 2 - frame.width / 2),
          Math.round(py + s - frame.height),
        )
      },
    })
  }

  for (const cart of world.merchantCarts) {
    const frame = getScaledSprite(getMerchantCartSprite(cart.direction, cart.frame), camera.zoom)
    const sx = Math.round(offsetX + cart.x * s)
    const sy = Math.round(offsetY + cart.y * s)
    drawables.push({
      z: cart.y * 100 + 56,
      draw: (c) => {
        c.drawImage(
          frame,
          Math.round(sx + s / 2 - frame.width / 2),
          Math.round(sy + s - frame.height),
        )
      },
    })
  }

  for (const drone of world.drones) {
    const pulse = Math.floor((drone.angle * 3) % 2)
    const frame = getScaledSprite(getDroneSprite(pulse), camera.zoom)
    const sx = Math.round(offsetX + drone.x * s)
    const sy = Math.round(offsetY + drone.y * s)
    drawables.push({
      z: drone.y * 100 + 73,
      draw: (c) => {
        c.drawImage(
          frame,
          Math.round(sx + s / 2 - frame.width / 2),
          Math.round(sy + s - frame.height - 4 * camera.zoom),
        )
      },
    })
  }

  for (const bot of world.repairBots) {
    const frame = getScaledSprite(getRepairBotSprite(Math.floor((bot.orbitPhase * 2) % 2)), camera.zoom)
    const sx = Math.round(offsetX + bot.x * s)
    const sy = Math.round(offsetY + bot.y * s)
    drawables.push({
      z: bot.y * 100 + 62,
      draw: (c) => {
        c.drawImage(
          frame,
          Math.round(sx + s / 2 - frame.width / 2),
          Math.round(sy + s - frame.height),
        )
      },
    })
  }

  for (const wallet of world.wallets) {
    const frame = getScaledSprite(getWalletSprite(wallet.kind), camera.zoom)
    const sx = Math.round(offsetX + wallet.x * s)
    const sy = Math.round(offsetY + wallet.y * s)
    drawables.push({
      z: wallet.y * 100 + 58,
      draw: (c) => {
        c.drawImage(
          frame,
          Math.round(sx + s / 2 - frame.width / 2),
          Math.round(sy + s - frame.height),
        )
      },
    })
  }

  drawables.sort((a, b) => a.z - b.z)
  for (const drawable of drawables) {
    drawable.draw(ctx)
  }
}

function getWalletSprite(kind: 'hot' | 'cold'): HTMLCanvasElement {
  const hit = walletBaseCache.get(kind)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = 14
  canvas.height = 14
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.imageSmoothingEnabled = false

  const body = kind === 'hot' ? '#d58a43' : '#5f8dd6'
  const edge = kind === 'hot' ? '#8a4f22' : '#32518e'
  const glow = kind === 'hot' ? 'rgba(255,206,120,0.42)' : 'rgba(120,220,255,0.42)'

  ctx.fillStyle = glow
  ctx.fillRect(1, 10, 12, 3)
  ctx.fillStyle = edge
  ctx.fillRect(3, 4, 8, 7)
  ctx.fillStyle = body
  ctx.fillRect(4, 5, 6, 5)
  ctx.fillStyle = '#efd9ac'
  ctx.fillRect(5, 3, 4, 2)
  ctx.fillStyle = '#1a2138'
  ctx.fillRect(6, 7, 2, 1)

  walletBaseCache.set(kind, canvas)
  return canvas
}

function getDroneSprite(frame: number): HTMLCanvasElement {
  const key = String(frame)
  const hit = droneSpriteCache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.imageSmoothingEnabled = false

  ctx.fillStyle = frame === 0 ? 'rgba(120,225,255,0.35)' : 'rgba(140,245,255,0.45)'
  ctx.fillRect(3, 12, 10, 2)
  ctx.fillStyle = '#2d4265'
  ctx.fillRect(5, 6, 6, 4)
  ctx.fillStyle = '#4f8bc8'
  ctx.fillRect(6, 7, 4, 2)
  ctx.fillStyle = '#86e9ff'
  ctx.fillRect(4, 5, 2, 1)
  ctx.fillRect(10, 5, 2, 1)
  ctx.fillRect(7, 4, 2, 1)

  droneSpriteCache.set(key, canvas)
  return canvas
}

function getMerchantCartSprite(direction: 'up' | 'down' | 'left' | 'right', frame: number): HTMLCanvasElement {
  const key = `${direction}:${frame}`
  const hit = cartSpriteCache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.imageSmoothingEnabled = false

  const body = '#b88c56'
  const edge = '#7f5a32'
  const cargo = '#d3b58a'
  const wheel = '#2f2b2a'
  const wheelShift = frame % 2

  if (direction === 'left' || direction === 'right') {
    ctx.fillStyle = edge
    ctx.fillRect(3, 8, 10, 4)
    ctx.fillStyle = body
    ctx.fillRect(4, 7, 8, 3)
    ctx.fillStyle = cargo
    ctx.fillRect(5, 5, 6, 2)
    ctx.fillStyle = wheel
    ctx.fillRect(4 + wheelShift, 12, 2, 2)
    ctx.fillRect(10 - wheelShift, 12, 2, 2)
  } else {
    ctx.fillStyle = edge
    ctx.fillRect(4, 7, 8, 5)
    ctx.fillStyle = body
    ctx.fillRect(5, 6, 6, 4)
    ctx.fillStyle = cargo
    ctx.fillRect(6, 4, 4, 2)
    ctx.fillStyle = wheel
    ctx.fillRect(4, 12 - wheelShift, 2, 2)
    ctx.fillRect(10, 12 - wheelShift, 2, 2)
  }

  cartSpriteCache.set(key, canvas)
  return canvas
}

function getRepairBotSprite(frame: number): HTMLCanvasElement {
  const key = String(frame)
  const hit = repairBotCache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = 12
  canvas.height = 12
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.imageSmoothingEnabled = false

  ctx.fillStyle = 'rgba(122,236,255,0.35)'
  ctx.fillRect(1, 10, 10, 2)
  ctx.fillStyle = '#36536f'
  ctx.fillRect(3, 5, 6, 4)
  ctx.fillStyle = '#74b7e0'
  ctx.fillRect(4, 6, 4, 2)
  ctx.fillStyle = frame === 0 ? '#ffd88f' : '#8ff4ff'
  ctx.fillRect(5, 4, 2, 1)
  ctx.fillStyle = '#1f3044'
  ctx.fillRect(2, 7, 1, 2)
  ctx.fillRect(9, 7, 1, 2)

  repairBotCache.set(key, canvas)
  return canvas
}

function resolveBuildingFrame(isMaster: boolean | undefined, progress: number, variant: number): string {
  if (isMaster) return 'building_master'
  if (progress < 0.2) return 'building_construct_0'
  if (progress < 0.4) return 'building_construct_1'
  if (progress < 0.6) return 'building_construct_2'
  if (progress < 0.8) return 'building_construct_3'
  if (progress < 1) return 'building_construct_4'
  return `building_shard_${variant}`
}
