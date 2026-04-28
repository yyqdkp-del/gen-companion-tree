'use client'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'

const InputBar = dynamic(() => import('@/app/components/InputBar'), { ssr: false })
const SettingsButtonWrapper = dynamic(() => import('@/app/components/SettingsButtonWrapper'), { ssr: false })

export default function ClientComponents() {
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

  return (
    <>
      <InputBar />
      <SettingsButtonWrapper />
    </>
  )
}
