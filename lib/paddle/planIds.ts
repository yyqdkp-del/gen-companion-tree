/** 沙盒 Catalog 与升级页测试链接一致 */
export const PADDLE_SANDBOX_PRICE_ID = 'pri_01kss5c225qmn8ztj87gc3jyaw'
export const PADDLE_SANDBOX_PRODUCT_ID = 'pro_01kss56b0va1hfk1ggbxxcay1e'

/**
 * 解析 Pro 计划的 Paddle ID。
 * 常见误配：把 pri_... 填进 PADDLE_PRO_PRODUCT_ID，或 PRICE_ID 仍是旧沙盒/生产价格。
 */
export function resolvePaddlePlanIds(): { priceId: string; productId: string } {
  const envPrice = process.env.PADDLE_PRO_PRICE_ID?.trim()
  const envProduct = process.env.PADDLE_PRO_PRODUCT_ID?.trim()

  let priceId = envPrice || PADDLE_SANDBOX_PRICE_ID
  let productId = envProduct || PADDLE_SANDBOX_PRODUCT_ID

  // PRODUCT_ID 误填为 Price（pri_...）→ 优先用作结账 priceId
  if (productId.startsWith('pri_')) {
    if (priceId !== productId) {
      console.warn(
        '[paddle] PADDLE_PRO_PRODUCT_ID 是 Price ID，已用于结账；请在 Vercel 改到 PADDLE_PRO_PRICE_ID',
      )
    }
    priceId = productId
    productId = PADDLE_SANDBOX_PRODUCT_ID
  }

  // PRICE_ID 误填为 Product（pro_...）→ 与 product 字段互换
  if (priceId.startsWith('pro_') && productId.startsWith('pri_')) {
    const swap = priceId
    priceId = productId
    productId = swap
  }

  if (!priceId.startsWith('pri_')) {
    priceId = PADDLE_SANDBOX_PRICE_ID
  }
  if (!productId.startsWith('pro_')) {
    productId = PADDLE_SANDBOX_PRODUCT_ID
  }

  return { priceId, productId }
}
