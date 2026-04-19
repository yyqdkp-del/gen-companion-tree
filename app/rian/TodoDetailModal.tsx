'use client'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, Send, Navigation, Phone, Mail, Calendar, Download, ExternalLink, CreditCard, ShoppingBag, Loader, ChevronRight } from 'lucide-react'
import { useObject } from '@ai-sdk/react'
import { z } from 'zod'

const THEME = {
  text: '#2C3E50',
  gold: '#B08D57',
  muted: '#6B8BAA',
  navy: '#1A3C5E',
}

// ── Schema（与 route.ts 保持一致）──
const ExecutionPackSchema = z.object({
  summary: z.string(),
  checklist: z.array(z.object({
    item: z.string(),
    status: z.enum(['ready', 'missing', 'optional']),
    note: z.string().optional(),
    action: z.enum(['buy', 'print', 'prepare', 'download']).nullable().optional(),
  })),
  actions: z.array(z.object({
    type: z.enum(['navigate', 'call', 'email', 'whatsapp', 'calendar', 'download_pdf', 'open_url', 'pay', 'buy']),
    label: z.string(),
    data: z.record(z.string(), z.any()),
  })).max(5),
  draft: z.string().optional(),
  depart_suggestion: z.string().optional(),
  cost_estimate: z.string().optional(),
  risk_warnings: z.array(z.string()),
  carry_items: z.array(z.string()),
})

type ExecutionPack = z.infer<typeof ExecutionPackSchema>

type Reminder = {
  id: string
  title: string
  description?: string
  category?: string
  urgency_level: number
  due_date?: string
  status: string
  ai_action_data?: {
    execution_pack?: ExecutionPack
    brain_instruction?: any
    prepared_at?: string
  }
}

type Props = {
  reminder: Reminder | null
  userId: string
  onClose: () => void
  onDone: (id: string) => void
  onSnooze: (id: string) => void
}

