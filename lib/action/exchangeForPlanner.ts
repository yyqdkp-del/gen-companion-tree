import { getPaymentFxQuote } from '@/lib/realtime/exchangeRate'

export type PlannerExchangeRate = {
  rates: Record<string, number>
  trend: 'up' | 'down' | 'flat'
  trendText: string
  savingsTip: string
}

/** THB/CNY 汇率，供一键办使用 */
export async function getExchangeRate(): Promise<PlannerExchangeRate | null> {
  const quote = await getPaymentFxQuote(1000)
  if (!quote) return null

  const thbRate = 1
  const cnyRate = quote.rateToday
  const trend =
    quote.rateToday < quote.rateWeekAgo ? 'up'
    : quote.rateToday > quote.rateWeekAgo ? 'down'
    : 'flat'

  const trendText =
    trend === 'up' ? '当前汇率对你有利'
    : trend === 'down' ? '汇率略高，可观望'
    : '汇率平稳'

  const savingsTip = quote.savingsCny > 0
    ? `相比一周前可省约 ¥${Math.round(quote.savingsCny)}`
    : ''

  return {
    rates: { THB: thbRate, CNY: cnyRate },
    trend,
    trendText,
    savingsTip,
  }
}
