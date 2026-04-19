'use client'
import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LineComplete() {
  useEffect(() => {
    const finish = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const params = new URLSearchParams(window.location.search)
      const raw = params.get('data')
      if (!raw) { window.location.href = '/auth?error=line_failed'; return }

      try {
        const { email, password } = JSON.parse(atob(raw))
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { window.location.href = '/auth?error=line_failed'; return }
        await new Promise(r => setTimeout(r, 300))
        window.location.href = '/'
      } catch {
        window.location.href = '/auth?error=line_failed'
      }
    }
    finish()
  }, [])

  return (
    <main style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F5F9FC' }}>
      <div style={{ textAlign:'center', color:'#6B8BAA', fontFamily:"'Noto Sans SC', sans-serif" }}>
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>🌿</div>
        <div>正在登录...</div>
      </div>
    </main>
  )
}
