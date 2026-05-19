import { createHmac } from 'crypto'

const SECRET = process.env.CARDS_URL_SECRET ?? 'fallback-secret'

export function signUserId(userId: string): string {
  const expires = Date.now() + 10 * 60 * 1000 // 10 分钟有效
  const payload = `${userId}:${expires}`
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}:${sig}`
}

export function verifySignedUserId(token: string): string | null {
  try {
    const parts = token.split(':')
    if (parts.length !== 3) return null
    const [userId, expires, sig] = parts
    if (Date.now() > Number(expires)) return null
    const payload = `${userId}:${expires}`
    const expected = createHmac('sha256', SECRET).update(payload).digest('hex')
    return sig === expected ? userId : null
  } catch {
    return null
  }
}
