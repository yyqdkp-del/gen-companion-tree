'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Navigation, Phone, ExternalLink, RefreshCw,
  ChevronDown, AlertTriangle,
} from 'lucide-react'

const THEME = {
  text: '#2C3E50',
  gold: '#B08D57',
  muted: '#6B8BAA',
  navy: '#1A3C5E',
}

type HotspotItem = {
  id: string
  title: string
  summary: string
  urgency: 'urgent' | 'important' | 'lifestyle'
  category: string
  relevance_reason?: string
  action_available: boolean
  action_type?: string
  action_data?: {
    destination?: string
    phone?: string
    url?: string
    action_label?: string
    actions?: {
      type: string
      label: string
      url?: string
      destination?: string
      phone?: string
    }[]
  }
  status: string
  created_at: string
}

type Props = {
  hotspots: HotspotItem[]
  onClose: () => void
  onPatrol: () => void
  patrolling: boolean
  onRead: (id: string) => void
}

const URGENCY_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  urgent:    { label: '紧急', color: '#CC3333', bg: 'rgba(255,100,100,0.08)', border: '#FF6B6B' },
  important: { label: '重要', color: '#E07B2A', bg: 'rgba(255,160,60,0.08)', border: '#FF8C00' },
  lifestyle: { label: '生活', color: '#3B82F6', bg: 'rgba(154,183,232,0.08)', border: '#60A5FA' },
}

const CAT_EMOJI: Record<string, string> = {
  safety: '🚨', education: '📚', visa: '📋',
  finance: '💰', health: '🏥', shopping: '🛍',
  mom: '💆', weather: '🌤', default: '📌',
}

const ACTION_ICON: Record<string, React.ReactNode> = {
  navigate: <Navigation size={13} />,
  call:     <Phone size={13} />,
  open_url: <ExternalLink size={13} />,
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}分钟前`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}小时前`
  return `${Math.floor(hrs / 24)}天前`
}

