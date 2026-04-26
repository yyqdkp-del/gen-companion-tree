'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader, ChevronDown, CheckCircle2 } from 'lucide-react'
import VoiceBtn, { speak } from '@/app/components/VoiceBtn'
import PackCheckItem from '@/app/components/PackCheckItem'
import ActionBtn, { ActionData } from '@/app/components/ActionBtn'
import BottomActions from '@/app/components/BottomActions'

const THEME = { text: '#2C3E50', gold: '#B08D57', muted: '#6B8BAA', navy: '#1A3C5E' }
const G = { bg: '#E1F5EE', border: '#9FE1CB', mid: '#5DCAA5', deep: '#1D9E75', dark: '#0F6E56', darkest: '#085041' }

const eventTypeEmoji: Record<string, string> = {
  activity: '🎯', exam: '📝', holiday: '🎉', meeting: '👨‍👩‍👧',
  class: '📚', trip: '🚌', medical: '🏥', extracurricular: '🎨', other: '📌',
}

export type ChildEvent = {
  id: string; child_id: string; event_type?: string; title: string
  date_start: string; description?: string; requires_action?: string
  requires_items?: string[]; requires_payment?: number; source?: string
  ai_action_data?: { execution_pack?: any; prepared_at?: string }
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
}

type Props = {
  event: ChildEvent | null
  childName: string
  userId: string
  onClose: () => void
  onDone?: () => void
}

function getTodayKey() { return new Date().toISOString().split('T')[0] }

