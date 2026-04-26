'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Navigation, CreditCard, Calendar } from 'lucide-react'
import VoiceBtn, { speak } from '@/app/components/VoiceBtn'
import PackCheckItem from '@/app/components/PackCheckItem'
import ActionBtn, { ActionData } from '@/app/components/ActionBtn'
import BottomActions from '@/app/components/BottomActions'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const THEME = { text: '#2C3E50', gold: '#B08D57', muted: '#6B8BAA', navy: '#1A3C5E' }
const G = { bg: '#E1F5EE', border: '#9FE1CB', mid: '#5DCAA5', deep: '#1D9E75', dark: '#0F6E56', darkest: '#085041' }

const eventTypeEmoji: Record<string, string> = {
  activity: '🎯', exam: '📝', holiday: '🎉',
  meeting: '👨‍👩‍👧', class: '📚', trip: '🚌', other: '📌',
}

export type ChildEvent = {
  id: string
  child_id: string
  event_type?: string
  title: string
  date_start: string
  description?: string
  requires_action?: string
  requires_items?: string[]
  requires_payment?: number
  source?: string
}

type Props = {
  event: ChildEvent | null
  childName: string
  userId: string
  onClose: () => void
  onDone?: () => void
}

function getTodayKey() { return new Date().toISOString().split('T')[0] }

export default function ChildActionSheet({ event, childName, userId, onClose, onDone }: Props) {
  const [done, setDone] = useState(false)

  if (!event) return null

  const today = getTodayKey()
  const storageKey = `packing_${event.child_id}_${today}`
  const items: string[] = Array.isArray(event.requires_items) ? event.requires_items : []

  // 构建语音摘要
  const voiceText = [
    `${childName} ${event.title}`,
    event.date_start === today ? '今天' : `${event.date_start}`,
    event.description,
    items.length ? `需要带：${items.join('、')}` : '',
    event.requires_payment ? `需缴费 ${event.requires_payment} 泰铢` : '',
    event.requires_action ? `注意：${event.requires_action}` : '',
  ].filter(Boolean).join('。')

  // 自动生成可执行的 actions
  const actions: ActionData[] = []

  if (event.requires_payment) {
    actions.push({
      type: 'pay',
      label: `缴费 ฿${event.requires_payment}`,
      data: { note: `${event.title} 缴费 ฿${event.requires_payment}`, channel: '请联系学校' },
    })
  }

  actions.push({
    type: 'calendar',
    label: '加入日历',
    data: {
      calendar_title: `${childName} ${event.title}`,
      calendar_date: event.date_start,
      calendar_time: '08:00',
      calendar_location: '',
    },
  })

  if (event.requires_action) {
    actions.push({
      type: 'open_url',
      label: '查看详情',
      data: { url: `https://www.google.com/search?q=${encodeURIComponent(event.title)}` },
    })
  }

  const handleDone = async () => {
    setDone(true)
    onDone?.()
    onClose()
  }

  const handleSnooze = () => {
    onClose()
  }

  const urgencyColor = event.requires_payment
    ? 'linear-gradient(90deg,#F0A500,#F0C040)'
    : event.requires_action
    ? 'linear-gradient(90deg,#FF6B6B,#FF8E53)'
    : 'linear-gradient(90deg,#A7D7D9,#D9A7B4)'

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 350,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(180,200,210,0.35)', backdropFilter: 'blur(6px)',
          padding: '0 0 max(calc(env(safe-area-inset-bottom) + 80px), 90px)',
        }}
        onClick={onClose}>
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 430, margin: '0 10px',
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(40px)',
            borderRadius: 22, overflow: 'hidden',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          }}>

          {/* 顶部色条 */}
          <div style={{ height: 4, background: urgencyColor, flexShrink: 0 }} />
          <div style={{ width: 32, height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, margin: '10px auto 0' }} />

          {/* 标题栏 */}
          <div style={{ padding: '10px 14px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>{eventTypeEmoji[event.event_type || ''] || '📌'}</span>
                  <span style={{ fontSize: 10, color: THEME.gold, fontWeight: 600, letterSpacing: '0.1em' }}>
                    {childName} · {event.date_start === today ? '今天' : event.date_start}
                  </span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: THEME.text, margin: 0, lineHeight: 1.3 }}>
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

            {/* 描述 */}
            {event.description && (
              <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.65, marginBottom: 14 }}>
                {event.description}
              </div>
            )}

            {/* 注意事项 */}
            {event.requires_action && (
              <div style={{
                padding: '10px 12px', borderRadius: 10, marginBottom: 14,
                background: 'rgba(255,100,100,0.07)', border: '0.5px solid rgba(255,100,100,0.2)',
                borderLeft: '3px solid #FF6B6B',
                fontSize: 12, color: THEME.text, lineHeight: 1.6,
              }}>
                ⚠ {event.requires_action}
              </div>
            )}

            {/* 缴费 */}
            {event.requires_payment && (
              <div style={{
                padding: '10px 12px', borderRadius: 10, marginBottom: 14,
                background: 'rgba(176,141,87,0.08)', border: '0.5px solid rgba(176,141,87,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CreditCard size={16} color={THEME.gold} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>需缴费</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: THEME.gold }}>฿{event.requires_payment}</div>
                  </div>
                </div>
                <ActionBtn
                  action={{
                    type: 'pay',
                    label: `缴费 ฿${event.requires_payment}`,
                    data: { note: `${event.title} 缴费`, channel: '请联系学校' },
                  }}
                  userId={userId}
                  fullWidth={false}
                />
              </div>
            )}

            {/* 携带物品 */}
            {items.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: THEME.navy }}>🎒 需要带的</div>
                  <VoiceBtn text={`需要带：${items.join('、')}`} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {items.map((item, i) => (
                    <PackCheckItem
                      key={i}
                      item={item}
                      storageKey={storageKey}
                      itemKey={`${event.id}-${item}`}
                      size="md"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 执行动作 */}
            {actions.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: THEME.navy, marginBottom: 8 }}>一键执行</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {actions.map((action, i) => (
                    <ActionBtn
                      key={i}
                      action={action}
                      userId={userId}
                      fullWidth
                      isPrimary={i === 0}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* 底部按钮 */}
          <BottomActions
            onDone={handleDone}
            onSnooze={handleSnooze}
            doneLabel="知道了"
            snoozeLabel="稍后提醒"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
