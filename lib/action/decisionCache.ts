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