// ── 材料清单 ──
function ChecklistSection({ checklist }: { checklist: { item: string; status: string; note?: string }[] }) {
  return (
    <div>
      {checklist.map((c, i) => {
        const [done, setDone] = useState(false)
        return (
          <div key={i} onClick={() => setDone(p => !p)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 0',
              borderBottom: i < checklist.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer' }}>
            <motion.div whileTap={{ scale: 0.8 }} style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              border: done ? 'none' : `1.5px solid ${THEME.muted}`,
              background: done ? G.deep : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
              {done && <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <polyline points="1,4.5 3.5,7 8,2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>}
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: done ? THEME.muted : THEME.text,
                textDecoration: done ? 'line-through' : 'none' }}>{c.item}</div>
              {c.note && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{c.note}</div>}
            </div>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, flexShrink: 0,
              background: c.status === 'ready' ? G.bg : c.status === 'missing' ? 'rgba(220,38,38,0.08)' : 'rgba(0,0,0,0.04)',
              color: c.status === 'ready' ? G.dark : c.status === 'missing' ? '#DC2626' : THEME.muted }}>
              {c.status === 'ready' ? '已有' : c.status === 'missing' ? '需备' : '可选'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── 折叠 tab ──
function CollapseTab({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 8, borderRadius: 10, border: `0.5px solid ${G.border}`, overflow: 'hidden' }}>
      <motion.div whileTap={{ scale: 0.98 }} onClick={() => setOpen(p => !p)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', background: open ? G.bg : 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: open ? G.darkest : THEME.text }}>{title}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={13} color={open ? G.dark : THEME.muted} />
        </motion.div>
      </motion.div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.9)' }}>
            <div style={{ padding: '10px 12px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ChildActionSheet({ event, childName, userId, onClose, onDone }: Props) {
  const [pack, setPack] = useState<ExecutionPack | null>(null)
  const [loading, setLoading] = useState(false)

  const today = getTodayKey()
  const storageKey = `packing_${event?.child_id}_${today}`
  const items: string[] = Array.isArray(event?.requires_items) ? event.requires_items : []

  useEffect(() => {
    if (!event) return

    // 有缓存直接用
    if (event.ai_action_data?.execution_pack && event.ai_action_data?.prepared_at) {
      const ageHours = (Date.now() - new Date(event.ai_action_data.prepared_at).getTime()) / 3600000
      if (ageHours < 6) {
        setPack(event.ai_action_data.execution_pack)
        return
      }
    }

    // 调 AI 生成
    setLoading(true)
    fetch('/api/todo/smart-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule_event: event, child_name: childName, user_id: userId }),
    })
      .then(r => r.json())
      .then(data => { if (data.ok && data.execution_pack) setPack(data.execution_pack) })
      .catch(e => console.error('ChildActionSheet AI error:', e))
      .finally(() => setLoading(false))
  }, [event?.id])

  if (!event) return null

  const urgencyColor = event.requires_payment
    ? 'linear-gradient(90deg,#F0A500,#F0C040)'
    : event.requires_action
    ? 'linear-gradient(90deg,#FF6B6B,#FF8E53)'
    : 'linear-gradient(90deg,#A7D7D9,#D9A7B4)'

  const voiceText = [
    `${childName} ${event.title}`,
    event.date_start === today ? '今天' : event.date_start,
    pack?.summary || event.description,
    items.length ? `需要带：${items.join('、')}` : '',
    event.requires_payment ? `需缴费 ${event.requires_payment} 泰铢` : '',
  ].filter(Boolean).join('。')

  const allCarryItems = [...new Set([
    ...items,
    ...(pack?.carry_items || []),
  ])]

  const primaryAction = pack?.actions?.[pack?.primary_action_index ?? 0]
  const otherActions = pack?.actions?.filter((_, i) => i !== (pack?.primary_action_index ?? 0)) || []

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 350,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(180,200,210,0.35)', backdropFilter: 'blur(6px)',
          padding: '0 0 max(calc(env(safe-area-inset-bottom) + 80px), 90px)' }}
        onClick={onClose}>
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 430, margin: '0 10px',
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(40px)',
            borderRadius: 22, overflow: 'hidden',
            maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}>

          <div style={{ height: 4, background: urgencyColor, flexShrink: 0 }} />
          <div style={{ width: 32, height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, margin: '10px auto 0' }} />

          {/* 标题 */}
          <div style={{ padding: '10px 14px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>{eventTypeEmoji[event.event_type || ''] || '📌'}</span>
                  <span style={{ fontSize: 10, color: THEME.gold, fontWeight: 600, letterSpacing: '0.1em' }}>
                    {childName} · {event.date_start === today ? '今天' : event.date_start}
                  </span>
                </div>
                <h2 style={{ fontSize: 17, fontWeight: 600, color: THEME.text, margin: 0, lineHeight: 1.3 }}>
                  {event.title}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                <VoiceBtn text={voiceText} />
                <motion.div whileTap={{ scale: 0.86 }} onClick={onClose} style={{ cursor: 'pointer', padding: 4 }}>
                  <X size={18} color={THEME.muted} />
                </motion.div>
              </div>
            </div>
          </div>

          {/* 滚动内容 */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '12px 14px', WebkitOverflowScrolling: 'touch' as any }}>

            {/* AI 加载中 */}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 0' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0,1,2].map(i => (
                    <motion.div key={i}
                      animate={{ opacity: [0.3,1,0.3], y: [0,-4,0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      style={{ width: 7, height: 7, borderRadius: '50%', background: THEME.gold }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: THEME.muted }}>根正在帮你准备...</span>
              </div>
            )}

            {/* AI 摘要 */}
            {pack?.summary && (
              <div style={{ padding: '10px 12px', borderRadius: 12, marginBottom: 12,
                background: G.bg, border: `0.5px solid ${G.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: G.deep }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: G.darkest }}>帮你查了</span>
                  </div>
                  <VoiceBtn text={pack.summary} />
                </div>
                <p style={{ fontSize: 12, color: G.darkest, lineHeight: 1.65, margin: 0 }}>{pack.summary}</p>
                {(pack.depart_suggestion || pack.cost_estimate) && (
                  <div style={{ display: 'flex', gap: 14, marginTop: 8, paddingTop: 8, borderTop: `0.5px solid ${G.border}` }}>
                    {pack.depart_suggestion && (
                      <span style={{ fontSize: 11, color: G.dark }}>🕐 {pack.depart_suggestion}</span>
                    )}
                    {pack.cost_estimate && (
                      <span style={{ fontSize: 11, color: G.dark }}>💰 {pack.cost_estimate}</span>
                    )}
                  </div>
                )}
                {pack.risk_warnings && pack.risk_warnings.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `0.5px solid ${G.border}` }}>
                    {pack.risk_warnings.map((w, i) => (
                      <div key={i} style={{ fontSize: 11, color: G.darkest, lineHeight: 1.6 }}>· {w}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 注意事项 */}
            {event.requires_action && (
              <div style={{ padding: '9px 12px', borderRadius: 10, marginBottom: 12,
                background: 'rgba(255,100,100,0.07)', border: '0.5px solid rgba(255,100,100,0.2)',
                borderLeft: '3px solid #FF6B6B', fontSize: 12, color: THEME.text, lineHeight: 1.6 }}>
                ⚠ {event.requires_action}
              </div>
            )}

            {/* 主要执行动作 */}
            {primaryAction && (
              <div style={{ marginBottom: 12 }}>
                {pack?.primary_action_reason && (
                  <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 6 }}>
                    {pack.primary_action_reason}
                  </div>
                )}
                <ActionBtn action={primaryAction} userId={userId} fullWidth isPrimary />
              </div>
            )}

            {/* 携带物品 */}
            {allCarryItems.length > 0 && (
              <CollapseTab title={`🎒 需要带的（${allCarryItems.length}件）`} defaultOpen={true}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allCarryItems.map((item, i) => (
                    <PackCheckItem key={i} item={item} storageKey={storageKey}
                      itemKey={`action-${event.id}-${item}`} size="md" />
                  ))}
                </div>
              </CollapseTab>
            )}

            {/* 材料清单 */}
            {pack?.checklist && pack.checklist.length > 0 && (
              <CollapseTab title={`📋 材料清单（${pack.checklist.length}项）`} defaultOpen={false}>
                <ChecklistSection checklist={pack.checklist} />
              </CollapseTab>
            )}

            {/* 其他执行动作 */}
            {otherActions.length > 0 && (
              <CollapseTab title="更多操作" defaultOpen={false}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6 }}>
                  {otherActions.map((action, i) => (
                    <ActionBtn key={i} action={action} userId={userId} />
                  ))}
                </div>
              </CollapseTab>
            )}

            {/* 草稿 */}
            {pack?.draft && (
              <CollapseTab title="✉️ 草稿" defaultOpen={false}>
                <p style={{ fontSize: 12, color: THEME.text, lineHeight: 1.75, margin: '0 0 10px',
                  fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{pack.draft}</p>
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    navigator.clipboard.writeText(pack.draft || '').catch(() => {})
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none',
                    background: G.bg, color: G.darkest, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  复制草稿
                </motion.button>
              </CollapseTab>
            )}

            {/* 无 AI 数据时显示基础缴费 */}
            {!pack && !loading && event.requires_payment && (
              <div style={{ padding: '10px 12px', borderRadius: 10, marginBottom: 12,
                background: 'rgba(176,141,87,0.08)', border: '0.5px solid rgba(176,141,87,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>需缴费</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: THEME.gold }}>฿{event.requires_payment}</div>
                </div>
                <ActionBtn action={{ type: 'pay', label: `缴费 ฿${event.requires_payment}`,
                  data: { note: `${event.title} 缴费`, channel: '请联系学校' } }}
                  userId={userId} />
              </div>
            )}

          </div>

          {/* 底部 */}
          <BottomActions onDone={() => { onDone?.(); onClose() }}
            onSnooze={onClose} doneLabel="知道了" snoozeLabel="稍后提醒" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
