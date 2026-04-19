'use client'
import dynamic from 'next/dynamic'

const SettingsButton = dynamic(
  () => import('./SettingsButton').then(mod => ({ default: mod.default })),
  { ssr: false }
)

export default function SettingsButtonWrapper() {
  return <SettingsButton />
}
