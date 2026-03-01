import { LOGIC_FPS, MAX_DELTA_SEC } from '../constants'

type GameLoopCallbacks = {
  update: (dt: number) => void
  render: () => void
}

export function startGameLoop(callbacks: GameLoopCallbacks): () => void {
  let rafId = 0
  let running = true
  let lastTime = 0
  let accumulator = 0
  const fixedStep = 1 / LOGIC_FPS

  const tick = (time: number) => {
    if (!running) return

    const dt = lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, MAX_DELTA_SEC)
    lastTime = time
    accumulator += dt

    while (accumulator >= fixedStep) {
      callbacks.update(fixedStep)
      accumulator -= fixedStep
    }

    callbacks.render()
    rafId = requestAnimationFrame(tick)
  }

  rafId = requestAnimationFrame(tick)

  return () => {
    running = false
    cancelAnimationFrame(rafId)
  }
}

