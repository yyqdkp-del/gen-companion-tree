import { createHmac } from 'crypto'

/** 服务端签名用；缺失时签发必须失败 loud，验证返回 null（避免未配置密钥时误判为合法） */
function getCardsUrlSecret(): string | null {
  const secret = process.env.CARDS_URL_SECRET
  if (!secret) {
    console.error('[signedUrl] CARDS_URL_SECRET is not configured')
    return null
  }
  return secret
}

export function signUserId(userId: string): string {
  const SECRET = getCardsUrlSecret()
  if (!SECRET) {
    throw new Error('CARDS_URL_SECRET is not configured')
  }
  const expires = Date.now() + 10 * 60 * 1000 // 10 分钟有效
  const payload = `${userId}:${expires}`
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}:${sig}`
}

/** 与 signUserId 相同，供卡片 token 等 API 显式命名调用 */
export function createSignedUserId(userId: string): string {
  return signUserId(userId)
}

export function verifySignedUserId(token: string): string | null {
  const SECRET = getCardsUrlSecret()
  if (!SECRET) return null

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
