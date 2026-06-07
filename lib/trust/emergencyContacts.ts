import type { SourceLevel } from '@/lib/trust/sourceLabel'

export const EMERGENCY_PHONES: Record<string, {
  police: string
  ambulance: string
  tourist_police?: string
  fire?: string
}> = {
  Thailand: {
    police: '191',
    ambulance: '1669',
    tourist_police: '1155',
    fire: '199',
  },
  Singapore: {
    police: '999',
    ambulance: '995',
    fire: '995',
  },
  Malaysia: {
    police: '999',
    ambulance: '999',
    fire: '994',
  },
  Indonesia: {
    police: '110',
    ambulance: '118',
    fire: '113',
  },
  Japan: {
    police: '110',
    ambulance: '119',
    fire: '119',
  },
  UK: {
    police: '999',
    ambulance: '999',
    fire: '999',
  },
  USA: {
    police: '911',
    ambulance: '911',
    fire: '911',
  },
  Australia: {
    police: '000',
    ambulance: '000',
    fire: '000',
  },
  default: {
    police: '112',
    ambulance: '112',
  },
}

const COUNTRY_ALIASES: Record<string, string> = {
  thailand: 'Thailand',
  泰国: 'Thailand',
  singapore: 'Singapore',
  新加坡: 'Singapore',
  malaysia: 'Malaysia',
  马来西亚: 'Malaysia',
  indonesia: 'Indonesia',
  印尼: 'Indonesia',
  japan: 'Japan',
  日本: 'Japan',
  uk: 'UK',
  'united kingdom': 'UK',
  英国: 'UK',
  usa: 'USA',
  'united states': 'USA',
  美国: 'USA',
  australia: 'Australia',
  澳大利亚: 'Australia',
}

function resolveCountryKey(country: string): string {
  const trimmed = country.trim()
  if (EMERGENCY_PHONES[trimmed]) return trimmed
  const alias = COUNTRY_ALIASES[trimmed.toLowerCase()]
  if (alias) return alias
  return 'default'
}

export function getEmergencyPhone(
  country: string,
  type: 'police' | 'ambulance' | 'tourist_police' | 'fire',
): { phone: string; source: Extract<SourceLevel, 'knowledge_base'> } {
  const contacts = EMERGENCY_PHONES[resolveCountryKey(country)] || EMERGENCY_PHONES.default
  return {
    phone: contacts[type] || contacts.ambulance || '112',
    source: 'knowledge_base',
  }
}
