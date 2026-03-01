const P = 16

type RGBA = [number, number, number, number]

const C = {
  grassLight: [106, 170, 80, 255] as RGBA,
  grassDark: [90, 148, 66, 255] as RGBA,
  grassFlower1: [220, 180, 60, 255] as RGBA,
  grassFlower2: [180, 80, 100, 255] as RGBA,
  grassFlower3: [100, 140, 210, 255] as RGBA,
  roadBase: [160, 140, 120, 255] as RGBA,
  roadLine: [200, 185, 155, 255] as RGBA,
  roadEdge: [120, 105, 90, 255] as RGBA,
  stone: [140, 140, 150, 255] as RGBA,
  stoneDark: [115, 115, 128, 255] as RGBA,
  stoneLight: [165, 165, 175, 255] as RGBA,
  waterA: [70, 130, 180, 255] as RGBA,
  waterB: [60, 115, 165, 255] as RGBA,
  waterShine: [120, 180, 220, 255] as RGBA,
  dark: [14, 16, 34, 255] as RGBA,
  darkStar: [60, 70, 110, 255] as RGBA,
}

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return [canvas, ctx]
}

function setPixel(ctx: CanvasRenderingContext2D, x: number, y: number, c: RGBA): void {
  ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})`
  ctx.fillRect(x, y, 1, 1)
}

function fill(ctx: CanvasRenderingContext2D, w: number, h: number, c: RGBA): void {
  ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})`
  ctx.fillRect(0, 0, w, h)
}

function seededRand(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s & 0x7fffffff) / 0x7fffffff
  }
}

export function makeGrassA(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(P, P)
  const rng = seededRand(42)
  for (let y = 0; y < P; y++) {
    for (let x = 0; x < P; x++) {
      const pick = rng() > 0.55 ? C.grassLight : C.grassDark
      setPixel(ctx, x, y, pick)
    }
  }
  setPixel(ctx, 3, 5, C.grassFlower1)
  setPixel(ctx, 11, 2, C.grassFlower2)
  setPixel(ctx, 7, 12, C.grassFlower3)
  setPixel(ctx, 14, 9, C.grassFlower1)
  return canvas
}

export function makeGrassB(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(P, P)
  const rng = seededRand(99)
  for (let y = 0; y < P; y++) {
    for (let x = 0; x < P; x++) {
      const pick = rng() > 0.5 ? C.grassLight : C.grassDark
      setPixel(ctx, x, y, pick)
    }
  }
  setPixel(ctx, 5, 8, C.grassFlower3)
  setPixel(ctx, 10, 14, C.grassFlower2)
  return canvas
}

export function makeRoad(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(P, P)
  fill(ctx, P, P, C.roadBase)
  for (let x = 0; x < P; x++) {
    setPixel(ctx, x, 0, C.roadEdge)
    setPixel(ctx, x, P - 1, C.roadEdge)
  }
  for (let x = 0; x < P; x += 4) {
    setPixel(ctx, x, 7, C.roadLine)
    setPixel(ctx, x + 1, 7, C.roadLine)
  }
  return canvas
}

export function makeStone(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(P, P)
  const rng = seededRand(77)
  for (let y = 0; y < P; y++) {
    for (let x = 0; x < P; x++) {
      const v = rng()
      const c = v < 0.3 ? C.stoneDark : v < 0.7 ? C.stone : C.stoneLight
      setPixel(ctx, x, y, c)
    }
  }
  for (let y = 0; y < P; y += 4) {
    for (let x = 0; x < P; x++) {
      setPixel(ctx, x, y, C.stoneDark)
    }
  }
  for (let y = 2; y < P; y += 4) {
    for (let x = 0; x < P; x += 8) {
      const off = (y % 8 === 2) ? 0 : 4
      setPixel(ctx, x + off, y, C.stoneDark)
    }
  }
  return canvas
}

export function makeWater(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(P, P)
  const rng = seededRand(123)
  for (let y = 0; y < P; y++) {
    for (let x = 0; x < P; x++) {
      setPixel(ctx, x, y, rng() > 0.5 ? C.waterA : C.waterB)
    }
  }
  setPixel(ctx, 4, 3, C.waterShine)
  setPixel(ctx, 5, 3, C.waterShine)
  setPixel(ctx, 10, 9, C.waterShine)
  setPixel(ctx, 11, 9, C.waterShine)
  return canvas
}

