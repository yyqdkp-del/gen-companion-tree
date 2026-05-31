import { toastLimitReached } from '@/app/components/Toast'

type LimitJson = {
  error?: string
  feature?: string
  message?: string
}

export function isLimitReachedPayload(data: unknown): data is LimitJson & { error: 'limit_reached' } {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as LimitJson).error === 'limit_reached'
  )
}

/** 若为限额错误则 toast + 可选跳转；返回是否已处理 */
export function handleLimitReached(
  data: unknown,
  onUpgrade?: () => void,
): boolean {
  if (!isLimitReachedPayload(data)) return false
  toastLimitReached(onUpgrade)
  return true
}

/** 解析 fetch 响应体并处理限额 */
export async function handleLimitReachedResponse(
  res: Response,
  onUpgrade?: () => void,
): Promise<boolean> {
  if (res.status !== 429 && res.status !== 403) return false
  try {
    const data = await res.json()
    return handleLimitReached(data, onUpgrade)
  } catch {
    return false
  }
}
