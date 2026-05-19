/** 客户端：疑似网络 / fetch 失败时提示，其余写入控制台。返回 true 表示已弹出网络提示 */
export function logOrAlertNetworkError(e: unknown): boolean {
  if (typeof window === 'undefined') {
    console.error(e)
    return false
  }
  if (
    e instanceof TypeError &&
    typeof e.message === 'string' &&
    (e.message.includes('fetch') ||
      e.message.includes('Failed to fetch') ||
      e.message.includes('Load failed') ||
      e.message.includes('NetworkError'))
  ) {
    alert('网络连接失败，请检查网络后重试')
    return true
  }
  console.error(e)
  return false
}
