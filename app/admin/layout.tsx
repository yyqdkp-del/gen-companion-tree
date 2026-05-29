'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin', label: '📊 概览' },
  { href: '/admin/users', label: '👥 用户' },
  { href: '/admin/hotspots', label: '🔥 热点审核' },
  { href: '/admin/subscriptions', label: '💳 订阅' },
  { href: '/admin/cron', label: '⚙️ 任务' },
  { href: '/admin/ai', label: '🤖 根监控' },
]

function isNavActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname.startsWith(href)
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div
        style={{
          width: 200,
          background: '#1a1f1c',
          padding: '24px 0',
          flexShrink: 0,
        }}
      >
        <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, padding: '0 20px 24px' }}>
          根陪伴后台
        </div>
        {NAV.map((item) => {
          const active = isNavActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '10px 20px',
                color: active ? '#a46355' : 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                fontSize: 14,
                background: active ? 'rgba(164,99,85,0.15)' : 'none',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      <div style={{ flex: 1, padding: 32, background: '#f5f4f1', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}
