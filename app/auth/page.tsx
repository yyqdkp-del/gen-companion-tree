'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion } from 'framer-motion'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const THEME = {
  navy: '#1A3C5E',
  orange: '#E8892A',
  bg: '#F5F9FC',
  white: '#FFFFFF',
  text: '#1A2B3C',
  muted: '#6B8BAA',
  border: '#D0DFF0',
}

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
const saveChildData = async (userId: string) => {
    try {
      const raw = localStorage.getItem('child_assessment')
      if (!raw) return
      const { name, grade, school } = JSON.parse(raw)
      if (!name) return
      await supabase.from('children').insert({
        user_id: userId,
        name,
        grade,
        school_short: school,
      })
      localStorage.removeItem('child_assessment')
    } catch {}
  }

useEffect(() => {
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await saveChildData(session.user.id)
      router.push('/')
    }
  }
  checkSession()
}, []) 
  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) { setError(error.message); setLoading(false); return }
        if (data.user) await saveChildData(data.user.id)
        setDone(true)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(error.message); setLoading(false); return }
        if (data.user) await saveChildData(data.user.id)
        router.push('/')
      }
    } catch {
      setError('网络错误，请重试')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  if (done) return (
    <main style={{ minHeight:'100dvh', background: THEME.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Noto Sans SC', sans-serif" }}>
      <div style={{ maxWidth:'400px', width:'100%', margin:'0 16px', background: THEME.white, borderRadius:'16px', padding:'40px 28px', textAlign:'center' }}>
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>🌿</div>
        <div style={{ fontFamily:"'Noto Serif SC', serif", fontSize:'22px', fontWeight:500, color: THEME.navy, marginBottom:'10px' }}>验证邮件已发送</div>
        <div style={{ fontSize:'14px', color: THEME.muted, lineHeight:1.8, marginBottom:'24px' }}>请检查 {email} 的收件箱，点击链接完成注册后即可进入基地。</div>
        <button onClick={() => router.push('/')}
          style={{ width:'100%', padding:'13px', background: THEME.navy, color:'#fff', border:'none', borderRadius:'10px', fontSize:'15px', fontWeight:500, cursor:'pointer' }}>
          先去基地看看 →
        </button>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight:'100dvh', background: THEME.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Noto Sans SC', sans-serif" }}>
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
        style={{ maxWidth:'400px', width:'100%', margin:'0 16px', background: THEME.white, borderRadius:'16px', padding:'40px 28px', boxShadow:'0 4px 24px rgba(26,60,94,0.10)' }}>

        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ fontFamily:"'Noto Serif SC', serif", fontSize:'24px', fontWeight:500, color: THEME.navy, marginBottom:'6px' }}>根·中文</div>
          <div style={{ fontSize:'13px', color: THEME.muted }}>{mode === 'register' ? '创建账号，保存孩子的学习档案' : '欢迎回来'}</div>
        </div>

        {/* Google登录 */}
        <button onClick={handleGoogle}
          style={{ width:'100%', padding:'13px', background: THEME.white, color: THEME.text, border:`1.5px solid ${THEME.border}`, borderRadius:'10px', fontSize:'14px', fontWeight:500, cursor:'pointer', marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          <span style={{ fontSize:'16px' }}>G</span> 用Google账号{mode === 'register' ? '注册' : '登录'}
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
          <div style={{ flex:1, height:'1px', background: THEME.border }} />
          <span style={{ fontSize:'12px', color: THEME.muted }}>或用邮箱</span>
          <div style={{ flex:1, height:'1px', background: THEME.border }} />
        </div>

        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="邮箱地址" type="email"
          style={{ width:'100%', padding:'13px 15px', border:`1.5px solid ${THEME.border}`, borderRadius:'10px', fontSize:'14px', marginBottom:'10px', outline:'none', fontFamily:"'Noto Sans SC', sans-serif", color: THEME.text }} />

        <input value={password} onChange={e => setPassword(e.target.value)}
          placeholder="密码（6位以上）" type="password"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{ width:'100%', padding:'13px 15px', border:`1.5px solid ${THEME.border}`, borderRadius:'10px', fontSize:'14px', marginBottom:'16px', outline:'none', fontFamily:"'Noto Sans SC', sans-serif", color: THEME.text }} />

        {error && <div style={{ fontSize:'13px', color:'#E8892A', marginBottom:'12px', textAlign:'center' }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading || !email || !password}
          style={{ width:'100%', padding:'13px', background: email && password ? THEME.navy : THEME.border, color:'#fff', border:'none', borderRadius:'10px', fontSize:'15px', fontWeight:500, cursor: email && password ? 'pointer' : 'not-allowed', fontFamily:"'Noto Sans SC', sans-serif" }}>
          {loading ? '处理中...' : mode === 'register' ? '创建账号 →' : '登录 →'}
        </button>

        <div style={{ textAlign:'center', marginTop:'16px', fontSize:'13px', color: THEME.muted }}>
          {mode === 'register' ? '已有账号？' : '还没有账号？'}
          <button onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError('') }}
            style={{ background:'none', border:'none', color: THEME.orange, cursor:'pointer', fontSize:'13px', fontWeight:500 }}>
            {mode === 'register' ? '直接登录' : '立即注册'}
          </button>
        </div>

      </motion.div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500&family=Noto+Sans+SC:wght@300;400;500&display=swap');`}</style>
    </main>
  )
}
