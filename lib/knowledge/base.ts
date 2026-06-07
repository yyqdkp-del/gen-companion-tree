/** 变化慢的全局参考数据 — 本地 POI 一律走实时搜索 */

export const AIRLINE_PHONES: Record<string, string> = {
  MU: '95530',
  CA: '95583',
  CZ: '95539',
  TG: '+66-2-356-1111',
  FD: '+66-2-515-9999',
  SQ: '+65-6223-8888',
  MH: '+60-3-7843-3000',
  CX: '+852-2747-3333',
  NH: '+81-3-6735-1111',
  JL: '+81-3-5460-0522',
}

export const THAI_FORMS = {
  TM7: 'https://www.immigration.go.th/download/TM7.pdf',
  TM47_ONLINE: 'https://tm47.immigration.go.th/tm47/#/login',
  TM30: 'https://extranet.immigration.go.th/fn24online/login.html',
} as const

export function lookupAirlinePhone(flightCode: string): string | null {
  const match = flightCode.match(/^([A-Z]{2})\d/i)
  if (!match) return null
  return AIRLINE_PHONES[match[1].toUpperCase()] || null
}
