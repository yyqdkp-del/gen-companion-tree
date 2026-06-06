'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SchoolRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/growth?tab=%E5%AD%A6%E6%A0%A1')
  }, [router])

  return null
}
