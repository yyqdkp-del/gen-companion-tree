'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SchoolRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/growth?tab=学校')
  }, [router])

  return null
}
