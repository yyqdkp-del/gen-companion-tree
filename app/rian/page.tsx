'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home as HomeIcon, FileText, ShoppingCart, Pill, Building2,
  Plane, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  X, Mic, Camera, Send, Square, Loader, Upload
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

const THEME = {
  bg: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)',
  text: '#2C3E50',
  gold: '#B08D57',
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

// 交错动画参数 — 每个水珠独立节奏
const DROP_ANIM = [
  { duration: 6.5, delay: 0,   yRange: 14, xRange: 5,  rotate: 1.5 },
  { duration: 8.2, delay: 1.5, yRange: 10, xRange: 7,  rotate: 2   },
  { duration: 7.0, delay: 3.2, yRange: 16, xRange: 4,  rotate: 1   },
  { duration: 5.8, delay: 0.8, yRange: 12, xRange: 6,  rotate: 2.5 },
  { duration: 9.0, delay: 2.4, yRange: 8,  xRange: 8,  rotate: 1.2 },
  { duration: 6.2, delay: 4.1, yRange: 18, xRange: 3,  rotate: 0.8 },
  { duration: 7.8, delay: 1.9, yRange: 11, xRange: 5,  rotate: 1.8 },
]

// 全屏散落，避开头像/时间/底部导航
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
}

export default function RianPage() {
  const router = useRouter()

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [children, setChildren] = useState<Child[]>([
    { id: '', name: 'William', emoji: '👦🏻', energy: 85, progress: 12 },
    { id: '', name: 'Noah', emoji: '👶🏻', energy: 42, progress: 5 },
  ])
  const [childIndex, setChildIndex] = useState(0)
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)
  const [showFamilyMenu, setShowFamilyMenu] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null)
  const [allDone, setAllDone] = useState(false)
  const [inputMode, setInputMode] = useState<'none' | 'audio_text' | 'vision_file'>('none')
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const currentChild = children[childIndex]
  const getEnergyColor = (v: number) => v > 70 ? '#4ADE80' : v > 40 ? '#FACC15' : '#FB7185'

  const syncData = useCallback(async () => {
    const { data: childData } = await supabase.from('children').select('*')
    if (childData?.length) setChildren(childData)

    const { data: remData } = await supabase
      .from('reminders')
      .select('*')
      .eq('status', 'pending')
    setReminders(remData || [])
    setAllDone((remData || []).length === 0)
  }, [])

  useEffect(() => {
    syncData()
    const channel = supabase.channel('rian_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, syncData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, syncData)
      .subscribe()
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => { supabase.removeChannel(channel); clearInterval(ticker) }
  }, [syncData])

  const markDone = async (id: string) => {
    await supabase.from('reminders').update({ status: 'done' }).eq('id', id)
    await supabase.from('user_habits').insert({
      action_type: 'mark_done',
      target_category: reminders.find(r => r.id === id)?.category,
      target_id: id,
    })
    setSelectedReminder(null)
    syncData()
  }

  const snooze = async (id: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await supabase.from('reminders').update({ due_date: tomorrow.toISOString() }).eq('id', id)
    await supabase.from('user_habits').insert({
      action_type: 'snooze',
      target_category: reminders.find(r => r.id === id)?.category,
      target_id: id,
    })
    setSelectedReminder(null)
    syncData()
  }

  const sendCommand = async () => {
    if (!inputText.trim() || sending) return
    setSending(true)
    try {
      await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text_command', command: inputText.trim(),
          child: currentChild?.name, timestamp: new Date().toISOString(), source: 'rian_text',
        }),
      })
      setInputText('')
      setInputMode('none')
    } catch (e) { console.error(e) }
    finally { setSending(false) }
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
      if (MAKE_WEBHOOK_URL) {
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'file_upload', file_url: urlData.publicUrl, category, child: currentChild?.name, timestamp: new Date().toISOString() }),
        })
      }
      setUploadStatus('done')
      setTimeout(() => { setUploadStatus('idle'); setInputMode('none') }, 1500)
    } catch { setUploadStatus('error'); setTimeout(() => setUploadStatus('idle'), 2000) }
    finally { setUploading(false) }
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

  const uploadStatusText = { idle: '', uploading: '上传中…', done: '✓ 已上传', error: '上传失败' }

  return (
    <main style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      overflow: 'hidden', background: THEME.bg, fontFamily: 'sans-serif',
    }}>

      {/* 隐藏文件输入 */}
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf,audio/*,.doc,.docx" style={{ display: 'none' }} onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* 背景水印 */}
      <div style={{ position: 'absolute', top: '12%', right: '-3%', fontSize: 'clamp(60px, 16vw, 120px)', fontWeight: 'bold', color: THEME.text, opacity: 0.07, pointerEvents: 'none', fontStyle: 'italic', whiteSpace: 'nowrap', lineHeight: 1 }}>
        日安
      </div>

      {/* 左上角：孩子头像 */}
      <div style={{ position: 'absolute', top: '5%', left: '5%', zIndex: 100 }}>
        <motion.div
          onClick={() => setShowFamilyMenu(!showFamilyMenu)}
          animate={{ boxShadow: [`0 0 15px ${getEnergyColor(currentChild?.energy)}40`, `0 0 35px ${getEnergyColor(currentChild?.energy)}80`, `0 0 15px ${getEnergyColor(currentChild?.energy)}40`] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', cursor: 'pointer' }}
        >
          <span style={{ fontSize: '30px' }}>{currentChild?.emoji}</span>
        </motion.div>
        <p style={{ marginTop: '8px', fontSize: '10px', color: THEME.text, fontWeight: 'bold', letterSpacing: '0.2em', textAlign: 'center' }}>{currentChild?.name}</p>
        <div style={{ width: '56px', height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', margin: '3px auto', overflow: 'hidden' }}>
          <motion.div animate={{ width: `${currentChild?.energy ?? 85}%`, backgroundColor: getEnergyColor(currentChild?.energy ?? 85) }} style={{ height: '100%' }} />
        </div>
      </div>

      {/* 家族切换菜单 */}
      <AnimatePresence>
        {showFamilyMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: 'absolute', top: '17%', left: '5%', zIndex: 120, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(30px)', borderRadius: '20px', padding: '12px', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', gap: '12px', alignItems: 'center' }}
          >
            {children.map((c, i) => (
              <div key={i} onClick={() => { setChildIndex(i); setShowFamilyMenu(false) }}
                style={{ cursor: 'pointer', fontSize: '26px', opacity: childIndex === i ? 1 : 0.3 }}>
                {c.emoji}
              </div>
            ))}
            <X size={14} onClick={() => setShowFamilyMenu(false)} style={{ cursor: 'pointer', opacity: 0.4 }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 右上角：时间 */}
      <header style={{ position: 'absolute', top: '5%', right: '5%', zIndex: 50, textAlign: 'right' }}>
        <h1 style={{ fontSize: 'clamp(48px, 14vw, 72px)', fontWeight: 100, color: THEME.text, opacity: 0.9, lineHeight: 1, margin: 0 }}>
          {time.getHours()}:{time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}
        </h1>
        <p style={{ fontSize: '10px', color: THEME.text, opacity: 0.35, letterSpacing: '0.25em', marginTop: '3px' }}>日安指挥中心</p>
      </header>

      {/* 空状态：今日已安 */}
      <AnimatePresence>
        {allDone && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>🌸</div>
            <p style={{ fontSize: '22px', fontWeight: 300, color: THEME.text, opacity: 0.6, letterSpacing: '0.4em' }}>今日已安</p>
            <p style={{ fontSize: '11px', color: THEME.text, opacity: 0.3, letterSpacing: '0.2em', marginTop: '8px' }}>清迈的今天很平静</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 三级提醒水珠 — 交错呼吸动画 */}
      {!allDone && reminders.map((r, i) => {
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
            style={{ position: 'absolute', top: pos.top, right: pos.right, zIndex: 20 }}
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
              <div style={{ color: THEME.text, opacity: 0.7, marginBottom: '2px' }}>{icon}</div>
              <span style={{ fontSize: '9px', fontWeight: 600, color: THEME.text, textAlign: 'center', padding: '0 5px', lineHeight: 1.2 }}>
                {r.title.length > 5 ? r.title.slice(0, 5) + '…' : r.title}
              </span>
              {isUrgent && (
                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ position: 'absolute', top: '8px', right: '10px', width: '8px', height: '8px', background: '#FF6B6B', borderRadius: '50%', border: '2px solid white' }} />
              )}
              <div style={{ position: 'absolute', top: '13px', left: '18px', width: '13px', height: '6px', background: 'rgba(255,255,255,0.45)', borderRadius: '50%', transform: 'rotate(-35deg)' }} />
            </div>
          </motion.div>
        )
      })}

      {/* 详情弹窗 */}
      <AnimatePresence>
        {selectedReminder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 12px 110px' }}
            onClick={() => setSelectedReminder(null)}
          >
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(40px)', borderRadius: '28px', padding: '22px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <p style={{ fontSize: '10px', color: THEME.text, opacity: 0.4, letterSpacing: '0.2em', marginBottom: '4px', textTransform: 'uppercase' }}>{selectedReminder.category || '提醒'}</p>
                  <h2 style={{ fontSize: '19px', fontWeight: 500, color: THEME.text, margin: 0 }}>{selectedReminder.title}</h2>
                </div>
                <X size={18} onClick={() => setSelectedReminder(null)} style={{ cursor: 'pointer', opacity: 0.4 }} />
              </div>
              {selectedReminder.description && (
                <p style={{ fontSize: '13px', color: THEME.text, opacity: 0.6, lineHeight: 1.6, marginBottom: '18px' }}>{selectedReminder.description}</p>
              )}
              {selectedReminder.due_date && (
                <p style={{ fontSize: '11px', color: THEME.text, opacity: 0.4, marginBottom: '18px' }}>
                  截止：{new Date(selectedReminder.due_date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {selectedReminder.action_url && (
                <a href={selectedReminder.action_url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px', background: 'rgba(176,141,87,0.2)', borderRadius: '14px', marginBottom: '10px', textDecoration: 'none', border: '1px solid rgba(176,141,87,0.3)' }}>
                  <ChevronRight size={15} color={THEME.gold} />
                  <span style={{ fontSize: '13px', color: THEME.gold, fontWeight: 600 }}>{selectedReminder.action_label || '立即处理'}</span>
                </a>
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => markDone(selectedReminder.id)}
                  style={{ flex: 1, padding: '12px', borderRadius: '14px', background: 'rgba(141,200,160,0.4)', border: '1px solid rgba(141,200,160,0.5)', fontSize: '13px', fontWeight: 600, color: THEME.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} /> 已处理
                </button>
                <button onClick={() => snooze(selectedReminder.id)}
                  style={{ flex: 1, padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)', fontSize: '13px', color: THEME.text, opacity: 0.7, cursor: 'pointer' }}>
                  明天再说
                </button>
              </div>
              {['visa', 'medical', 'school', 'utility'].includes(selectedReminder.category || '') && (
                <button style={{ width: '100%', marginTop: '10px', padding: '10px', borderRadius: '14px', background: 'rgba(176,141,87,0.1)', border: '1px dashed rgba(176,141,87,0.4)', fontSize: '11px', color: THEME.gold, cursor: 'pointer', letterSpacing: '0.1em' }}>
                  📄 自动生成相关文件（即将开放）
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部指挥仓 — 麦克风 / 日安 / 相机 */}
      <footer style={{ position: 'fixed', bottom: '36px', left: 0, right: 0, zIndex: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px' }}>

        {/* 输入面板 */}
        <AnimatePresence>
          {inputMode !== 'none' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              style={{ marginBottom: '16px', width: '100%', maxWidth: '360px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(40px)', borderRadius: '28px', padding: '18px', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
            >
              {inputMode === 'audio_text' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
                    <Mic size={16} />
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{isRecording ? `录音中 ${recordingSeconds}s` : '语音录制 / 文字指令'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {!isRecording ? (
                      <motion.button whileTap={{ scale: 0.9 }} onClick={startRecording}
                        style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,100,100,0.3)', border: '2px solid rgba(255,100,100,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Mic size={22} color="#E05050" />
                      </motion.button>
                    ) : (
                      <motion.button whileTap={{ scale: 0.9 }} onClick={stopRecording}
                        animate={{ boxShadow: ['0 0 0 0 rgba(255,80,80,0.4)', '0 0 0 12px rgba(255,80,80,0)', '0 0 0 0 rgba(255,80,80,0)'] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,80,80,0.5)', border: '2px solid rgba(255,80,80,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Square size={18} color="white" />
                      </motion.button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.4)', borderRadius: '14px', padding: '10px 14px' }}>
                    <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendCommand()}
                      placeholder="或输入文字指令..." style={{ flex: 1, background: 'none', border: 'none', fontSize: '14px', color: THEME.text, outline: 'none' }} />
                    <motion.div whileTap={{ scale: 0.85 }} onClick={sendCommand} style={{ cursor: 'pointer', opacity: sending ? 0.4 : 1 }}>
                      <Send size={17} style={{ color: THEME.gold }} />
                    </motion.div>
                  </div>
                  {uploadStatus !== 'idle' && <p style={{ fontSize: '11px', textAlign: 'center', color: uploadStatus === 'done' ? '#4ADE80' : '#FB7185' }}>{uploadStatusText[uploadStatus]}</p>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
                    <Camera size={16} /> <span style={{ fontSize: '12px', fontWeight: 'bold' }}>拍摄 / 上传文件</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => cameraInputRef.current?.click()}>
                      <motion.div whileTap={{ scale: 0.9 }}
                        style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.4)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                        <Camera size={24} color={THEME.text} />
                      </motion.div>
                      <span style={{ fontSize: '10px', opacity: 0.6, color: THEME.text }}>拍摄</span>
                    </div>
                    <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                      <motion.div whileTap={{ scale: 0.9 }}
                        style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.4)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                        {uploading ? <Loader size={24} color={THEME.gold} /> : <Upload size={24} color={THEME.text} />}
                      </motion.div>
                      <span style={{ fontSize: '10px', opacity: 0.6, color: THEME.text }}>上传文件</span>
                    </div>
                  </div>
                  {uploadStatus !== 'idle' && <p style={{ fontSize: '11px', textAlign: 'center', color: uploadStatus === 'done' ? '#4ADE80' : '#FB7185' }}>{uploadStatusText[uploadStatus]}</p>}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 基地弹出菜单 */}
        <AnimatePresence>
          {showBaseMenu && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              style={{ marginBottom: '12px', display: 'flex', gap: '10px' }}>
              {[{ label: '基地', path: '/' }, { label: '根·中文', path: '/chinese/decode' }, { label: '日栖', path: '/treehouse' }].map(item => (
                <button key={item.label} onClick={() => { router.push(item.path); setShowBaseMenu(false) }}
                  style={{ padding: '8px 18px', borderRadius: '14px', background: 'rgba(255,255,255,0.4)', border: 'none', fontSize: '11px', fontWeight: 'bold', color: THEME.text, backdropFilter: 'blur(10px)', cursor: 'pointer' }}>
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 底部导航条 — 麦克风 / 日安 / 相机 */}
        <div style={{ width: '100%', maxWidth: '360px', height: '62px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '31px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>

          {/* 左：麦克风 */}
          <button onClick={() => setInputMode(inputMode === 'audio_text' ? 'none' : 'audio_text')}
            style={{ width: '52px', height: '46px', borderRadius: '23px', background: inputMode === 'audio_text' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s' }}>
            <Mic size={21} color={inputMode === 'audio_text' ? THEME.gold : THEME.text} />
          </button>

          {/* 中：日安（点击弹出基地菜单） */}
          <button onClick={() => setShowBaseMenu(!showBaseMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', border: 'none', background: 'none', cursor: 'pointer' }}>
            <HomeIcon size={19} color={showBaseMenu ? THEME.gold : THEME.text} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.3em', color: showBaseMenu ? THEME.gold : THEME.text }}>日安</span>
          </button>

          {/* 右：相机 */}
          <button onClick={() => setInputMode(inputMode === 'vision_file' ? 'none' : 'vision_file')}
            style={{ width: '52px', height: '46px', borderRadius: '23px', background: inputMode === 'vision_file' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s' }}>
            <Camera size={21} color={inputMode === 'vision_file' ? THEME.gold : THEME.text} />
          </button>
        </div>
      </footer>
    </main>
  )
}