// ── 动作按钮执行器 ──
function executeAction(action: any, userId: string) {
  switch (action.type) {
    case 'navigate':
      window.open(action.data.url, '_blank')
      break
    case 'call':
      window.open(`tel:${action.data.phone}`)
      break
    case 'whatsapp':
      window.open(`https://wa.me/${action.data.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(action.data.message || '')}`, '_blank')
      break
    case 'email':
      window.open(`mailto:${action.data.email_to}?subject=${encodeURIComponent(action.data.email_subject || '')}&body=${encodeURIComponent(action.data.email_body || '')}`)
      break
    case 'calendar':
      const start = `${action.data.calendar_date}T${action.data.calendar_time || '09:00'}:00`
      const end = `${action.data.calendar_date}T${action.data.calendar_time || '10:00'}:00`
      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(action.data.calendar_title || '')}&dates=${start.replace(/[-:]/g, '')}/${end.replace(/[-:]/g, '')}&location=${encodeURIComponent(action.data.calendar_location || '')}`, '_blank')
      break
    case 'open_url':
    case 'download_pdf':
      window.open(action.data.url || action.data.official_url, '_blank')
      break
    case 'buy':
      const channel = action.data.channel === 'shopee' ? 'https://shopee.co.th/search?keyword=' : 'https://www.lazada.co.th/catalog/?q='
      window.open(channel + encodeURIComponent(action.data.item || ''), '_blank')
      break
    default:
      break
  }
  // 后台执行 Make.com webhook（email/calendar）
  if (action.type === 'email' || action.type === 'calendar') {
    fetch('/api/todo/smart-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ execute_action: action, user_id: userId }),
    }).catch(() => {})
  }
}

// ── 动作图标 ──
const ACTION_ICON: Record<string, React.ReactNode> = {
  navigate: <Navigation size={14} />,
  call: <Phone size={14} />,
  email: <Mail size={14} />,
  whatsapp: <Phone size={14} />,
  calendar: <Calendar size={14} />,
  download_pdf: <Download size={14} />,
  open_url: <ExternalLink size={14} />,
  pay: <CreditCard size={14} />,
  buy: <ShoppingBag size={14} />,
}

// ── 执行包展示 ──
function ExecutionPackView({ pack, isStreaming }: { pack: Partial<ExecutionPack>, isStreaming: boolean }) {
  return (
    <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Summary */}
      {pack.summary && (
        <div style={{ background: 'rgba(176,141,87,0.08)', borderLeft: '3px solid #B08D57', borderRadius: '0 10px 10px 0', padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: THEME.gold, fontWeight: 600, marginBottom: 4, letterSpacing: '0.1em' }}>根帮你查了</div>
          <p style={{ fontSize: 13, color: THEME.text, lineHeight: 1.7, margin: 0 }}>{pack.summary}</p>
          {isStreaming && !pack.checklist?.length && (
            <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }}
              style={{ display: 'inline-block', width: 8, height: 14, background: THEME.gold, marginLeft: 4, verticalAlign: 'middle' }} />
          )}
        </div>
      )}

      {/* 出发时间 + 费用 */}
      {(pack.depart_suggestion || pack.cost_estimate) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {pack.depart_suggestion && (
            <div style={{ background: 'rgba(74,158,255,0.08)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#4A9EFF', fontWeight: 600, marginBottom: 3 }}>🕗 出发时间</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{pack.depart_suggestion}</div>
            </div>
          )}
          {pack.cost_estimate && (
            <div style={{ background: 'rgba(141,200,160,0.1)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#3A7A2A', fontWeight: 600, marginBottom: 3 }}>💰 预估费用</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{pack.cost_estimate}</div>
            </div>
          )}
        </div>
      )}

      {/* Checklist */}
      {!!pack.checklist?.length && (
        <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600, marginBottom: 8, letterSpacing: '0.1em' }}>✅ 准备清单</div>
          {pack.checklist.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0', borderBottom: i < pack.checklist!.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                {item.status === 'ready' ? '✅' : item.status === 'missing' ? '❌' : '⚪️'}
              </span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: THEME.text, fontWeight: item.status === 'missing' ? 600 : 400 }}>{item.item}</span>
                {item.note && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{item.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 携带物品 */}
      {!!pack.carry_items?.length && (
        <div style={{ background: 'rgba(141,200,160,0.08)', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: '#3A7A2A', fontWeight: 600, marginBottom: 6 }}>🎒 携带物品</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {pack.carry_items.map((item, i) => (
              <span key={i} style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(255,255,255,0.6)', borderRadius: 20, color: THEME.text }}>{item}</span>
            ))}
          </div>
        </div>
      )}

      {/* 风险提示 */}
      {!!pack.risk_warnings?.length && (
        <div style={{ background: 'rgba(255,107,107,0.06)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,107,107,0.15)' }}>
          <div style={{ fontSize: 10, color: '#FF6B6B', fontWeight: 600, marginBottom: 4 }}>⚠️ 注意</div>
          {pack.risk_warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 11, color: THEME.text, lineHeight: 1.6 }}>· {w}</div>
          ))}
        </div>
      )}

      {/* 草稿 */}
      {pack.draft && (
        <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600, marginBottom: 6 }}>📝 草稿</div>
          <p style={{ fontSize: 12, color: THEME.text, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{pack.draft}</p>
        </div>
      )}

      {/* 一键动作按钮 */}
      {!!pack.actions?.length && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600, letterSpacing: '0.1em' }}>⚡ 一键执行</div>
          {pack.actions.map((action, i) => (
            <motion.button key={i} whileTap={{ scale: 0.97 }}
              onClick={() => executeAction(action, '')}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 14, background: i === 0 ? THEME.navy : 'rgba(255,255,255,0.6)', border: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ color: i === 0 ? '#fff' : THEME.text, opacity: 0.7 }}>{ACTION_ICON[action.type]}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? '#fff' : THEME.text, flex: 1 }}>{action.label}</span>
              <ChevronRight size={14} style={{ color: i === 0 ? 'rgba(255,255,255,0.5)' : THEME.muted }} />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 主组件 ──
export default function TodoDetailModal({ reminder, userId, onClose, onDone, onSnooze }: Props) {
  const [reminderChat, setReminderChat] = useState<{ role: string, text: string }[]>([])
  const [reminderInput, setReminderInput] = useState('')
  const [reminderLoading, setReminderLoading] = useState(false)
  const [tab, setTab] = useState<'pack' | 'chat'>('pack')

  // 缓存的执行包
  const cachedPack = reminder?.ai_action_data?.execution_pack

  // Stream hook（只在没有缓存时使用）
  const { object: streamedPack, submit, isLoading: isStreaming } = useObject({
    api: '/api/todo/smart-action',
    schema: ExecutionPackSchema,
  })

  // 点开弹窗时：有缓存直接用，没有就触发 stream
  useEffect(() => {
    if (!reminder) return
    setTab('pack')
    setReminderChat([])
    setReminderInput('')

    if (!cachedPack) {
      submit({ todo_id: reminder.id, user_id: userId })
    }
  }, [reminder?.id])

  // 当前展示的执行包：优先缓存，其次 stream
  const displayPack: Partial<ExecutionPack> | null = cachedPack || streamedPack || null

  const askReminderQuestion = async (question: string) => {
    if (!question.trim() || reminderLoading) return
    setReminderChat(prev => [...prev, { role: 'user', text: question }])
    setReminderInput('')
    setReminderLoading(true)
    try {
      const res = await fetch('/api/rian/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          context: `事件：${reminder?.title}\n详情：${reminder?.description}`,
          history: reminderChat,
        }),
      })
      const data = await res.json()
      const replyText = data.reply || '抱歉，无法获取建议'
      setReminderChat(prev => [...prev, { role: 'assistant', text: replyText }])
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(replyText.slice(0, 80))
        u.lang = 'zh-CN'; u.rate = 0.95
        window.speechSynthesis.speak(u)
      }
    } catch {
      setReminderChat(prev => [...prev, { role: 'assistant', text: '网络异常，请稍后再试' }])
    } finally {
      setReminderLoading(false)
    }
  }

  if (!reminder) return null

  const urgencyGradient = reminder.urgency_level === 3
    ? 'linear-gradient(90deg, #FF6B6B, #FF8E53)'
    : reminder.urgency_level === 2
    ? 'linear-gradient(90deg, #F0A500, #F0C040)'
    : 'linear-gradient(90deg, #4A9EFF, #7BC4FF)'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: `0 12px max(calc(env(safe-area-inset-bottom) + 80px), 110px)`, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(40px)', borderRadius: 28, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        >
          {/* 顶部色条 */}
          <div style={{ height: 4, background: urgencyGradient, flexShrink: 0 }} />

          {/* 标题区 */}
          <div style={{ padding: '20px 20px 12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 10, color: THEME.gold, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  {reminder.category || '提醒'}
                  {reminder.due_date && ` · ${new Date(reminder.due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}`}
                </span>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: THEME.text, margin: '4px 0 0', lineHeight: 1.3 }}>{reminder.title}</h2>
              </div>
              <X size={18} onClick={onClose} style={{ cursor: 'pointer', opacity: 0.3, marginLeft: 12, flexShrink: 0 }} />
            </div>

            {/* Tab 切换 */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {(['pack', 'chat'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding: '6px 16px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: tab === t ? THEME.navy : 'rgba(0,0,0,0.06)', color: tab === t ? '#fff' : THEME.muted }}>
                  {t === 'pack' ? '⚡ 一键办' : '💬 问日安'}
                </button>
              ))}
              {isStreaming && tab === 'pack' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                  <Loader size={12} style={{ color: THEME.gold }} />
                  <span style={{ fontSize: 11, color: THEME.gold }}>生成中…</span>
                </div>
              )}
            </div>
          </div>

          {/* 内容区（可滚动）*/}
          <div style={{ overflowY: 'auto', flex: 1 }}>

            {/* 执行包 Tab */}
            {tab === 'pack' && (
              <>
                {/* 没有任何数据且不在 streaming */}
                {!displayPack && !isStreaming && (
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: THEME.muted }}>暂无执行包</div>
                  </div>
                )}

                {/* streaming 中但还没有 summary */}
                {isStreaming && !displayPack?.summary && (
                  <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[0, 1, 2].map(i => (
                        <motion.div key={i}
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          style={{ width: 8, height: 8, borderRadius: '50%', background: THEME.gold }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: THEME.muted }}>根正在为你查询准备…</span>
                  </div>
                )}

                {/* 有数据就展示 */}
                {displayPack && <ExecutionPackView pack={displayPack} isStreaming={isStreaming} />}
              </>
            )}

            {/* 聊天 Tab */}
            {tab === 'chat' && (
              <div style={{ padding: '0 20px 16px' }}>
                {reminderChat.length === 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {['还需要准备什么？', '帮我加入日历', '有什么风险？'].map(q => (
                      <button key={q} onClick={() => askReminderQuestion(q)}
                        style={{ padding: '6px 12px', borderRadius: 20, background: 'rgba(176,141,87,0.1)', border: '1px solid rgba(176,141,87,0.2)', fontSize: 11, color: THEME.gold, cursor: 'pointer' }}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 8 }}>
                  {reminderChat.map((msg, i) => (
                    <div key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: msg.role === 'user' ? THEME.navy : 'rgba(255,255,255,0.8)', fontSize: 12, color: msg.role === 'user' ? '#fff' : THEME.text, lineHeight: 1.6 }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {reminderLoading && (
                    <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          style={{ width: 6, height: 6, borderRadius: '50%', background: THEME.gold }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div style={{ flexShrink: 0, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            {tab === 'chat' && (
              <div style={{ padding: '10px 20px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={reminderInput} onChange={e => setReminderInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && askReminderQuestion(reminderInput)}
                  placeholder="问日安..." style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)', fontSize: 13, color: THEME.text, outline: 'none' }} />
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => askReminderQuestion(reminderInput)}
                  style={{ width: 36, height: 36, borderRadius: '50%', background: THEME.navy, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Send size={14} color="#fff" />
                </motion.button>
              </div>
            )}
            <div style={{ padding: '10px 20px 16px', display: 'flex', gap: 10 }}>
              <button onClick={() => onDone(reminder.id)}
                style={{ flex: 1, padding: 12, borderRadius: 14, background: 'rgba(141,200,160,0.4)', border: '1px solid rgba(141,200,160,0.5)', fontSize: 13, fontWeight: 600, color: THEME.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CheckCircle2 size={14} /> 已处理
              </button>
              <button onClick={() => onSnooze(reminder.id)}
                style={{ flex: 1, padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)', fontSize: 13, color: THEME.text, opacity: 0.7, cursor: 'pointer' }}>
                明天再说
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
