import type { FrameRect } from '../types'

type FrameDef = FrameRect & {
  name: string
  targetW?: number
  targetH?: number
  removeCheckerboard?: boolean
  autoTrim?: boolean
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    image.src = src
  })
}

export class SpriteSheet {
  private image: HTMLImageElement | null = null
  private frames = new Map<string, HTMLCanvasElement>()
  private readonly src: string

  constructor(src: string) {
    this.src = src
  }

  async load(frameDefs: FrameDef[]): Promise<void> {
    this.image = await loadImage(this.src)
    for (const frame of frameDefs) {
      const sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = frame.w
      sourceCanvas.height = frame.h
      const sourceCtx = sourceCanvas.getContext('2d')
      if (!sourceCtx) continue
      sourceCtx.imageSmoothingEnabled = false
      sourceCtx.clearRect(0, 0, frame.w, frame.h)
      sourceCtx.drawImage(
        this.image,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        0,
        0,
        frame.w,
        frame.h,
      )

      if (frame.removeCheckerboard ?? true) {
        removeCheckerboardBackground(sourceCtx, frame.w, frame.h)
        removeBorderBackground(sourceCtx, frame.w, frame.h)
      }

      const bounds = frame.autoTrim === false ? null : findOpaqueBounds(sourceCtx, frame.w, frame.h)
      const sourceX = bounds ? bounds.x : 0
      const sourceY = bounds ? bounds.y : 0
      const sourceW = bounds ? bounds.w : frame.w
      const sourceH = bounds ? bounds.h : frame.h
      const outW = frame.targetW ?? sourceW
      const outH = frame.targetH ?? sourceH

      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, outW, outH)
      ctx.drawImage(sourceCanvas, sourceX, sourceY, sourceW, sourceH, 0, 0, outW, outH)
      this.frames.set(frame.name, canvas)
    }
  }

  getFrame(name: string): HTMLCanvasElement {
    const frame = this.frames.get(name)
    if (!frame) {
      throw new Error(`Sprite frame not found: ${name}`)
    }
    return frame
  }
}

export function buildGridFrames(
  imageWidth: number,
  imageHeight: number,
  cols: number,
  rows: number,
  names: string[],
  options: {
    inset?: number
    targetW?: number
    targetH?: number
    removeCheckerboard?: boolean
    autoTrim?: boolean
  } = {},
): FrameDef[] {
  const inset = options.inset ?? 0
  const frameW = imageWidth / cols
  const frameH = imageHeight / rows
  return names.map((name, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    return {
      name,
      x: Math.round(col * frameW + inset),
      y: Math.round(row * frameH + inset),
      w: Math.max(1, Math.round(frameW - inset * 2)),
      h: Math.max(1, Math.round(frameH - inset * 2)),
      targetW: options.targetW,
      targetH: options.targetH,
      removeCheckerboard: options.removeCheckerboard,
      autoTrim: options.autoTrim,
    }
  })
}

function removeCheckerboardBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const data = ctx.getImageData(0, 0, width, height)
  const pixels = data.data
  const histogram = new Map<string, { r: number; g: number; b: number; count: number }>()

  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3]
    if (a < 250) continue
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max - min > 14) continue
    const qr = Math.round(r / 8) * 8
    const qg = Math.round(g / 8) * 8
    const qb = Math.round(b / 8) * 8
    const key = `${qr},${qg},${qb}`
    const hit = histogram.get(key)
    if (hit) {
      hit.count += 1
    } else {
      histogram.set(key, { r: qr, g: qg, b: qb, count: 1 })
    }
  }

  const candidates = Array.from(histogram.values())
    .filter((item) => {
      const luma = (item.r + item.g + item.b) / 3
      const spread = Math.max(item.r, item.g, item.b) - Math.min(item.r, item.g, item.b)
      return luma >= 135 && luma <= 230 && spread <= 12
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)

  if (candidates.length === 0) return

  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3]
    if (a < 10) continue
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max - min > 14) continue

    let isBackground = false
    for (const key of candidates) {
      const distance = Math.abs(r - key.r) + Math.abs(g - key.g) + Math.abs(b - key.b)
      if (distance <= 24) {
        isBackground = true
        break
      }
    }

    if (isBackground) {
      pixels[i + 3] = 0
    }
  }

  ctx.putImageData(data, 0, 0)
}

function removeBorderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const data = ctx.getImageData(0, 0, width, height)
  const pixels = data.data
  const borderHist = new Map<string, { r: number; g: number; b: number; count: number }>()

  const addBorderPixel = (x: number, y: number): void => {
    const i = (y * width + x) * 4
    if (pixels[i + 3] <= 10) return
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const qr = Math.round(r / 12) * 12
    const qg = Math.round(g / 12) * 12
    const qb = Math.round(b / 12) * 12
    const key = `${qr},${qg},${qb}`
    const hit = borderHist.get(key)
    if (hit) {
      hit.count += 1
    } else {
      borderHist.set(key, { r: qr, g: qg, b: qb, count: 1 })
    }
  }

  for (let x = 0; x < width; x += 1) {
    addBorderPixel(x, 0)
    addBorderPixel(x, height - 1)
  }
  for (let y = 0; y < height; y += 1) {
    addBorderPixel(0, y)
    addBorderPixel(width - 1, y)
  }

  const borderColors = Array.from(borderHist.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  if (borderColors.length === 0) return

  const visited = new Uint8Array(width * height)
  const queueX = new Int16Array(width * height)
  const queueY = new Int16Array(width * height)
  let head = 0
  let tail = 0

  const isBackgroundLike = (x: number, y: number): boolean => {
    const i = (y * width + x) * 4
    if (pixels[i + 3] <= 10) return false
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    for (const c of borderColors) {
      const dist = Math.abs(r - c.r) + Math.abs(g - c.g) + Math.abs(b - c.b)
      if (dist <= 42) return true
    }
    return false
  }

  const tryPush = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const idx = y * width + x
    if (visited[idx]) return
    visited[idx] = 1
    if (!isBackgroundLike(x, y)) return
    queueX[tail] = x
    queueY[tail] = y
    tail += 1
  }

  for (let x = 0; x < width; x += 1) {
    tryPush(x, 0)
    tryPush(x, height - 1)
  }
  for (let y = 0; y < height; y += 1) {
    tryPush(0, y)
    tryPush(width - 1, y)
  }

  while (head < tail) {
    const x = queueX[head]
    const y = queueY[head]
    head += 1

    const i = (y * width + x) * 4
    pixels[i + 3] = 0

    tryPush(x + 1, y)
    tryPush(x - 1, y)
    tryPush(x, y + 1)
    tryPush(x, y - 1)
  }

  ctx.putImageData(data, 0, 0)
}

function findOpaqueBounds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } | null {
  const pixels = ctx.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3]
      if (alpha <= 10) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  if (maxX < 0 || maxY < 0) return null
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

