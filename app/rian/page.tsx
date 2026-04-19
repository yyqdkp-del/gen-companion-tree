'use client'

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home as HomeIcon, FileText, ShoppingCart, Pill, Building2,
  Plane, CheckCircle2, Clock, ChevronRight,
  X, Mic, Camera, Send, Square, Loader, Upload
} from 'lucide-react'

export const dynamic = 'force-dynamic'

import { createBrowserClient } from '@supabase/ssr'
import { useApp } from '@/app/context/AppContext'
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)
  const THEME = {
  bg: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)',
  text: '#2C3E50',
  gold: '#B08D57',
  navy: '#1A3C5E',
  muted: '#6B8BAA',
}

const URGENCY_COLOR: Record<number, string> = {
  1: 'rgba(154, 183, 232, 0.35)',
  2: 'rgba(141, 200, 160, 0.5)',
  3: 'rgba(255, 180, 100, 0.65)',
}
const URGENCY_BORDER: Record<number, string> = {
  1: 'rgba(154,183,232,0.3)',
  2: 'rgba(141,200,160,0.5)',
  3: 'rgba(255,180,100,0.7)',
}

const DROP_ANIM = [
  { duration: 6.5, delay: 0,   yRange: 14, xRange: 5,  rotate: 1.5 },
  { duration: 8.2, delay: 1.5, yRange: 10, xRange: 7,  rotate: 2   },
  { duration: 7.0, delay: 3.2, yRange: 16, xRange: 4,  rotate: 1   },
  { duration: 5.8, delay: 0.8, yRange: 12, xRange: 6,  rotate: 2.5 },
  { duration: 9.0, delay: 2.4, yRange: 8,  xRange: 8,  rotate: 1.2 },
  { duration: 6.2, delay: 4.1, yRange: 18, xRange: 3,  rotate: 0.8 },
  { duration: 7.8, delay: 1.9, yRange: 11, xRange: 5,  rotate: 1.8 },
]

