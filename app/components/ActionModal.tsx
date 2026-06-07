'use client'
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getJsonAuthHeaders } from '@/lib/auth/clientAuthHeaders'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { handleLimitReached } from '@/lib/limits/client'
import { useRouter } from 'next/navigation'
import { toast } from '@/app/components/Toast'
import { useApp } from '@/app/context/AppContext'
import {
  X, CheckCircle2, Navigation, Phone, Mail, Calendar,
  Download, ExternalLink, CreditCard, ShoppingBag,
  Loader, ClipboardList, ShoppingCart, FileText,
  Volume2, ChevronDown, Zap, Brain,
  Shield, HeartPulse, GraduationCap, Plane, Home,
} from 'lucide-react'
import type { BrainHotspotActionData, BrainSuggestedAction } from '@/app/_shared/_types'
import type { PreparedItem, RootAction, RootDecision } from '@/lib/action/rootBrain'
import { shouldShowHotspotOneKey, shouldShowTodoFullOneKey } from '@/lib/action/oneKeyEligibility'
import { SOURCE_CONFIG, type SourceLevel } from '@/lib/trust/sourceLabel'
import { formatThb } from '@/lib/realtime/exchangeRate'
import { resolveHotspotLink, hotspotSearchUrl } from '@/lib/hotspot/url'

const THEME = { text: '#2C3E50', gold: '#8a7355', muted: '#6B8BAA', navy: '#2d3f4a' }
const G = { bg: '#E1F5EE', border: '#9FE1CB', mid: '#5DCAA5', deep: '#1D9E75', dark: '#0F6E56', darkest: '#085041' }

// ── 类型 ──
export type ActionSource = 'todo' | 'schedule' | 'hotspot' | 'health' | 'activity'

export type ActionModalProps = {
  // 来源
  source_type: ActionSource
  source_id: string
  // 展示
  title: string
  category?: string
  urgency_level: 1 | 2 | 3
  due_date?: string
  // 额外数据（孩子日程用）
  event_data?: any
  child_name?: string
  /** 待办预生成数据（有 execution_pack 时可即时展示） */
  ai_action_data?: any
  /** 关联分析热点摘要 */
  hotspot_summary?: string
  /** 关联分析 action_data（source: brain） */
  hotspot_action_data?: BrainHotspotActionData | Record<string, unknown>
  hotspot_action_available?: boolean
  hotspot_linked_todo_id?: string | null
  hotspot_source_url?: string | null
  // 用户
  userId: string
  // 回调
  onClose: () => void
  onDone: (id: string) => void
  onSnooze: (id: string) => void
  onSync?: () => void
  /** 根的大脑建议动作（one_tap / generate_leave_letter / open_packing） */
  onBrainAction?: (action: string, value?: string) => void
}

type ExecutionPack = {
  summary?: string
  checklist?: { item: string; status: string; note?: string }[]
  actions?: ActionData[]
  draft?: string
  depart_suggestion?: string
  cost_estimate?: string
  risk_warnings?: string[]
  carry_items?: string[]
  primary_action_index?: number
  primary_action_reason?: string
  autoCompleted?: string[]
  userActions?: UserAction[]
  nextStep?: string
}

type UserAction = {
  label: string
  action: string
  value: string
  timing: 'now' | 'today' | 'tomorrow' | 'scheduled'
  reason: string
  meta?: Record<string, unknown>
}

type ExecutionState = 'idle' | 'preparing' | 'confirming' | 'executing' | 'done'

type MCPStatus = {
  gmail: boolean
  calendar: boolean
  gmailMessage: string
  calendarMessage: string
}

type ConfirmPayload = {
  kind: 'email' | 'calendar'
  to?: string
  subject?: string
  body?: string
  title?: string
  date?: string
  notes?: string
  draftId?: string
  doneLines: string[]
}

type ActionData = {
  type: string
  label: string
  data?: Record<string, any>
}

type ActionStatus = 'idle' | 'running' | 'done' | 'error'
type TabKey = 'checklist' | 'carry' | 'draft'

/** executeAction 返回值（含服务端 perform_action 的 skipped、eventLink） */
type ExecuteClientResult = { message: string; skipped?: boolean; draftOnly?: boolean; eventLink?: string }

type ExecuteActionContext = { sourceType?: ActionSource; sourceId?: string }

/** 站内相对路径（如 /travel）补全为绝对 URL，避免 window.open 对部分相对路径不生效 */
function resolveOpenUrl(url: string): string {
  const u = url.trim()
  if (/^https?:\/\//i.test(u)) return u
  if (typeof window === 'undefined') return u
  const path = u.startsWith('/') ? u : `/${u}`
  return `${window.location.origin}${path}`
}

const BRAIN_TIMING_LABEL: Record<string, string> = {
  now: '现在',
  today: '今天',
  tonight: '今晚',
  this_week: '本周',
}

const BRAIN_URGENCY_LABEL: Record<string, string> = {
  high: '紧急',
  medium: '关注',
  low: '参考',
}

const DIMENSION_ICON: Record<string, React.ReactNode> = {
  compliance: <Shield size={16} />,
  medical: <HeartPulse size={16} />,
  wealth: <CreditCard size={16} />,
  education: <GraduationCap size={16} />,
  mobility: <Plane size={16} />,
  logistics: <span aria-hidden="true">🛍️</span>,
  estate: <Home size={16} />,
  social: <span aria-hidden="true">👥</span>,
  selfcare: <span aria-hidden="true">💆</span>,
  weather_pickup: <span aria-hidden="true">🌧️</span>,
}

const USER_TIMING_LABEL: Record<UserAction['timing'], string> = {
  now: '现在',
  today: '今天',
  tomorrow: '明天',
  scheduled: '稍后',
}

function dimensionIcon(category?: string) {
  const key = String(category || 'education').toLowerCase()
  return DIMENSION_ICON[key] || <ClipboardList size={16} />
}

function userActionToActionData(action: UserAction): ActionData {
  switch (action.action) {
    case 'navigate':
      return { type: 'navigate', label: action.label, data: { url: action.value } }
    case 'call':
      return { type: 'call', label: action.label, data: { phone: action.value.replace(/^tel:/, '') } }
    case 'open_url':
      return { type: 'open_url', label: action.label, data: { url: action.value } }
    case 'open_draft':
      return { type: 'email', label: action.label, data: { note: action.reason } }
    case 'send_leave_email': {
      const data = action.meta || (action.value ? JSON.parse(action.value) : {})
      return { type: 'send_leave_email', label: action.label, data }
    }
    case 'add_google_calendar': {
      const data = action.meta || (action.value ? JSON.parse(action.value) : {})
      return { type: 'add_google_calendar', label: action.label, data }
    }
    default:
      return { type: action.action, label: action.label, data: { url: action.value } }
  }
}

function isBrainHotspotData(data?: BrainHotspotActionData | Record<string, unknown>): data is BrainHotspotActionData {
  return !!data && (data as BrainHotspotActionData).source === 'brain'
}

function runBrainSuggestedAction(
  action: BrainSuggestedAction,
  onBrainAction?: (action: string, value?: string) => void,
) {
  switch (action.action) {
    case 'call':
      if (action.value) window.location.href = action.value
      break
    case 'open_url':
      if (action.value) window.open(resolveOpenUrl(action.value), '_blank', 'noopener,noreferrer')
      break
    case 'open_email':
      if (action.value) {
        const href = action.value.startsWith('mailto:') ? action.value : `mailto:${action.value}`
        window.location.href = href
      }
      break
    case 'one_tap':
    case 'generate_leave_letter':
    case 'open_packing':
      onBrainAction?.(action.action, action.value)
      break
    default:
      if (action.value?.startsWith('http') || action.value?.startsWith('/')) {
        window.open(resolveOpenUrl(action.value), '_blank', 'noopener,noreferrer')
      }
      break
  }
}

function PaymentTimingPanel({
  quote,
  reason,
  actions,
  onBrainAction,
}: {
  quote: NonNullable<BrainHotspotActionData['paymentQuote']>
  reason: string
  actions: BrainSuggestedAction[]
  onBrainAction?: (action: string, value?: string) => void
}) {
  const title = quote.todoTitle || '待付款项'
  const reasonLines = reason.split('\n').filter(Boolean)
  const primary = actions.find((a) => a.action === 'one_tap') || actions[0]
  const secondary = actions.filter((a) => a !== primary)

  return (
    <div style={{ padding: '12px 14px 4px' }}>
      <div style={{
        padding: '20px 18px',
        borderRadius: 16,
        background: '#fff',
        border: '0.5px solid rgba(164,99,85,0.12)',
        boxShadow: 'var(--sh-warm)',
        marginBottom: 12,
      }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          fontWeight: 600,
          color: THEME.text,
          marginBottom: 10,
          lineHeight: 1.35,
        }}>
          {title.includes('฿') || title.includes('THB') ? title : `${title} ${formatThb(quote.amountThb)}`}
        </div>
        {reasonLines.map((line) => (
          <div
            key={line}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: line.includes('约合人民币') ? 15 : 14,
              color: line.includes('现在付款') ? 'var(--clay)' : 'var(--fg2)',
              fontWeight: line.includes('现在付款') ? 600 : 400,
              lineHeight: 1.65,
              marginBottom: line.includes('现在付款') ? 0 : 6,
            }}
          >
            {line.includes('约合人民币') ? line : line}
          </div>
        ))}
      </div>

      {primary ? (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => runBrainSuggestedAction(primary, onBrainAction)}
          className="gc-btn"
          style={{ width: '100%', marginBottom: secondary.length ? 8 : 0 }}
        >
          {primary.label}
        </motion.button>
      ) : null}

      {secondary.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {secondary.map((action, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.97 }}
              onClick={() => runBrainSuggestedAction(action, onBrainAction)}
              className="gc-btn gc-btn--ghost"
              style={{ width: '100%' }}
            >
              {action.label}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

function BrainInsightPanel({
  brain,
  summary,
  onBrainAction,
}: {
  brain: BrainHotspotActionData
  summary?: string
  onBrainAction?: (action: string, value?: string) => void
}) {
  const reason = brain.reason || summary || ''
  const actions = brain.suggestedActions || []
  const urgency = brain.urgency || 'medium'

  if (brain.insight_type === 'payment_timing' && brain.paymentQuote) {
    return (
      <PaymentTimingPanel
        quote={brain.paymentQuote}
        reason={reason}
        actions={actions}
        onBrainAction={onBrainAction}
      />
    )
  }

  const urgencyColor =
    urgency === 'high' ? '#d58074'
    : urgency === 'medium' ? '#b88e5e'
    : '#537b8e'

  return (
    <div style={{ padding: '12px 14px 4px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        padding: '10px 12px', borderRadius: 12,
        background: urgency === 'high' ? 'rgba(213,128,116,0.1)' : urgency === 'medium' ? 'rgba(184,142,94,0.1)' : 'rgba(83,123,142,0.08)',
        border: `0.5px solid ${urgencyColor}44`,
      }}>
        <Brain size={16} color={urgencyColor} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: urgencyColor, letterSpacing: '0.06em' }}>
            {BRAIN_URGENCY_LABEL[urgency] || '关联分析'}
          </div>
          <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>根的分析</div>
        </div>
      </div>

      {reason ? (
        <div style={{
          fontSize: 14, color: THEME.text, lineHeight: 1.65,
          padding: '12px 14px', borderRadius: 12,
          background: 'rgba(255,255,255,0.65)',
          border: '0.5px solid rgba(0,0,0,0.06)',
          marginBottom: 12,
        }}>
          {reason}
        </div>
      ) : null}

      {actions.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: THEME.muted, letterSpacing: '0.05em', marginBottom: 8 }}>
            建议动作
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actions.map((action, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.97 }}
                onClick={() => runBrainSuggestedAction(action, onBrainAction)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 12, border: 'none',
                  background: i === 0 ? G.dark : 'rgba(255,255,255,0.75)',
                  color: i === 0 ? '#fff' : THEME.text,
                  cursor: 'pointer', textAlign: 'left',
                  boxShadow: i === 0 ? '0 2px 8px rgba(15,110,86,0.2)' : undefined,
                  borderWidth: i === 0 ? 0 : 0.5,
                  borderStyle: 'solid',
                  borderColor: 'rgba(0,0,0,0.08)',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: i === 0 ? 600 : 500 }}>{action.label}</span>
                <span style={{
                  fontSize: 10, opacity: 0.75, flexShrink: 0, marginLeft: 8,
                  color: i === 0 ? 'rgba(255,255,255,0.75)' : THEME.muted,
                }}>
                  {BRAIN_TIMING_LABEL[action.timing] || action.timing}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getFreshExecutionPack(aiActionData?: any): ExecutionPack | null {
  const pack = aiActionData?.execution_pack
  const preparedAt = aiActionData?.prepared_at
  if (!pack || !preparedAt) return null
  const ageHours = (Date.now() - new Date(preparedAt).getTime()) / 3600000
  if (ageHours >= 2) return null
  return pack as ExecutionPack
}

