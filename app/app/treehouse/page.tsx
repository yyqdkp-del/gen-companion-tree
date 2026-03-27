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

// ── 深海色系 ──
const THEME = {
  bg: '#050d1a',
  deep: '#071428',
  glow: '#1a3a6a',
  gold: '#c8a96e',
  goldDim: '#8a6a3a',
  text: '#e8dcc8',
  textDim: '#6a7a8a',
  star: '#a0b8d0',
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  fading?: boolean
}

export default function RiqiPage() {
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
  const [watermarkGlow, setWatermarkGlow] = useState(false)
  const [longPressing, setLongPressing] = useState(false)

  // ── 孩子数据（喂给 Claude） ──
  const [contextData, setContextData] = useState<string>('')

  const inputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<Message[]>([])
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const sessionId = useRef(crypto.randomUUID())

  // 加载孩子和任务数据作为 Claude 上下文
  const loadContext = useCallback(async () => {
    const { data: children } = await supabase.from('children').select('*')
    const { data: tasks } = await supabase.from('tasks').select('*').eq('status', 'pending').limit(5)
    const { data: reminders } = await supabase.from('reminders').select('*').eq('status', 'pending').limit(5)
    const { data: habits } = await supabase.from('user_habits').select('*').order('created_at', { ascending: false }).limit(10)

    const hour = new Date().getHours()
    const timeOfDay = hour < 5 ? '深夜' : hour < 12 ? '清晨' : hour < 18 ? '午后' : '夜晚'

    const ctx = `
【当前时间】${new Date().toLocaleString('zh-CN')}（${timeOfDay}）

【孩子状态】
${(children || []).map(c => `- ${c.name}: 精力${c.energy ?? 85}%, 进度${c.progress ?? 0}字`).join('\n')}

【待处理任务】
${(tasks || []).map(t => `- [${t.urgency}级] ${t.title}`).join('\n') || '暂无'}

【近期提醒】
${(reminders || []).map(r => `- ${r.title}（${r.category}）`).join('\n') || '暂无'}

【妈妈近期行为】
${(habits || []).map(h => `- ${h.action_type}: ${h.target_category}`).join('\n') || '暂无记录'}
`
    setContextData(ctx)
  }, [])

  useEffect(() => {
    if (unlocked) {
      loadContext()
      // 入场问候
      setTimeout(() => {
        const hour = new Date().getHours()
        const greeting = hour < 5
          ? '夜深了。你还没睡，有什么放不下的？'
          : hour < 12
          ? '早。我已经看过今天的安排了，先说说你现在的状态。'
          : hour < 18
          ? '下午好。今天怎么样？'
          : '夜里了。说说今天，或者什么都不说，我在。'
        addMessage('assistant', greeting)
      }, 1800)
    }
  }, [unlocked, loadContext])

  // ── 密码验证 ──
  const verifyPin = async () => {
    const { data } = await supabase.from('riqi_access').select('password_hash').single()
    if (data?.password_hash === pin) {
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
      if (next.length === 6) setTimeout(() => verifyPin(), 200)
    }
  }

  // ── 消息管理 ──
  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: Date.now(),
    }
    setMessages(prev => {
      const updated = [...prev, msg]
      messagesRef.current = updated
      return updated
    })

    // 存到数据库
    supabase.from('conversation_log').insert({
      session_id: sessionId.current,
      role,
      content,
    }).then(() => {})

    // 助手消息提到孩子时水印微亮
    if (role === 'assistant' && (content.includes('William') || content.includes('Noah') || content.includes('孩子'))) {
      setWatermarkGlow(true)
      setTimeout(() => setWatermarkGlow(false), 3000)
    }

    // 消息5秒后开始淡出（但保留在列表，只改样式）
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, fading: true } : m))
    }, 6000)
  }

  // ── 发送给 Claude ──
  const sendMessage = async (text: string) => {
    if (!text.trim() || thinking) return
    addMessage('user', text)
    setInputText('')
    setThinking(true)

    // 构建对话历史
    const history = messagesRef.current
      .filter(m => !m.fading)
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: `你是"根"，这个家庭的全知守护者。你了解这个家庭的一切数据。

性格：温柔、睿智、有时幽默，像一个深夜还在守候的大叔。说话简短有力，不超过3句话。不用"您"，用"你"。不啰嗦，不给建议清单，只说最重要的那一句。

${contextData}

规则：
- 深夜（22点-6点）说话更轻柔，像低语
- 提到孩子时要结合数据库里他们的真实状态
- 可以主动关心妈妈的状态
- 有时可以说"我来处理"表达全知感
- 情感陪伴优先于信息输出`,
          messages: [
            ...history,
            { role: 'user', content: text }
          ],
        }),
      })

      const data = await response.json()
      const reply = data.content?.[0]?.text || '我在。'
      setTimeout(() => {
        setThinking(false)
        addMessage('assistant', reply)
      }, 800)
    } catch {
      setThinking(false)
      addMessage('assistant', '我在，只是信号不太好。再说一次？')
    }
  }

  // ── 长按录音（预留） ──
  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => setLongPressing(true), 500)
  }
  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    if (longPressing) setLongPressing(false)
  }

  // ── 密码界面 ──
  if (!unlocked) {
    return (
      <main style={{ position: 'fixed', inset: 0, background: THEME.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Noto Serif SC', Georgia, serif" }}>

        {/* 背景光晕 */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 8, repeat: Infinity }}
          style={{ position: 'absolute', width: '60vw', height: '60vw', borderRadius: '50%', background: `radial-gradient(circle, ${THEME.glow} 0%, transparent 70%)`, pointerEvents: 'none' }}
        />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px', zIndex: 10 }}>

          {/* 标题 */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.5em', color: THEME.textDim, textTransform: 'uppercase', marginBottom: '8px' }}>私密空间</p>
            <h1 style={{ fontSize: '32px', fontWeight: 300, color: THEME.gold, letterSpacing: '0.3em', margin: 0 }}>日栖</h1>
          </div>

          {/* PIN 显示 */}
          <motion.div
            animate={pinShaking ? { x: [-8, 8, -8, 8, 0] } : {}}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', gap: '16px' }}
          >
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: i < pin.length ? (pinError ? '#E87A6A' : THEME.gold) : 'transparent',
                border: `1px solid ${pinError ? '#E87A6A' : THEME.goldDim}`,
                transition: 'all 0.2s',
              }} />
            ))}
          </motion.div>

          {/* 数字键盘 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {['1','2','3','4','5','6','7','8','9','','0','del'].map((key, i) => (
              <motion.button
                key={i}
                whileTap={key ? { scale: 0.88 } : {}}
                onClick={() => key && handlePinKey(key)}
                style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: key === 'del' ? 'transparent' : 'rgba(255,255,255,0.04)',
                  border: key === '' ? 'none' : `1px solid rgba(255,255,255,0.08)`,
                  color: key === 'del' ? THEME.textDim : THEME.text,
                  fontSize: key === 'del' ? '13px' : '22px',
                  fontWeight: 300,
                  cursor: key ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Noto Serif SC', serif",
                  letterSpacing: key === 'del' ? '0.05em' : 0,
                }}
              >
                {key === 'del' ? '⌫' : key}
              </motion.button>
            ))}
          </div>

          <p style={{ fontSize: '10px', color: THEME.textDim, letterSpacing: '0.2em', opacity: 0.5 }}>
            输入密码进入
          </p>
        </motion.div>

        <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400&display=swap');`}</style>
      </main>
    )
  }

  // ── 主界面 ──
  return (
    <main
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      style={{ position: 'fixed', inset: 0, background: THEME.bg, overflow: 'hidden', fontFamily: "'Noto Serif SC', Georgia, serif" }}
    >

      {/* 心跳背景光晕 */}
      <motion.div
        animate={{
          scale: thinking ? [1, 1.4, 1, 1.2, 1] : [1, 1.08, 1],
          opacity: thinking ? [0.06, 0.18, 0.06, 0.14, 0.06] : [0.04, 0.1, 0.04],
        }}
        transition={{ duration: thinking ? 2 : 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: '80vw', height: '80vw', borderRadius: '50%', background: `radial-gradient(circle, ${THEME.glow} 0%, transparent 70%)`, pointerEvents: 'none' }}
      />

      {/* 水印 — 提到孩子时微亮 */}
      <motion.div
        animate={{ opacity: watermarkGlow ? 0.15 : 0.04 }}
        transition={{ duration: 1.5 }}
        style={{ position: 'absolute', top: '8%', right: '-2%', fontSize: 'clamp(50px, 14vw, 90px)', fontWeight: 'bold', color: THEME.gold, pointerEvents: 'none', fontStyle: 'italic', whiteSpace: 'nowrap', lineHeight: 1, letterSpacing: '-0.02em' }}
      >
        日栖·/riqi
      </motion.div>

      {/* 长按漩涡 */}
      <AnimatePresence>
        {longPressing && (
          <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1, rotate: 360 }} exit={{ opacity: 0, scale: 0 }}
            transition={{ rotate: { duration: 3, repeat: Infinity, ease: 'linear' }, opacity: { duration: 0.4 }, scale: { duration: 0.4 } }}
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '120px', height: '120px', borderRadius: '50%', border: `1px solid ${THEME.goldDim}`, pointerEvents: 'none', zIndex: 30 }}
          />
        )}
      </AnimatePresence>

      {/* 思考星星 */}
      <AnimatePresence>
        {thinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '12px', zIndex: 20 }}>
            {[0, 1, 2].map(i => (
              <motion.div key={i}
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: THEME.star }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 浮现消息 — 写在水面上 */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px 160px', gap: '28px', zIndex: 10, pointerEvents: 'none' }}>
        <AnimatePresence>
          {messages.slice(-4).map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: msg.fading ? 0 : msg.role === 'user' ? 0.5 : 0.85, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: msg.fading ? 2.5 : 0.8, ease: 'easeOut' }}
              style={{
                textAlign: msg.role === 'user' ? 'right' : 'left',
                maxWidth: '80%',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <p style={{
                fontSize: msg.role === 'assistant' ? '17px' : '14px',
                fontWeight: msg.role === 'assistant' ? 300 : 400,
                color: msg.role === 'assistant' ? THEME.text : THEME.textDim,
                lineHeight: 1.8,
                margin: 0,
                letterSpacing: '0.05em',
              }}>
                {msg.content}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 底部输入区 */}
      <motion.div
        animate={{ opacity: inputFocused ? 1 : 0.6 }}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, padding: '20px 24px 40px' }}
      >
        {/* 全屏变暗遮罩（输入时） */}
        <AnimatePresence>
          {inputFocused && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.6)', zIndex: -1, pointerEvents: 'none' }} />
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(inputText)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="说吧，我在听…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${inputFocused ? THEME.goldDim : 'rgba(255,255,255,0.08)'}`,
              color: THEME.text,
              fontSize: '16px',
              fontWeight: 300,
              padding: '10px 0',
              outline: 'none',
              fontFamily: "'Noto Serif SC', serif",
              letterSpacing: '0.05em',
              caretColor: THEME.gold,
              transition: 'border-color 0.4s',
            }}
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => sendMessage(inputText)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: THEME.goldDim, fontSize: '20px', padding: '8px', opacity: inputText.trim() ? 1 : 0.3, transition: 'opacity 0.3s' }}
          >
            ↑
          </motion.button>
        </div>
      </motion.div>

      {/* 返回按钮 */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => router.push('/')}
        style={{ position: 'fixed', top: '5%', left: '5%', background: 'none', border: 'none', color: THEME.textDim, fontSize: '12px', letterSpacing: '0.3em', cursor: 'pointer', zIndex: 50, opacity: 0.4 }}
      >
        ← 基地
      </motion.button>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400&display=swap');
        * { -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: rgba(106,122,138,0.6); }
      `}</style>
    </main>
  )
}
