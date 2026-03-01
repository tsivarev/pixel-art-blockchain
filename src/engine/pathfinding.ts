import type { Vec2 } from '../types'

function key(x: number, y: number): string {
  return `${x},${y}`
}

const DIRS: Vec2[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

export function bfsPath(
  walkable: boolean[][],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): Vec2[] {
  if (startX === endX && startY === endY) return [{ x: startX, y: startY }]
  const rows = walkable.length
  const cols = rows > 0 ? walkable[0].length : 0
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows

  const queue: Vec2[] = [{ x: startX, y: startY }]
  const prev = new Map<string, Vec2>()
  const visited = new Set<string>([key(startX, startY)])

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break

    for (const dir of DIRS) {
      const nx = current.x + dir.x
      const ny = current.y + dir.y
      const k = key(nx, ny)
      if (!inBounds(nx, ny) || visited.has(k) || !walkable[ny][nx]) continue
      visited.add(k)
      prev.set(k, current)
      if (nx === endX && ny === endY) {
        const path: Vec2[] = [{ x: endX, y: endY }]
        let node = current
        while (!(node.x === startX && node.y === startY)) {
          path.push(node)
          const parent = prev.get(key(node.x, node.y))
          if (!parent) break
          node = parent
        }
        path.push({ x: startX, y: startY })
        return path.reverse()
      }
      queue.push({ x: nx, y: ny })
    }
  }

  return [{ x: startX, y: startY }]
}

