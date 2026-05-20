import Stripe from 'stripe'

/** 服务端专用；勿在 `'use client'` 组件中 import 本文件。 */
/** 与本包 `stripe` 依赖捆绑的 Stripe API 版本一致（见 `node_modules/stripe/cjs/apiVersion.js`）。 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-04-22.dahlia',
  typescript: true,
})

export { PLANS } from './plans'
