export type SourceLevel =
  | 'user_data'
  | 'official_search'
  | 'ai_generated'
  | 'knowledge_base'
  | 'realtime_api'

export interface SourcedContent {
  content: unknown
  source: SourceLevel
  sourceUrl?: string
  verifiedAt?: string
  disclaimer?: string
}

export const SOURCE_CONFIG: Record<SourceLevel, {
  label: string
  color: string
  icon: string
  trustLevel: number
  disclaimer: string
}> = {
  user_data: {
    label: '来自你的档案',
    color: '#5c7a5e',
    icon: '🔵',
    trustLevel: 5,
    disclaimer: '',
  },
  official_search: {
    label: '来自官方搜索',
    color: '#5c7a5e',
    icon: '🟢',
    trustLevel: 4,
    disclaimer: '信息可能变化，请以官网为准',
  },
  knowledge_base: {
    label: '根的知识库',
    color: '#a46355',
    icon: '📚',
    trustLevel: 4,
    disclaimer: '定期人工更新',
  },
  realtime_api: {
    label: '实时数据',
    color: '#a46355',
    icon: '📡',
    trustLevel: 4,
    disclaimer: '',
  },
  ai_generated: {
    label: 'AI生成，请核对',
    color: '#b07050',
    icon: '🤖',
    trustLevel: 2,
    disclaimer: '请核对后再使用',
  },
}

export const TRUSTED_PHONE_SOURCES: SourceLevel[] = [
  'user_data',
  'knowledge_base',
]

export const TRUSTED_PAYMENT_SOURCES: SourceLevel[] = [
  'user_data',
]

export const TRUSTED_ADDRESS_SOURCES: SourceLevel[] = [
  'user_data',
  'knowledge_base',
  'official_search',
]

const LEGACY_SOURCE_MAP: Record<string, SourceLevel> = {
  claude: 'ai_generated',
  gemini: 'official_search',
}

export function normalizeSourceLevel(raw: unknown): SourceLevel {
  const key = String(raw || 'ai_generated').trim()
  if (key in SOURCE_CONFIG) return key as SourceLevel
  return LEGACY_SOURCE_MAP[key] || 'ai_generated'
}

export function resolveItemDisclaimer(source: SourceLevel, custom?: string): string {
  return custom || SOURCE_CONFIG[source].disclaimer
}
