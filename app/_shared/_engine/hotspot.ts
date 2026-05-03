// ─────────────────────────────────────────
// 热点引擎
// 过滤、分组、排序逻辑
// 纯函数，零副作用，零UI
// ─────────────────────────────────────────

import type { HotspotItem } from '../_types'

export type HotspotGroup = {
  alerts:    HotspotItem[]  // 安全+健康，需要立即注意
  policy:    HotspotItem[]  // 政策+签证+法律
  life:      HotspotItem[]  // 生活+社群+妈妈
}

export type HotspotEngineResult = {
  groups:      HotspotGroup
  sorted:      HotspotItem[]   // 全部排序后列表
  badge:       number           // 水珠数字：未读数量
  state:       'red' | 'orange' | 'calm'  // 水珠颜色
  urgentCount: number
  unreadCount: number
}

const URGENCY_ORDER: Record<string, number> = {
  urgent: 0, important: 1, lifestyle: 2,
}

const ALERT_CATEGORIES = new Set([
  'safety', 'safety_school', 'safety_area',
  'health', 'health_epidemic', 'weather',
])

const POLICY_CATEGORIES = new Set([
  'visa', 'visa_policy', 'visa_child',
  'legal', 'education_policy', 'finance_rate',
])

// ── 过期过滤 ──────────────────────────────
function isValid(h: HotspotItem): boolean {
  const now = Date.now()
  if ((h as any).expires_at) {
    return new Date((h as any).expires_at).getTime() > now
  }
  // 无 expires_at：超过24小时过滤
  return now - new Date(h.created_at).getTime() < 24 * 60 * 60 * 1000
}

function isConsumed(status: string): boolean {
  return status === 'read' || status === 'dismissed'
}

// ── 主函数 ────────────────────────────────
export function runHotspotEngine(
  hotspots: HotspotItem[],
): HotspotEngineResult {

  // 过滤过期和已忽略
  const valid = hotspots.filter(h =>
    h.status !== 'dismissed' && isValid(h)
  )

  // 排序
  const sorted = [...valid].sort(
    (a, b) => (URGENCY_ORDER[a.urgency] ?? 2) - (URGENCY_ORDER[b.urgency] ?? 2)
  )

  // 分组
  const groups: HotspotGroup = {
    alerts: sorted.filter(h => ALERT_CATEGORIES.has(h.category)),
    policy: sorted.filter(h => POLICY_CATEGORIES.has(h.category)),
    life:   sorted.filter(h =>
      !ALERT_CATEGORIES.has(h.category) && !POLICY_CATEGORIES.has(h.category)
    ),
  }

  // 统计
  const urgentCount = valid.filter(h => h.urgency === 'urgent').length
  const unreadCount = valid.filter(h => !isConsumed(h.status)).length

  // 水珠状态
  const state: 'red' | 'orange' | 'calm' =
    urgentCount > 0                                          ? 'red'
    : valid.some(h => h.urgency === 'important') ? 'orange'
    : 'calm'

  return {
    groups,
    sorted,
    badge: unreadCount,
    state,
    urgentCount,
    unreadCount,
  }
}

export { isConsumed }
