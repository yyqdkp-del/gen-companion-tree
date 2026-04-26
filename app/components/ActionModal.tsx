'use client'
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, CheckCircle2, Navigation, Phone, Mail, Calendar,
  Download, ExternalLink, CreditCard, ShoppingBag,
  Loader, ClipboardList, ShoppingCart, FileText,
  Volume2, ChevronDown, Zap,
} from 'lucide-react'

const THEME = { text: '#2C3E50', gold: '#B08D57', muted: '#6B8BAA', navy: '#1A3C5E' }
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
  // 用户
  userId: string
  // 回调
  onClose: () => void
  onDone: (id: string) => void
  onSnooze: (id: string) => void
  onSync?: () => void
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

type ActionData = {
  type: string
  label: string
  data?: Record<string, any>
}

type ActionStatus = 'idle' | 'running' | 'done' | 'error'
type TabKey = 'checklist' | 'carry' | 'draft'

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
function CheckItem({ item, note }: { item: string; note?: string }) {
  const [done, setDone] = useState(false)
  return (
    <div onClick={() => setDone(p => !p)}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 0',
        borderBottom: '0.5px solid rgba(0,0,0,0.05)', cursor: 'pointer' }}>
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
function CarryTag({ label }: { label: string }) {
  const [done, setDone] = useState(false)
  return (
    <motion.div whileTap={{ scale: 0.86 }} onClick={() => setDone(p => !p)}
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
function TabContent({ tabKey, pack }: { tabKey: TabKey; pack: ExecutionPack }) {
  const [copied, setCopied] = useState(false)
  const checklistText = pack.checklist?.map(c => c.item + (c.note ? `（${c.note}）` : '')).join('、') || ''
  const carryText = pack.carry_items?.join('、') || ''
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
        {pack.checklist.map((c, i) => <CheckItem key={i} item={c.item} note={c.note} />)}
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
          {pack.carry_items.map((item, i) => <CarryTag key={i} label={item} />)}
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
      <motion.button whileTap={{ scale: 0.95 }} onClick={copyDraft}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          width: '100%', padding: '9px', borderRadius: 9, border: 'none',
          background: copied ? G.mid : G.bg, color: copied ? '#fff' : G.darkest,
          fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>
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

async function executeAction(action: ActionData, userId: string): Promise<string> {
  const data = action.data || {}
  switch (action.type) {
    case 'navigate': {
      const url = data.url || (data.destination
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.destination)}`
        : null)
      if (url) window.open(url, '_blank')
      return '已打开导航'
    }
    case 'call':
      if (data.phone) window.location.href = `tel:${data.phone.replace(/\s/g, '')}`
      return `拨打 ${data.phone}`
    case 'email':
      window.open(`mailto:${data.email_to}?subject=${encodeURIComponent(data.email_subject || '')}&body=${encodeURIComponent(data.email_body || '')}`)
      fetch('/api/action/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perform_action: action, user_id: userId }) }).catch(() => {})
      return '已打开邮件'
    case 'whatsapp':
      window.open(`https://wa.me/${(data.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(data.message || '')}`, '_blank')
      return '已打开 WhatsApp'
    case 'calendar': {
      const title = encodeURIComponent(data.calendar_title || '')
      const date = (data.calendar_date || '').replace(/-/g, '')
      const time = (data.calendar_time || '09:00').replace(':', '')
      const loc = encodeURIComponent(data.calendar_location || '')
      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}T${time}00/${date}T${time}00&location=${loc}`, '_blank')
      fetch('/api/action/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perform_action: action, user_id: userId }) }).catch(() => {})
      return '已加入日历'
    }
    case 'download_pdf': {
      // 有预填数据，调 perform API 生成 PDF
      if (data.prefilled_fields && data.form_type) {
        try {
          const res = await fetch('/api/action/perform', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action_type: 'fill_pdf', form_type: data.form_type,
              prefilled_fields: data.prefilled_fields, user_id: userId }),
          })
          if (res.ok) {
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `${data.form_type}.pdf`; a.click()
            URL.revokeObjectURL(url)
            return '已下载预填表格'
          }
        } catch {}
      }
      // 降级：直接打开官方链接
      const pdfUrl = data.download_url || data.official_url || data.url
      if (pdfUrl) window.open(pdfUrl, '_blank')
      return '已打开表格页面'
    }
    case 'open_url':
      if (data.url) window.open(data.url, '_blank')
      return '已打开'
    case 'pay':
      if (data.url) window.open(data.url, '_blank')
      else alert(data.note || data.channel || '请按提示方式缴费')
      return '已查看缴费方式'
    case 'buy': {
      const ch = data.channel === 'shopee'
        ? 'https://shopee.co.th/search?keyword='
        : 'https://www.lazada.co.th/catalog/?q='
      window.open(ch + encodeURIComponent(data.item || ''), '_blank')
      return '已打开购物'
    }
    default: return '已完成'
  }
}

function ActionsArea({ actions, userId, primaryIndex, primaryReason, sourceId, onAllDone }: {
  actions: ActionData[]
  userId: string
  primaryIndex?: number
  primaryReason?: string
  sourceId: string
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
      const msg = await executeAction(action, userId)
      setStates(prev => { const n = [...prev]; n[i] = { status: 'done', message: msg }; return n })
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

// ══ 主组件 ══
export default function ActionModal({
  source_type, source_id, title, category, urgency_level,
  due_date, event_data, child_name, userId,
  onClose, onDone, onSnooze, onSync,
}: ActionModalProps) {
  const [pack, setPack] = useState<ExecutionPack | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey | null>(null)

  useEffect(() => {
    if (!source_id) return
    setActiveTab(null)
    setPack(null)
    setLoading(true)

    fetch('/api/action/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_type,
        source_id,
        user_id: userId,
        event_data,
        child_name,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.execution_pack) {
          setPack(data.execution_pack)
          onSync?.()
        }
      })
      .catch(e => console.error('ActionModal error:', e))
      .finally(() => setLoading(false))
  }, [source_id])

  const urgencyGradient =
    urgency_level === 3 ? 'linear-gradient(90deg,#FF6B6B,#FF8E53)'
    : urgency_level === 2 ? 'linear-gradient(90deg,#F0A500,#F0C040)'
    : 'linear-gradient(90deg,#A7D7D9,#D9A7B4)'

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
                <span style={{ fontSize: 10, color: THEME.gold, fontWeight: 600, letterSpacing: '0.12em' }}>
                  {source_type === 'schedule' && child_name ? `${child_name} · ` : ''}
                  {category || source_type}
                  {due_date ? ` · ${new Date(due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}` : ''}
                </span>
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

            {/* 加载中 */}
            {loading && !pack && (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0,1,2].map(i => (
                    <motion.div key={i} animate={{ opacity: [0.3,1,0.3], y: [0,-4,0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      style={{ width: 7, height: 7, borderRadius: '50%', background: THEME.gold }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: THEME.muted }}>根正在为你准备…</span>
              </div>
            )}

            {/* AI 摘要 */}
            {pack && <AiSummaryCard pack={pack} />}

            {/* 标签页 */}
            {pack && (
              <div style={{ display: 'flex', gap: 5, padding: '10px 12px 0' }}>
                {tabs.filter(t => hasTab(t.key)).map(tab => {
                  const isOpen = activeTab === tab.key
                  return (
                    <motion.button key={tab.key} whileTap={{ scale: 0.88 }}
                      onClick={() => setActiveTab(prev => prev === tab.key ? null : tab.key)}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 3, padding: '7px 4px', borderRadius: 9,
                        border: `0.5px solid ${isOpen ? G.mid : 'rgba(0,0,0,0.07)'}`,
                        background: isOpen ? G.bg : 'rgba(255,255,255,0.7)', cursor: 'pointer',
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
                  <TabContent tabKey={activeTab} pack={pack} />
                </motion.div>
              )}
            </AnimatePresence>

            {pack && (
              <>
                <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.06)', margin: '10px 12px 0' }} />
                <ActionsArea
                  actions={pack.actions || []}
                  userId={userId}
                  primaryIndex={pack.primary_action_index}
                  primaryReason={pack.primary_action_reason}
                  sourceId={source_id}
                  onAllDone={() => onDone(source_id)}
                />
              </>
            )}

            {!pack && !loading && (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: THEME.muted }}>暂时无法加载执行包</div>
              </div>
            )}
          </div>

          {/* 底部 */}
          <div style={{ flexShrink: 0, borderTop: '0.5px solid rgba(0,0,0,0.06)',
            padding: '10px 12px 16px', display: 'flex', gap: 8 }}>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => onDone(source_id)}
              style={{ flex: 1, padding: '11px', borderRadius: 12,
                background: 'rgba(141,200,160,0.35)', border: '0.5px solid rgba(141,200,160,0.5)',
                fontSize: 13, fontWeight: 600, color: THEME.text, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <CheckCircle2 size={14} /> 已处理
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => onSnooze(source_id)}
              style={{ flex: 1, padding: '11px', borderRadius: 12,
                background: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(0,0,0,0.08)',
                fontSize: 13, color: THEME.muted, cursor: 'pointer' }}>
              明天再说
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
