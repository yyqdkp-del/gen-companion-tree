'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/app/context/AppContext'

const icons = {
  home: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12L12 3L21 12V20C21 20.55 20.55 21 20 21H15V16H9V21H4C3.45 21 3 20.55 3 20V12Z"
        stroke={active ? '#a46355' : 'rgba(45,50,47,0.35)'}
        fill={active ? 'rgba(164,99,85,0.12)' : 'none'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  calendar: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="2"
        stroke={active ? '#a46355' : 'rgba(45,50,47,0.35)'}
        fill={active ? 'rgba(164,99,85,0.12)' : 'none'}
        strokeWidth="1.5"
      />
      <line x1="8" y1="2" x2="8" y2="6" stroke={active ? '#a46355' : 'rgba(45,50,47,0.35)'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke={active ? '#a46355' : 'rgba(45,50,47,0.35)'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="12" x2="17" y2="12" stroke={active ? '#a46355' : 'rgba(45,50,47,0.35)'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="16" x2="13" y2="16" stroke={active ? '#a46355' : 'rgba(45,50,47,0.35)'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  book: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4C4 3.45 4.45 3 5 3H14L20 9V20C20 20.55 19.55 21 19 21H5C4.45 21 4 20.55 4 20V4Z"
        stroke={active ? '#a46355' : 'rgba(45,50,47,0.35)'}
        fill={active ? 'rgba(164,99,85,0.12)' : 'none'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 3V9H20" stroke={active ? '#a46355' : 'rgba(45,50,47,0.35)'} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="8" y1="13" x2="16" y2="13" stroke={active ? '#a46355' : 'rgba(45,50,47,0.35)'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="17" x2="13" y2="17" stroke={active ? '#a46355' : 'rgba(45,50,47,0.35)'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  tree: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L6 10H9L4 18H11V22H13V18H20L15 10H18L12 2Z"
        stroke={active ? '#a46355' : 'rgba(45,50,47,0.35)'}
        fill={active ? 'rgba(164,99,85,0.12)' : 'none'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
}

const TABS = [
  { path: '/', label: '根', iconKey: 'home' as const },
  { path: '/rian', label: '根·安', iconKey: 'calendar' as const },
  { path: '/learn', label: '根·字', iconKey: 'book' as const },
  { path: '/treehouse', label: '根·栖', iconKey: 'tree' as const },
]

const HIDE_ON = ['/auth', '/grandparent', '/admin', '/upgrade', '/privacy', '/terms', '/refund']

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { modalOpen } = useApp()

  useEffect(() => {
    TABS.forEach((tab) => router.prefetch(tab.path))
  }, [router])

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null

  const isActive = (path: string) => {
    const base = path.split('?')[0]
    if (base === '/') return pathname === '/'
    if (base === '/learn') {
      return pathname.startsWith('/learn') || pathname.startsWith('/growth')
    }
    return pathname.startsWith(base)
  }

  return (
    <nav
      aria-label="主导航"
      style={{
        position: 'fixed',
        bottom: 'var(--keyboard-height, 0px)',
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(251,249,246,0.94)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '0.5px solid rgba(45,50,47,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'stretch',
        minHeight: 56,
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        opacity: modalOpen ? 0 : 1,
        transform: modalOpen ? 'translateY(100%)' : 'translateY(0)',
        pointerEvents: modalOpen ? 'none' : 'auto',
      }}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.path)
        return (
          <Link
            key={tab.path}
            href={tab.path}
            prefetch
            scroll={false}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              minHeight: 56,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              padding: '6px 0',
              position: 'relative',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            {active && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 44,
                  height: 36,
                  borderRadius: 18,
                  background: 'rgba(164,99,85,0.1)',
                }}
              />
            )}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {icons[tab.iconKey](active)}
            </div>
            <span
              style={{
                fontSize: 10,
                fontFamily: "'Noto Serif SC', serif",
                color: active ? '#a46355' : 'rgba(45,50,47,0.35)',
                fontWeight: active ? 600 : 400,
                letterSpacing: '0.05em',
                position: 'relative',
                zIndex: 1,
                lineHeight: 1,
              }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
