'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import SettingsButton from '@/app/components/SettingsButton'
import BottomInput from '@/app/components/BottomInput'
import BottomNav from '@/app/components/BottomNav'

const HIDE_CHROME = ['/auth', '/grandparent', '/admin', '/upgrade', '/privacy', '/terms', '/refund']
const TREEHOUSE_PREFIX = '/treehouse'

function isNightHour(date: Date): boolean {
  const h = date.getHours()
  return h >= 21 || h < 6
}

function syncNightMode(pathname: string) {
  const body = document.body
  if (pathname.startsWith(TREEHOUSE_PREFIX)) {
    body.classList.remove('night-mode')
    return
  }
  body.classList.toggle('night-mode', isNightHour(new Date()))
}

function NightModeSync() {
  const pathname = usePathname()

  useEffect(() => {
    syncNightMode(pathname)
    const id = window.setInterval(() => syncNightMode(pathname), 60_000)
    return () => window.clearInterval(id)
  }, [pathname])

  return null
}

export default function ClientComponents() {
  const pathname = usePathname()

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => {
      const vh = viewport.height
      const keyboardHeight = Math.max(0, window.innerHeight - vh - viewport.offsetTop)
      document.documentElement.style.setProperty('--vh', `${vh}px`)
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`)
    }
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    update()
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])

  const showChrome = !HIDE_CHROME.some((p) => pathname.startsWith(p))

  return (
    <>
      <NightModeSync />
      {showChrome && (
        <div
          style={{
            position: 'fixed',
            top: 'max(10px, env(safe-area-inset-top, 10px))',
            left: 12,
            zIndex: 98,
          }}
        >
          <SettingsButton />
        </div>
      )}
      <BottomInput />
      <BottomNav />
    </>
  )
}
