'use client'
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, RefreshCw, ChevronDown, AlertTriangle, Plus } from 'lucide-react'
import { THEME, URGENCY_CFG } from '@/app/_shared/_constants/theme'
import { FLOAT_SHEET_BOTTOM } from '@/app/_shared/_constants/layout'
import { CAT_EMOJI } from '@/app/_shared/_constants/categories'
import { useHotspotEngine } from '@/app/_shared/_hooks/useHotspotEngine'
import { isConsumed } from '@/app/_shared/_engine/hotspot'
import { convertHotspotToTodoAndMarkRead } from '@/app/_shared/_services/todoService'
import { useApp } from '@/app/context/AppContext'
import type { HotspotItem, BrainHotspotActionData } from '@/app/_shared/_types'
import ActionModal from '@/app/components/ActionModal'
import HotspotPreferences from '@/app/_shared/_components/HotspotPreferences'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { track } from '@/lib/analytics/track'
import { resolveHotspotLink, hotspotSearchUrl } from '@/lib/hotspot/url'

const HOTSPOT_GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.8)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 20px rgba(45,50,47,0.05)',
}

const RIAN_GOLD = '#8a7355'
const RIAN_NAVY = '#2d322f'

function getHotspotColor(title: string) {
  if (title.includes('签证') || title.includes('移民') || title.includes('政策'))
    return { bg: 'rgba(164,99,85,0.1)', border: 'rgba(164,99,85,0.3)', color: '#a46355' }
  if (title.includes('健康') || title.includes('疾病') || title.includes('预警'))
    return { bg: 'rgba(200,80,80,0.08)', border: 'rgba(200,80,80,0.25)', color: '#c85050' }
  if (title.includes('教育') || title.includes('学校') || title.includes('升学'))
    return { bg: 'rgba(92,122,94,0.08)', border: 'rgba(92,122,94,0.25)', color: '#5c7a5e' }
  if (title.includes('安全') || title.includes('治安'))
    return { bg: 'rgba(180,100,50,0.08)', border: 'rgba(180,100,50,0.25)', color: '#b46432' }
  return { bg: 'rgba(45,50,47,0.04)', border: 'rgba(45,50,47,0.12)', color: 'rgba(45,50,47,0.6)' }
}

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
  const titleStr = item.title || ''
  const tagMatch = titleStr.match(/【(.+?)】/)
  const tag = tagMatch?.[1]
  const colors = getHotspotColor(titleStr)
  const displayTitle = titleStr.replace(/【.+?】/, '').trim() || titleStr
  const consumed = isConsumed(item.status)
  const isUrgent = item.urgency === 'urgent'
  const isImportant = item.urgency === 'important'
  const showActionButton = (isUrgent || isImportant) && item.action_available
  const sourceLink = resolveHotspotLink(item)
  const externalHref = sourceLink || hotspotSearchUrl(displayTitle || titleStr)
  const externalLabel = sourceLink ? '打开来源' : '搜索更多'

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    void track({
      event_type: 'hotspot_clicked',
      page: '/rian',
      meta: {
        hotspot_id: item.id,
        category: item.category,
        urgency: item.urgency,
      },
    })
    setExpanded(p => !p)
    if (!consumed) onRead()
  }

  const handleConvert = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setConverting(true)
    setConvertError(false)
    try {
      await onConvertTodo()
    } catch (e) {
      if (!logOrAlertNetworkError(e)) setConvertError(true)
    } finally {
      setConverting(false)
    }
  }

  return (
    <motion.div layout
      style={{
        ...HOTSPOT_GLASS,
        marginBottom: 10,
        overflow: 'hidden',
        border: consumed ? '1px solid rgba(255,255,255,0.5)' : `1px solid ${colors.border}`,
        opacity: consumed ? 0.6 : 1,
        transition: 'opacity 0.3s',
      }}>

      <div onClick={handleExpand} style={{ padding: '12px 14px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{CAT_EMOJI[item.category] || CAT_EMOJI.default}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {tag && (
                <span style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 8,
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  color: colors.color,
                  fontFamily: 'sans-serif',
                  marginBottom: 6,
                  display: 'inline-block',
                }}>
                  {tag}
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6,
                  background: `${cfg.color}18`, color: cfg.color, fontWeight: 600, flexShrink: 0 }}>
                  {cfg.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: THEME.text, lineHeight: 1.3,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  minWidth: 0,
                  flex: 1,
                }}>
                  {displayTitle}
                </span>
              </div>
              {item.relevance_reason && (
                <div style={{ fontSize: 12, color: RIAN_GOLD, fontWeight: 500,
                  background: 'rgba(164,99,85,0.08)', padding: '3px 8px',
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
              {item.action && (
                <div style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  background: 'rgba(92,122,94,0.06)',
                  borderRadius: 10,
                  border: '1px solid rgba(92,122,94,0.15)',
                  fontSize: 12,
                  color: '#5c7a5e',
                  fontFamily: 'sans-serif',
                  lineHeight: 1.6,
                }}>
                  ✓ {item.action}
                </div>
              )}
              {convertError && (
                <p style={{ fontSize: 11, color: '#7d3f37', marginBottom: 8 }}>添加失败，请重试</p>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {showActionButton && (
                  <motion.button whileTap={{ scale: 0.92 }}
                    onClick={e => { e.stopPropagation(); onActionModal() }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5,
                      padding: '8px 14px', borderRadius: 20, border: 'none',
                      background: isUrgent ? '#d58074' : '#b88e5e',
                      color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ⚡ 一键处理
                  </motion.button>
                )}
                <motion.button whileTap={{ scale: 0.92 }}
                  onClick={handleConvert} disabled={converting}
                  style={{ display: 'flex', alignItems: 'center', gap: 5,
                    padding: '8px 14px', borderRadius: 20,
                    border: `0.5px solid ${RIAN_GOLD}`,
                    background: 'rgba(164,99,85,0.08)',
                    color: RIAN_GOLD, fontSize: 12, fontWeight: 500,
                    cursor: converting ? 'default' : 'pointer',
                    opacity: converting ? 0.6 : 1 }}>
                  {converting ? '添加中…' : <><Plus size={12} /> 加入待办</>}
                </motion.button>
                <motion.a
                  whileTap={{ scale: 0.92 }}
                  href={externalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => {
                    e.stopPropagation()
                    if (!consumed) onRead()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: `0.5px solid ${cfg.border}`,
                    background: 'rgba(255,255,255,0.7)',
                    color: cfg.color,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={12} /> {externalLabel}
                </motion.a>
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
  onBrainAction?: (action: string, value?: string) => void
}

export default function HotspotSheet({ hotspots, onClose, onPatrol, patrolling, onRead, userId, onSync, onBrainAction }: Props) {
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotItem | null>(null)
  const [showPrefs, setShowPrefs] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const { sorted, urgentCount, unreadCount } = useHotspotEngine(hotspots)
  const displayHotspots = unreadOnly
    ? sorted.filter(h => h.status !== 'read' && h.status !== 'dismissed')
    : sorted
  const { speak, stop } = useApp()
  const spokenRef = useRef<string | null>(null)

  // 有紧急内容时自动朗读一次
  useEffect(() => {
    if (urgentCount > 0) {
      const urgent = sorted.find(h => h.urgency === 'urgent')
      if (urgent && spokenRef.current !== urgent.id) {
        spokenRef.current = urgent.id
        stop()
        speak(`紧急提醒：${urgent.title}`)
      }
    }
  }, [urgentCount, speak, stop, sorted])

  const handleConvertTodo = useCallback(
    async (item: HotspotItem) => {
      await convertHotspotToTodoAndMarkRead(item.id, onRead, onSync)
    },
    [onRead, onSync],
  )

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 0 16px',
          paddingBottom: `max(${FLOAT_SHEET_BOTTOM}, max(env(safe-area-inset-bottom), 20px))`,
          background: 'rgba(180,200,210,0.35)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}>
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 430, margin: '0 10px',
            background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(40px)',
            borderRadius: '24px 24px 0 0', overflow: 'hidden',
            maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}>

          <div style={{ height: 4, flexShrink: 0,
            background: urgentCount > 0
              ? 'linear-gradient(90deg,#d58074,#e6a89e)'
              : 'linear-gradient(90deg,#537b8e,#cddce5)' }} />
          <div style={{ width: 32, height: 4, background: 'rgba(0,0,0,0.1)',
            borderRadius: 2, margin: '10px auto 0' }} />

          <div style={{ padding: '10px 14px 0', flexShrink: 0,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: THEME.text }}>热点</span>
              <motion.div whileTap={{ scale: 0.88 }} onClick={() => setShowPrefs(true)}
                style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8,
                  background: 'rgba(164,99,85,0.1)', color: RIAN_GOLD,
                  cursor: 'pointer', fontWeight: 500 }}>
                设置关注
              </motion.div>
              {unreadCount > 0 && (
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10,
                  background: urgentCount > 0 ? '#fff2f0' : '#f0f5f6',
                  color: urgentCount > 0 ? '#7d3f37' : '#2b3942', fontWeight: 600 }}>
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
              background: '#fff2f0', border: '0.5px solid #fad6d1',
              display: 'flex', alignItems: 'center', gap: 7 }}>
              <AlertTriangle size={14} color="#7d3f37" />
              <span style={{ fontSize: 12, color: '#7d3f37', fontWeight: 500 }}>
                有 {urgentCount} 条紧急信息需要关注
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 14px 8px' }}>
            <button
              type="button"
              onClick={() => setUnreadOnly(v => !v)}
              style={{
                fontSize: 12,
                color: unreadOnly ? '#a46355' : 'rgba(45,50,47,0.4)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'sans-serif',
              }}
            >
              {unreadOnly ? '✓ 仅未读' : '全部'}
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1,
            WebkitOverflowScrolling: 'touch' as any, padding: '10px 14px 0' }}>
            {displayHotspots.length === 0 ? (
              <div style={{ textAlign: 'center', opacity: 0.35, padding: '40px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🌸</div>
                <div style={{ fontSize: 13, color: THEME.text }}>
                  {unreadOnly ? '暂无未读热点' : '今天暂无热点提示'}
                </div>
              </div>
            ) : displayHotspots.map(item => (
              <HotspotCard key={item.id} item={item}
                onRead={() => onRead(item.id)}
                onActionModal={() => setSelectedHotspot(item)}
                onConvertTodo={() => handleConvertTodo(item)}
              />
            ))}
          </div>

          <div style={{ flexShrink: 0, borderTop: '0.5px solid rgba(0,0,0,0.06)',
            padding: '10px 14px 14px', paddingBottom: 'max(14px, max(env(safe-area-inset-bottom), 20px))',
            display: 'flex', justifyContent: 'flex-end' }}>
            <motion.button whileTap={{ scale: 0.93 }} onClick={onPatrol}
              style={{ display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 20,
                border: '0.5px solid rgba(164,99,85,0.3)',
                background: 'rgba(164,99,85,0.08)',
                fontSize: 12, color: RIAN_GOLD, fontWeight: 500, cursor: 'pointer' }}>
              <motion.div animate={patrolling ? { rotate: 360 } : { rotate: 0 }}
                transition={patrolling ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}>
                <RefreshCw size={13} color={RIAN_GOLD} />
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
            urgency_level={
              (selectedHotspot.action_data as { urgency?: string } | undefined)?.urgency === 'high' ? 3
              : (selectedHotspot.action_data as { urgency?: string } | undefined)?.urgency === 'medium' ? 2
              : selectedHotspot.urgency === 'urgent' ? 3
              : selectedHotspot.urgency === 'important' ? 2
              : 1
            }
            hotspot_summary={selectedHotspot.summary}
            hotspot_action_data={selectedHotspot.action_data as BrainHotspotActionData | undefined}
            userId={userId}
            onClose={() => setSelectedHotspot(null)}
            onDone={() => { onRead(selectedHotspot.id); setSelectedHotspot(null) }}
            onSnooze={() => setSelectedHotspot(null)}
            onSync={onSync}
            onBrainAction={(action, value) => {
              setSelectedHotspot(null)
              onBrainAction?.(action, value)
            }}
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
