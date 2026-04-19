'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// ── 深夜色系 ──
const THEME = {
  bg1: '#020617',
  bg2: '#0A1F18',
  glow: '#1a4a3a',
  gold: '#E8D5B8',
  goldDim: '#8a7a6a',
  aiText: '#A8C4B8',
  aiBubble: 'rgba(20,50,40,0.6)',
  userBubble: 'rgba(80,60,30,0.5)',
  textDim: '#4a5a52',
  star: '#6a9a8a',
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

  // ── 密码验证 ──
  const [unlocked, setUnlocked] = useState(false)
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
  const bgOpacityRange = isLateNight ? [0.03, 0.08] : [0.05, 0.15]
  const glowDuration = isLateNight ? 12 : 8

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<Message[]>([])
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const sessionId = useRef(crypto.randomUUID())
  const inputRef = useRef<HTMLInputElement>(null)

  // ── 自动滚动到底部 ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  // ── 加载孩子上下文 ──
  const loadContext = useCallback(async () => {
    const { data: children } = await supabase.from('children').select('*')
    const { data: tasks } = await supabase.from('tasks').select('*').eq('status', 'pending').limit(5)
    const { data: reminders } = await supabase.from('reminders').select('*').eq('status', 'pending').limit(5)
    const { data: habits } = await supabase.from('user_habits').select('*').order('created_at', { ascending: false }).limit(10)

    const timeOfDay = isLateNight ? '深夜' : hour < 12 ? '清晨' : '午后'
    const ctx = `
【当前时间】${new Date().toLocaleString('zh-CN')}（${timeOfDay}）
【孩子状态】${(children || []).map(c => `${c.name}: 精力${c.energy ?? 85}%`).join('、')}
【待处理任务】${(tasks || []).map(t => t.title).join('、') || '暂无'}
【近期提醒】${(reminders || []).map(r => `${r.title}(${r.category})`).join('、') || '暂无'}
【妈妈近期习惯】${(habits || []).map(h => `${h.action_type}:${h.target_category}`).join('、') || '暂无'}
`
    setContextData(ctx)
  }, [isLateNight, hour])

  // ── 逐字显示开场问候 ──
  const showGreeting = useCallback(async () => {
    const greet = isLateNight
      ? '夜深了。孩子睡了吗？我在这里，想说什么都行。'
      : '妈妈，今天怎么样？我听着呢。'

    let i = 0
    const timer = setInterval(() => {
      setGreetingText(greet.slice(0, i + 1))
      i++
      if (i >= greet.length) {
        clearInterval(timer)
        setTimeout(() => {
          setGreetingDone(true)
          addMessage('assistant', greet)
          setGreetingText('')
        }, 800)
      }
    }, 80)
  }, [isLateNight])

  useEffect(() => {
    if (unlocked) {
      loadContext()
      setTimeout(showGreeting, 1800)
    }
  }, [unlocked, loadContext, showGreeting])

  // ── 密码验证 ──
  const verifyPin = async (currentPin?: string) => {
    const checkPin = currentPin ?? pin
    const { data } = await supabase.from('riqi_access').select('password_hash').single()
    if (data?.password_hash === checkPin) {
      setUnlocked(true)
    } else {
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
    supabase.from('conversation_log').insert({ session_id: sessionId.current, role, content }).then(() => {})

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: text }],
          contextData,
        }),
      })

      const data = await response.json()
      const reply = data.content?.[0]?.text || '我在。'
      setTimeout(() => { setThinking(false); addMessage('assistant', reply) }, 600 + Math.random() * 800)
    } catch {
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
      <main style={{
        position: 'fixed', inset: 0,
        background: `linear-gradient(160deg, ${THEME.bg1} 0%, ${THEME.bg2} 100%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Noto Serif SC', 'SimSun', Georgia, serif",
      }}>

        {/* 呼吸光晕 */}
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [bgOpacityRange[0], bgOpacityRange[1], bgOpacityRange[0]] }}
          transition={{ duration: glowDuration, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: '70vw', height: '70vw', borderRadius: '50%', background: `radial-gradient(circle, ${THEME.glow} 0%, transparent 70%)`, pointerEvents: 'none' }}
        />

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.6, ease: 'easeOut' }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '44px', zIndex: 10 }}>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.6em', color: THEME.textDim, textTransform: 'uppercase', marginBottom: '10px', margin: '0 0 10px' }}>私密空间</p>
            <h1 style={{ fontSize: '36px', fontWeight: 300, color: THEME.gold, letterSpacing: '0.4em', margin: 0, opacity: 0.9 }}>日栖</h1>
          </div>

          {/* PIN 圆点 */}
          <motion.div animate={pinShaking ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}
            style={{ display: 'flex', gap: '18px' }}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{
                width: '11px', height: '11px', borderRadius: '50%',
                background: i < pin.length ? (pinError ? '#c87a6a' : THEME.gold) : 'transparent',
                border: `1px solid ${pinError ? '#c87a6a' : THEME.goldDim}`,
                transition: 'all 0.2s',
                opacity: 0.8,
              }} />
            ))}
          </motion.div>

          {/* 数字键盘 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {['1','2','3','4','5','6','7','8','9','','0','del'].map((key, i) => (
              <motion.button key={i} whileTap={key ? { scale: 0.85, opacity: 0.7 } : {}}
                onClick={() => key && handlePinKey(key)}
                style={{
                  width: '74px', height: '74px', borderRadius: '50%',
                  background: key && key !== 'del' ? 'rgba(255,255,255,0.03)' : 'transparent',
                  border: key && key !== 'del' ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  color: key === 'del' ? THEME.textDim : THEME.gold,
                  fontSize: key === 'del' ? '14px' : '24px',
                  fontWeight: 300,
                  cursor: key ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Noto Serif SC', serif",
                  opacity: key ? 0.85 : 0,
                }}
              >
                {key === 'del' ? '⌫' : key}
              </motion.button>
            ))}
          </div>

          <p style={{ fontSize: '10px', color: THEME.textDim, letterSpacing: '0.25em', opacity: 0.4, margin: 0 }}>
            输入密码进入
          </p>
        </motion.div>

        <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400&display=swap');`}</style>
      </main>
    )
  }

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
        position: 'fixed', inset: 0,
        background: `linear-gradient(160deg, ${THEME.bg1} 0%, ${THEME.bg2} 100%)`,
        overflow: 'hidden',
        fontFamily: "'Noto Serif SC', 'SimSun', Georgia, serif",
        display: 'flex', flexDirection: 'column',
      }}
    >

      {/* ── 呼吸背景光晕 ── */}
      <motion.div
        animate={{
          scale: thinking ? [1, 1.5, 1.2, 1.5, 1] : [1, 1.3, 1],
          opacity: thinking
            ? [bgOpacityRange[0], bgOpacityRange[1] * 2, bgOpacityRange[0], bgOpacityRange[1] * 1.5, bgOpacityRange[0]]
            : [bgOpacityRange[0], bgOpacityRange[1], bgOpacityRange[0]],
        }}
        transition={{ duration: thinking ? 3 : glowDuration, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)',
          width: '90vw', height: '90vw', borderRadius: '50%',
          background: `radial-gradient(circle, ${THEME.glow} 0%, transparent 70%)`,
          pointerEvents: 'none', zIndex: 0,
        }}
      />

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

      {/* ── 水印 ── */}
      <div style={{
        position: 'absolute', top: '5%', right: '-2%',
        fontSize: 'clamp(60px, 20vw, 120px)', fontWeight: 300,
        color: THEME.gold, opacity: 0.03,
        pointerEvents: 'none', fontStyle: 'normal',
        whiteSpace: 'nowrap', lineHeight: 1,
        letterSpacing: '0.1em', zIndex: 0,
      }}>
        日栖
      </div>

      {/* ── 顶部栏 ── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '52px 24px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', color: THEME.textDim, letterSpacing: '0.35em', opacity: 0.5 }}>日栖</span>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: THEME.textDim, fontSize: '18px', cursor: 'pointer', opacity: 0.35, padding: '4px 8px' }}>
          ×
        </motion.button>
      </div>

      {/* ── 消息列表 ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 20px 24px',
        position: 'relative', zIndex: 10,
        scrollbarWidth: 'none',
      }}>

        {/* 逐字开场问候 */}
        <AnimatePresence>
          {greetingText && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ textAlign: 'left', marginBottom: '20px' }}>
              <div style={{
                display: 'inline-block',
                background: THEME.aiBubble,
                backdropFilter: 'blur(20px)',
                borderRadius: '20px 20px 20px 4px',
                padding: '14px 18px',
                maxWidth: '82%',
                border: '1px solid rgba(168,196,184,0.1)',
              }}>
                <p style={{ color: THEME.aiText, fontSize: '16px', fontWeight: 300, lineHeight: 1.8, margin: 0, letterSpacing: '0.05em' }}>
                  {greetingText}
                  <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
                    style={{ color: THEME.gold, marginLeft: '2px' }}>|</motion.span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 消息 */}
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.94, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: idx < messages.length - 1 ? '16px' : '8px',
              }}
            >
              <div style={{
                maxWidth: '80%',
                background: msg.role === 'user' ? THEME.userBubble : THEME.aiBubble,
                backdropFilter: 'blur(20px)',
                borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                padding: '13px 17px',
                border: msg.role === 'user'
                  ? '1px solid rgba(232,213,184,0.12)'
                  : '1px solid rgba(168,196,184,0.1)',
              }}>
                <p style={{
                  color: msg.role === 'user' ? THEME.gold : THEME.aiText,
                  fontSize: msg.role === 'assistant' ? '16px' : '15px',
                  fontWeight: 300,
                  lineHeight: 1.85,
                  margin: 0,
                  letterSpacing: '0.04em',
                }}>
                  {msg.content}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 思考状态 */}
        <AnimatePresence>
          {thinking && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
              <div style={{
                background: THEME.aiBubble, backdropFilter: 'blur(20px)',
                borderRadius: '20px 20px 20px 4px', padding: '14px 20px',
                border: '1px solid rgba(168,196,184,0.1)',
                display: 'flex', gap: '8px', alignItems: 'center',
              }}>
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

      {/* ── 底部输入区 ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        padding: '12px 16px 40px',
        background: 'linear-gradient(to top, rgba(2,6,23,0.95) 0%, transparent 100%)',
        flexShrink: 0,
      }}>
        <AnimatePresence>
          {inputFocused && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.5)', zIndex: -1, pointerEvents: 'none' }} />
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '28px', padding: '12px 16px', border: `1px solid ${inputFocused ? 'rgba(232,213,184,0.15)' : 'rgba(255,255,255,0.06)'}`, transition: 'border-color 0.4s' }}>
          <input
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(inputText)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={isLateNight ? '夜深了，说说吧…' : '说吧，我在听…'}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              color: THEME.gold, fontSize: '16px', fontWeight: 300,
              outline: 'none', fontFamily: "'Noto Serif SC', serif",
              letterSpacing: '0.04em', caretColor: THEME.gold,
            }}
          />
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={() => sendMessage(inputText)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: inputText.trim() ? THEME.gold : THEME.textDim,
              fontSize: '20px', padding: '2px 6px',
              opacity: inputText.trim() ? 0.8 : 0.25,
              transition: 'all 0.3s', flexShrink: 0,
            }}
          >↑</motion.button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '9px', color: THEME.textDim, opacity: 0.25, letterSpacing: '0.2em', margin: '10px 0 0' }}>
          长按屏幕说话（即将开放）
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        input::placeholder { color: rgba(74,90,82,0.7); }
      `}</style>
    </main>
  )
}
