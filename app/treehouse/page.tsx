'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { handleLimitReached } from '@/lib/limits/client'
import { useApp } from '@/app/context/AppContext'
import { motion, AnimatePresence } from 'framer-motion'

const supabase = createClient(
)

// ── 深夜树洞视觉 token（对齐 UI Kit Treehouse.jsx）──
const TREEHOUSE_BASE = 'var(--night)'
const TREEHOUSE_GRADIENT = 'linear-gradient(135deg, var(--night-1) 0%, var(--night-2) 50%, var(--night-1) 100%)'

const THEME = {
  goldNight: 'rgba(230,168,158,0.85)',
  goldDim: 'rgba(230,168,158,0.35)',
  fgDark: 'var(--fg-on-dark)',
  fgDim: 'rgba(230,232,214,0.55)',
  eyebrow: 'rgba(230,232,214,0.4)',
  aiText: '#f0ebe4',
  aiBubble: 'rgba(255,255,255,0.07)',
  aiBorder: 'rgba(255,255,255,0.1)',
  userBubble: 'rgba(164,99,85,0.25)',
  userText: 'rgba(230,168,158,0.9)',
  pinBorder: 'rgba(230,168,158,0.4)',
  pinFill: 'rgba(230,168,158,0.85)',
  keyBg: 'rgba(255,255,255,0.04)',
  keyBorder: 'rgba(255,255,255,0.08)',
  inputBg: 'rgba(255,255,255,0.07)',
  inputBorder: 'rgba(232,213,184,0.12)',
  placeholder: 'rgba(230,232,214,0.4)',
  sendBg: 'rgba(230,168,158,0.2)',
  glow: 'radial-gradient(circle, rgba(26,74,58,0.5) 0%, rgba(16,19,38,0) 70%)',
  star: 'rgba(230,168,158,0.6)',
}

