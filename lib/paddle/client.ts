import { Environment, Paddle, type PaddleOptions } from '@paddle/paddle-node-sdk'

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

/** 客户端也可安全引用（不含 SDK），仅暴露价格元数据与对应 Price ID */
export const PADDLE_PLANS = {
  pro: {
    name: '根陪伴 Pro',
    price: 9.99,
    currency: 'USD',
    priceId: process.env.PADDLE_PRO_PRICE_ID || 'pri_01ksh7y1var6m2e5tkt1bmtsn9',
    productId: process.env.PADDLE_PRO_PRODUCT_ID || 'pro_01ksh7qf2dttmr0v44czfnjcsg',
  },
} as const

export type PaddlePlanKey = keyof typeof PADDLE_PLANS
