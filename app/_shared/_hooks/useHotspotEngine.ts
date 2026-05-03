import { useMemo } from 'react'
import { runHotspotEngine } from '../_engine/hotspot'
import type { HotspotItem } from '../_types'
import type { HotspotEngineResult } from '../_engine/hotspot'

export function useHotspotEngine(hotspots: HotspotItem[]): HotspotEngineResult {
  return useMemo(() => runHotspotEngine(hotspots), [hotspots])
}