function getFreshRootDecision(aiActionData?: Record<string, unknown>): RootDecision | null {
  const decision = aiActionData?.root_decision as RootDecision | undefined
  const cachedAt = (aiActionData?.cached_at || aiActionData?.prepared_at) as string | undefined
  if (!decision || !cachedAt) return null
  const ageHours = (Date.now() - new Date(cachedAt).getTime()) / 3600000
  if (ageHours >= 2) return null
  return decision
}

function isPreparedItemVisible(item: PreparedItem): boolean {
  if (item.content == null) return false
  if (typeof item.content === 'string' && !item.content.trim()) return false
  if (Array.isArray(item.content) && item.content.length === 0) return false
  return true
}

function renderPreparedContent(item: PreparedItem): React.ReactNode {
  if (
    !item.content
    && (!Array.isArray(item.content) || item.content.length === 0)
  ) {
    return null
  }

  if (item.type === 'checklist') {
    const items = Array.isArray(item.content)
      ? item.content
      : String(item.content).split('\n').filter(Boolean)

    if (items.length === 0) return null

    return (
      <div>
        {items.map((i: unknown, idx: number) => {
          const text = typeof i === 'string'
            ? i
            : (i && typeof i === 'object'
              ? String((i as { item?: string; name?: string }).item
                || (i as { name?: string }).name
                || JSON.stringify(i))
              : String(i))
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 10,
                padding: '8px 0',
                borderBottom: '1px solid rgba(45,50,47,0.06)',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: 'var(--text-muted, rgba(45,50,47,0.45))' }}>□</span>
              <span>{text}</span>
            </div>
          )
        })}
      </div>
    )
  }

  if (item.type === 'draft' || item.type === 'phrase') {
    const text = String(item.content)
    if (!text.trim()) return null

    return (
      <div>
        <div style={{
          background: item.type === 'phrase' ? '#f0f6ef' : 'var(--canvas-warm, rgba(251,249,246,0.9))',
          borderRadius: 12,
          padding: 16,
          fontSize: 13,
          lineHeight: 1.8,
          whiteSpace: 'pre-line',
          fontFamily: item.type === 'phrase' ? 'var(--font-body, inherit)' : 'inherit',
        }}>
          {text}
        </div>
        {item.copyable && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(text)
              toast('已复制', 'success')
            }}
            style={{
              marginTop: 8,
              background: 'transparent',
              border: '1px solid var(--clay, #a46355)',
              color: 'var(--clay, #a46355)',
              borderRadius: 20,
              padding: '4px 16px',
              fontSize: 12,
              cursor: 'pointer',
              display: 'block',
            }}
          >
            复制
          </button>
        )}
      </div>
    )
  }

  if (item.type === 'comparison') {
    const data = typeof item.content === 'string'
      ? (() => { try { return JSON.parse(item.content) } catch { return null } })()
      : item.content as Record<string, unknown> | null

    if (!data || typeof data !== 'object') {
      return <div style={{ fontSize: 14 }}>{String(item.content)}</div>
    }

    const recommended = data.recommended as { label?: string; fee?: string; cny?: string } | undefined
    const alternatives = (data.alternatives || []) as Array<{ label?: string; fee?: string }>

    return (
      <div>
        {recommended && (
          <div style={{
            background: '#f0f6ef',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: 'var(--accent-jade, #2D6A4F)', fontWeight: 600 }}>
              ✓ {recommended.label}
            </span>
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {recommended.fee}
              {recommended.cny && ` · ¥${recommended.cny}`}
            </span>
          </div>
        )}
        {alternatives.map((alt, i) => (
          <div
            key={i}
            style={{
              padding: '8px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              color: 'var(--text-muted, rgba(45,50,47,0.45))',
              fontSize: 13,
            }}
          >
            <span>{alt.label}</span>
            <span>{alt.fee}</span>
          </div>
        ))}
      </div>
    )
  }

  const text = typeof item.content === 'string'
    ? item.content
    : Array.isArray(item.content)
      ? item.content.map((i: unknown) => (typeof i === 'string' ? i : JSON.stringify(i))).join('\n')
      : JSON.stringify(item.content, null, 2)

  if (!text.trim()) return null

  return (
    <div style={{
      fontSize: 14,
      lineHeight: 1.7,
      whiteSpace: 'pre-line',
    }}>
      {text}
    </div>
  )
}

function SourceBadge({
  source,
  sourceUrl,
}: {
  source: SourceLevel
  sourceUrl?: string
}) {
  const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.ai_generated

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      marginBottom: 6,
      flexWrap: 'wrap',
    }}>
      <span style={{
        fontSize: 11,
        color: config.color,
        background: `${config.color}15`,
        padding: '2px 8px',
        borderRadius: 20,
      }}>
        {config.icon} {config.label}
      </span>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: THEME.muted, textDecoration: 'none' }}
        >
          查看来源 →
        </a>
      )}
    </div>
  )
}

