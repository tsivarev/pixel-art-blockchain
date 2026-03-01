type CacheKey = string

const cache = new Map<CacheKey, HTMLCanvasElement>()
const sourceIds = new WeakMap<HTMLCanvasElement, string>()
let nextSourceId = 1

function getSourceId(source: HTMLCanvasElement): string {
  const existing = sourceIds.get(source)
  if (existing) return existing
  const value = String(nextSourceId++)
  sourceIds.set(source, value)
  return value
}

export function getScaledSprite(source: HTMLCanvasElement, zoom: number): HTMLCanvasElement {
  const width = Math.max(1, Math.round(source.width * zoom))
  const height = Math.max(1, Math.round(source.height * zoom))
  const key = `${getSourceId(source)}:${source.width}x${source.height}:${zoom}`
  const hit = cache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, width, height)
  }
  cache.set(key, canvas)
  return canvas
}

export function clearSpriteCache(): void {
  cache.clear()
}

