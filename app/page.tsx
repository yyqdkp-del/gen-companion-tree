'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, Trees, Zap, Home as HomeIcon, Sprout, Mic, Camera, Send, AlertTriangle, BookOpen, Clock, Upload, X, Square, Loader } from 'lucide-react'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

type ChildStatus = { name: string; status: string; emoji?: string; energy?: number }

export default function HydroApp() {
  const router = useRouter()

  const [tasks, setTasks] = useState<any[]>([])
  const [children, setChildren] = useState<ChildStatus[]>([
    { name: 'William', emoji: '👦🏻', energy: 85, status: 'active' },
    { name: 'Noah', emoji: '👶🏻', energy: 42, status: 'active' },
  ])
  const [childIndex, setChildIndex] = useState(0)
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)
  const [showFamilyTree, setShowFamilyTree] = useState(false)
  const [inputMode, setInputMode] = useState<'none' | 'audio_text' | 'vision_file'>('none')
  const [dropConfigs, setDropConfigs] = useState<any[]>([])
  const [localEvents, setLocalEvents] = useState<any[]>([])

  // 指令文字
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)

  // 语音录音
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 文件上传
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const syncData = async () => {
      const { data: taskData } = await supabase.from('tasks').select('*').eq('status', 'pending')
      setTasks(taskData || [])

      const { data: childData } = await supabase.from('children').select('*')
      if (childData?.length) setChildren(childData)

      const { data: configData } = await supabase
        .from('app_config').select('*').eq('page', 'dashboard').eq('is_visible', true)
        .order('sort_order', { ascending: true })
      setDropConfigs(configData || [])

      const { data: eventData } = await supabase
        .from('local_events').select('*').eq('is_active', true)
        .order('created_at', { ascending: false }).limit(1)
      setLocalEvents(eventData || [])
    }

    syncData()
    const channel = supabase.channel('realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, syncData)
      .subscribe()
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => { supabase.removeChannel(channel); clearInterval(ticker) }
  }, [])

  const currentChild = children[childIndex]
  const getEnergyColor = (val: number) => val > 70 ? '#4ADE80' : val > 40 ? '#FACC15' : '#FB7185'

  // ── 发送文字指令到 Make ──
  const sendCommand = async () => {
    if (!inputText.trim() || sending) return
    setSending(true)
    try {
      await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text_command',
          command: inputText.trim(),
          child: currentChild?.name,
          timestamp: new Date().toISOString(),
          source: 'app_text_input',
        }),
      })
      setInputText('')
      setInputMode('none')
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  // ── 开始录音 ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        await uploadFile(audioBlob, 'audio', `voice_${Date.now()}.webm`)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1)
      }, 1000)
    } catch (e) {
      alert('请允许麦克风权限')
    }
  }

  // ── 停止录音 ──
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }

  // ── 上传文件到 Supabase Storage + 通知 Make ──
  const uploadFile = async (file: Blob | File, category: string, filename?: string) => {
    setUploading(true)
    setUploadStatus('uploading')
    try {
      const name = filename || (file instanceof File ? file.name : `file_${Date.now()}`)
      const path = `uploads/${category}/${Date.now()}_${name}`

      const { data, error } = await supabase.storage
        .from('companion-files')
        .upload(path, file, { upsert: true })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('companion-files')
        .getPublicUrl(path)

      // 通知 Make.com 处理这个文件
      if (MAKE_WEBHOOK_URL) {
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'file_upload',
            file_url: urlData.publicUrl,
            file_path: path,
            category,
            child: currentChild?.name,
            timestamp: new Date().toISOString(),
            source: 'app_upload',
          }),
        })
      }

      setUploadStatus('done')
      setTimeout(() => {
        setUploadStatus('idle')
        setInputMode('none')
      }, 1500)
    } catch (e) {
      console.error(e)
      setUploadStatus('error')
      setTimeout(() => setUploadStatus('idle'), 2000)
    } finally {
      setUploading(false)
    }
  }

  // ── 处理文件选择 ──
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 自动判断分类
    const category = file.type.startsWith('image/') ? 'image'
      : file.type === 'application/pdf' ? 'document'
      : file.type.startsWith('audio/') ? 'audio'
      : 'other'
    await uploadFile(file, category)
  }

  const iconMap: Record<string, React.ReactNode> = {
    TaskCard: <Bell size={18} />, EnergyCard: <Zap size={18} />,
    ChildCard: <Heart size={18} />, WeatherCard: <Trees size={18} />,
    AlertCard: <AlertTriangle size={18} />, ClockCard: <Clock size={18} />,
    BookCard: <BookOpen size={18} />,
  }
  const colorMap: Record<string, string> = {
    TaskCard: 'rgba(141, 160, 138, 0.4)', EnergyCard: 'rgba(212, 169, 106, 0.4)',
    ChildCard: 'rgba(232, 168, 154, 0.4)', WeatherCard: 'rgba(154, 183, 232, 0.4)',
    AlertCard: '#FB7185', ClockCard: 'rgba(154, 183, 232, 0.4)', BookCard: 'rgba(212, 169, 106, 0.4)',
  }
  const positions = [
    { top: '25%', right: '15%' }, { top: '42%', right: '28%' },
    { top: '59%', right: '12%' }, { top: '76%', right: '24%' },
    { top: '33%', right: '35%' }, { top: '65%', right: '38%' },
  ]
  const getDropValue = (component: string, config: any) => {
    if (component === 'TaskCard') return tasks.length > 0 ? `${tasks.length} 条` : '静默'
    if (component === 'ChildCard') {
      const sm: Record<string, string> = { sleeping: '睡眠中', active: '活跃', school: '上学中', eating: '用餐中' }
      return sm[currentChild?.status] || '活跃'
    }
    if (component === 'AlertCard') return localEvents[0]?.title_cn?.slice(0, 4) || 'Grok 侦察'
    if (component === 'BookCard') return `${(currentChild as any)?.progress ?? 0} 字`
    return config.config_value?.value ?? '—'
  }

  const uploadStatusText = { idle: '', uploading: '上传中…', done: '✓ 已上传，Make 处理中', error: '上传失败，请重试' }

  return (
    <main style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden',
      background: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)', fontFamily: 'sans-serif'
    }}>

      {/* 背景水印 */}
      <div style={{ position: 'absolute', top: '15%', right: '-5%', fontSize: '18vw', fontWeight: 'bold', color: '#2C3E50', opacity: 0.1, pointerEvents: 'none', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
        根·陪伴
      </div>

      {/* 左上角：头像 */}
      <div style={{ position: 'absolute', top: '6%', left: '6%', zIndex: 100 }}>
        <div style={{ position: 'relative' }}>
          <motion.div
            onClick={() => setChildIndex(i => (i + 1) % children.length)}
            animate={{ boxShadow: [`0 0 15px ${getEnergyColor(currentChild?.energy ?? 85)}40`, `0 0 35px ${getEnergyColor(currentChild?.energy ?? 85)}80`, `0 0 15px ${getEnergyColor(currentChild?.energy ?? 85)}40`] }}
            transition={{ duration: 4, repeat: Infinity }}
            style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '36px' }}>{(currentChild as any)?.emoji || '👶🏻'}</span>
          </motion.div>
          <motion.button
            onClick={() => setShowFamilyTree(!showFamilyTree)} whileTap={{ scale: 0.8 }}
            style={{ position: 'absolute', bottom: '-5px', left: '-5px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8DA08A', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
          >
            <Sprout size={18} />
          </motion.button>
        </div>
        <p style={{ marginTop: '12px', fontSize: '11px', color: '#2C3E50', fontWeight: 'bold', letterSpacing: '0.2em', textAlign: 'center' }}>{currentChild?.name}</p>
        <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden', margin: '4px auto' }}>
          <motion.div animate={{ width: `${currentChild?.energy ?? 85}%`, backgroundColor: getEnergyColor(currentChild?.energy ?? 85) }} style={{ height: '100%' }} />
        </div>
      </div>

      {/* 家族树弹窗 */}
      <AnimatePresence>
        {showFamilyTree && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: 'absolute', top: '15%', left: '6%', zIndex: 120, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(30px)', borderRadius: '25px', padding: '15px', border: '1px solid rgba(255,255,255,0.5)', width: '220px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.5 }}>家族成员</span>
              <X size={14} onClick={() => setShowFamilyTree(false)} style={{ cursor: 'pointer', opacity: 0.4 }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
              {children.map((c, i) => (
                <div key={i} onClick={() => setChildIndex(i)} style={{ cursor: 'pointer', fontSize: '24px', opacity: childIndex === i ? 1 : 0.3 }}>{(c as any).emoji}</div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 时间 */}
      <header style={{ position: 'absolute', top: '6%', right: '8%', zIndex: 50, textAlign: 'right' }}>
        <h1 style={{ fontSize: '72px', fontWeight: 100, color: '#2C3E50', opacity: 0.9, lineHeight: 1, margin: 0 }}>
          {time.getHours()}:{time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}
        </h1>
      </header>

      {/* 水珠区 */}
      {dropConfigs.map((config, i) => {
        const pos = positions[i] || positions[0]
        const value = getDropValue(config.component, config)
        const label = config.config_value?.title ?? config.component
        const alert = config.component === 'TaskCard' ? tasks.length > 0 : config.component === 'AlertCard' ? localEvents.length > 0 : false
        return (
          <LiquidDrop key={config.id} icon={iconMap[config.component] ?? <Bell size={18} />}
            label={label} value={value} top={pos.top} right={pos.right}
            color={colorMap[config.component] ?? 'rgba(141,160,138,0.4)'} alert={alert} delay={i * 1.5} />
        )
      })}

      {/* 底部指挥仓 */}
      <footer style={{ position: 'fixed', bottom: '48px', left: 0, right: 0, zIndex: 110, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* 隐藏文件输入 */}
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf,audio/*,.doc,.docx" style={{ display: 'none' }} onChange={handleFileChange} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />

        <AnimatePresence>
          {inputMode !== 'none' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              style={{ marginBottom: '20px', width: '340px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(40px)', borderRadius: '30px', padding: '20px', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
            >
              {inputMode === 'audio_text' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.6 }}>
                    <Mic size={18} />
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                      {isRecording ? `录音中 ${recordingSeconds}s — 点停止` : '语音录制 / 文字指令'}
                    </span>
                  </div>

                  {/* 录音按钮 */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    {!isRecording ? (
                      <motion.button whileTap={{ scale: 0.9 }} onClick={startRecording}
                        style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,100,100,0.3)', border: '2px solid rgba(255,100,100,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Mic size={24} color="#E05050" />
                      </motion.button>
                    ) : (
                      <motion.button whileTap={{ scale: 0.9 }} onClick={stopRecording}
                        animate={{ boxShadow: ['0 0 0 0 rgba(255,80,80,0.4)', '0 0 0 12px rgba(255,80,80,0)', '0 0 0 0 rgba(255,80,80,0)'] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,80,80,0.5)', border: '2px solid rgba(255,80,80,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Square size={20} color="white" />
                      </motion.button>
                    )}
                  </div>

                  {/* 文字输入 */}
                  <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.4)', borderRadius: '15px', padding: '10px 15px' }}>
                    <input autoFocus value={inputText} onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendCommand()}
                      placeholder="或输入文字指令..."
                      style={{ flex: 1, background: 'none', border: 'none', fontSize: '14px', color: '#2C3E50', outline: 'none' }} />
                    <motion.div whileTap={{ scale: 0.85 }} onClick={sendCommand} style={{ cursor: 'pointer', opacity: sending ? 0.4 : 1 }}>
                      <Send size={18} style={{ color: '#B08D57' }} />
                    </motion.div>
                  </div>

                  {uploadStatus !== 'idle' && (
                    <p style={{ fontSize: '11px', textAlign: 'center', color: uploadStatus === 'done' ? '#4ADE80' : uploadStatus === 'error' ? '#FB7185' : '#2C3E50', opacity: 0.8 }}>
                      {uploadStatusText[uploadStatus]}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.6 }}>
                    <Camera size={18} />
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>拍摄 / 上传文件</span>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', padding: '10px' }}>
                    {/* 拍摄 */}
                    <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => cameraInputRef.current?.click()}>
                      <motion.div whileTap={{ scale: 0.9 }}
                        style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.4)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', border: '1px solid rgba(255,255,255,0.6)' }}>
                        <Camera size={26} color="#2C3E50" />
                      </motion.div>
                      <span style={{ fontSize: '10px', opacity: 0.6, color: '#2C3E50' }}>拍摄</span>
                    </div>
                    {/* 上传文件 */}
                    <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                      <motion.div whileTap={{ scale: 0.9 }}
                        style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.4)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', border: '1px solid rgba(255,255,255,0.6)' }}>
                        {uploading ? <Loader size={26} color="#B08D57" /> : <Upload size={26} color="#2C3E50" />}
                      </motion.div>
                      <span style={{ fontSize: '10px', opacity: 0.6, color: '#2C3E50' }}>上传文件</span>
                    </div>
                  </div>

                  {uploadStatus !== 'idle' && (
                    <p style={{ fontSize: '11px', textAlign: 'center', color: uploadStatus === 'done' ? '#4ADE80' : uploadStatus === 'error' ? '#FB7185' : '#2C3E50', opacity: 0.8 }}>
                      {uploadStatusText[uploadStatus]}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ width: '380px', height: '64px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
          <button onClick={() => setInputMode(inputMode === 'audio_text' ? 'none' : 'audio_text')}
            style={{ width: '54px', height: '48px', borderRadius: '24px', background: inputMode === 'audio_text' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s' }}>
            <Mic size={22} color={inputMode === 'audio_text' ? '#B08D57' : '#2C3E50'} />
          </button>

          <button onClick={() => setShowBaseMenu(!showBaseMenu)} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer' }}>
            <HomeIcon size={20} color={showBaseMenu ? '#B08D57' : '#2C3E50'} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.3em', color: showBaseMenu ? '#B08D57' : '#2C3E50' }}>基地</span>
          </button>

          <button onClick={() => setInputMode(inputMode === 'vision_file' ? 'none' : 'vision_file')}
            style={{ width: '54px', height: '48px', borderRadius: '24px', background: inputMode === 'vision_file' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s' }}>
            <Camera size={22} color={inputMode === 'vision_file' ? '#B08D57' : '#2C3E50'} />
          </button>
        </div>

        {/* 基地菜单 */}
        <AnimatePresence>
          {showBaseMenu && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              style={{ position: 'absolute', bottom: '80px', display: 'flex', gap: '10px' }}
            >
              {[
  { label: '基地', path: '/' },
  { label: '日安', path: '/rian' },
  { label: '根', path: '/growth' },
  { label: '树洞', path: '/treehouse' },
].map(item => (
                <button key={item.label} onClick={() => router.push(item.path)}
                  style={{ padding: '8px 20px', borderRadius: '15px', background: item.path === '/' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)', border: 'none', fontSize: '11px', fontWeight: 'bold', color: '#2C3E50', backdropFilter: 'blur(10px)', cursor: 'pointer' }}>
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </main>
  )
}

function LiquidDrop({ icon, label, value, top, right, color, alert, delay }: any) {
  return (
    <motion.div animate={{ y: [0, -12, 0], rotate: [0, 1, -1, 0] }} transition={{ duration: 7, repeat: Infinity, delay, ease: 'easeInOut' }}
      style={{ position: 'absolute', top, right, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '92px', height: '92px', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '66% 34% 71% 29% / 37% 53% 47% 63%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3) 0%, ${color} 100%)`, boxShadow: 'inset 5px 5px 10px rgba(255,255,255,0.3), 10px 15px 25px rgba(0,0,0,0.05)' }}>
        <div style={{ color: '#2C3E50', opacity: 0.7, marginBottom: '2px' }}>{icon}</div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#2C3E50' }}>{value}</span>
        <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#2C3E50', opacity: 0.3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
        {alert && <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ position: 'absolute', top: '10px', right: '15px', width: '10px', height: '10px', backgroundColor: '#FB7185', borderRadius: '50%', border: '2px solid white' }} />}
        <div style={{ position: 'absolute', top: '16px', left: '24px', width: '16px', height: '8px', background: 'rgba(255,255,255,0.4)', borderRadius: '50%', transform: 'rotate(-35deg)' }} />
      </div>
    </motion.div>
  )
}
