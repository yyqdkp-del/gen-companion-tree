'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, RefreshCw, ChevronDown, AlertTriangle, Plus } from 'lucide-react'
import { THEME, URGENCY_CFG } from '@/app/_shared/_constants/theme'
import { FLOAT_SHEET_BOTTOM } from '@/app/_shared/_constants/layout'
import { CAT_EMOJI } from '@/app/_shared/_constants/categories'
import { useHotspotSheet, isConsumed } from '@/app/_shared/_hooks/useHotspotSheet'
import type { HotspotItem } from '@/app/_shared/_types'
import ActionModal from '@/app/components/ActionModal'
import HotspotPreferences from '@/app/_shared/_components/HotspotPreferences'

function timeAgo(dateStr: string): string {
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime())
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}小时前`
  return `${Math.floor(hrs / 24)}天前`
}

function HotspotCard({ item, onRead, onActionModal, onConvertTodo }: {
  item: HotspotItem
  onRead: () => void
  onActionModal: () => void
  onConvertTodo: () => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState(false)
  const cfg = URGENCY_CFG[item.urgency]
  const consumed = isConsumed(item.status)
  const isUrgent = item.urgency === 'urgent'
  const isImportant = item.urgency === 'important'
  const showActionButton = (isUrgent || isImportant) && item.action_available

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(p => !p)
    if (!consumed) onRead()
  }

  const handleConvert = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setConverting(true)
    setConvertError(false)
    try {
      await onConvertTodo()
    } catch {
      setConvertError(true)
    } finally {
      setConverting(false)
    }
  }

  return (
    <motion.div layout
      style={{ borderRadius: 12, marginBottom: 10, overflow: 'hidden',
        border: `0.5px solid ${cfg.border}40`,
        background: consumed ? 'rgba(255,255,255,0.4)' : cfg.bg,
        opacity: consumed ? 0.6 : 1, transition: 'opacity 0.3s' }}>

      <div onClick={handleExpand} style={{ padding: '12px 14px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{CAT_EMOJI[item.category] || CAT_EMOJI.default}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6,
                  background: `${cfg.color}18`, color: cfg.color, fontWeight: 600, flexShrink: 0 }}>
                  {cfg.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: THEME.text, lineHeight: 1.3 }}>
                  {item.title}
                </span>
              </div>
              {item.relevance_reason && (
                <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 500,
                  background: 'rgba(176,141,87,0.08)', padding: '3px 8px',
                  borderRadius: 6, display: 'inline-block', marginBottom: 4 }}>
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

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 14px 14px', borderTop: `0.5px solid ${cfg.border}30` }}>
              <p style={{ fontSize: 13, color: THEME.text, lineHeight: 1.7,
                margin: '10px 0 12px', whiteSpace: 'pre-wrap' }}>
                {item.summary}
              </p>
              {convertError && (
                <p style={{ fontSize: 11, color: '#CC3333', marginBottom: 8 }}>添加失败，请重试</p>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {showActionButton && (
                  <motion.button whileTap={{ scale: 0.92 }}
                    onClick={e => { e.stopPropagation(); onActionModal() }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5,
                      padding: '8px 14px', borderRadius: 20, border: 'none',
                      background: isUrgent ? '#FF6B6B' : '#FF8C00',
                      color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ⚡ 一键处理
                  </motion.button>
                )}
                <motion.button whileTap={{ scale: 0.92 }}
                  onClick={handleConvert} disabled={converting}
                  style={{ display: 'flex', alignItems: 'center', gap: 5,
                    padding: '8px 14px', borderRadius: 20,
                    border: `0.5px solid ${THEME.gold}`,
                    background: 'rgba(176,141,87,0.08)',
                    color: THEME.gold, fontSize: 12, fontWeight: 500,
                    cursor: converting ? 'default' : 'pointer',
                    opacity: converting ? 0.6 : 1 }}>
                  {converting ? '添加中…' : <><Plus size={12} /> 加入待办</>}
                </motion.button>
                {!item.action_available && item.action_data?.url && (
                  <motion.button whileTap={{ scale: 0.92 }}
                    onClick={e => { e.stopPropagation(); window.open(item.action_data?.url, '_blank'); onRead() }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5,
                      padding: '8px 14px', borderRadius: 20,
                      border: `0.5px solid ${cfg.border}`,
                      background: 'rgba(255,255,255,0.7)',
                      color: cfg.color, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                    <ExternalLink size={12} /> 查看详情
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

type Props = {
  hotspots: HotspotItem[]
  onClose: () => void
  onPatrol: () => void
  patrolling: boolean
  onRead: (id: string) => void
  userId: string
  onSync?: () => void
}

export default function HotspotSheet({ hotspots, onClose, onPatrol, patrolling, onRead, userId, onSync }: Props) {
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotItem | null>(null)
  const [showPrefs, setShowPrefs] = useState(false)
  const { sorted, urgentCount, unreadCount, handleConvertTodo } =
    useHotspotSheet(hotspots, userId, onRead, onSync)

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 0 16px',
          paddingBottom: FLOAT_SHEET_BOTTOM,
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

          <div style={{ height: 4, flexShrink: 0,
            background: urgentCount > 0
              ? 'linear-gradient(90deg,#FF6B6B,#FF8E53)'
              : 'linear-gradient(90deg,#4A9EFF,#7BC4FF)' }} />
          <div style={{ width: 32, height: 4, background: 'rgba(0,0,0,0.1)',
            borderRadius: 2, margin: '10px auto 0' }} />

          <div style={{ padding: '10px 14px 0', flexShrink: 0,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: THEME.text }}>热点</span>
              <motion.div whileTap={{ scale: 0.88 }} onClick={() => setShowPrefs(true)}
                style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8,
                  background: 'rgba(176,141,87,0.1)', color: THEME.gold,
                  cursor: 'pointer', fontWeight: 500 }}>
                设置关注
              </motion.div>
              {unreadCount > 0 && (
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10,
                  background: urgentCount > 0 ? 'rgba(255,100,100,0.12)' : 'rgba(154,183,232,0.15)',
                  color: urgentCount > 0 ? '#CC3333' : THEME.navy, fontWeight: 600 }}>
                  {unreadCount} 条未读
                </span>
              )}
            </div>
            <motion.div whileTap={{ scale: 0.86 }} onClick={onClose} style={{ cursor: 'pointer', padding: 4 }}>
              <X size={18} color={THEME.muted} />
            </motion.div>
          </div>

          {urgentCount > 0 && (
            <div style={{ margin: '10px 14px 0', padding: '9px 12px', borderRadius: 10,
              background: 'rgba(255,100,100,0.09)', border: '0.5px solid rgba(255,100,100,0.25)',
              display: 'flex', alignItems: 'center', gap: 7 }}>
              <AlertTriangle size={14} color="#CC3333" />
              <span style={{ fontSize: 12, color: '#CC3333', fontWeight: 500 }}>
                有 {urgentCount} 条紧急信息需要关注
              </span>
            </div>
          )}

          <div style={{ overflowY: 'auto', flex: 1,
            WebkitOverflowScrolling: 'touch' as any, padding: '10px 14px 0' }}>
            {sorted.length === 0 ? (
              <div style={{ textAlign: 'center', opacity: 0.35, padding: '40px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🌸</div>
                <div style={{ fontSize: 13, color: THEME.text }}>今天暂无热点提示</div>
              </div>
            ) : sorted.map(item => (
              <HotspotCard key={item.id} item={item}
                onRead={() => onRead(item.id)}
                onActionModal={() => setSelectedHotspot(item)}
                onConvertTodo={() => handleConvertTodo(item)}
              />
            ))}
          </div>

          <div style={{ flexShrink: 0, borderTop: '0.5px solid rgba(0,0,0,0.06)',
            padding: '10px 14px 14px', display: 'flex', justifyContent: 'flex-end' }}>
            <motion.button whileTap={{ scale: 0.93 }} onClick={onPatrol}
              style={{ display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 20,
                border: '0.5px solid rgba(176,141,87,0.3)',
                background: 'rgba(176,141,87,0.08)',
                fontSize: 12, color: THEME.gold, fontWeight: 500, cursor: 'pointer' }}>
              <motion.div animate={patrolling ? { rotate: 360 } : { rotate: 0 }}
                transition={patrolling ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}>
                <RefreshCw size={13} color={THEME.gold} />
              </motion.div>
              {patrolling ? '刷新中…' : '刷新热点'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {selectedHotspot && (
          <ActionModal
            source_type="hotspot"
            source_id={selectedHotspot.id}
            title={selectedHotspot.title}
            category={selectedHotspot.category}
            urgency_level={selectedHotspot.urgency === 'urgent' ? 3 : selectedHotspot.urgency === 'important' ? 2 : 1}
            userId={userId}
            onClose={() => setSelectedHotspot(null)}
            onDone={() => { onRead(selectedHotspot.id); setSelectedHotspot(null) }}
            onSnooze={() => setSelectedHotspot(null)}
            onSync={onSync}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPrefs && (
          <HotspotPreferences
            userId={userId}
            onClose={() => setShowPrefs(false)}
            onSave={() => { onSync?.(); setShowPrefs(false) }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