export function makeDark(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(P, P)
  fill(ctx, P, P, C.dark)
  const rng = seededRand(200)
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(rng() * P)
    const y = Math.floor(rng() * P)
    setPixel(ctx, x, y, C.darkStar)
  }
  return canvas
}

export function makeMasterTower(): HTMLCanvasElement {
  const W = 32
  const H = 48
  const [canvas, ctx] = createCanvas(W, H)

  ctx.fillStyle = '#4a6a8a'
  ctx.fillRect(8, 16, 16, 32)
  ctx.fillStyle = '#3a5a7a'
  ctx.fillRect(10, 18, 12, 28)
  ctx.fillStyle = '#5a8ab0'
  ctx.fillRect(12, 20, 8, 4)
  ctx.fillRect(12, 28, 8, 4)
  ctx.fillRect(12, 36, 8, 4)

  ctx.fillStyle = '#2a4a6a'
  ctx.fillRect(6, 14, 20, 4)
  ctx.fillRect(4, 12, 24, 3)

  ctx.fillStyle = '#00e5cc'
  ctx.fillRect(13, 2, 6, 8)
  ctx.fillStyle = '#00ffd5'
  ctx.fillRect(14, 3, 4, 6)
  ctx.fillStyle = '#ffffff'
  setPixel(ctx, 15, 4, [255, 255, 255, 200])
  setPixel(ctx, 16, 5, [255, 255, 255, 160])

  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(10, 46, 14, 2)

  return canvas
}

export function makeShardHouse(hue: number): HTMLCanvasElement {
  const W = 24
  const H = 32
  const [canvas, ctx] = createCanvas(W, H)

  const wallR = Math.round(128 + 60 * Math.cos(hue))
  const wallG = Math.round(128 + 60 * Math.cos(hue + 2.1))
  const wallB = Math.round(128 + 60 * Math.cos(hue + 4.2))
  const roofR = Math.max(0, wallR - 40)
  const roofG = Math.max(0, wallG - 40)
  const roofB = Math.max(0, wallB - 40)

  ctx.fillStyle = `rgb(${wallR},${wallG},${wallB})`
  ctx.fillRect(4, 14, 16, 16)
  ctx.fillStyle = `rgb(${Math.max(0, wallR - 20)},${Math.max(0, wallG - 20)},${Math.max(0, wallB - 20)})`
  ctx.fillRect(6, 16, 5, 5)
  ctx.fillRect(13, 16, 5, 5)

  ctx.fillStyle = `rgb(${roofR},${roofG},${roofB})`
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(4 + i, 14 - i, 16 - i * 2, 1)
  }

  ctx.fillStyle = `rgb(${Math.max(0, wallR - 30)},${Math.max(0, wallG - 30)},${Math.max(0, wallB - 30)})`
  ctx.fillRect(9, 24, 6, 6)
  ctx.fillStyle = `rgb(${Math.min(255, wallR + 30)},${Math.min(255, wallG + 30)},${Math.min(255, wallB + 30)})`
  ctx.fillRect(10, 25, 2, 2)

  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.fillRect(6, 30, 14, 2)

  return canvas
}

export function makeConstruction(stage: number): HTMLCanvasElement {
  const W = 24
  const H = 32
  const [canvas, ctx] = createCanvas(W, H)

  const maxH = 6 + stage * 5
  ctx.fillStyle = '#8a7050'
  ctx.fillRect(5, 30 - maxH, 2, maxH)
  ctx.fillRect(17, 30 - maxH, 2, maxH)

  for (let y = 30 - maxH; y < 30; y += 4) {
    ctx.fillRect(5, y, 14, 1)
  }

  if (stage >= 2) {
    ctx.fillStyle = '#b0a080'
    ctx.fillRect(7, 28 - stage * 4, 10, stage * 3)
  }

  if (stage >= 3) {
    ctx.fillStyle = '#c0b090'
    ctx.fillRect(6, 14, 12, 16)
  }

  return canvas
}

const COURIER_PALETTE = {
  skin: [210, 170, 130, 255] as RGBA,
  hair: [80, 55, 40, 255] as RGBA,
  shirt: [70, 120, 180, 255] as RGBA,
  pants: [50, 60, 80, 255] as RGBA,
  bag: [170, 120, 50, 255] as RGBA,
  shoe: [50, 40, 35, 255] as RGBA,
}