const POSITIONS = [
  { top: '25%', left: '8%'   },
  { top: '22%', right: '8%'  },
  { top: '38%', left: '55%'  },
  { top: '45%', left: '15%'  },
  { top: '52%', right: '12%' },
  { top: '60%', left: '40%'  },
  { top: '65%', right: '45%' },
  { top: '35%', left: '30%'  },
  { top: '70%', left: '10%'  },
  { top: '58%', right: '55%' },
]

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
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [reminderChat, setReminderChat] = useState<{role: string, text: string}[]>([])
  const [reminderInput, setReminderInput] = useState('')
  const [reminderLoading, setReminderLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [mounted, setMounted] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const getEnergyColor = (v: number) => v > 70 ? '#4ADE80' : v > 40 ? '#FACC15' : '#FB7185'

const { userId, kids: ctxKids, todos: ctxTodos, sync: ctxSync } = useApp()

// ── 从 Context 筛选今日水珠 ──
const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
const reminders = useMemo<Reminder[]>(() => ctxTodos
  .filter((t: any) => t._isTemp || (t.status === 'pending' && (t.priority === 'red' || t.due_date === todayStr)))
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
  
  const markDone = async (id: string) => {
  await supabase.from('todo_items').update({
    status: 'done',
    completed_at: new Date().toISOString()
  }).eq('id', id)
  await supabase.from('user_habits').insert({
    action_type: 'mark_done',
    target_category: reminders.find(r => r.id === id)?.category,
    target_id: id,
  })
  setSelectedReminder(null)
  ctxSync()
}
  const snooze = async (id: string) => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  await supabase.from('todo_items').update({
    due_date: tomorrow.toISOString().split('T')[0]
  }).eq('id', id)
  await supabase.from('user_habits').insert({
    action_type: 'snooze',
    target_category: reminders.find(r => r.id === id)?.category,
    target_id: id,
  })
  setSelectedReminder(null)
  ctxSync()
}
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

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorderRef.current = mediaRecorder
    audioChunksRef.current = []
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      stream.getTracks().forEach(t => t.stop())
      await uploadFile(audioBlob, 'audio', `voice_${Date.now()}.webm`)
    }
    mediaRecorder.start()
    setIsRecording(true)
    setRecordingSeconds(0)
    recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
  } catch { alert('请允许麦克风权限') }
}

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }

  const uploadFile = async (file: Blob | File, category: string, filename?: string) => {
    setUploading(true)
    setUploadStatus('uploading')
    try {
      const name = filename || (file instanceof File ? file.name : `file_${Date.now()}`)
      const path = `uploads/${category}/${Date.now()}_${name}`
      const { error } = await supabase.storage.from('companion-files').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('companion-files').getPublicUrl(path)
      const isImage = file.type.startsWith('image/')
      const res = await fetch('/api/rian/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: isImage ? '请分析这张图片，提取所有需要跟进的事件' : `文件已上传：${name}，请提取关键事件`,
          input_type: isImage ? 'image' : category,
          file_url: urlData.publicUrl,
          user_id: userId,
      }),
      })
      
      const result = await res.json()
      if (result.ok) {
        setUploadStatus('done')
        ctxSync()
        setTimeout(() => { setUploadStatus('idle'); setInputMode('none') }, 1500)
      } else {
        throw new Error(result.error)
      }
    } catch (e) {
      console.error(e)
      setUploadStatus('error')
      setTimeout(() => setUploadStatus('idle'), 2000)
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const category = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'document' : 'other'
    await uploadFile(file, category)
  }

  const categoryIcon: Record<string, React.ReactNode> = {
    visa: <Plane size={16} />, medical: <Pill size={16} />, school: <FileText size={16} />,
    shopping: <ShoppingCart size={16} />, utility: <Building2 size={16} />, default: <Clock size={16} />,
  }

  const uploadStatusText = { idle: '', uploading: '处理中…', done: '✓ 已添加', error: '处理失败' }

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
        const icon = categoryIcon[r.category || 'default'] ?? categoryIcon.default
        const isUrgent = r.urgency_level === 3
        const size = r.urgency_level === 3 ? 96 : r.urgency_level === 2 ? 84 : 72

        return (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, scale: 0.6 }}
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
      <AnimatePresence>
        {selectedReminder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: `0 12px max(calc(env(safe-area-inset-bottom) + 80px), 110px)`, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
            onClick={() => { setSelectedReminder(null); setReminderChat([]); setReminderInput('') }}
          >
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(40px)', borderRadius: 28, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '80vh', overflowY: 'auto' }}
            >
              <div style={{ height: 4, background: selectedReminder.urgency_level === 3 ? 'linear-gradient(90deg, #FF6B6B, #FF8E53)' : selectedReminder.urgency_level === 2 ? 'linear-gradient(90deg, #F0A500, #F0C040)' : 'linear-gradient(90deg, #4A9EFF, #7BC4FF)' }} />

              <div style={{ padding: '20px 20px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 10, color: THEME.gold, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      {selectedReminder.category || '提醒'}
                      {selectedReminder.due_date && ` · ${new Date(selectedReminder.due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}`}
                    </span>
                    <h2 style={{ fontSize: 20, fontWeight: 600, color: THEME.text, margin: '4px 0 0', lineHeight: 1.3 }}>{selectedReminder.title}</h2>
                  </div>
                  <X size={18} onClick={() => { setSelectedReminder(null); setReminderChat([]); setReminderInput('') }} style={{ cursor: 'pointer', opacity: 0.3, marginLeft: 12, flexShrink: 0 }} />
                </div>

                {selectedReminder.description && (() => {
                  const lines = selectedReminder.description.split('\n')
                  const advice = lines[0]
                  const actionLine = lines.find((l: string) => l.startsWith('行动清单：'))
                  const carryLine = lines.find((l: string) => l.startsWith('携带物品：'))
                  const departLine = lines.find((l: string) => l.startsWith('建议出发：'))
                  const warnLine = lines.find((l: string) => l.startsWith('注意：'))
                  const relatedLine = lines.find((l: string) => l.startsWith('顺路：'))

                  return (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ background: 'rgba(176,141,87,0.08)', borderLeft: '3px solid #B08D57', borderRadius: '0 10px 10px 0', padding: '10px 12px', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
  <p style={{ fontSize: 13, color: THEME.text, lineHeight: 1.7, margin: 0, flex: 1 }}>{advice}</p>
  <button
    onClick={() => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(advice)
        u.lang = 'zh-CN'
        u.rate = 0.9
        window.speechSynthesis.speak(u)
      }
    }}
    style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 4 }}
  >
    🔊
  </button>
</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                        {departLine && (
                          <div style={{ background: 'rgba(74,158,255,0.08)', borderRadius: 12, padding: '10px 12px' }}>
                            <div style={{ fontSize: 10, color: '#4A9EFF', fontWeight: 600, marginBottom: 3 }}>🕗 出发时间</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>{departLine.replace('建议出发：', '')}</div>
                          </div>
                        )}
                        {carryLine && (
                          <div style={{ background: 'rgba(141,200,160,0.1)', borderRadius: 12, padding: '10px 12px' }}>
                            <div style={{ fontSize: 10, color: '#3A7A2A', fontWeight: 600, marginBottom: 3 }}>🎒 携带</div>
                            <div style={{ fontSize: 12, color: THEME.text, lineHeight: 1.5 }}>
                              {carryLine.replace('携带物品：', '').split('、').slice(0, 2).join('、')}
                              {carryLine.replace('携带物品：', '').split('、').length > 2 ? '...' : ''}
                            </div>
                          </div>
                        )}
                      </div>
                      {actionLine && (
                        <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: '10px 12px', marginBottom: 8, border: '1px solid rgba(0,0,0,0.06)' }}>
                          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600, marginBottom: 6, letterSpacing: '0.1em' }}>✅ 行动清单</div>
                          {actionLine.replace('行动清单：', '').split('、').map((item: string, i: number) => (
                            <div key={i} style={{ fontSize: 12, color: THEME.text, padding: '3px 0', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                              <span style={{ color: THEME.gold, flexShrink: 0 }}>·</span>{item}
                            </div>
                          ))}
                        </div>
                      )}
                      {warnLine && (
                        <div style={{ background: 'rgba(255,107,107,0.06)', borderRadius: 10, padding: '8px 12px', marginBottom: 8, border: '1px solid rgba(255,107,107,0.15)' }}>
                          <div style={{ fontSize: 11, color: '#FF6B6B', lineHeight: 1.6 }}>⚠️ {warnLine.replace('注意：', '')}</div>
                        </div>
                      )}
                      {relatedLine && (
                        <div style={{ background: 'rgba(176,141,87,0.06)', borderRadius: 10, padding: '8px 12px', marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: THEME.gold, lineHeight: 1.6 }}>🔀 {relatedLine.replace('顺路：', '')}</div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {reminderChat.length > 0 && (
                <div style={{ maxHeight: 160, overflowY: 'auto', padding: '0 20px', marginTop: 8 }}>
                  {reminderChat.map((msg: {role: string, text: string}, i: number) => (
                    <div key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '80%', padding: '8px 12px',
                        borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: msg.role === 'user' ? THEME.navy : 'rgba(255,255,255,0.8)',
                        fontSize: 12, color: msg.role === 'user' ? '#fff' : THEME.text, lineHeight: 1.6,
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {reminderLoading && (
                    <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
                      {[0,1,2].map(i => (
                        <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          style={{ width: 6, height: 6, borderRadius: '50%', background: THEME.gold }} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {reminderChat.length === 0 && (
                <div style={{ padding: '8px 20px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['还需要准备什么？', '帮我加入日历', '有什么风险？'].map(q => (
                    <button key={q} onClick={() => askReminderQuestion(q)}
                      style={{ padding: '6px 12px', borderRadius: 20, background: 'rgba(176,141,87,0.1)', border: '1px solid rgba(176,141,87,0.2)', fontSize: 11, color: THEME.gold, cursor: 'pointer' }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ padding: '8px 20px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={reminderInput}
                  onChange={e => setReminderInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && askReminderQuestion(reminderInput)}
                  placeholder="问日安..."
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)', fontSize: 13, color: THEME.text, outline: 'none' }}
                />
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => askReminderQuestion(reminderInput)}
                  style={{ width: 36, height: 36, borderRadius: '50%', background: THEME.navy, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Send size={14} color="#fff" />
                </motion.button>
              </div>

              <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
                <button onClick={() => markDone(selectedReminder.id)}
                  style={{ flex: 1, padding: 12, borderRadius: 14, background: 'rgba(141,200,160,0.4)', border: '1px solid rgba(141,200,160,0.5)', fontSize: 13, fontWeight: 600, color: THEME.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> 已处理
                </button>
                <button onClick={() => snooze(selectedReminder.id)}
                  style={{ flex: 1, padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)', fontSize: 13, color: THEME.text, opacity: 0.7, cursor: 'pointer' }}>
                  明天再说
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  )
}
