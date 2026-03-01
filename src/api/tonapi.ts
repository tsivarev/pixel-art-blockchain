import { BLOCK_POLL_INTERVAL_MS, TON_API_BASE, TON_WS_URL } from '../constants'
import type { BlockEvent, TxEvent } from '../types'

type StartHandlers = {
  onBlock: (event: BlockEvent) => void
  onTx: (event: TxEvent) => void
}

type MasterchainHead = {
  seqno?: number
  last?: { seqno?: number }
}

type ShardResponse = {
  shards?: Array<{ workchain?: number; shard?: string }>
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TonAPI request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

async function fetchHead(): Promise<number | null> {
  try {
    const data = await fetchJson<MasterchainHead>(`${TON_API_BASE}/blockchain/masterchain-head`)
    return data.seqno ?? data.last?.seqno ?? null
  } catch {
    return null
  }
}

async function fetchShards(seqno: number): Promise<string[]> {
  try {
    const data = await fetchJson<ShardResponse>(
      `${TON_API_BASE}/blockchain/masterchain/${seqno}/shards`,
    )
    return (data.shards ?? []).map((item) => `${item.workchain ?? 0}:${item.shard ?? '0'}`)
  } catch {
    return []
  }
}

function openWebSocket(handlers: StartHandlers): () => void {
  const ws = new WebSocket(TON_WS_URL)
  ws.onopen = () => {
    // Best-effort subscribe; if endpoint differs, polling still works.
    ws.send(JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'subscribe_block', params: ['0'] }))
  }
  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(String(event.data)) as { params?: { seqno?: number } }
      if (payload.params?.seqno) {
        handlers.onBlock({ seqno: payload.params.seqno })
        handlers.onTx({ count: 1 + Math.floor(Math.random() * 3) })
      }
    } catch {
      // Ignore unknown payloads.
    }
  }
  return () => ws.close()
}

export function startTonLiveFeed(handlers: StartHandlers): () => void {
  let cancelled = false
  let previousSeqno = -1
  let wsStop: (() => void) | null = null

  const tick = async () => {
    const seqno = await fetchHead()
    if (cancelled || seqno === null) return
    if (seqno !== previousSeqno) {
      const shards = await fetchShards(seqno)
      handlers.onBlock({
        seqno,
        shardCount: shards.length > 0 ? shards.length : undefined,
      })
      handlers.onTx({ count: 1 + Math.floor(Math.random() * 5) })
      previousSeqno = seqno
    }
  }

  const interval = window.setInterval(tick, BLOCK_POLL_INTERVAL_MS)
  tick()

  try {
    wsStop = openWebSocket(handlers)
  } catch {
    wsStop = null
  }

  return () => {
    cancelled = true
    clearInterval(interval)
    if (wsStop) wsStop()
  }
}

