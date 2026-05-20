import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  if (typeof window === 'undefined' || initialized) return

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
  })

  initialized = true
}

export function getPostHog() {
  if (typeof window === 'undefined' || !initialized) return null
  return posthog
}

export function identifyPostHog(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  initPostHog()
  posthog.identify(userId, traits)
}

export function capturePostHog(
  event: string,
  properties?: Record<string, unknown>,
) {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  initPostHog()
  posthog.capture(event, properties)
}

export function resetPostHog() {
  if (typeof window === 'undefined' || !initialized) return
  posthog.reset()
}
