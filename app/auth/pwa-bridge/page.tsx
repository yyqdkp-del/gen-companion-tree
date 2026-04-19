'use client'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

function PWABridgeInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const init = async () => {
      const authCode = searchParams.get('auth_code')
      const redirectTo = searchParams.get('redirect') || '/'
      const showInstall = searchParams.get('show_install') || '0'

      if (!authCode) { router.push('/auth'); return }

      const { data } = await supabase
        .from('auth_temp_codes')
        .select('*')
        .eq('code', authCode)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (!data) { router.push('/auth'); return }

      const { data: { session } } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })

      if (!session?.user?.id) { router.push('/auth'); return }

      const uid = session.user.id

      if ('caches' in window) {
        try {
          const cache = await caches.open('auth-v1')
          await cache.put('/auth/user-id', new Response(uid))
        } catch (e) { console.error('Cache write error:', e) }
      }

      await supabase.from('auth_temp_codes').delete().eq('code', authCode)

      const url = new URL(redirectTo, window.location.origin)
      if (showInstall === '1') url.searchParams.set('show_install', '1')
      router.push(url.toString())
    }

    init()
  }, [])

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)'
    }}>
      <p style={{ color: '#2C3E50', fontSize: 14, opacity: 0.6, letterSpacing: '0.2em' }}>
        登录中…
      </p>
    </div>
  )
}

export default function PWABridge() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)'
      }}>
        <p style={{ color: '#2C3E50', fontSize: 14, opacity: 0.6, letterSpacing: '0.2em' }}>
          登录中…
        </p>
      </div>
    }>
      <PWABridgeInner />
    </Suspense>
  )
}
