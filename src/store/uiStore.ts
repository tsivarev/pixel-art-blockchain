import { create } from 'zustand'
import type { StatsSnapshot } from '../types'

type UiState = {
  stats: StatsSnapshot
  setStats: (stats: StatsSnapshot) => void
}

const initialStats: StatsSnapshot = {
  lastBlockSeqno: 0,
  shardCount: 0,
  tps: 0,
  isLive: false,
}

export const useUiStore = create<UiState>((set) => ({
  stats: initialStats,
  setStats: (stats) => set({ stats }),
}))

