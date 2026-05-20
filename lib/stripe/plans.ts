/**
 * 客户端可安全引用（不含 Stripe Node SDK）。
 * Price ID 仅服务端结账使用，见 `STRIPE_PRO_PRICE_ID`。
 */
export const PLANS = {
  pro: {
    name: '根陪伴 Pro',
    price: 9.99,
    currency: 'usd',
    interval: 'month' as const,
    features: [
      '无限汉字解码',
      '木棉树洞无限对话',
      '每周成长周报',
      '签证到期提醒',
      '学校通知解析',
      '多孩子档案',
    ],
  },
} as const