// ── 单条热点 ──
function HotspotCard({ item, onRead }: { item: HotspotItem; onRead: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [actionDone, setActionDone] = useState<Record<number, boolean>>({})
  const cfg = URGENCY_CFG[item.urgency] || URGENCY_CFG.lifestyle
  const isRead = item.status === 'read' || item.status === 'dismissed'

  // 标准化 actions：支持旧版单个 action_type 和新版 actions[]
  const actions = item.action_data?.actions || (
    item.action_available && item.action_type ? [{
      type: item.action_type,
      label: item.action_data?.action_label || '查看详情',
      url: item.action_data?.url,
      destination: item.action_data?.destination,
      phone: item.action_data?.phone,
    }] : []
  )

  const execAction = (action: any, idx: number) => {
    switch (action.type) {
      case 'navigate': {
        const url = action.url || (action.destination
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(action.destination)}`
          : null)
        if (url) window.open(url, '_blank')
        break
      }
      case 'call':
        if (action.phone) window.location.href = `tel:${action.phone}`
        break
      case 'open_url':
        if (action.url) window.open(action.url, '_blank')
        break
      default:
        if (action.url) window.open(action.url, '_blank')
    }
    setActionDone(prev => ({ ...prev, [idx]: true }))
    onRead()
  }

  const handleExpand = () => {
    setExpanded(p => !p)
    if (!isRead) onRead()
  }

  return (
    <motion.div
      layout
      style={{
        borderRadius: 12, marginBottom: 10, overflow: 'hidden',
        border: `0.5px solid ${cfg.border}40`,
        background: isRead ? 'rgba(255,255,255,0.4)' : cfg.bg,
        opacity: isRead ? 0.6 : 1,
        transition: 'opacity 0.3s',
      }}
    >
      {/* 条目头部 */}
      <div
        onClick={handleExpand}
        style={{ padding: '12px 14px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{CAT_EMOJI[item.category] || CAT_EMOJI.default}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 6,
                  background: `${cfg.color}18`, color: cfg.color, fontWeight: 600, flexShrink: 0,
                }}>{cfg.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: THEME.text, lineHeight: 1.3 }}>{item.title}</span>
              </div>
              {/* relevance_reason 突出显示 */}
              {item.relevance_reason && (
                <div style={{
                  fontSize: 12, color: THEME.gold, fontWeight: 500,
                  background: 'rgba(176,141,87,0.08)', padding: '3px 8px',
                  borderRadius: 6, display: 'inline-block', marginBottom: 4,
                }}>
                  和你有关：{item.relevance_reason}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: THEME.muted }}>{timeAgo(item.created_at)}</span>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.18 }}>
              <ChevronDown size={14} color={THEME.muted} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* 展开内容 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px', borderTop: `0.5px solid ${cfg.border}30` }}>
              {/* 摘要 */}
              <p style={{
                fontSize: 13, color: THEME.text, lineHeight: 1.7,
                margin: '10px 0 0', whiteSpace: 'pre-wrap',
              }}>{item.summary}</p>

              {/* 执行动作 */}
              {actions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {actions.map((action, idx) => (
                    <motion.button
                      key={idx}
                      whileTap={{ scale: 0.90 }}
                      onClick={() => execAction(action, idx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '7px 13px', borderRadius: 20,
                        border: `0.5px solid ${actionDone[idx] ? '#1D9E75' : cfg.border}`,
                        background: actionDone[idx] ? '#E1F5EE' : 'rgba(255,255,255,0.7)',
                        color: actionDone[idx] ? '#085041' : cfg.color,
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {actionDone[idx]
                        ? <span style={{ fontSize: 11 }}>✓</span>
                        : ACTION_ICON[action.type] || <ExternalLink size={13} />
                      }
                      {actionDone[idx] ? '已完成' : action.label}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── 主组件 ──
export default function HotspotSheet({ hotspots, onClose, onPatrol, patrolling, onRead }: Props) {
  const sorted = [...hotspots].sort((a, b) => {
    const order: Record<string, number> = { urgent: 0, important: 1, lifestyle: 2 }
    return (order[a.urgency] ?? 2) - (order[b.urgency] ?? 2)
  })

  const urgentCount = hotspots.filter(h => h.urgency === 'urgent').length
  const unreadCount = hotspots.filter(h => h.status !== 'read' && h.status !== 'dismissed').length

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: `0 0 max(calc(env(safe-area-inset-bottom) + 80px), 90px)`,
        background: 'rgba(180,200,210,0.35)', backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 430,
          background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(40px)',
          borderRadius: 22, overflow: 'hidden',
          maxHeight: '82vh', display: 'flex', flexDirection: 'column',
          margin: '0 10px',
        }}
      >
        {/* 顶部色条 */}
        <div style={{
          height: 4, flexShrink: 0,
          background: urgentCount > 0
            ? 'linear-gradient(90deg,#FF6B6B,#FF8E53)'
            : 'linear-gradient(90deg,#4A9EFF,#7BC4FF)',
        }} />
        <div style={{ width: 32, height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, margin: '10px auto 0' }} />

        {/* 标题栏 */}
        <div style={{ padding: '10px 14px 0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: THEME.text }}>热点</span>
            {unreadCount > 0 && (
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 10,
                background: urgentCount > 0 ? 'rgba(255,100,100,0.12)' : 'rgba(154,183,232,0.15)',
                color: urgentCount > 0 ? '#CC3333' : THEME.navy,
                fontWeight: 600,
              }}>{unreadCount} 条未读</span>
            )}
          </div>
          <motion.div whileTap={{ scale: 0.86 }} onClick={onClose} style={{ cursor: 'pointer', padding: 4 }}>
            <X size={18} color={THEME.muted} />
          </motion.div>
        </div>

        {/* 紧急横幅 */}
        {urgentCount > 0 && (
          <div style={{
            margin: '10px 14px 0', padding: '9px 12px', borderRadius: 10,
            background: 'rgba(255,100,100,0.09)', border: '0.5px solid rgba(255,100,100,0.25)',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <AlertTriangle size={14} color="#CC3333" />
            <span style={{ fontSize: 12, color: '#CC3333', fontWeight: 500 }}>
              有 {urgentCount} 条紧急信息需要关注
            </span>
          </div>
        )}

        {/* 列表 */}
        <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' as any, padding: '10px 14px 0' }}>
          {sorted.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.35, padding: '40px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🌸</div>
              <div style={{ fontSize: 13, color: THEME.text }}>今天暂无热点提示</div>
            </div>
          ) : sorted.map(item => (
            <HotspotCard
              key={item.id}
              item={item}
              onRead={() => onRead(item.id)}
            />
          ))}
        </div>

        {/* 底部刷新 */}
        <div style={{
          flexShrink: 0, borderTop: '0.5px solid rgba(0,0,0,0.06)',
          padding: '10px 14px 14px', display: 'flex', justifyContent: 'flex-end',
        }}>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={onPatrol}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 20,
              border: '0.5px solid rgba(176,141,87,0.3)',
              background: 'rgba(176,141,87,0.08)',
              fontSize: 12, color: THEME.gold, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <motion.div
              animate={patrolling ? { rotate: 360 } : { rotate: 0 }}
              transition={patrolling ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
            >
              <RefreshCw size={13} color={THEME.gold} />
            </motion.div>
            {patrolling ? '刷新中…' : '刷新热点'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
