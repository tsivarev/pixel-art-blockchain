import { useEffect, useRef } from 'react'
import { MAX_ZOOM, MIN_ZOOM, PAN_MARGIN, ZOOM_STEP } from '../constants'
import { startTonLiveFeed } from '../api/tonapi'
import { clearSpriteCache } from '../engine/spriteCache'
import { startGameLoop } from '../engine/gameLoop'
import { renderFrame } from '../engine/renderer'
import { SpriteRegistry } from '../engine/spriteRegistry'
import { WorldState } from '../engine/worldState'
import { useUiStore } from '../store/uiStore'

export function CityCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(2)
  const draggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return () => undefined

    const setStats = useUiStore.getState().setStats
    const world = new WorldState(setStats)
    const sprites = new SpriteRegistry()
    let stopLoop: (() => void) | null = null
    let stopLive: (() => void) | null = null
    let disposed = false

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      clearSpriteCache()
    }

    const clampPan = (): void => {
      const mapW = 48 * 16 * zoomRef.current
      const mapH = 32 * 16 * zoomRef.current
      const maxX = Math.max(PAN_MARGIN, mapW / 2 - canvas.width / 2 + PAN_MARGIN)
      const maxY = Math.max(PAN_MARGIN, mapH / 2 - canvas.height / 2 + PAN_MARGIN)
      panRef.current.x = Math.max(-maxX, Math.min(maxX, panRef.current.x))
      panRef.current.y = Math.max(-maxY, Math.min(maxY, panRef.current.y))
    }

    const onMouseDown = (event: MouseEvent) => {
      draggingRef.current = true
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      }
    }

    const onMouseMove = (event: MouseEvent) => {
      if (!draggingRef.current) return
      const dx = event.clientX - dragStartRef.current.x
      const dy = event.clientY - dragStartRef.current.y
      panRef.current.x = dragStartRef.current.panX + dx
      panRef.current.y = dragStartRef.current.panY + dy
      clampPan()
    }

    const onMouseUp = () => {
      draggingRef.current = false
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const direction = event.deltaY > 0 ? -1 : 1
      zoomRef.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current + direction * ZOOM_STEP))
      clearSpriteCache()
      clampPan()
    }

    resize()
    window.addEventListener('resize', resize)
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    void sprites.load().then(() => {
      if (disposed) return
      stopLoop = startGameLoop({
        update: (dt) => {
          world.update(dt)
        },
        render: () => {
          const context = canvas.getContext('2d')
          if (!context) return
          renderFrame(context, canvas, world, sprites, {
            panX: panRef.current.x,
            panY: panRef.current.y,
            zoom: zoomRef.current,
          })
        },
      })
      stopLive = startTonLiveFeed({
        onBlock: (event) => world.handleNewBlock(event),
        onTx: (event) => world.handleNewTransaction(event),
      })
    })

    return () => {
      disposed = true
      if (stopLoop) stopLoop()
      if (stopLive) stopLive()
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative h-screen w-screen overflow-hidden bg-[#0e1022]">
      <canvas ref={canvasRef} className="h-full w-full cursor-grab active:cursor-grabbing" />
    </div>
  )
}

