import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'production') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage',
    autocapture: false,
  })
}

export function phCapture(event: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'production') return
  try { posthog.capture(event, properties) } catch {}
}

export function phIdentify(userId: string, traits?: Record<string, any>) {
  if (typeof window === 'undefined') return
  try { posthog.identify(userId, traits) } catch {}
}

export { posthog }
