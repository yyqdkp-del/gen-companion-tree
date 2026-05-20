import { createClient } from '@/lib/supabase/client'
import { capturePostHog, identifyPostHog } from '@/lib/analytics/posthog'

interface TrackEvent {
  event_type: string
  page?: string
  meta?: Record<string, unknown>
}

export async function track(event: TrackEvent) {
  if (typeof window === 'undefined') return

  const page = event.page || window.location.pathname
  let sessionId = sessionStorage.getItem('app_session_id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem('app_session_id', sessionId)
  }

  const enrichedMeta = {
    ...event.meta,
    page,
    session_id: sessionId,
    is_pwa: window.matchMedia('(display-mode: standalone)').matches,
    is_wechat: /MicroMessenger/i.test(navigator.userAgent),
    ts: Date.now(),
  }

  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user?.id) {
      identifyPostHog(session.user.id, { email: session.user.email })
    }

    capturePostHog(event.event_type, {
      ...enrichedMeta,
      user_id: session?.user?.id || null,
    })

    await supabase.from('analytics_events').insert({
      event_type: event.event_type,
      page,
      user_id: session?.user?.id || null,
      session_id: sessionId,
      meta: enrichedMeta,
    })
  } catch (e) {
    console.warn('track failed:', e)
    capturePostHog(event.event_type, enrichedMeta)
  }
}

export function trackPageView(page: string, meta?: Record<string, unknown>) {
  void track({ event_type: 'page_view', page, meta })
}