export function makeCourier(dir: 'down' | 'up' | 'left' | 'right', frame: number): HTMLCanvasElement {
  const W = 16
  const H = 24
  const [canvas, ctx] = createCanvas(W, H)
  const p = COURIER_PALETTE

  const bobY = frame % 2 === 0 ? 0 : -1

  setPixel(ctx, 7, 2 + bobY, p.hair)
  setPixel(ctx, 8, 2 + bobY, p.hair)
  setPixel(ctx, 6, 3 + bobY, p.hair)
  setPixel(ctx, 7, 3 + bobY, p.skin)
  setPixel(ctx, 8, 3 + bobY, p.skin)
  setPixel(ctx, 9, 3 + bobY, p.hair)
  setPixel(ctx, 7, 4 + bobY, p.skin)
  setPixel(ctx, 8, 4 + bobY, p.skin)

  if (dir === 'down') {
    setPixel(ctx, 7, 3 + bobY, [190, 150, 115, 255])
  }

  for (let y = 6; y < 12; y++) {
    setPixel(ctx, 7, y + bobY, p.shirt)
    setPixel(ctx, 8, y + bobY, p.shirt)
  }
  setPixel(ctx, 6, 7 + bobY, p.shirt)
  setPixel(ctx, 9, 7 + bobY, p.shirt)

  if (dir === 'left' || dir === 'right') {
    const bagX = dir === 'right' ? 10 : 5
    setPixel(ctx, bagX, 8 + bobY, p.bag)
    setPixel(ctx, bagX, 9 + bobY, p.bag)
    setPixel(ctx, bagX, 10 + bobY, p.bag)
  } else {
    setPixel(ctx, 10, 8 + bobY, p.bag)
    setPixel(ctx, 10, 9 + bobY, p.bag)
  }

  const legOff = [0, 1, 0, -1][frame]
  for (let y = 12; y < 18; y++) {
    setPixel(ctx, 7, y + bobY, p.pants)
    setPixel(ctx, 8, y + bobY, p.pants)
  }
  setPixel(ctx, 7 + legOff, 18 + bobY, p.shoe)
  setPixel(ctx, 8 - legOff, 18 + bobY, p.shoe)

  return canvas
}

const VALIDATOR_PALETTE = {
  skin: [200, 160, 120, 255] as RGBA,
  helmet: [220, 180, 40, 255] as RGBA,
  vest: [220, 140, 40, 255] as RGBA,
  pants: [60, 60, 90, 255] as RGBA,
  hammer: [140, 140, 150, 255] as RGBA,
  handle: [120, 80, 40, 255] as RGBA,
}

export function makeValidator(frame: number): HTMLCanvasElement {
  const W = 16
  const H = 24
  const [canvas, ctx] = createCanvas(W, H)
  const p = VALIDATOR_PALETTE

  setPixel(ctx, 7, 1, p.helmet)
  setPixel(ctx, 8, 1, p.helmet)
  setPixel(ctx, 6, 2, p.helmet)
  setPixel(ctx, 7, 2, p.helmet)
  setPixel(ctx, 8, 2, p.helmet)
  setPixel(ctx, 9, 2, p.helmet)
  setPixel(ctx, 7, 3, p.skin)
  setPixel(ctx, 8, 3, p.skin)
  setPixel(ctx, 7, 4, p.skin)
  setPixel(ctx, 8, 4, p.skin)

  for (let y = 6; y < 12; y++) {
    setPixel(ctx, 7, y, p.vest)
    setPixel(ctx, 8, y, p.vest)
  }
  setPixel(ctx, 6, 7, p.vest)
  setPixel(ctx, 9, 7, p.vest)

  for (let y = 12; y < 18; y++) {
    setPixel(ctx, 7, y, p.pants)
    setPixel(ctx, 8, y, p.pants)
  }

  const hammerY = frame === 0 ? 4 : 8
  setPixel(ctx, 11, hammerY, p.handle)
  setPixel(ctx, 11, hammerY + 1, p.handle)
  setPixel(ctx, 11, hammerY + 2, p.handle)
  setPixel(ctx, 10, hammerY - 1, p.hammer)
  setPixel(ctx, 11, hammerY - 1, p.hammer)
  setPixel(ctx, 12, hammerY - 1, p.hammer)

  return canvas
}
