'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** 汉字 Tab：直接进入字理解码器，不展示中间页 */
export default function HanziTab() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/learn')
  }, [router])

  return null
}