function PreparedSection({ item }: { item: PreparedItem }) {
  const [confirmed, setConfirmed] = useState(!item.requiresConfirm)
  const config = SOURCE_CONFIG[item.source] || SOURCE_CONFIG.ai_generated
  const canUse = !item.requiresConfirm || confirmed
  const body = renderPreparedContent(item)

  if (!body) return null

  const copyPlainText = () => {
    if (!item.copyable || !canUse) return
    const text = typeof item.content === 'string'
      ? item.content
      : JSON.stringify(item.content, null, 2)
    void navigator.clipboard.writeText(text)
    toast('已复制', 'success')
  }

  return (
    <div style={{
      margin: '8px 12px 0',
      padding: '12px 14px',
      borderRadius: 12,
      border: item.requiresConfirm && !confirmed
        ? `1px dashed ${config.color}`
        : `0.5px solid ${G.border}`,
      background: 'rgba(255,255,255,0.75)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: G.dark }}>{item.label}</span>
      </div>
      <SourceBadge source={item.source} sourceUrl={item.sourceUrl} />
      <div style={{
        fontSize: 13,
        color: THEME.text,
        lineHeight: 1.55,
        maxHeight: item.type === 'checklist' ? undefined : 160,
        overflowY: item.type === 'checklist' ? undefined : 'auto',
      }}>
        {body}
      </div>
      {item.disclaimer && (
        <div style={{
          fontSize: 11,
          color: THEME.muted,
          marginTop: 6,
          fontStyle: 'italic',
        }}>
          ⓘ {item.disclaimer}
        </div>
      )}
      {item.requiresConfirm && !confirmed && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setConfirmed(true)}
          style={{
            marginTop: 8,
            padding: '6px 12px',
            borderRadius: 8,
            border: `0.5px solid ${config.color}`,
            background: `${config.color}10`,
            fontSize: 11,
            color: config.color,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          我已核对
        </motion.button>
      )}
      {item.copyable && canUse && item.type !== 'draft' && item.type !== 'phrase' && (
        <motion.button whileTap={{ scale: 0.95 }} onClick={copyPlainText}
          style={{
            marginTop: 8, padding: '6px 12px', borderRadius: 8, border: `0.5px solid ${G.border}`,
            background: G.bg, fontSize: 11, color: G.dark, cursor: 'pointer',
          }}>
          复制
        </motion.button>
      )}
    </div>
  )
}

function RootDecisionPanel({
  decision,
  userId,
  autoCompleted,
  onAllDone,
  onClose,
}: {
  decision: RootDecision
  userId: string
  autoCompleted: string[]
  onAllDone: () => void
  onClose: () => void
}) {
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<RootAction | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [finalDone, setFinalDone] = useState(false)
  const [draftIds, setDraftIds] = useState<Record<string, string>>({})

  const doExecute = async (action: RootAction) => {
    setExecutingId(action.id)
    setConfirming(null)

    try {
      let payload = action
      if (action.executor.service === 'gmail' && action.executor.method === 'send_draft') {
        const draftId = draftIds[action.id] || String(action.executor.params.draftId || '')
        payload = {
          ...action,
          executor: {
            ...action.executor,
            params: { ...action.executor.params, draftId },
          },
        }
      }

      const res = await fetchWithAuth('/api/action/execute-step', {
        method: 'POST',
        body: JSON.stringify({ action: payload }),
      })
      const result = await res.json()

      if (action.executor.service === 'gmail' && action.executor.method === 'create_draft' && result.draftId) {
        setDraftIds((prev) => ({ ...prev, [action.id]: result.draftId }))
      }

      if (result.url) {
        if (result.url.startsWith('tel:') || result.url.startsWith('mailto:')) {
          window.location.href = result.url
        } else {
          window.open(resolveOpenUrl(result.url), '_blank', 'noopener,noreferrer')
        }
      }

      if (result.ok !== false) {
        setCompletedIds((prev) => new Set([...prev, action.id]))
        const primaryActions = decision.actions.filter((a) => a.type === 'primary')
        const nextCompleted = new Set([...completedIds, action.id])
        if (primaryActions.length > 0 && primaryActions.every((a) => nextCompleted.has(a.id))) {
          setTimeout(() => setFinalDone(true), 500)
        }
      } else {
        toast(result.error || '执行失败', 'error')
      }
    } catch (e) {
      logOrAlertNetworkError(e)
    } finally {
      setExecutingId(null)
    }
  }

  const handleAction = (action: RootAction) => {
    if (action.requiresConfirm) {
      setConfirming(action)
      return
    }
    void doExecute(action)
  }

  if (finalDone) {
    return (
      <div style={{ padding: '20px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <CheckCircle2 size={36} color={G.deep} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: THEME.text, lineHeight: 1.5 }}>
            {decision.completion.message}
          </div>
          {decision.completion.nextStep && (
            <div style={{ fontSize: 13, color: THEME.muted, marginTop: 10, lineHeight: 1.55 }}>
              {decision.completion.nextStep}
            </div>
          )}
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onAllDone}
          style={{
            width: '100%', padding: '12px', borderRadius: 12, border: 'none',
            background: G.dark, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
          好的 ✓
        </motion.button>
      </div>
    )
  }

  if (confirming) {
    return (
      <div style={{ padding: '16px' }}>
        <div style={{
          fontSize: 14, color: THEME.text, lineHeight: 1.6, marginBottom: 16,
          padding: '14px', borderRadius: 12, background: G.bg, border: `0.5px solid ${G.border}`,
        }}>
          {confirming.confirmMessage || '确认执行这个操作？'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => void doExecute(confirming)}
            style={{
              flex: 1, padding: '12px', borderRadius: 12, border: 'none',
              background: G.dark, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
            确认
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setConfirming(null)}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              border: '0.5px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)',
              fontSize: 14, color: THEME.muted, cursor: 'pointer',
            }}>
            取消
          </motion.button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0 4px' }}>
      <div style={{ padding: '0 14px 12px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: THEME.text, lineHeight: 1.4, marginBottom: 8 }}>
          {decision.message.headline}
        </div>
        <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.6, marginBottom: 8 }}>
          {decision.message.detail}
        </div>
        {decision.message.reassurance && (
          <div style={{
            fontSize: 12, color: G.dark, lineHeight: 1.55, padding: '10px 12px', borderRadius: 10,
            background: G.bg, border: `0.5px solid ${G.border}`,
          }}>
            {decision.message.reassurance}
          </div>
        )}
      </div>

      {autoCompleted.length > 0 && (
        <div style={{ padding: '0 14px 8px' }}>
          {autoCompleted.map((line) => (
            <div key={line} style={{ fontSize: 12, color: G.dark, marginBottom: 4 }}>
              ✓ {line}
            </div>
          ))}
        </div>
      )}

      {decision.prepared
        .filter(isPreparedItemVisible)
        .map((item, i) => (
          <PreparedSection key={`${item.label}-${i}`} item={item} />
        ))}

      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {decision.actions.map((action) => {
          const done = completedIds.has(action.id)
          const running = executingId === action.id
          const isPrimary = action.type === 'primary'

          return (
            <motion.button
              key={action.id}
              whileTap={{ scale: running || done ? 1 : 0.97 }}
              disabled={running || done}
              onClick={() => !running && !done && handleAction(action)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 16px', borderRadius: 12, border: 'none', cursor: running || done ? 'default' : 'pointer',
                background: done ? G.bg : isPrimary ? G.dark : 'rgba(255,255,255,0.8)',
                color: done ? G.dark : isPrimary ? '#fff' : THEME.text,
                borderWidth: done || isPrimary ? 0 : 0.5,
                borderStyle: 'solid',
                borderColor: 'rgba(0,0,0,0.1)',
                opacity: running ? 0.7 : 1,
              }}
            >
              {running ? <Loader size={16} /> : done ? <CheckCircle2 size={16} /> : null}
              <span style={{ fontSize: 14, fontWeight: isPrimary ? 600 : 500 }}>
                {done ? '已完成' : action.label}
              </span>
            </motion.button>
          )
        })}
      </div>

      <div style={{ padding: '12px 14px 4px', display: 'flex', gap: 8 }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setFinalDone(true)}
          style={{
            flex: 1, padding: '10px', borderRadius: 12,
            background: 'rgba(141,200,160,0.35)', border: '0.5px solid rgba(141,200,160,0.5)',
            fontSize: 13, fontWeight: 600, color: THEME.text, cursor: 'pointer',
          }}>
          搞定了 ✓
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
          style={{
            flex: 1, padding: '10px', borderRadius: 12,
            background: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(0,0,0,0.08)',
            fontSize: 13, color: THEME.muted, cursor: 'pointer',
          }}>
          明天再说
        </motion.button>
      </div>
    </div>
  )
}

// ── 语音播报（联动设置）──
function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const enabled = localStorage.getItem('speech_enabled')
  if (enabled === 'false') return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'; u.rate = 0.95
  window.speechSynthesis.speak(u)
}

function VoiceBtn({ text }: { text: string }) {
  const [active, setActive] = useState(false)
  return (
    <motion.button whileTap={{ scale: 0.86 }}
      onClick={e => { e.stopPropagation(); speak(text); setActive(true); setTimeout(() => setActive(false), 1400) }}
      style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', borderRadius: 20,
        border: `0.5px solid ${G.border}`, background: active ? G.mid : 'rgba(255,255,255,0.55)',
        cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}>
      <Volume2 size={11} color={active ? '#fff' : G.dark} />
      <span style={{ fontSize: 10, color: active ? '#fff' : G.dark, fontWeight: 500 }}>播报</span>
    </motion.button>
  )
}

// ── 材料清单单项 ──
function CheckItem({ item, note, checked, onToggle }: {
  item: string; note?: string; checked?: boolean; onToggle?: () => void
}) {
  const done = checked ?? false
  return (
    <div onClick={onToggle}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 0',
        borderBottom: '0.5px solid rgba(0,0,0,0.05)', cursor: onToggle ? 'pointer' : 'default' }}>
      <motion.div whileTap={{ scale: 0.8 }} style={{ width: 19, height: 19, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        border: done ? 'none' : `1.5px solid ${THEME.muted}`, background: done ? G.deep : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
        <AnimatePresence>
          {done && <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            transition={{ duration: 0.15 }} width="9" height="9" viewBox="0 0 9 9" fill="none">
            <polyline points="1,4.5 3.5,7 8,2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>}
        </AnimatePresence>
      </motion.div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: done ? THEME.muted : THEME.text,
          textDecoration: done ? 'line-through' : 'none' }}>{item}</div>
        {note && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{note}</div>}
      </div>
      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, flexShrink: 0,
        background: 'rgba(0,0,0,0.04)', color: THEME.muted }}>
        {note || ''}
      </span>
    </div>
  )
}

