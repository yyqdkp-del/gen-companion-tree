'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Mic, Camera } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/app/context/AppContext'
import { FLOAT_INPUT_BOTTOM } from '@/app/_shared/_constants/layout'
import { THEME } from '@/app/_shared/_constants/theme'
import { toastRegisterPrompt } from '@/app/components/Toast'
import InputSheet, { type InputMode } from '@/app/components/InputSheet'

const CAMERA_PAGES = ['/', '/rian']
const FLOAT_CHROME_PAGES = ['/rian']

const FLOAT_BTN: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 24,
  background: 'rgba(251,249,246,0.92)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '0.5px solid rgba(45,50,47,0.12)',
  boxShadow: '0 2px 12px rgba(45,50,47,0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
}

export default function BottomInput() {
  const pathname = usePathname()
  const router = useRouter()
  const { userId, sessionReady } = useApp()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<InputMode>('camera')

  const requireRianLogin = useCallback(() => {
    if (pathname !== '/rian' || userId) return false
    toastRegisterPrompt(
      () => router.push('/auth?next=/rian'),
      '登录后可保存待办和日程',
    )
    return true
  }, [pathname, userId, router])

  const openSheet = useCallback((mode: InputMode) => {
    setSheetMode(mode)
    setSheetOpen(true)
  }, [])

  useEffect(() => {
    const handleOpenCamera = () => {
      openSheet('camera')
    }
    window.addEventListener('openCamera', handleOpenCamera)
    return () => window.removeEventListener('openCamera', handleOpenCamera)
  }, [openSheet])

  if (!CAMERA_PAGES.includes(pathname)) return null

  const showFloatChrome = FLOAT_CHROME_PAGES.includes(pathname)
  const floatBottom = `calc(${FLOAT_INPUT_BOTTOM} + var(--keyboard-height, 0px))`

  return (
    <>
      <InputSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        mode={sheetMode}
        onModeChange={setSheetMode}
      />

      {showFloatChrome && (
        <div
          style={{
            position: 'fixed',
            bottom: floatBottom,
            right: 16,
            zIndex: 99,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <motion.button
            type="button"
            aria-label="拍照或上传"
            whileTap={{ scale: 0.92 }}
            disabled={!sessionReady}
            onClick={() => {
              if (requireRianLogin()) return
              if (sessionReady) openSheet('camera')
            }}
            style={{
              ...FLOAT_BTN,
              border: sheetOpen && sheetMode === 'camera'
                ? '1.5px solid rgba(164,99,85,0.4)'
                : FLOAT_BTN.border,
              opacity: !sessionReady ? 0.45 : 1,
              cursor: sessionReady ? 'pointer' : 'default',
            }}
          >
            <Camera
              size={21}
              color={sheetOpen && sheetMode === 'camera' ? THEME.gold : THEME.text}
            />
          </motion.button>
          <motion.button
            type="button"
            aria-label="语音与文字"
            whileTap={{ scale: 0.92 }}
            disabled={!sessionReady}
            onClick={() => {
              if (requireRianLogin()) return
              if (sessionReady) openSheet('voice')
            }}
            style={{
              ...FLOAT_BTN,
              border: sheetOpen && sheetMode === 'voice'
                ? '1.5px solid rgba(164,99,85,0.4)'
                : FLOAT_BTN.border,
              opacity: !sessionReady ? 0.45 : 1,
              cursor: sessionReady ? 'pointer' : 'default',
            }}
          >
            <Mic
              size={21}
              color={sheetOpen && sheetMode === 'voice' ? THEME.gold : THEME.text}
            />
          </motion.button>
        </div>
      )}
    </>
  )
}
