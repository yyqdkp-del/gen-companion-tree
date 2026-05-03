'use client'
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, ShoppingCart, Pill, Building2,
  Plane, CheckCircle2, Clock,
  X, Mic, Camera, Send, Square, Loader, Upload as UploadIcon
} from 'lucide-react'
import nextDynamic from 'next/dynamic'
import { THEME, URGENCY_COLOR, URGENCY_BORDER } from '@/app/_shared/_constants/theme'
import { DROP_ANIM, POSITIONS } from '@/app/_shared/_constants/animations'
import { getCategoryIcon } from '@/app/_shared/_constants/categories'
import { useTodoActions } from '@/app/_shared/_hooks/useTodoActions'
import { useRecorder } from '@/app/_shared/_hooks/useRecorder'
import { useUpload, UPLOAD_STATUS_TEXT } from '@/app/_shared/_hooks/useUpload'
const TodoDetailModal = nextDynamic(() => import('./TodoDetailModal'), { ssr: false })
export const dynamic = 'force-dynamic'
import { useApp } from '@/app/context/AppContext'
  

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
  energy: number
  progress: number
  avatar_url?: string
}

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const getEnergyColor = (v: number) => v > 70 ? '#4ADE80' : v > 40 ? '#FACC15' : '#FB7185'

const { userId, kids: ctxKids, todos: ctxTodos, sync: ctxSync } = useApp()

