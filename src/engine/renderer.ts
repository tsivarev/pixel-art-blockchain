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
  const tileFrame: Record<number, string> = {
    [TileType.GrassA]: 'terrain_grass_a',
    [TileType.GrassB]: 'terrain_grass_b',
    [TileType.Road]: 'terrain_road',
    [TileType.Stone]: 'terrain_stone',
    [TileType.Water]: 'terrain_water',
    [TileType.Dark]: 'terrain_dark',
  }

  const s = Math.round(TILE_SIZE * camera.zoom)

  for (let y = 0; y < world.tileMap.length; y += 1) {
    for (let x = 0; x < world.tileMap[y].length; x += 1) {
      const frameName = tileFrame[world.tileMap[y][x]]
      const source = sprites.getFrame(frameName)
      const sx = Math.round(offsetX + x * s)
      const sy = Math.round(offsetY + y * s)
      ctx.drawImage(source, 0, 0, source.width, source.height, sx, sy, s + 1, s + 1)
    }
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

  drawables.sort((a, b) => a.z - b.z)
  for (const drawable of drawables) {
    drawable.draw(ctx)
  }
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
