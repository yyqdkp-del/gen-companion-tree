'use client'
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import nextDynamic from 'next/dynamic'
import { THEME } from '@/app/_shared/_constants/theme'
import { SAFE_AREA_TOP } from '@/app/_shared/_constants/layout'
import { useTodoActions } from '@/app/_shared/_hooks/useTodoActions'
import { useRecorder } from '@/app/_shared/_hooks/useRecorder'
import { useUpload, UPLOAD_STATUS_TEXT } from '@/app/_shared/_hooks/useUpload'
const TodoDetailModal = nextDynamic(() => import('./TodoDetailModal'), { ssr: false })
const WeeklyReportSheet = nextDynamic(() => import('./WeeklyReportSheet'), { ssr: false })
export const dynamic = 'force-dynamic'
import { useApp } from '@/app/context/AppContext'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { useTodoEngine } from '@/app/_shared/_hooks/useTodoEngine'
import type { TodoItem } from '@/app/_shared/_types'
import TourGuide, { type TourStep } from '@/app/components/TourGuide'

type Reminder = {
  id: string
  title: string
  description?: string
  category?: string
  urgency_level: number
  due_date?: string
  status: string
  action_url?: string
  action_label?: string
  ai_action_data?: {
  execution_pack?: any
  brain_instruction?: any
  prepared_at?: string
}
}

type Child = {
  id: string
  name: string
  emoji: string
  energy: number | null
  progress: number
  avatar_url?: string
}

const RIAN_TOUR: TourStep[] = [
  {
    id: 'todo',
    title: '说出来，根来整理',
    desc: '点击底部相机或麦克风，说一件事、拍一张通知，AI自动变成待办和日历。',
    emoji: '✨',
    position: 'bottom',
    targetHint: '试试底部右侧相机按钮',
  },
  {
    id: 'report',
    title: '每周成长周报',
    desc: '点击「给爷爷奶奶的成长周报」，AI生成本周故事，一键发微信给国内家人。',
    emoji: '💌',
    position: 'center',
  },
]

export default function RianPage() {
  const router = useRouter()
  const [childIndex, setChildIndex] = useState(0)
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)
  const [showFamilyMenu, setShowFamilyMenu] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null)
  const [inputMode, setInputMode] = useState<'none' | 'audio_text' | 'vision_file'>('none')
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [reminderChat, setReminderChat] = useState<{role: string, text: string}[]>([])
  const [reminderInput, setReminderInput] = useState('')
  const [reminderLoading, setReminderLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showWeeklyReport, setShowWeeklyReport] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
const getEnergyColor = (v: number) => v > 70 ? '#8ca88d' : v > 40 ? '#b88e5e' : '#d58074'
const getChildGlow = (energy: number | null | undefined) =>
  energy == null ? 'rgba(255,255,255,0.45)' : getEnergyColor(energy)

const { userId, kids: ctxKids, todos: ctxTodos, sync: ctxSync } = useApp()

const todosTyped = ctxTodos as TodoItem[]
const { groups } = useTodoEngine(todosTyped)

const tempTodos = useMemo(
  () => (ctxTodos as TodoItem[]).filter((t) => t._isTemp),
  [ctxTodos],
)

const mapTodoToReminder = (t: TodoItem): Reminder => ({
  id: t.id,
  title: t.title,
  description: (t as any).description,
  category: t.category,
  urgency_level: t.priority === 'red' ? 3 : t.priority === 'orange' ? 2 : 1,
  due_date: t.due_date,
  status: t.status,
  ai_action_data: t.ai_action_data,
})

