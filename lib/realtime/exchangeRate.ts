export type PaymentFxQuote = {
  amountThb: number
  amountCny: number
  amountCnyWeekAgo: number
  savingsCny: number
  rateToday: number
  rateWeekAgo: number
}

function formatYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function fetchThbCnyRate(date?: string): Promise<number | null> {
  try {
    const url = date
      ? `https://api.frankfurter.app/${date}?from=THB&to=CNY`
      : 'https://api.frankfurter.app/latest?from=THB&to=CNY'
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = await res.json()
    const rate = data?.rates?.CNY
    return typeof rate === 'number' && rate > 0 ? rate : null
  } catch {
    return null
  }
}

export function parseThbAmount(text: string): number | null {
  const raw = String(text || '')
  const patterns = [
    /(?:฿|THB|泰铢)\s*([\d,]+(?:\.\d+)?)/i,
    /([\d,]+(?:\.\d+)?)\s*(?:฿|THB|泰铢)/i,
    /(?:学费|缴费|账单).*?([\d,]{3,}(?:\.\d+)?)/,
  ]
  for (const re of patterns) {
    const m = raw.match(re)
    if (m?.[1]) {
      const n = parseFloat(m[1].replace(/,/g, ''))
      if (Number.isFinite(n) && n > 0) return n
    }
  }
  return null
}

export function formatThb(amount: number): string {
  return `฿${Math.round(amount).toLocaleString('en-US')}`
}

export function formatCny(amount: number): string {
  return Math.round(amount).toLocaleString('zh-CN')
}

export async function getPaymentFxQuote(amountThb: number): Promise<PaymentFxQuote | null> {
  if (!amountThb || amountThb <= 0) return null

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [rateToday, rateWeekAgo] = await Promise.all([
    fetchThbCnyRate(),
    fetchThbCnyRate(formatYmd(weekAgo)),
  ])

  if (!rateToday || !rateWeekAgo) return null

  const amountCny = amountThb * rateToday
  const amountCnyWeekAgo = amountThb * rateWeekAgo
  const savingsCny = Math.max(0, amountCnyWeekAgo - amountCny)

  return {
    amountThb,
    amountCny,
    amountCnyWeekAgo,
    savingsCny,
    rateToday,
    rateWeekAgo,
  }
}

export function buildPaymentTimingReason(quote: PaymentFxQuote): string {
  const lines = [`约合人民币 ${formatCny(quote.amountCny)} 元`]
  if (quote.savingsCny >= 10) {
    lines.push(`人民币升值，比上周节省约${formatCny(quote.savingsCny)}元`)
    lines.push('现在付款比较划算')
  } else if (quote.rateToday < quote.rateWeekAgo) {
    lines.push('人民币汇率较好，可考虑本周内付款')
  } else {
    lines.push('建议关注截止日前完成付款')
  }
  return lines.join('\n')
}

export function paymentTimingUrgencyBoost(quote: PaymentFxQuote, daysUntilDue: number): 'high' | 'medium' | 'low' {
  if (daysUntilDue <= 3) return 'high'
  if (quote.savingsCny >= 30 && daysUntilDue <= 7) return 'high'
  return daysUntilDue <= 7 ? 'medium' : 'low'
}