// ── 携带物品 tag ──
function CarryTag({ label, checked, onToggle }: {
  label: string; checked?: boolean; onToggle?: () => void
}) {
  const done = checked ?? false
  return (
    <motion.div whileTap={{ scale: 0.86 }} onClick={onToggle}
      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
        padding: '6px 11px', borderRadius: 20,
        background: done ? G.bg : 'rgba(255,255,255,0.6)',
        color: done ? G.darkest : THEME.text,
        border: `0.5px solid ${done ? G.mid : 'rgba(0,0,0,0.08)'}`,
        cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s' }}>
      <AnimatePresence>
        {done && <motion.svg initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}
          width="11" height="11" viewBox="0 0 11 11" fill="none">
          <polyline points="1.5,5.5 4.5,8.5 9.5,2.5" stroke={G.deep} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>}
      </AnimatePresence>
      {label}
    </motion.div>
  )
}

// ── AI 摘要卡 ──
function AiSummaryCard({ pack }: { pack: ExecutionPack }) {
  const [warnOpen, setWarnOpen] = useState(false)
  const summaryText = [pack.summary, pack.depart_suggestion && `出发时间：${pack.depart_suggestion}`,
    pack.cost_estimate && `预估费用：${pack.cost_estimate}`, ...(pack.risk_warnings || [])].filter(Boolean).join('。')
  return (
    <div style={{ margin: '10px 12px 0', padding: '12px', background: G.bg, borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: G.deep }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: G.darkest }}>帮你查了</span>
        </div>
        <VoiceBtn text={summaryText} />
      </div>
      {pack.summary && <p style={{ fontSize: 12, color: G.darkest, lineHeight: 1.65, margin: 0 }}>{pack.summary}</p>}
      {(pack.depart_suggestion || pack.cost_estimate) && (
        <div style={{ display: 'flex', gap: 14, marginTop: 8, paddingTop: 8, borderTop: `0.5px solid ${G.border}` }}>
          {pack.depart_suggestion && <span style={{ fontSize: 11, color: G.dark }}>🕐 {pack.depart_suggestion}</span>}
          {pack.cost_estimate && <span style={{ fontSize: 11, color: G.dark }}>💰 {pack.cost_estimate}</span>}
        </div>
      )}
      {!!pack.risk_warnings?.length && (
        <>
          <motion.div whileTap={{ scale: 0.97 }} onClick={() => setWarnOpen(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 8, cursor: 'pointer', width: 'fit-content' }}>
            <motion.div animate={{ rotate: warnOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={12} color={G.dark} />
            </motion.div>
            <span style={{ fontSize: 11, color: G.dark }}>
              {warnOpen ? '收起' : `${pack.risk_warnings.length} 条注意事项`}
            </span>
          </motion.div>
          <AnimatePresence>
            {warnOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
                <div style={{ marginTop: 7, paddingTop: 7, borderTop: `0.5px solid ${G.border}` }}>
                  {pack.risk_warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: 11, color: G.darkest, lineHeight: 1.6, padding: '3px 0',
                      borderBottom: i < (pack.risk_warnings?.length || 0) - 1 ? `0.5px solid ${G.border}` : 'none' }}>
                      · {w}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

// ── 标签页内容 ──
function TabContent({ tabKey, pack, saving, onToggleChecklist, onToggleCarry }: {
  tabKey: TabKey; pack: ExecutionPack
  saving: boolean
  onToggleChecklist: (i: number) => void
  onToggleCarry: (i: number) => void
}) {
  const [copied, setCopied] = useState(false)
  const checklistText = pack.checklist?.map(c => c.item + (c.note ? `（${c.note}）` : '')).join('、') || ''
  const carryText = (pack.carry_items || [])
    .map((x: string | { label?: string }) => (typeof x === 'string' ? x : (x.label ?? '')))
    .filter(Boolean)
    .join('、') || ''
  const draftText = pack.draft || ''

  const copyDraft = () => {
    navigator.clipboard.writeText(draftText).catch(() => {
      const el = document.createElement('textarea')
      el.value = draftText
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    })
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (tabKey === 'checklist') {
    if (!pack.checklist?.length) return <div style={{ padding: '12px 14px', fontSize: 12, color: THEME.muted }}>暂无材料清单</div>
    return (
      <div style={{ padding: '4px 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 2px' }}>
          <span style={{ fontSize: 10, color: THEME.muted }}>点击勾选</span>
          <VoiceBtn text={`材料清单：${checklistText}`} />
        </div>
        {pack.checklist.map((c, i) => (
          <CheckItem key={i} item={c.item} note={c.note} checked={c.status === 'done'}
            onToggle={saving ? undefined : () => onToggleChecklist(i)} />
        ))}
      </div>
    )
  }

  if (tabKey === 'carry') {
    if (!pack.carry_items?.length) return <div style={{ padding: '12px 14px', fontSize: 12, color: THEME.muted }}>暂无携带物品</div>
    return (
      <div style={{ padding: '4px 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 8px' }}>
          <span style={{ fontSize: 10, color: THEME.muted }}>点击确认已放入包中</span>
          <VoiceBtn text={`携带物品：${carryText}`} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {pack.carry_items.map((item: string | { label?: string; checked?: boolean }, i: number) => (
            <CarryTag
              key={i}
              label={typeof item === 'string' ? item : (item.label ?? '')}
              checked={typeof item === 'string' ? false : !!item.checked}
              onToggle={saving ? undefined : () => onToggleCarry(i)}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!draftText) return <div style={{ padding: '12px 14px', fontSize: 12, color: THEME.muted }}>暂无草稿</div>
  return (
    <div style={{ padding: '4px 14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 6px' }}>
        <span style={{ fontSize: 10, color: THEME.muted }}>草稿</span>
        <VoiceBtn text={draftText} />
      </div>
      <p style={{ fontSize: 12, color: THEME.text, lineHeight: 1.75, margin: '0 0 10px',
        fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{draftText}</p>
      <motion.button whileTap={{ scale: 0.95 }} onClick={copyDraft} disabled={saving}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          width: '100%', padding: '9px', borderRadius: 9, border: 'none',
          background: copied ? G.mid : G.bg, color: copied ? '#fff' : G.darkest,
          fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
          opacity: saving ? 0.55 : 1 }}>
        {copied ? '已复制 ✓' : '复制内容'}
      </motion.button>
    </div>
  )
}

// ── 执行动作区 ──
const ACTION_ICON: Record<string, React.ReactNode> = {
  navigate: <Navigation size={15} />, call: <Phone size={15} />,
  email: <Mail size={15} />, whatsapp: <Phone size={15} />,
  calendar: <Calendar size={15} />, download_pdf: <Download size={15} />,
  open_url: <ExternalLink size={15} />, pay: <CreditCard size={15} />,
  buy: <ShoppingBag size={15} />,
}

const ACTION_COLOR: Record<string, { bg: string; icon: string }> = {
  email:        { bg: '#E1F5EE', icon: G.dark },
  navigate:     { bg: '#E6F1FB', icon: '#185FA5' },
  call:         { bg: '#EAF3DE', icon: '#3B6D11' },
  download_pdf: { bg: '#EEEDFE', icon: '#534AB7' },
  open_url:     { bg: '#EEEDFE', icon: '#534AB7' },
  calendar:     { bg: '#FAEEDA', icon: '#854F0B' },
  buy:          { bg: '#FBEAF0', icon: '#993556' },
  pay:          { bg: '#FBEAF0', icon: '#993556' },
  whatsapp:     { bg: '#EAF3DE', icon: '#3B6D11' },
}

const SHORT_LABEL: Record<string, string> = {
  email: '邮件', navigate: '导航', call: '致电',
  download_pdf: '下载', open_url: '打开', calendar: '提醒',
  buy: '购买', pay: '支付', whatsapp: '消息',
}

async function executeAction(
  action: ActionData,
  userId: string,
  ctx?: ExecuteActionContext,
): Promise<ExecuteClientResult> {
  const data = action.data || {}
  switch (action.type) {
    case 'navigate': {
      const url = data.url || (data.destination
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.destination)}`
        : null)
      if (url) window.open(url, '_blank')
      return { message: '已打开导航' }
    }
    case 'call':
      if (data.phone) window.location.href = `tel:${data.phone.replace(/\s/g, '')}`
      return { message: `拨打 ${data.phone}` }
    case 'email': {
      window.open(`mailto:${data.email_to}?subject=${encodeURIComponent(data.email_subject || '')}&body=${encodeURIComponent(data.email_body || '')}`)
      try {
        const res = await fetchWithAuth('/api/action/execute', {
          method: 'POST',
          body: JSON.stringify({ perform_action: action }),
        })
        const json = await res.json().catch(() => ({})) as {
          skipped?: boolean
          reason?: string
          draft_only?: boolean
          message?: string
        }
        if (json?.draft_only) {
          return {
            message: json.message || '已生成草稿，需手动执行',
            draftOnly: true,
          }
        }
        if (json?.skipped) {
          return { message: typeof json.reason === 'string' ? json.reason : '未执行', skipped: true }
        }
      } catch (e) {
        logOrAlertNetworkError(e)
      }
      return { message: '已打开邮件' }
    }
    case 'whatsapp':
      window.open(`https://wa.me/${(data.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(data.message || '')}`, '_blank')
      return { message: '已打开 WhatsApp' }
    case 'calendar': {
      try {
        const res = await fetchWithAuth('/api/action/execute', {
          method: 'POST',
          body: JSON.stringify({ perform_action: action }),
        })
        const json = await res.json().catch(() => ({})) as {
          skipped?: boolean
          reason?: string
          ok?: boolean
          eventLink?: string
          message?: string
          fallback?: boolean
          draft_only?: boolean
        }
        if (json?.draft_only) {
          return {
            message: json.message || '已生成草稿，需手动执行',
            draftOnly: true,
          }
        }
        if (json?.skipped) {
          return { message: typeof json.reason === 'string' ? json.reason : '未执行', skipped: true }
        }
        if (res.ok && json?.ok && json.eventLink) {
          window.open(json.eventLink, '_blank')
          return { message: typeof json.message === 'string' ? json.message : '已添加到 Google 日历', eventLink: json.eventLink }
        }
        if (res.ok && json?.ok && json.fallback) {
          const title = encodeURIComponent(data.calendar_title || '')
          const date = (data.calendar_date || '').replace(/-/g, '')
          const time = (data.calendar_time || '09:00').replace(':', '')
          const loc = encodeURIComponent(data.calendar_location || '')
          window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}T${time}00/${date}T${time}00&location=${loc}`, '_blank')
          return { message: typeof json.message === 'string' ? json.message : '日历请求已提交' }
        }
      } catch (e) {
        logOrAlertNetworkError(e)
      }
      const title = encodeURIComponent(data.calendar_title || '')
      const date = (data.calendar_date || '').replace(/-/g, '')
      const time = (data.calendar_time || '09:00').replace(':', '')
      const loc = encodeURIComponent(data.calendar_location || '')
      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}T${time}00/${date}T${time}00&location=${loc}`, '_blank')
      return { message: '已加入日历' }
    }
    case 'download_pdf': {
      if (data.form_type === 'medical_form') {
        const tokenRes = await fetchWithAuth('/api/auth/card-token', { method: 'POST' })
        if (!tokenRes.ok) throw new Error('card token')
        const tokenJson = await tokenRes.json()
        const token = tokenJson.token as string | undefined
        if (!token) throw new Error('missing token')
        window.open(`/api/cards/medical?token=${encodeURIComponent(token)}`, '_blank')
        return { message: '已打开就诊信息卡' }
      }
      if (['TM7', 'TM47', 'TM8'].includes(data.form_type || '')) {
        const tokenRes = await fetchWithAuth('/api/auth/card-token', { method: 'POST' })
        if (!tokenRes.ok) throw new Error('card token')
        const tokenJson = await tokenRes.json()
        const token = tokenJson.token as string | undefined
        if (!token) throw new Error('missing token')
        window.open(`/api/cards/visa?token=${encodeURIComponent(token)}`, '_blank')

        let pdfDownloaded = false
        try {
          const pdfRes = await fetchWithAuth('/api/todo/generate-pdf', {
            method: 'POST',
            body: JSON.stringify({
              ...(ctx?.sourceType === 'todo' && ctx?.sourceId ? { todo_id: ctx.sourceId } : {}),
              form_type: data.form_type,
              prefilled_fields: data.prefilled_fields ?? {},
            }),
          })
          if (pdfRes.ok) {
            const j = (await pdfRes.json()) as { ok?: boolean; pdf_url?: string; filename?: string }
            if (j.ok && j.pdf_url) {
              const dl = await fetch(j.pdf_url)
              if (dl.ok) {
                const blob = await dl.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = j.filename || `${data.form_type}_prefilled.pdf`
                a.click()
                URL.revokeObjectURL(url)
                pdfDownloaded = true
              }
            }
          }
        } catch (e) {
          console.warn('PDF 预填生成失败，已打开指引页', e)
        }
        return {
          message: pdfDownloaded
            ? '已打开签证填写指引，预填 PDF 已下载'
            : '已打开签证填写指引',
        }
      }
      // 有预填数据，调 perform API 生成 PDF
      if (data.prefilled_fields && data.form_type) {
        try {
          const res = await fetchWithAuth('/api/action/perform', {
            method: 'POST',
            body: JSON.stringify({
              action_type: 'fill_pdf',
              form_type: data.form_type,
              prefilled_fields: data.prefilled_fields,
            }),
          })
          if (res.ok) {
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `${data.form_type}.pdf`; a.click()
            URL.revokeObjectURL(url)
            return { message: '已下载预填表格' }
          }
        } catch {}
      }
      // 降级：直接打开官方链接
      const pdfUrl = data.download_url || data.official_url || data.url
      if (pdfUrl) window.open(pdfUrl, '_blank')
      return { message: '已打开表格页面' }
    }
    case 'open_url':
      if (data.url) window.open(resolveOpenUrl(data.url), '_blank')
      return { message: '已打开' }
    case 'pay':
      if (data.url) window.open(data.url, '_blank')
      else toast(data.note || data.channel || '请按提示方式缴费', 'info')
      return { message: '已查看缴费方式' }
    case 'buy': {
      const ch = data.channel === 'shopee'
        ? 'https://shopee.co.th/search?keyword='
        : 'https://www.lazada.co.th/catalog/?q='
      window.open(ch + encodeURIComponent(data.item || ''), '_blank')
      return { message: '已打开购物' }
    }
    default:
      return { message: '已完成' }
  }
}

function AutoExecutePanel({
  autoCompleted,
  userActions,
  userId,
  sourceType,
  sourceId,
  onOpenDraft,
  onAllDone,
}: {
  autoCompleted: string[]
  userActions: UserAction[]
  userId: string
  sourceType: ActionSource
  sourceId: string
  onOpenDraft: () => void
  onAllDone: () => void
}) {
  const [runningIdx, setRunningIdx] = useState<number | null>(null)
  const [execState, setExecState] = useState<ExecutionState>('idle')
  const [mcpStatus, setMcpStatus] = useState<MCPStatus>({
    gmail: false,
    calendar: false,
    gmailMessage: '连接 Gmail 后根可以帮你直接发送',
    calendarMessage: '连接 Google 日历后根可以帮你自动加入',
  })
  const [confirmPayload, setConfirmPayload] = useState<ConfirmPayload | null>(null)
  const [editBody, setEditBody] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetchWithAuth('/api/action/mcp')
        const data = await res.json()
        if (!cancelled && data.ok) {
          setMcpStatus({
            gmail: !!data.gmail,
            calendar: !!data.calendar,
            gmailMessage: data.gmailMessage || '',
            calendarMessage: data.calendarMessage || '',
          })
        }
      } catch {
        // keep defaults
      }
    })()
    return () => { cancelled = true }
  }, [])

  const parseActionData = (action: UserAction): Record<string, unknown> => {
    if (action.meta) return action.meta
    if (!action.value) return {}
    try {
      return JSON.parse(action.value) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  const startEmailConfirm = async (action: UserAction, idx: number) => {
    const data = parseActionData(action)
    const to = String(data.to || '')
    const subject = String(data.subject || '')
    const body = String(data.body || '')
    setEditBody(body)
    setRunningIdx(idx)
    setExecState('preparing')

    let draftId = ''
    if (mcpStatus.gmail && to) {
      try {
        const res = await fetchWithAuth('/api/action/mcp', {
          method: 'POST',
          body: JSON.stringify({ op: 'create_draft', to, subject, body }),
        })
        const json = await res.json()
        if (json.ok && json.draftId) draftId = String(json.draftId)
      } catch (e) {
        logOrAlertNetworkError(e)
      }
    }

    setConfirmPayload({
      kind: 'email',
      to,
      subject,
      body,
      draftId,
      doneLines: [],
    })
    setExecState('confirming')
    setRunningIdx(null)
  }

  const startCalendarConfirm = (action: UserAction, idx: number) => {
    const data = parseActionData(action)
    setConfirmPayload({
      kind: 'calendar',
      title: String(data.title || ''),
      date: String(data.date || ''),
      notes: String(data.notes || ''),
      doneLines: [],
    })
    setRunningIdx(idx)
    setExecState('confirming')
    setRunningIdx(null)
  }

  const confirmExecution = async () => {
    if (!confirmPayload) return
    setExecState('executing')

    if (confirmPayload.kind === 'email') {
      const to = confirmPayload.to || ''
      const subject = confirmPayload.subject || ''
      const body = editBody || confirmPayload.body || ''

      if (mcpStatus.gmail && to) {
        try {
          const res = await fetchWithAuth('/api/action/mcp', {
            method: 'POST',
            body: JSON.stringify({
              op: 'send_draft',
              draftId: confirmPayload.draftId || '',
              to,
              subject,
              body,
            }),
          })
          const json = await res.json()
          if (json.ok) {
            setConfirmPayload({
              ...confirmPayload,
              doneLines: [
                `✓ 邮件已发送${to ? `给 ${to}` : ''}`,
                '✓ 今日缺课已记录',
                '搞定了，安心照顾孩子',
              ],
            })
            setExecState('done')
            return
          }
        } catch (e) {
          logOrAlertNetworkError(e)
        }
      }

      if (to) {
        window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      }
      setConfirmPayload({
        ...confirmPayload,
        doneLines: ['已打开邮件应用，请确认发送'],
      })
      setExecState('done')
      return
    }

    if (confirmPayload.kind === 'calendar') {
      if (mcpStatus.calendar) {
        try {
          const res = await fetchWithAuth('/api/action/mcp', {
            method: 'POST',
            body: JSON.stringify({
              op: 'add_calendar',
              title: confirmPayload.title,
              date: confirmPayload.date,
              notes: confirmPayload.notes,
            }),
          })
          const json = await res.json()
          if (json.ok) {
            if (json.eventLink) window.open(json.eventLink, '_blank', 'noopener,noreferrer')
            setConfirmPayload({
              ...confirmPayload,
              doneLines: ['✓ 已加入 Google 日历', '搞定了'],
            })
            setExecState('done')
            return
          }
        } catch (e) {
          logOrAlertNetworkError(e)
        }
      }

      const title = encodeURIComponent(confirmPayload.title || '')
      const d = (confirmPayload.date || '').replace(/-/g, '')
      window.open(
        `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${d}/${d}`,
        '_blank',
        'noopener,noreferrer',
      )
      setConfirmPayload({
        ...confirmPayload,
        doneLines: ['已打开 Google 日历，请确认添加'],
      })
      setExecState('done')
    }
  }

  const handleAction = async (action: UserAction, idx: number) => {
    if (action.action === 'open_draft') {
      onOpenDraft()
      return
    }
    if (action.action === 'send_leave_email') {
      await startEmailConfirm(action, idx)
      return
    }
    if (action.action === 'add_google_calendar') {
      startCalendarConfirm(action, idx)
      return
    }
    setRunningIdx(idx)
    try {
      await executeAction(userActionToActionData(action), userId, { sourceType, sourceId })
    } catch (e) {
      logOrAlertNetworkError(e)
    } finally {
      setRunningIdx(null)
    }
  }

  const resetConfirm = () => {
    setExecState('idle')
    setConfirmPayload(null)
    setEditBody('')
  }

  if (execState !== 'idle' && confirmPayload) {
    return (
      <div style={{ padding: '10px 12px 0' }}>
        <div style={{
          fontSize: 11,
          color: THEME.muted,
          marginBottom: 10,
          lineHeight: 1.5,
        }}>
          {confirmPayload.kind === 'email' ? mcpStatus.gmailMessage : mcpStatus.calendarMessage}
        </div>

        {execState === 'preparing' && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: THEME.muted, fontSize: 13 }}>
            <div style={{ marginBottom: 8 }}><Loader size={18} /></div>
            根在准备…
          </div>
        )}

        {execState === 'confirming' && confirmPayload.kind === 'email' && (
          <div style={{
            background: 'rgba(255,255,255,0.85)',
            borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)',
            padding: '14px 16px',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text, marginBottom: 10 }}>
              根已准备好：
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4 }}>📧 请假邮件草稿</div>
            {confirmPayload.to && (
              <div style={{ fontSize: 12, color: THEME.text, marginBottom: 2 }}>
                收件人：{confirmPayload.to}
              </div>
            )}
            {confirmPayload.subject && (
              <div style={{ fontSize: 12, color: THEME.text, marginBottom: 8 }}>
                主题：{confirmPayload.subject}
              </div>
            )}
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={6}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontSize: 12,
                lineHeight: 1.6,
                borderRadius: 8,
                border: '0.5px solid rgba(0,0,0,0.1)',
                padding: '8px 10px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" className="gc-btn" style={{ flex: 1 }} onClick={() => void confirmExecution()}>
                确认发送
              </button>
              <button type="button" className="gc-btn" style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: THEME.text }} onClick={resetConfirm}>
                取消
              </button>
            </div>
          </div>
        )}

        {execState === 'confirming' && confirmPayload.kind === 'calendar' && (
          <div style={{
            background: 'rgba(255,255,255,0.85)',
            borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)',
            padding: '14px 16px',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text, marginBottom: 8 }}>
              根已准备好：
            </div>
            <div style={{ fontSize: 13, color: THEME.text, marginBottom: 4 }}>{confirmPayload.title}</div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 12 }}>{confirmPayload.date}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="gc-btn" style={{ flex: 1 }} onClick={() => void confirmExecution()}>
                确认加入日历
              </button>
              <button type="button" className="gc-btn" style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: THEME.text }} onClick={resetConfirm}>
                取消
              </button>
            </div>
          </div>
        )}

        {execState === 'executing' && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: THEME.muted, fontSize: 13 }}>
            <div style={{ marginBottom: 8 }}><Loader size={18} /></div>
            正在执行…
          </div>
        )}

        {execState === 'done' && (
          <div style={{
            background: 'rgba(141,200,160,0.12)',
            border: '0.5px solid rgba(141,200,160,0.35)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 12,
          }}>
            {(confirmPayload.doneLines || []).map((line, i) => (
              <div key={i} style={{ fontSize: 13, color: G.dark, marginBottom: i < confirmPayload.doneLines.length - 1 ? 6 : 0 }}>
                {line}
              </div>
            ))}
            <button type="button" className="gc-btn" style={{ width: '100%', marginTop: 12 }} onClick={resetConfirm}>
              完成
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '10px 12px 0' }}>
      {autoCompleted.length > 0 && (
        <div style={{
          background: 'rgba(141,200,160,0.12)',
          border: '0.5px solid rgba(141,200,160,0.35)',
          borderRadius: 12,
          padding: '12px 14px',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: G.dark, marginBottom: 8 }}>
            根已帮你完成
          </div>
          {autoCompleted.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: i < autoCompleted.length - 1 ? 6 : 0 }}>
              <span style={{ color: 'var(--accent-jade, #1D9E75)' }}>✓</span>
              <span style={{ fontSize: 14, color: 'var(--text-primary, #2C3E50)' }}>{item}</span>
            </div>
          ))}
        </div>
      )}

      {autoCompleted.length > 0 && userActions.length > 0 && (
        <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.06)', margin: '0 0 12px' }} />
      )}

      {userActions.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, lineHeight: 1.5 }}>
            {mcpStatus.gmail ? mcpStatus.gmailMessage : '连接 Gmail 后根可以帮你直接发送'}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text, marginBottom: 8 }}>
            还需要你做
          </div>
          {userActions.map((action, i) => (
            <div key={i} style={{
              background: 'var(--canvas-card, rgba(255,255,255,0.7))',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 8,
              border: '0.5px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted, #6B8BAA)', marginBottom: 4 }}>
                {USER_TIMING_LABEL[action.timing] || '稍后'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary, #537b8e)', marginBottom: 8 }}>
                {action.reason}
              </div>
              <button
                type="button"
                onClick={() => void handleAction(action, i)}
                className="gc-btn"
                disabled={runningIdx === i}
                style={{ width: '100%' }}
              >
                {runningIdx === i ? '处理中…' : action.label}
              </button>
            </div>
          ))}
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onAllDone}
        className="gc-btn"
        style={{ width: '100%', marginTop: 4, marginBottom: 4 }}
      >
        全部搞定了
      </motion.button>
    </div>
  )
}