const actionReminders = useMemo<Reminder[]>(() => {
  const merged = [...tempTodos, ...groups.today, ...groups.soon]
  const seen = new Set<string>()
  return merged
    .filter((t) => {
      if (!t?.id || seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
    .map(mapTodoToReminder)
}, [tempTodos, groups.today, groups.soon])
 // ── 时钟 ──
  useEffect(() => {
    setMounted(true)
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(ticker)
  }, [])

  const children = ctxKids
  const loading = false
  const currentChild = children[childIndex]
  const childEnergy = currentChild?.energy != null ? currentChild.energy : null
  const showChildEnergy = childEnergy != null
  
  const { markDone: markDoneAction, snooze: snoozeAction } = useTodoActions(actionReminders, ctxSync)
  const { uploading, uploadStatus, upload } = useUpload(userId || '', () => {
    ctxSync()
    setInputMode('none')
  })
  const { isRecording, recordingSeconds, startRecording, stopRecording } = useRecorder(
    async (blob, filename) => { await upload(blob, 'audio', filename) }
  )

  const markDone = async (id: string) => { await markDoneAction(id); setSelectedReminder(null) }
  const snooze   = async (id: string) => { await snoozeAction(id);   setSelectedReminder(null) }
  const askReminderQuestion = async (question: string) => {
    if (!question.trim() || reminderLoading) return
    setReminderChat(prev => [...prev, { role: 'user', text: question }])
    setReminderInput('')
    setReminderLoading(true)
    try {
      const res = await fetchWithAuth('/api/rian/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          context: `事件：${selectedReminder?.title}\n详情：${selectedReminder?.description}`,
          history: reminderChat,
        }),
      })
     const data = await res.json()
      const replyText = data.reply || '抱歉，无法获取建议'
      setReminderChat(prev => [...prev, { role: 'assistant', text: replyText }])
      if (typeof window !== 'undefined' && window.speechSynthesis) {
  const u = new SpeechSynthesisUtterance(replyText.slice(0, 80))
  u.lang = 'zh-CN'
  u.rate = 0.95
  window.speechSynthesis.speak(u)
}
    } catch (e) {
      if (!logOrAlertNetworkError(e)) {
        setReminderChat(prev => [...prev, { role: 'assistant', text: '抱歉，暂时无法回复，请稍后再试' }])
      }
    } finally {
      setReminderLoading(false)
    }
  }





  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const category = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'document' : 'other'
    await upload(file, category)
  }



  return (
    <main style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100dvh',
      backgroundColor: '#fbf9f6',
      backgroundImage: `
        radial-gradient(at 90% 10%, rgba(245,214,209,0.2) 0px, transparent 50%),
        radial-gradient(at 10% 90%, rgba(217,230,218,0.15) 0px, transparent 50%)
      `,
      overflow: 'hidden',
      fontFamily: 'sans-serif',
    }}>

      <input ref={fileInputRef} type="file" accept="image/*,application/pdf,audio/*,.doc,.docx" style={{ display: 'none' }} onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* 背景水印 */}
      <div style={{ position: 'absolute', top: '12%', right: '-3%', fontSize: 'clamp(60px, 16vw, 120px)', fontWeight: 'bold', color: THEME.text, opacity: 0.07, pointerEvents: 'none', fontStyle: 'italic', whiteSpace: 'nowrap', lineHeight: 1 }}>
        根·陪伴
      </div>

      {/* 左上角：孩子头像 */}
      <div style={{ position: 'absolute', top: `calc(${SAFE_AREA_TOP} + 5%)`, left: '5%', zIndex: 100 }}>
        <motion.div
          onClick={() => setShowFamilyMenu(!showFamilyMenu)}
          animate={{ boxShadow: [`0 0 15px ${getChildGlow(childEnergy)}40`, `0 0 35px ${getChildGlow(childEnergy)}80`, `0 0 15px ${getChildGlow(childEnergy)}40`] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', cursor: 'pointer', overflow: 'hidden' }}
        >
          {currentChild?.avatar_url ? (
            <img src={currentChild.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 30 }}>{currentChild?.emoji || '🌱'}</span>
          )}
        </motion.div>
        <p style={{ marginTop: 8, fontSize: 10, color: THEME.text, fontWeight: 'bold', letterSpacing: '0.2em', textAlign: 'center' }}>{currentChild?.name || ''}</p>
        <div style={{ width: 56, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2, margin: '3px auto', overflow: 'hidden' }}>
          {showChildEnergy ? (
            <motion.div animate={{ width: `${childEnergy}%`, backgroundColor: getEnergyColor(childEnergy) }} style={{ height: '100%' }} />
          ) : (
            <div style={{ width: '30%', height: '100%', background: 'rgba(45,50,47,0.12)', borderRadius: 2 }} />
          )}
        </div>
        {!showChildEnergy && (
          <p style={{ marginTop: 4, fontSize: 10, color: THEME.muted, textAlign: 'center' }}>—</p>
        )}
      </div>

      {/* 家族切换菜单 */}
      <AnimatePresence>
        {showFamilyMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: 'absolute', top: '17%', left: '5%', zIndex: 120, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(30px)', borderRadius: 20, padding: 12, border: '1px solid rgba(255,255,255,0.5)', display: 'flex', gap: 12, alignItems: 'center' }}
          >
            {children.map((c, i) => (
              <div key={i} onClick={() => { setChildIndex(i); setShowFamilyMenu(false) }}
                style={{ cursor: 'pointer', opacity: childIndex === i ? 1 : 0.3, width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.5)' }}>
                {c.avatar_url ? (
                  <img src={c.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 20 }}>{c.emoji}</span>
                )}
              </div>
            ))}
            <X size={14} onClick={() => setShowFamilyMenu(false)} style={{ cursor: 'pointer', opacity: 0.4 }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 右上角：时间 */}
     <header style={{ position: 'absolute', top: `calc(${SAFE_AREA_TOP} + 5%)`, right: '5%', zIndex: 50, textAlign: 'right' }}>
  <h1 style={{ fontSize: 'clamp(48px, 14vw, 72px)', fontWeight: 100, color: THEME.text, opacity: 0.9, lineHeight: 1, margin: 0 }}>
    {mounted ? `${time.getHours()}:${time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}` : '--:--'}
  </h1>
  <p style={{ fontSize: 10, color: THEME.text, opacity: 0.35, letterSpacing: '0.25em', marginTop: 3 }}>日安指挥中心</p>
</header>

      {/* 加载中 */}
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ fontSize: 13, color: THEME.text, opacity: 0.4, letterSpacing: '0.2em' }}>
            日安·启动中…
          </motion.div>
        </div>
      )}

      {/* 主内容：周报 + 待办列表（可滚动） */}
      <div
        style={{
          position: 'absolute',
          top: `calc(${SAFE_AREA_TOP} + 18vh)`,
          left: 0,
          right: 0,
          bottom: 'calc(88px + env(safe-area-inset-bottom))',
          overflowY: 'auto',
          zIndex: 25,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {currentChild && (
          <div style={{ padding: '0 16px', marginBottom: 12 }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowWeeklyReport(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setShowWeeklyReport(true)
              }}
              style={{
                background:
                  'linear-gradient(135deg, rgba(164,99,85,0.08) 0%, rgba(92,122,94,0.06) 100%)',
                borderRadius: 18,
                padding: '16px 18px',
                border: '1px solid rgba(164,99,85,0.12)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: 36, flexShrink: 0 }}>💌</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: '#2d322f',
                    fontFamily: "'Noto Serif SC', serif",
                    marginBottom: 4,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  给爷爷奶奶的成长周报
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'rgba(45,50,47,0.5)',
                    fontFamily: 'sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                    wordBreak: 'break-word',
                  }}
                >
                  根·生成本周成长故事，一键分享到微信
                </div>
              </div>
              <div style={{ fontSize: 18, color: 'rgba(45,50,47,0.3)', flexShrink: 0 }}>→</div>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {[...tempTodos, ...groups.today].length > 0 && (
              <div style={{ padding: '0 16px', marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.4)', fontFamily: 'sans-serif', marginBottom: 8, letterSpacing: '0.1em' }}>
                  今日待办
                </div>
                {[...tempTodos, ...groups.today].map((todo) => (
                  <div
                    key={todo.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedReminder(mapTodoToReminder(todo))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedReminder(mapTodoToReminder(todo))
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.7)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 14,
                      padding: '12px 16px',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      border: '1px solid rgba(45,50,47,0.06)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                      background: todo.priority === 'red' ? '#c85050' : todo.priority === 'orange' ? '#d4804a' : '#a46355',
                    }} />
                    <div style={{ flex: 1, fontSize: 15, color: '#2d322f', fontFamily: "'Noto Serif SC', serif" }}>
                      {todo.title}
                    </div>
                    {todo.due_date && (
                      <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.4)', fontFamily: 'sans-serif', flexShrink: 0 }}>
                        {new Date(todo.due_date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {groups.soon.length > 0 && (
              <div style={{ padding: '0 16px', marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.4)', fontFamily: 'sans-serif', marginBottom: 8, letterSpacing: '0.1em' }}>
                  近期安排
                </div>
                {groups.soon.map((todo) => (
                  <div
                    key={todo.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedReminder(mapTodoToReminder(todo))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedReminder(mapTodoToReminder(todo))
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.5)',
                      borderRadius: 14,
                      padding: '12px 16px',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      border: '1px solid rgba(45,50,47,0.04)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 6, height: 6, borderRadius: 3, flexShrink: 0,
                      background: 'rgba(45,50,47,0.2)',
                    }} />
                    <div style={{ flex: 1, fontSize: 14, color: 'rgba(45,50,47,0.7)', fontFamily: 'sans-serif' }}>
                      {todo.title}
                    </div>
                    {todo.due_date && (
                      <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.35)', fontFamily: 'sans-serif', flexShrink: 0 }}>
                        {new Date(todo.due_date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tempTodos.length === 0 && groups.today.length === 0 && groups.soon.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'rgba(45,50,47,0.3)', fontSize: 14, fontFamily: 'sans-serif' }}>
                今日清闲，说点什么让根记下来？
              </div>
            )}
          </>
        )}
      </div>

      {/* 详情弹窗 */}
    <TodoDetailModal
  reminder={selectedReminder}
  userId={userId || ''}
  onClose={() => setSelectedReminder(null)}
  onDone={markDone}
  onSnooze={snooze}
  onSync={ctxSync}
/>

      <AnimatePresence>
        {showWeeklyReport && currentChild?.id && (
          <WeeklyReportSheet
            childId={currentChild.id}
            childName={currentChild.name || '宝宝'}
            onClose={() => setShowWeeklyReport(false)}
          />
        )}
      </AnimatePresence>

      <TourGuide tourId="rian" steps={RIAN_TOUR} />
    </main>
  )
}
