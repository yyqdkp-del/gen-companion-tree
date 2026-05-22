'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

type Props = {
  onRefresh: () => void | Promise<void>
}

/** ?refresh=1 时刷新孩子数据并清掉 query（须在 Suspense 内使用） */
export default function HomeRefreshFromQuery({ onRefresh }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (!searchParams.get('refresh')) return
    void onRefresh()
    router.replace('/', { scroll: false })
  }, [searchParams, onRefresh, router])

  return null
}
