export const AI_MODELS = {
  claude: {
    default: 'claude-sonnet-4-5',
    fast: 'claude-haiku-4-5',
    powerful: 'claude-opus-4-5',
  },
  gemini: {
    default: 'gemini-2.5-flash',
    vision: 'gemini-2.5-flash',
  },
} as const

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export function geminiGenerateContentUrl(apiKey?: string): string {
  const path = `${GEMINI_API_BASE}/${AI_MODELS.gemini.default}:generateContent`
  return apiKey ? `${path}?key=${apiKey}` : path
}

export function geminiVisionGenerateContentUrl(): string {
  return `${GEMINI_API_BASE}/${AI_MODELS.gemini.vision}:generateContent`
}
