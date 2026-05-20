'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { capturePostHog, identifyPostHog, initPostHog } from '@/lib/analytics/posthog'

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initPostHog()

    const supabase = createClient()
    const syncUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        identifyPostHog(session.user.id, {
          email: session.user.email,
        })
      }
    }
    void syncUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        identifyPostHog(session.user.id, { email: session.user.email })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!pathname) return
    const query = searchParams?.toString()
    const url = query ? `${pathname}?${query}` : pathname
    capturePostHog('$pageview', {
      $current_url: typeof window !== 'undefined' ? window.location.origin + url : url,
      pathname,
    })
  }, [pathname, searchParams])

  return <>{children}</>
}
