import { isFullRootDecision } from '@/lib/action/instantDecision'
import type { RootDecision } from '@/lib/action/rootBrain'

export const DECISION_CACHE_MS = 6 * 60 * 60 * 1000

export function isCachedRootDecisionValid(
  aiActionData: unknown,
  maxAgeMs: number = DECISION_CACHE_MS,
): { valid: boolean; decision?: RootDecision; cachedAt?: string } {
  const aiData = (aiActionData || {}) as Record<string, unknown>
  const cachedDecision = aiData.root_decision as RootDecision | undefined
  const cachedAt = String(aiData.cached_at || aiData.prepared_at || '')
  if (!cachedDecision || !cachedAt) return { valid: false }
  if (!isFullRootDecision(cachedDecision)) return { valid: false }

  const cacheAge = Date.now() - new Date(cachedAt).getTime()
  if (cacheAge >= maxAgeMs) return { valid: false }

  return { valid: true, decision: cachedDecision, cachedAt }
}

/** UI 缓存：含 instant 预览（isPartial），用于打开一键办立刻展示 */
export function getCachedRootDecisionForUI(
  aiActionData: unknown,
  maxAgeMs: number = DECISION_CACHE_MS,
): { decision: RootDecision | null; isPartial: boolean } {
  const aiData = (aiActionData || {}) as Record<string, unknown>
  const decision = aiData.root_decision as RootDecision | undefined
  const cachedAt = String(aiData.cached_at || aiData.prepared_at || '')
  if (!decision || !cachedAt) return { decision: null, isPartial: false }

  const cacheAge = Date.now() - new Date(cachedAt).getTime()
  if (cacheAge >= maxAgeMs) return { decision: null, isPartial: false }

  const isPartial = !isFullRootDecision(decision)
  return { decision, isPartial }
}