function TreehouseBackdrop({ thinking }: { thinking?: boolean }) {
  return (
    <>
      <div
        className={thinking ? undefined : 'treehouse-breathe'}
        style={{
          position: 'absolute',
          left: '50%',
          top: thinking ? '25%' : '38%',
          width: thinking ? '90vw' : 340,
          height: thinking ? '90vw' : 340,
          marginLeft: thinking ? '-45vw' : -170,
          marginTop: thinking ? '-45vw' : -170,
          borderRadius: '50%',
          background: THEME.glow,
          pointerEvents: 'none',
          zIndex: 0,
          ...(thinking
            ? { animation: 'gcBreathe 3s infinite ease-in-out' }
            : {}),
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: TREEHOUSE_GRADIENT,
          opacity: 0.6,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    </>
  )
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

type LightFlash = { id: string; x: number; y: number }

export default function TreehousePage() {
  const router = useRouter()
  const { kids: enrichedKids, userId } = useApp()

  // ── 密码验证（同一会话内免重复输入 PIN）──
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return sessionStorage.getItem('treehouse_unlocked') === '1'
    } catch {
      return false
    }
  })
  const unlock = () => {
    try {
      sessionStorage.setItem('treehouse_unlocked', '1')
    } catch { /* 隐私模式等 */ }
    setUnlocked(true)
  }
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [pinShaking, setPinShaking] = useState(false)

  // ── 对话 ──
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [thinking, setThinking] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [lightFlashes, setLightFlashes] = useState<LightFlash[]>([])
  const [longPressing, setLongPressing] = useState(false)
  const [greetingDone, setGreetingDone] = useState(false)
  const [greetingText, setGreetingText] = useState('')
  const [contextData, setContextData] = useState('')

  // ── 深夜模式 ──
  const hour = new Date().getHours()
  const isLateNight = hour >= 22 || hour < 6
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<Message[]>([])
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionId = useRef(crypto.randomUUID())
  const inputRef = useRef<HTMLInputElement>(null)

  // ── 自动滚动到底部 ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const handle = () => {
      const kbH = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      document.documentElement.style.setProperty('--treehouse-kb', `${kbH}px`)
    }
    vv.addEventListener('resize', handle)
    vv.addEventListener('scroll', handle)
    handle()
    return () => {
      vv.removeEventListener('resize', handle)
      vv.removeEventListener('scroll', handle)
      document.documentElement.style.removeProperty('--treehouse-kb')
    }
  }, [])

  // ── 加载孩子上下文 ──
  const loadContext = useCallback(async () => {
    const { data: children } = await supabase.from('children').select('*')
    const { data: tasks } = await supabase.from('tasks').select('*').eq('status', 'pending').limit(5)
    const { data: reminders } = await supabase.from('reminders').select('*').eq('status', 'pending').limit(5)
    const { data: habits } = await supabase.from('user_habits').select('*').order('created_at', { ascending: false }).limit(10)

    const formatChildStatus = (c: { id?: string; name?: string; energy?: number | null; energy_label?: string }) => {
      const enriched = enrichedKids.find(k => k.id === c.id) as typeof c | undefined
      const label = enriched?.energy_label || c.energy_label
      if (label) return `${c.name}: ${label}`
      const energy = enriched?.energy ?? c.energy
      if (energy != null) return `${c.name}: 精力${energy}%`
      return `${c.name}: 暂无精力数据`
    }

    const timeOfDay = isLateNight ? '深夜' : hour < 12 ? '清晨' : '午后'
    const ctx = `
【当前时间】${new Date().toLocaleString('zh-CN')}（${timeOfDay}）
【孩子状态】${(children || []).map(formatChildStatus).join('、')}
【待处理任务】${(tasks || []).map(t => t.title).join('、') || '暂无'}
【近期提醒】${(reminders || []).map(r => `${r.title}(${r.category})`).join('、') || '暂无'}
【妈妈近期习惯】${(habits || []).map(h => `${h.action_type}:${h.target_category}`).join('、') || '暂无'}
`
    setContextData(ctx)
  }, [isLateNight, hour, enrichedKids])

  // ── 逐字显示开场问候 ──
  const showGreeting = useCallback(() => {
    const greet = isLateNight
      ? '夜深了。孩子睡了吗？我在这里，想说什么都行。'
      : '妈妈，今天怎么样？我听着呢。'

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (endTimerRef.current) {
      clearTimeout(endTimerRef.current)
      endTimerRef.current = null
    }

    let i = 0
    intervalRef.current = setInterval(() => {
      setGreetingText(greet.slice(0, i + 1))
      i++
      if (i >= greet.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        endTimerRef.current = setTimeout(() => {
          endTimerRef.current = null
          setGreetingDone(true)
          addMessage('assistant', greet)
          setGreetingText('')
        }, 800)
      }
    }, 80)
  }, [isLateNight])

  useEffect(() => {
    if (!unlocked) {
      if (greetingTimerRef.current) {
        clearTimeout(greetingTimerRef.current)
        greetingTimerRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (endTimerRef.current) {
        clearTimeout(endTimerRef.current)
        endTimerRef.current = null
      }
      return
    }
    void loadContext()
    greetingTimerRef.current = setTimeout(() => {
      greetingTimerRef.current = null
      showGreeting()
    }, 1800)
    return () => {
      if (greetingTimerRef.current) {
        clearTimeout(greetingTimerRef.current)
        greetingTimerRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (endTimerRef.current) {
        clearTimeout(endTimerRef.current)
        endTimerRef.current = null
      }
    }
  }, [unlocked, loadContext, showGreeting])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current)
      if (endTimerRef.current) clearTimeout(endTimerRef.current)
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current)
    }
  }, [])

  // ── 密码验证 ──
  const verifyPin = async (currentPin?: string) => {
    const checkPin = currentPin ?? pin
    try {
      const res = await fetchWithAuth('/api/treehouse/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ pin: checkPin }),
      })
      const data = await res.json()
      if (data?.ok) {
        unlock()
      } else {
        setPinError(true)
        setPinShaking(true)
        setPin('')
        setTimeout(() => { setPinError(false); setPinShaking(false) }, 600)
      }
    } catch (e) {
      logOrAlertNetworkError(e)
      setPinError(true)
      setPinShaking(true)
      setPin('')
      setTimeout(() => { setPinError(false); setPinShaking(false) }, 600)
    }
  }

  const handlePinKey = (key: string) => {
    if (key === 'del') {
      setPin(p => p.slice(0, -1))
    } else if (pin.length < 6) {
      const next = pin + key
      setPin(next)
      if (next.length === 6) setTimeout(() => verifyPin(next), 200)
    }
  }

  // ── 添加消息 ──
  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const msg: Message = { id: crypto.randomUUID(), role, content, timestamp: Date.now() }
    setMessages(prev => { const u = [...prev, msg]; messagesRef.current = u; return u })
    if (userId) {
      void supabase.from('conversation_log').insert({
        user_id: userId,
        session_id: sessionId.current,
        role,
        content,
      })
    }

    // 提到孩子时触发光点闪烁
    if (role === 'assistant' && (content.includes('William') || content.includes('Noah') || content.includes('孩子'))) {
      triggerLightFlash()
    }

    // 触感反馈
    if (role === 'assistant' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([15, 80, 10])
    }
  }

  // ── 背景光点 ──
  const triggerLightFlash = () => {
    const flash: LightFlash = {
      id: crypto.randomUUID(),
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
    }
    setLightFlashes(prev => [...prev, flash])
    setTimeout(() => setLightFlashes(prev => prev.filter(f => f.id !== flash.id)), 2000)
  }

  // ── 发送给 Claude ──
  const sendMessage = async (text: string) => {
    if (!text.trim() || thinking) return
    addMessage('user', text)
    setInputText('')
    setThinking(true)

    const history = messagesRef.current.slice(-10).map(m => ({ role: m.role, content: m.content }))

    try {
      const response = await fetchWithAuth('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: text }],
          contextData,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (handleLimitReached(data, () => router.push('/upgrade'))) {
          setThinking(false)
          return
        }
        throw new Error('请求失败')
      }
      const reply = data.content?.[0]?.text || '我在。'
      const delay = 600 + Math.random() * 800
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current)
      sendTimerRef.current = setTimeout(() => {
        sendTimerRef.current = null
        setThinking(false)
        addMessage('assistant', reply)
      }, delay)
    } catch (e) {
      logOrAlertNetworkError(e)
      if (sendTimerRef.current) {
        clearTimeout(sendTimerRef.current)
        sendTimerRef.current = null
      }
      setThinking(false)
      addMessage('assistant', '我在，只是信号不太好。再说一次？')
    }
  }

  // ── 长按录音预留 ──
  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (inputFocused) return
    longPressTimer.current = setTimeout(() => setLongPressing(true), 600)
  }
  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    if (longPressing) {
      setLongPressing(false)
      // TODO: 接入 ElevenLabs STT
    }
  }

  // ══════════════════════════════════════
  // 密码界面
  // ══════════════════════════════════════
  if (!unlocked) {
    return (
      <main
        style={{
          position: 'fixed',
          inset: 0,
          minHeight: '100dvh',
          background: TREEHOUSE_BASE,
          fontFamily: 'var(--font-serif)',
          overflow: 'hidden',
        }}
      >
        <TreehouseBackdrop />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
          style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 36px',
            gap: 22,
            zIndex: 10,
          }}
        >
          <div className="gc-eyebrow" style={{ color: THEME.eyebrow, letterSpacing: '0.6em' }}>
            私密空间
          </div>

          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 300,
              fontSize: 34,
              color: THEME.goldNight,
              letterSpacing: '0.4em',
              marginRight: '-0.4em',
            }}
          >
            日栖
          </div>

          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 300,
              fontSize: 13.5,
              lineHeight: 1.9,
              color: THEME.fgDim,
              textAlign: 'center',
              margin: 0,
            }}
          >
            夜深了。这里只有你和根。
            <br />
            输入六位密语，进入树洞。
          </p>

          <motion.div
            animate={pinShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', gap: 15, margin: '6px 0 2px' }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  border: `1px solid ${pinError ? '#c87a6a' : THEME.pinBorder}`,
                  background: i < pin.length ? (pinError ? '#c87a6a' : THEME.pinFill) : 'transparent',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </motion.div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
              marginTop: 6,
            }}
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, i) =>
              key === '' ? (
                <span key={i} />
              ) : (
                <motion.button
                  key={i}
                  type="button"
                  whileTap={{ scale: 0.9, opacity: 0.85 }}
                  onClick={() => handlePinKey(key)}
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    border: `1px solid ${THEME.keyBorder}`,
                    background: THEME.keyBg,
                    color: THEME.fgDark,
                    fontFamily: 'var(--font-serif)',
                    fontSize: key === 'del' ? 16 : 20,
                    fontWeight: 300,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {key === 'del' ? '⌫' : key}
                </motion.button>
              ),
            )}
          </div>
        </motion.div>
      </main>
    )
  }

  const clockLabel = new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  // ══════════════════════════════════════
  // 主界面
  // ══════════════════════════════════════
  return (
    <main
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      style={{
        position: 'fixed',
        inset: 0,
        minHeight: '100dvh',
        background: TREEHOUSE_BASE,
        overflow: 'hidden',
        fontFamily: 'var(--font-serif)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TreehouseBackdrop thinking={thinking} />

      {!userId && (
        <p
          style={{
            position: 'relative',
            zIndex: 20,
            margin: 0,
            padding: 'max(env(safe-area-inset-top), 8px) 16px 6px',
            textAlign: 'center',
            fontSize: 11,
            color: THEME.fgDim,
            letterSpacing: '0.06em',
          }}
        >
          登录后可保存对话记录
        </p>
      )}

      {/* ── 背景光点（提到孩子时闪现） ── */}
      <AnimatePresence>
        {lightFlashes.map(flash => (
          <motion.div key={flash.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0, 1.5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: `${flash.x}%`, top: `${flash.y}%`,
              width: '4px', height: '4px', borderRadius: '50%',
              background: THEME.star, pointerEvents: 'none', zIndex: 1,
            }}
          />
        ))}
      </AnimatePresence>

      <div style={{ position: 'absolute', top: 'max(env(safe-area-inset-top), 12px)', right: 12, zIndex: 20, display: 'flex', gap: 8 }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push('/treehouse/mom')}
          style={{
            background: THEME.inputBg,
            border: `1px solid ${THEME.inputBorder}`,
            borderRadius: 999,
            color: THEME.goldNight,
            fontSize: 12,
            cursor: 'pointer',
            padding: '7px 14px',
            letterSpacing: '0.08em',
            fontFamily: 'var(--font-serif)',
          }}
        >
          🌸 木棉树洞
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => router.push('/')}
          style={{
            background: 'none',
            border: 'none',
            color: THEME.fgDim,
            fontSize: 18,
            cursor: 'pointer',
            opacity: 0.5,
            padding: '4px 8px',
          }}
        >
          ×
        </motion.button>
      </div>

      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: 'max(env(safe-area-inset-top), 20px) 0 10px', flexShrink: 0 }}>
        <div className="gc-eyebrow" style={{ color: THEME.eyebrow, letterSpacing: '0.5em' }}>
          木棉树洞
        </div>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 300,
            fontSize: 15,
            color: THEME.goldNight,
            marginTop: 6,
            letterSpacing: '0.1em',
          }}
        >
          {clockLabel} · 只有你和根
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 22px 24px',
          position: 'relative',
          zIndex: 10,
          scrollbarWidth: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 13,
        }}
      >

        {/* 逐字开场问候 */}
        <AnimatePresence>
          {greetingText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ alignSelf: 'flex-start', maxWidth: '80%' }}
            >
              <div
                style={{
                  background: THEME.aiBubble,
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${THEME.aiBorder}`,
                  borderRadius: '18px 18px 18px 4px',
                  padding: '12px 16px',
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 300,
                  fontSize: 14,
                  lineHeight: 1.85,
                  letterSpacing: '0.03em',
                  color: THEME.aiText,
                }}
              >
                {greetingText}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ color: THEME.goldNight, marginLeft: 2 }}
                >
                  |
                </motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 消息 */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.94, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
              }}
            >
              <div
                style={{
                  background: msg.role === 'user' ? THEME.userBubble : THEME.aiBubble,
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${msg.role === 'user' ? THEME.inputBorder : THEME.aiBorder}`,
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '12px 16px',
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 300,
                  fontSize: 14,
                  lineHeight: 1.85,
                  letterSpacing: '0.03em',
                  color: msg.role === 'user' ? THEME.userText : THEME.aiText,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 思考状态 */}
        <AnimatePresence>
          {thinking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ alignSelf: 'flex-start' }}
            >
              <div
                style={{
                  background: THEME.aiBubble,
                  backdropFilter: 'blur(20px)',
                  borderRadius: '18px 18px 18px 4px',
                  padding: '14px 20px',
                  border: `1px solid ${THEME.aiBorder}`,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                {[0,1,2].map(i => (
                  <motion.div key={i}
                    animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.35 }}
                    style={{ width: '5px', height: '5px', borderRadius: '50%', background: THEME.star }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ── 长按漩涡 ── */}
      <AnimatePresence>
        {longPressing && (
          <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
            style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50, pointerEvents: 'none' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              style={{ width: '100px', height: '100px', borderRadius: '50%', border: `1px solid ${THEME.goldDim}`, opacity: 0.4 }} />
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              style={{ position: 'absolute', inset: '12px', borderRadius: '50%', border: `1px solid ${THEME.goldDim}`, opacity: 0.2 }} />
            <p style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: THEME.goldDim, fontSize: '10px', letterSpacing: '0.2em', whiteSpace: 'nowrap', opacity: 0.6 }}>松手发送</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '10px 18px 16px',
          paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px + var(--treehouse-kb, 0px))',
          flexShrink: 0,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <AnimatePresence>
          {inputFocused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(16,19,38,0.5)',
                zIndex: -1,
                pointerEvents: 'none',
              }}
            />
          )}
        </AnimatePresence>

        <div
          style={{
            flex: 1,
            background: THEME.inputBg,
            border: `1px solid ${inputFocused ? 'rgba(232,213,184,0.2)' : THEME.inputBorder}`,
            borderRadius: 20,
            padding: '12px 16px',
            transition: 'border-color 0.4s',
          }}
        >
          <input
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(inputText)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={isLateNight ? '夜深了，说说吧…' : '想对根说点什么…'}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: THEME.aiText,
              fontSize: 13.5,
              fontWeight: 300,
              outline: 'none',
              fontFamily: 'var(--font-serif)',
              letterSpacing: '0.03em',
              caretColor: THEME.goldNight,
            }}
          />
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={() => sendMessage(inputText)}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: THEME.sendBg,
            color: THEME.goldNight,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
            opacity: inputText.trim() ? 1 : 0.55,
          }}
          aria-label="发送"
        >
          ↑
        </motion.button>
      </div>

      <p
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          fontSize: 9,
          color: THEME.fgDim,
          opacity: 0.35,
          letterSpacing: '0.2em',
          margin: '0 0 8px',
          paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        长按屏幕说话（即将开放）
      </p>
    </main>
  )
}
