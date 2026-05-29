import { Environment, Paddle, type PaddleOptions } from '@paddle/paddle-node-sdk'
import { resolvePaddlePlanIds } from '@/lib/paddle/planIds'

let _paddle: Paddle | null = null

function resolveEnvironment(): Environment {
  const explicit = process.env.PADDLE_ENVIRONMENT?.trim().toLowerCase()
  if (explicit === 'production') return Environment.production
  if (explicit === 'sandbox') return Environment.sandbox
  return process.env.NODE_ENV === 'production'
    ? Environment.production
    : Environment.sandbox
}

/** 服务端 Paddle 客户端；首次调用时初始化，密钥缺失时显式抛错避免静默失败 */
export function getPaddle(): Paddle {
  if (_paddle) return _paddle
  const apiKey = process.env.PADDLE_API_KEY
  if (!apiKey) {
    throw new Error('PADDLE_API_KEY is not configured')
  }
  const options: PaddleOptions = { environment: resolveEnvironment() }
  _paddle = new Paddle(apiKey, options)
  return _paddle
}

/** 展示用元数据（不含 Paddle ID，ID 见 getPaddlePlanIds） */
export const PADDLE_PLANS = {
  pro: {
    name: '根陪伴 Pro',
    price: 9.99,
    currency: 'USD',
  },
} as const

export type PaddlePlanKey = keyof typeof PADDLE_PLANS

/** 每次请求时解析 env，纠正 price/product 填反 */
export function getPaddlePlanIds() {
  return resolvePaddlePlanIds()
}
