import { getPaymentFxQuote } from '@/lib/realtime/exchangeRate'

export type PlannerExchangeRate = {
  rates: Record<string, number>
  trend: 'up' | 'down' | 'flat'
}

/** THB/CNY 汇率，供 executionPlanner 使用 */
export async function getExchangeRate(): Promise<PlannerExchangeRate | null> {
  const quote = await getPaymentFxQuote(1000)
  if (!quote) return null

  const thbRate = 1
  const cnyRate = quote.rateToday
  const trend =
    quote.rateToday < quote.rateWeekAgo ? 'up'
    : quote.rateToday > quote.rateWeekAgo ? 'down'
    : 'flat'

  return {
    rates: { THB: thbRate, CNY: cnyRate },
    trend,
  }
}
