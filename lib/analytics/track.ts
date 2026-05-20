import { createClient } from '@/lib/supabase/client'
import { phCapture } from './posthog'

interface TrackEvent {
  event_type: string
  page?: string
  meta?: Record<string, unknown>
}

export async function track(event: TrackEvent) {
  if (typeof window === 'undefined') return
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    let sessionId = sessionStorage.getItem('app_session_id')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem('app_session_id', sessionId)
    }

    await supabase.from('analytics_events').insert({
      event_type: event.event_type,
      page: event.page || window.location.pathname,
      user_id: session?.user?.id || null,
      session_id: sessionId,
      meta: {
        ...event.meta,
        is_pwa: window.matchMedia('(display-mode: standalone)').matches,
        is_wechat: /MicroMessenger/i.test(navigator.userAgent),
        ts: Date.now(),
      },
    })

    // 同时上报 PostHog
    phCapture(event.event_type, {
      page: event.page || (typeof window !== 'undefined' ? window.location.pathname : ''),
      ...event.meta,
    })
  } catch (e) {
    console.warn('track failed:', e)
  }
}

export function trackPageView(page: string, meta?: Record<string, unknown>) {
  void track({ event_type: 'page_view', page, meta })
}
