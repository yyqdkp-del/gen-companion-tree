'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home as HomeIcon } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { THEME } from '@/app/_shared/_constants/theme'
import { useApp } from '@/app/context/AppContext'
import SettingsButton from '@/app/components/SettingsButton'

const PAGE_MAP: Record<string, string> = {
  '/':          '基地',
  '/rian':      '日安',
  '/growth':    '根·中文',
  '/treehouse': '日栖',
}

const NAV_ITEMS = [
  { label: '基地',   path: '/' },
  { label: '日安',   path: '/rian' },
  { label: '根·中文', path: '/growth' },
  { label: '日栖',   path: '/treehouse' },
]

const SHOW_PATHS = ['/', '/rian', '/growth', '/treehouse']

type Props = {
  leftSlot?: React.ReactNode   // 左侧按钮（话筒）
  rightSlot?: React.ReactNode  // 右侧按钮（摄像头）
}

export default function BottomNav({ leftSlot, rightSlot }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const { modalOpen } = useApp()
  const [showMenu, setShowMenu] = useState(false)

  const currentPage = PAGE_MAP[pathname] || '根·陪伴'

  if (!SHOW_PATHS.includes(pathname)) return null

  return (
    <footer style={{
      position: 'fixed',
      bottom: 'calc(max(env(safe-area-inset-bottom), 36px) + var(--keyboard-height, 0px))',
      left: 0, right: 0, zIndex: 110,
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px',
      transition: 'bottom 0.15s ease-out, opacity 0.2s ease, transform 0.2s ease',
      opacity: modalOpen ? 0 : 1,
      transform: modalOpen ? 'translateY(100%)' : 'translateY(0)',
      pointerEvents: modalOpen ? 'none' : 'auto',
    }}>

      {/* 页面切换菜单 */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{ marginBottom: 12, display: 'flex', gap: 10 }}>
            {NAV_ITEMS.map(item => (
              <motion.button key={item.path} whileTap={{ scale: 0.95 }}
                onClick={() => { router.push(item.path); setShowMenu(false) }}
                style={{ padding: '8px 18px', borderRadius: 14,
                  background: pathname === item.path
                    ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                  border: 'none', fontSize: 11, fontWeight: 700, color: THEME.text,
                  backdropFilter: 'blur(10px)', cursor: 'pointer' }}>
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部胶囊 */}
      <div style={{
        width: '100%', maxWidth: 360, height: 62,
        background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(30px)',
        border: '1px solid rgba(255,255,255,0.2)', borderRadius: 31,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 10px',
      }}>
        {/* 左侧插槽（话筒按钮） */}
        {leftSlot ?? <div style={{ width: 52 }} />}

        {/* 中间页面名 */}
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => setShowMenu(!showMenu)}
          style={{ display: 'flex', alignItems: 'center', gap: 7,
            border: 'none', background: 'none', cursor: 'pointer' }}>
          <HomeIcon size={19} color={showMenu ? THEME.gold : THEME.text} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.3em',
            color: showMenu ? THEME.gold : THEME.text }}>
            {currentPage}
          </span>
        </motion.button>

        {/* 右侧插槽（摄像头按钮） */}
        {rightSlot ?? <div style={{ width: 52 }} />}
      </div>

      <SettingsButton />
    </footer>
  )
}