function ActionsArea({ actions, userId, primaryIndex, primaryReason, sourceId, sourceType, onAllDone }: {
  actions: ActionData[]
  userId: string
  primaryIndex?: number
  primaryReason?: string
  sourceId: string
  sourceType?: ActionSource
  onAllDone: () => void
}) {
  const [states, setStates] = useState<{ status: ActionStatus; message?: string }[]>(
    () => (actions || []).map(() => ({ status: 'idle' as ActionStatus }))
  )
  const [allOpen, setAllOpen] = useState(false)
  const [allRunning, setAllRunning] = useState(false)
  const [allDone, setAllDone] = useState(false)

  if (!actions?.length) return null
  const idx = primaryIndex ?? 0
  const primary = actions[idx]
  const doneCount = states.filter(s => s.status === 'done').length
  const pct = Math.round((doneCount / actions.length) * 100)

  const execOne = async (action: ActionData, i: number) => {
    setStates(prev => { const n = [...prev]; n[i] = { status: 'running' }; return n })
    try {
      const result = await executeAction(action, userId, { sourceType, sourceId })
      if (result.draftOnly) {
        toast(result.message || '已生成草稿，需手动执行', 'info')
        setStates(prev => { const n = [...prev]; n[i] = { status: 'idle' }; return n })
        return
      }
      if (result.skipped) {
        setStates(prev => { const n = [...prev]; n[i] = { status: 'idle' }; return n })
        return
      }
      setStates(prev => { const n = [...prev]; n[i] = { status: 'done', message: result.message }; return n })
    } catch {
      setStates(prev => { const n = [...prev]; n[i] = { status: 'error', message: '执行失败' }; return n })
    }
  }

  const execAll = async () => {
    setAllRunning(true)
    for (let i = 0; i < actions.length; i++) {
      if (states[i]?.status === 'done') continue
      await execOne(actions[i], i)
      await new Promise(r => setTimeout(r, 600))
    }
    setAllRunning(false); setAllDone(true)
    onAllDone()
  }

  const renderBtn = (action: ActionData, i: number, fullWidth = false) => {
    const st = states[i] || { status: 'idle' }
    const col = ACTION_COLOR[action.type] || { bg: 'rgba(0,0,0,0.05)', icon: THEME.text }
    const label = SHORT_LABEL[action.type] || action.label?.slice(0, 4) || action.type
    const isDone = st.status === 'done'
    const isRunning = st.status === 'running'
    const isError = st.status === 'error'

    return (
      <motion.button key={i} whileTap={{ scale: isRunning ? 1 : fullWidth ? 0.97 : 0.88 }}
        onClick={() => !isRunning && !isDone && execOne(action, i)}
        style={{ display: 'flex', flexDirection: fullWidth ? 'row' : 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: fullWidth ? 8 : 4, padding: fullWidth ? '11px 16px' : '10px 6px',
          borderRadius: 10,
          border: isDone ? `0.5px solid ${G.mid}` : isError ? '0.5px solid rgba(220,38,38,0.4)' : fullWidth ? 'none' : '0.5px solid rgba(0,0,0,0.07)',
          background: isDone ? G.bg : isError ? 'rgba(220,38,38,0.06)' : fullWidth ? G.dark : 'rgba(255,255,255,0.7)',
          cursor: isRunning || isDone ? 'default' : 'pointer',
          gridColumn: fullWidth ? 'span 3' : undefined,
          transition: 'all 0.2s', width: fullWidth ? '100%' : undefined }}>
        <div style={{ width: fullWidth ? 26 : 28, height: fullWidth ? 26 : 28, borderRadius: 7, flexShrink: 0,
          background: isDone ? G.bg : isError ? 'rgba(220,38,38,0.1)' : fullWidth ? 'rgba(255,255,255,0.15)' : col.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isRunning
            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Loader size={14} color={fullWidth ? '#fff' : THEME.muted} />
              </motion.div>
            : isDone ? <CheckCircle2 size={14} color={G.deep} />
            : isError ? <span style={{ fontSize: 13, color: '#DC2626' }}>!</span>
            : <span style={{ color: fullWidth ? '#fff' : col.icon, display: 'flex' }}>
                {ACTION_ICON[action.type] || <ExternalLink size={15} />}
              </span>
          }
        </div>
        <div style={{ textAlign: fullWidth ? 'left' : 'center', flex: fullWidth ? 1 : undefined }}>
          <div style={{ fontSize: fullWidth ? 13 : 11, fontWeight: 500,
            color: isDone ? G.dark : isError ? '#DC2626' : fullWidth ? '#fff' : THEME.text }}>
            {isDone ? (st.message || '已完成') : isError ? '失败' : fullWidth ? action.label : label}
          </div>
          {fullWidth && primaryReason && !isDone && !isError && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, lineHeight: 1.4 }}>
              {primaryReason}
            </div>
          )}
        </div>
      </motion.button>
    )
  }

  return (
    <div style={{ padding: '0 12px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: THEME.muted, letterSpacing: '0.05em', marginBottom: 6 }}>
        执行动作
      </div>
      {renderBtn(primary, idx, true)}

      {(allRunning || allDone) && (
        <div style={{ margin: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: THEME.muted, marginBottom: 4 }}>
            <span>{allRunning ? '逐项执行中…' : '全部完成 🎉'}</span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }}
              style={{ height: '100%', background: allDone ? G.deep : THEME.gold, borderRadius: 2 }} />
          </div>
        </div>
      )}

      <motion.div whileTap={{ scale: 0.97 }} onClick={() => setAllOpen(p => !p)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px', marginTop: 6, borderRadius: 8,
          border: '0.5px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
        <span style={{ fontSize: 12, color: allDone ? G.dark : THEME.muted, fontWeight: allDone ? 500 : 400 }}>
          {allDone ? '全部执行完成 ✓' : allOpen ? '收起' : `全部 ${actions.length} 个动作`}
        </span>
        <motion.div animate={{ rotate: allOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={13} color={THEME.muted} />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {allOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 5, marginTop: 6 }}>
              {actions.map((a, i) => renderBtn(a, i, false))}
            </div>
            {!allDone && (
              <motion.button whileTap={{ scale: 0.97 }} onClick={execAll} disabled={allRunning}
                style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, border: 'none',
                  background: allRunning ? 'rgba(0,0,0,0.06)' : THEME.navy,
                  color: allRunning ? THEME.muted : '#fff',
                  fontSize: 13, fontWeight: 500, cursor: allRunning ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {allRunning ? <><Loader size={14} /> 执行中…</> : <><Zap size={14} /> 全部执行</>}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AdviceOnlyPanel({
  summary,
  learnMoreUrl,
}: {
  summary: string
  learnMoreUrl?: string
}) {
  const href = learnMoreUrl || undefined
  return (
    <div style={{ padding: '16px 14px 8px' }}>
      <p style={{ fontSize: 14, color: THEME.text, lineHeight: 1.7, margin: '0 0 14px', whiteSpace: 'pre-wrap' }}>
        {summary}
      </p>
      {href && (
        <motion.a
          whileTap={{ scale: 0.95 }}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 16px',
            borderRadius: 20,
            background: G.bg,
            border: `0.5px solid ${G.border}`,
            color: G.dark,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={14} /> 了解更多
        </motion.a>
      )}
    </div>
  )
}

// ══ 主组件 ══
const LOADING_STEPS = [
  '根正在理解这件事...',
  '根正在搜索本地信息...',
  '根正在准备方案...',
  '马上就好...',
]
const LOADING_ICONS = ['🔍', '📍', '✍️', '✨']

export default function ActionModal({
  source_type, source_id, title, category, urgency_level,
  due_date, event_data, child_name, ai_action_data,
  hotspot_summary, hotspot_action_data,
  hotspot_action_available, hotspot_linked_todo_id, hotspot_source_url,
  userId,
  onClose, onDone, onSnooze, onSync, onBrainAction,
}: ActionModalProps) {
  const router = useRouter()
  const { sessionReady } = useApp()
  const [pack, setPack] = useState<ExecutionPack | null>(null)
  const [decision, setDecision] = useState<RootDecision | null>(null)
  const [brainAutoCompleted, setBrainAutoCompleted] = useState<string[]>([])
  const [autoCompleted, setAutoCompleted] = useState<string[]>([])
  const [userActions, setUserActions] = useState<UserAction[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey | null>(null)

  const syncAutoExecuteState = (nextPack: ExecutionPack | null, apiAuto?: string[], apiUser?: UserAction[]) => {
    const completed = apiAuto?.length ? apiAuto : (nextPack?.autoCompleted || [])
    const actions = apiUser?.length ? apiUser : (nextPack?.userActions || [])
    setAutoCompleted(completed)
    setUserActions(actions)
  }

  const useAutoLayout = source_type === 'todo'
    && !decision
    && (autoCompleted.length > 0 || userActions.length > 0)

  const useRootBrain = source_type === 'todo' && !!decision

  const brainData = isBrainHotspotData(hotspot_action_data) ? hotspot_action_data : null
  const isBrainMode = source_type === 'hotspot' && !!brainData

  const showFullOneKey = isBrainMode || source_type === 'schedule' || (
    source_type === 'todo'
      ? shouldShowTodoFullOneKey({ due_date, urgency_level, category, ai_action_data })
      : source_type === 'hotspot'
        ? shouldShowHotspotOneKey({
          action_available: hotspot_action_available,
          source: brainData?.source,
          linked_todo_id: hotspot_linked_todo_id,
          category,
          action_data: hotspot_action_data as Record<string, unknown> | undefined,
        })
        : true
  )

  const adviceSummary = hotspot_summary
    || (source_type === 'todo'
      ? '这条待办暂时没有明确截止行动，可以先查看详情再决定怎么处理。'
      : title)
  const learnMoreUrl = source_type === 'hotspot'
    ? (hotspot_source_url || resolveHotspotLink({
      source_url: hotspot_source_url,
      action_data: hotspot_action_data as { url?: string } | undefined,
    }) || hotspotSearchUrl(title))
    : undefined

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0)
      return
    }
    const timer = window.setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1))
    }, 3000)
    return () => window.clearInterval(timer)
  }, [loading])

  useEffect(() => {
    if (!source_id) return
    setActiveTab(null)

    if (isBrainMode) {
      setPack(null)
      setDecision(null)
      setAutoCompleted([])
      setUserActions([])
      setBrainAutoCompleted([])
      setLoading(false)
      return
    }

    if (!showFullOneKey) {
      setPack(null)
      setDecision(null)
      setAutoCompleted([])
      setUserActions([])
      setBrainAutoCompleted([])
      setLoading(false)
      return
    }

    const cachedDecision = source_type === 'todo' ? getFreshRootDecision(ai_action_data) : null
    if (cachedDecision) {
      setDecision(cachedDecision)
      setPack(null)
      setBrainAutoCompleted([])
      setLoading(false)
    } else {
      setDecision(null)
    }

    const cachedPack = source_type === 'todo' && !cachedDecision ? getFreshExecutionPack(ai_action_data) : null
    if (cachedPack) {
      setPack(cachedPack)
      syncAutoExecuteState(cachedPack)
      setLoading(false)
    }

    if (!cachedPack && !cachedDecision) {
      setPack(null)
      setAutoCompleted([])
      setUserActions([])
    }

    if (!sessionReady) {
      if (!cachedPack && !cachedDecision) setLoading(true)
      return
    }

    if (!cachedPack && !cachedDecision) setLoading(true)

    let cancelled = false
    void (async () => {
      const headers = await getJsonAuthHeaders()
      if (!headers.Authorization) {
        if (!cancelled) {
          toast('登录已过期，请重新登录', 'info')
          window.location.href = '/auth'
          setLoading(false)
        }
        return
      }
      try {
        const res = await fetchWithAuth('/api/action/execute', {
          method: 'POST',
          body: JSON.stringify({
            source_type,
            source_id,
            event_data,
            child_name,
          }),
        })
        const data = await res.json()
        if (cancelled) return
        if (handleLimitReached(data, () => router.push('/upgrade'))) return
        if (data.ok && data.decision) {
          setDecision(data.decision as RootDecision)
          setBrainAutoCompleted(data.autoCompleted || [])
          setPack(null)
          onSync?.()
        } else if (data.ok && data.execution_pack) {
          setPack(data.execution_pack)
          setDecision(null)
          syncAutoExecuteState(data.execution_pack, data.autoCompleted, data.userActions)
          onSync?.()
        }
      } catch (e) {
        if (!cancelled) logOrAlertNetworkError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [source_id, source_type, sessionReady, ai_action_data, event_data, child_name, onSync, router, isBrainMode, showFullOneKey])

  const brainUrgencyLevel: 1 | 2 | 3 =
    brainData?.urgency === 'high' ? 3
    : brainData?.urgency === 'medium' ? 2
    : 1
  const displayUrgencyLevel = isBrainMode ? brainUrgencyLevel : urgency_level

  const savePack = async (newPack: ExecutionPack) => {
    setPack(newPack)
    setSaving(true)
    try {
      const res = await fetchWithAuth('/api/action/update-pack', {
        method: 'POST',
        body: JSON.stringify({ source_type, source_id, execution_pack: newPack }),
      })
      if (!res.ok) throw new Error('save failed')
    } catch (e) {
      if (!logOrAlertNetworkError(e)) toast('保存失败，请重试', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleChecklist = (i: number) => {
    if (saving || !pack) return
    const newChecklist = pack.checklist?.map((c, idx) =>
      idx === i ? { ...c, status: c.status === 'done' ? 'missing' : 'done' } : c
    )
    savePack({ ...pack, checklist: newChecklist })
  }

  const toggleCarry = (i: number) => {
    if (saving || !pack) return
    const newCarry = (pack.carry_items || []).map((item: any, idx: number) => {
      if (typeof item === 'string') {
        return idx === i ? { label: item, checked: true } : item
      }
      return idx === i ? { ...item, checked: !item.checked } : item
    })
    savePack({ ...pack, carry_items: newCarry })
  }

  const urgencyGradient =
    displayUrgencyLevel === 3 ? 'linear-gradient(90deg,#d58074,#e6a89e)'
    : displayUrgencyLevel === 2 ? 'linear-gradient(90deg,#b88e5e,#f2e2cd)'
    : 'linear-gradient(90deg,#537b8e,#cddce5)'

  const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
    { key: 'checklist', icon: <ClipboardList size={15} />, label: '材料' },
    { key: 'carry',     icon: <ShoppingCart size={15} />,  label: '携带' },
    { key: 'draft',     icon: <FileText size={15} />,      label: '草稿' },
  ]

  const hasTab = (key: TabKey) => {
    if (!pack) return false
    if (key === 'checklist') return (pack.checklist?.length || 0) > 0
    if (key === 'carry') return (pack.carry_items?.length || 0) > 0
    if (key === 'draft') return !!pack.draft
    return false
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 300,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 0 max(calc(env(safe-area-inset-bottom) + 80px), 90px)',
          background: 'rgba(180,200,210,0.35)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}>
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 430, margin: '0 10px',
            background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(40px)',
            borderRadius: 22, overflow: 'hidden',
            maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}>

          <div style={{ height: 4, background: urgencyGradient, flexShrink: 0 }} />
          <div style={{ width: 32, height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, margin: '10px auto 0' }} />

          {/* 标题 */}
          <div style={{ padding: '10px 14px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ color: G.dark, display: 'flex' }}>{dimensionIcon(category)}</span>
                  <span style={{ fontSize: 10, color: THEME.gold, fontWeight: 600, letterSpacing: '0.12em' }}>
                    {source_type === 'schedule' && child_name ? `${child_name} · ` : ''}
                    {isBrainMode ? '关联分析' : (category || source_type)}
                    {due_date ? ` · ${new Date(due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}` : ''}
                  </span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: THEME.text, margin: '3px 0 0', lineHeight: 1.3 }}>
                  {title}
                </h2>
              </div>
              <motion.div whileTap={{ scale: 0.86 }} onClick={onClose}
                style={{ cursor: 'pointer', padding: 4, marginLeft: 8 }}>
                <X size={18} color={THEME.muted} />
              </motion.div>
            </div>
          </div>

          {/* 滚动区 */}
          <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' as any }}>

            {isBrainMode && brainData && (
              <BrainInsightPanel
                brain={brainData}
                summary={hotspot_summary}
                onBrainAction={onBrainAction}
              />
            )}

            {!isBrainMode && !showFullOneKey && (
              <AdviceOnlyPanel summary={adviceSummary} learnMoreUrl={learnMoreUrl} />
            )}

            {/* 加载中 */}
            {!isBrainMode && showFullOneKey && loading && !pack && !decision && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>
                  {LOADING_ICONS[loadingStep]}
                </div>
                <div style={{
                  fontSize: 15,
                  color: 'var(--text-primary, #2d322f)',
                  fontFamily: 'var(--font-body, inherit)',
                }}>
                  {!sessionReady ? '正在恢复会话…' : LOADING_STEPS[loadingStep]}
                </div>
                <div style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: 'var(--text-muted, rgba(45,50,47,0.45))',
                }}>
                  通常需要10-20秒
                </div>
              </div>
            )}

            {/* 根大脑决策（Claude 驱动） */}
            {!isBrainMode && showFullOneKey && useRootBrain && decision && (
              <RootDecisionPanel
                decision={decision}
                userId={userId}
                autoCompleted={brainAutoCompleted}
                onAllDone={() => onDone(source_id)}
                onClose={onClose}
              />
            )}

            {/* AI 摘要 */}
            {!isBrainMode && showFullOneKey && !useRootBrain && pack && !useAutoLayout && <AiSummaryCard pack={pack} />}

            {/* 根自动完成 + 用户必做（旧版兼容） */}
            {!isBrainMode && showFullOneKey && !useRootBrain && pack && useAutoLayout && (
              <AutoExecutePanel
                autoCompleted={autoCompleted}
                userActions={userActions}
                userId={userId}
                sourceType={source_type}
                sourceId={source_id}
                onOpenDraft={() => setActiveTab('draft')}
                onAllDone={() => onDone(source_id)}
              />
            )}

            {/* 标签页 */}
            {!isBrainMode && showFullOneKey && !useRootBrain && pack && !useAutoLayout && (
              <div style={{ display: 'flex', gap: 5, padding: '10px 12px 0' }}>
                {tabs.filter(t => hasTab(t.key)).map(tab => {
                  const isOpen = activeTab === tab.key
                  return (
                    <motion.button key={tab.key} whileTap={{ scale: 0.88 }}
                      disabled={saving}
                      onClick={() => !saving && setActiveTab(prev => prev === tab.key ? null : tab.key)}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 3, padding: '7px 4px', borderRadius: 9,
                        border: `0.5px solid ${isOpen ? G.mid : 'rgba(0,0,0,0.07)'}`,
                        background: isOpen ? G.bg : 'rgba(255,255,255,0.7)', cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.55 : 1,
                        transition: 'all 0.15s' }}>
                      <span style={{ color: isOpen ? G.dark : THEME.muted, display: 'flex' }}>{tab.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: isOpen ? 500 : 400,
                        color: isOpen ? G.darkest : THEME.muted }}>{tab.label}</span>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
                        <ChevronDown size={10} color={isOpen ? G.dark : THEME.muted} />
                      </motion.div>
                    </motion.button>
                  )
                })}
              </div>
            )}

            <AnimatePresence>
              {pack && activeTab && (
                <motion.div key={activeTab}
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden', margin: '6px 12px 0', borderRadius: 10,
                    border: `0.5px solid ${G.border}`, background: 'rgba(255,255,255,0.7)' }}>
                  <TabContent tabKey={activeTab} pack={pack} saving={saving} onToggleChecklist={toggleChecklist} onToggleCarry={toggleCarry} />
                </motion.div>
              )}
            </AnimatePresence>

            {useAutoLayout && pack?.draft && activeTab === 'draft' && (
              <div style={{ margin: '6px 12px 0', padding: '12px 14px', borderRadius: 10,
                border: `0.5px solid ${G.border}`, background: 'rgba(255,255,255,0.7)',
                fontSize: 13, color: THEME.text, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {pack.draft}
              </div>
            )}

            {showFullOneKey && pack && !useRootBrain && !useAutoLayout && (
              <>
                <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.06)', margin: '10px 12px 0' }} />
                <ActionsArea
                  actions={pack.actions || []}
                  userId={userId}
                  primaryIndex={pack.primary_action_index}
                  primaryReason={pack.primary_action_reason}
                  sourceId={source_id}
                  sourceType={source_type}
                  onAllDone={() => onDone(source_id)}
                />
              </>
            )}

            {!isBrainMode && showFullOneKey && !pack && !decision && !loading && (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: THEME.muted }}>暂时无法加载执行包</div>
              </div>
            )}
          </div>

          {/* 底部 */}
          <div style={{ flexShrink: 0, borderTop: '0.5px solid rgba(0,0,0,0.06)',
            padding: '10px 12px 16px', display: 'flex', gap: 8 }}>
            {!useAutoLayout && !useRootBrain && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => onDone(source_id)} disabled={saving}
                style={{ flex: 1, padding: '11px', borderRadius: 12,
                  background: 'rgba(141,200,160,0.35)', border: '0.5px solid rgba(141,200,160,0.5)',
                  fontSize: 13, fontWeight: 600, color: THEME.text, cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.55 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <CheckCircle2 size={14} /> 已处理
              </motion.button>
            )}
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => onSnooze(source_id)} disabled={saving}
              style={{ flex: 1, padding: '11px', borderRadius: 12,
                background: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(0,0,0,0.08)',
                fontSize: 13, color: THEME.muted, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.55 : 1 }}>
              明天再说
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
