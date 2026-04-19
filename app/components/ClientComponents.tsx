'use client'
import dynamic from 'next/dynamic'

const InputBar = dynamic(() => import('@/app/components/InputBar'), { ssr: false })
const SettingsButtonWrapper = dynamic(() => import('@/app/components/SettingsButtonWrapper'), { ssr: false })

export default function ClientComponents() {
  return (
    <>
      <InputBar />
      <SettingsButtonWrapper />
    </>
  )
}
