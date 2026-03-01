import { useMemo } from 'react'
import { useUiStore } from '../store/uiStore'

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function StatsBar() {
  const stats = useUiStore((state) => state.stats)
  const statusLabel = stats.isLive ? 'LIVE' : 'CONNECTING'
  const statusClass = stats.isLive
    ? 'border-emerald-400/50 text-emerald-200'
    : 'border-yellow-400/50 text-yellow-200'

  const block = useMemo(() => formatNumber(stats.lastBlockSeqno), [stats.lastBlockSeqno])
  const shards = useMemo(() => formatNumber(stats.shardCount), [stats.shardCount])
  const tps = useMemo(() => stats.tps.toFixed(1), [stats.tps])

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-3 rounded border border-[rgba(130,180,255,0.45)] bg-[rgba(8,10,20,0.85)] px-4 py-2 text-sm text-[#d6e8ff] shadow-[0_0_24px_rgba(27,52,98,0.35)] backdrop-blur-sm">
      <span className={`rounded border px-2 py-0.5 text-xs font-semibold tracking-wide ${statusClass}`}>
        {statusLabel}
      </span>
      <span className="text-[#87a0ca]">Block</span>
      <span className="font-semibold">{block}</span>
      <span className="text-[#87a0ca]">Shards</span>
      <span className="font-semibold">{shards}</span>
      <span className="text-[#87a0ca]">TPS</span>
      <span className="font-semibold">{tps}</span>
    </div>
  )
}