// ── 从 Context 筛选今日水珠 ──
const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
const reminders = useMemo<Reminder[]>(() => ctxTodos
  .filter((t: any) => t._isTemp || (t.status === 'pending' && t.due_date === todayStr))
  .sort((a: any, b: any) => {
    const o: Record<string, number> = { red: 0, orange: 1, yellow: 2 }
    return (o[a.priority] ?? 2) - (o[b.priority] ?? 2)
  })
  .map((t: any) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  category: t.category,
  urgency_level: t.priority === 'red' ? 3 : t.priority === 'orange' ? 2 : 1,
  due_date: t.due_date,
  status: t.status,
  ai_action_data: t.ai_action_data,
})), [ctxTodos, todayStr])
 // ── 时钟 ──
  useEffect(() => {
    setMounted(true)
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(ticker)
  }, [])

  const children = ctxKids
  const allDone = reminders.length === 0
  const loading = false
  const currentChild = children[childIndex]
  
  const { markDone: markDoneAction, snooze: snoozeAction } = useTodoActions(reminders, ctxSync)
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
      const res = await fetch('/api/rian/chat', {
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
    } catch {
      setReminderChat(prev => [...prev, { role: 'assistant', text: '网络异常，请稍后再试' }])
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
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      overflow: 'hidden', background: THEME.bg, fontFamily: 'sans-serif',
    }}>

      <input ref={fileInputRef} type="file" accept="image/*,application/pdf,audio/*,.doc,.docx" style={{ display: 'none' }} onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* 背景水印 */}
      <div style={{ position: 'absolute', top: '12%', right: '-3%', fontSize: 'clamp(60px, 16vw, 120px)', fontWeight: 'bold', color: THEME.text, opacity: 0.07, pointerEvents: 'none', fontStyle: 'italic', whiteSpace: 'nowrap', lineHeight: 1 }}>
        根·陪伴
      </div>

      {/* 左上角：孩子头像 */}
      <div style={{ position: 'absolute', top: '5%', left: '5%', zIndex: 100 }}>
        <motion.div
          onClick={() => setShowFamilyMenu(!showFamilyMenu)}
          animate={{ boxShadow: [`0 0 15px ${getEnergyColor(currentChild?.energy ?? 75)}40`, `0 0 35px ${getEnergyColor(currentChild?.energy ?? 75)}80`, `0 0 15px ${getEnergyColor(currentChild?.energy ?? 75)}40`] }}
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
          <motion.div animate={{ width: `${currentChild?.energy ?? 75}%`, backgroundColor: getEnergyColor(currentChild?.energy ?? 75) }} style={{ height: '100%' }} />
        </div>
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
     <header style={{ position: 'absolute', top: '5%', right: '5%', zIndex: 50, textAlign: 'right' }}>
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

      {/* 空状态：今日清零 */}
      <AnimatePresence>
        {!loading && allDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 15,
              backgroundColor: '#080c10',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', fontFamily: '"Source Han Serif SC", "Songti SC", serif',
            }}
          >
            {/* 流动琥珀光影 */}
            <div style={{ position: 'relative', height: 300, width: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <motion.div
                animate={{
                  borderRadius: ['40% 60% 70% 30% / 40% 50% 60% 50%', '60% 40% 30% 70% / 50% 60% 40% 50%', '40% 60% 70% 30% / 40% 50% 60% 50%'],
                  scale: [1, 1.15, 1], rotate: [0, 90, 0], opacity: [0.3, 0.6, 0.3],
                }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 180, height: 180,
                  background: 'radial-gradient(circle, rgba(255,190,100,0.4) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                }}
              />
              <motion.div
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 4, repeat: Infinity }}
                style={{
                  position: 'absolute', width: 4, height: 4,
                  backgroundColor: '#fff', borderRadius: '50%',
                  boxShadow: '0 0 20px 5px rgba(255,255,255,0.4)',
                }}
              />
            </div>

            {/* 文字 */}
            <div style={{ textAlign: 'center', zIndex: 10, marginTop: -40 }}>
              <motion.div
                initial={{ opacity: 0, filter: 'blur(15px)', y: 10 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                transition={{ duration: 3, ease: 'easeOut' }}
              >
                <p style={{ fontSize: 26, fontWeight: 300, color: '#fff', letterSpacing: '0.6em', margin: 0 }}>
                  今日清零
                </p>
              </motion.div>
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 40, opacity: 0.2 }}
                transition={{ delay: 2, duration: 2 }}
                style={{ height: 1, background: '#fff', margin: '30px auto' }}
              />
              <motion.div
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 0.5, filter: 'blur(0px)' }}
                transition={{ delay: 3.5, duration: 3 }}
                style={{ fontSize: 15, color: '#fff', lineHeight: 2.8, letterSpacing: '0.3em' }}
              >
                <p style={{ margin: 0 }}>去听风 &nbsp; 去看云</p>
                <p style={{ margin: 0 }}>去爱你自己 🫂</p>
              </motion.div>
            </div>

            {/* 流星背景 */}
            <div style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  initial={{ x: '-10%', y: `${20 * i}%`, opacity: 0 }}
                  animate={{ x: '110%', opacity: [0, 0.2, 0] }}
                  transition={{ duration: 15, repeat: Infinity, delay: i * 5, ease: 'linear' }}
                  style={{
                    position: 'absolute', width: 100, height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 水珠 */}
      {!loading && !allDone && reminders.map((r, i) => {
        const pos = POSITIONS[i % POSITIONS.length]
        const anim = DROP_ANIM[i % DROP_ANIM.length]
        const icon = getCategoryIcon(r.category || 'default')
        const isUrgent = r.urgency_level === 3
        const size = r.urgency_level === 3 ? 96 : r.urgency_level === 2 ? 84 : 72

        return (
          <motion.div
            key={r.id}
            layout
initial={false}
            animate={{
              opacity: 1, scale: 1,
              y: [0, -anim.yRange, 0],
              x: [0, anim.xRange, 0],
              rotate: [0, anim.rotate, -anim.rotate, 0],
            }}
            transition={{
              opacity: { duration: 0.6, delay: i * 0.15 },
              scale: { duration: 0.6, delay: i * 0.15 },
              y: { duration: anim.duration, repeat: Infinity, delay: anim.delay, ease: 'easeInOut' },
              x: { duration: anim.duration * 1.3, repeat: Infinity, delay: anim.delay + 0.5, ease: 'easeInOut' },
              rotate: { duration: anim.duration * 0.8, repeat: Infinity, delay: anim.delay, ease: 'easeInOut' },
            }}
            style={{ position: 'absolute', top: pos.top, left: (pos as any).left, right: (pos as any).right, zIndex: 20 }}
            onClick={() => setSelectedReminder(r)}
          >
            <div style={{
              width: `${size}px`, height: `${size}px`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${URGENCY_BORDER[r.urgency_level]}`,
              borderRadius: '66% 34% 71% 29% / 37% 53% 47% 63%',
              position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.35) 0%, ${URGENCY_COLOR[r.urgency_level]} 100%)`,
              boxShadow: `inset 5px 5px 10px rgba(255,255,255,0.3), 10px 15px 25px rgba(0,0,0,0.06)`,
              cursor: 'pointer',
            }}>
              <div style={{ color: THEME.text, opacity: 0.7, marginBottom: 2 }}>{icon}</div>
              <span style={{ fontSize: 9, fontWeight: 600, color: THEME.text, textAlign: 'center', padding: '0 5px', lineHeight: 1.2 }}>
                {r.title.length > 5 ? r.title.slice(0, 5) + '…' : r.title}
              </span>
              {isUrgent && (
                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ position: 'absolute', top: 8, right: 10, width: 8, height: 8, background: '#FF6B6B', borderRadius: '50%', border: '2px solid white' }} />
              )}
              <div style={{ position: 'absolute', top: 13, left: 18, width: 13, height: 6, background: 'rgba(255,255,255,0.45)', borderRadius: '50%', transform: 'rotate(-35deg)' }} />
            </div>
          </motion.div>
        )
      })}

      {/* 详情弹窗 */}
    <TodoDetailModal
  reminder={selectedReminder}
  userId={userId || ''}
  onClose={() => setSelectedReminder(null)}
  onDone={markDone}
  onSnooze={snooze}
  onSync={ctxSync}
/>
    </main>
  )
}
