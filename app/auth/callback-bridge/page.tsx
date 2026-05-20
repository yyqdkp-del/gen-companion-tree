'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { saveSessionBundle } from '@/lib/auth/saveSessionBundle'

const supabase = createClient()

export default function AuthCallbackBridgePage() {
  const router = useRouter()
  const [msg, setMsg] = useState('正在完成登录…')

  useEffect(() => {
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await saveSessionBundle(session)
          setMsg('跳转中…')
          router.replace('/')
          return
        }
        setMsg('未获取到会话')
        setTimeout(() => router.replace('/auth?error=session'), 1500)
      } catch {
        setMsg('出错了')
        setTimeout(() => router.replace('/auth?error=session'), 1500)
      }
    })()
  }, [router])

  return (
    <main style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#EEF5FB', fontFamily: 'system-ui, sans-serif', color: '#2d3f4a',
    }}>
      <p style={{ fontSize: 15 }}>{msg}</p>
    </main>
  )
}
