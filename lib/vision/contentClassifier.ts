import { geminiGenerateContentUrl } from '@/lib/ai/models'

export type ContentType =
  | 'school_notice'
  | 'school_calendar'
  | 'class_schedule'
  | 'flight_itinerary'
  | 'invoice_bill'
  | 'medical_doc'
  | 'passport_visa'
  | 'unknown'

export type ContentLanguage = 'zh' | 'en' | 'th' | 'mixed'

export interface ClassificationResult {
  type: ContentType
  confidence: number
  reason: string
  language: ContentLanguage
}

const CONTENT_TYPES = new Set<ContentType>([
  'school_notice',
  'school_calendar',
  'class_schedule',
  'flight_itinerary',
  'invoice_bill',
  'medical_doc',
  'passport_visa',
  'unknown',
])

function cleanBase64(imageBase64: string): string {
  return imageBase64.replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, '')
}

function normalizeContentType(raw: unknown): ContentType {
  const s = String(raw || 'unknown').trim().toLowerCase()
  return CONTENT_TYPES.has(s as ContentType) ? (s as ContentType) : 'unknown'
}

function normalizeLanguage(raw: unknown): ContentLanguage {
  const s = String(raw || 'mixed').trim().toLowerCase()
  if (s === 'zh' || s === 'en' || s === 'th' || s === 'mixed') return s
  return 'mixed'
}

function parseClassificationJson(text: string): ClassificationResult | null {
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return {
      type: normalizeContentType(parsed.type),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      reason: String(parsed.reason || '').trim(),
      language: normalizeLanguage(parsed.language),
    }
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      const parsed = JSON.parse(match[0])
      return {
        type: normalizeContentType(parsed.type),
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
        reason: String(parsed.reason || '').trim(),
        language: normalizeLanguage(parsed.language),
      }
    } catch {
      return null
    }
  }
}

export async function classifyContent(
  imageBase64?: string,
  textContent?: string,
  mimeType = 'image/jpeg',
): Promise<ClassificationResult> {
  const prompt = `请判断这份内容是什么类型。

只返回JSON：
{
  "type": "school_notice|school_calendar|class_schedule|flight_itinerary|invoice_bill|medical_doc|passport_visa|unknown",
  "confidence": 0.0-1.0,
  "reason": "判断理由（1句话）",
  "language": "zh|en|th|mixed"
}

判断标准：
- school_notice：学校发的通知、同意书、活动通知
- school_calendar：学期日期表、假期安排、校历
- class_schedule：每周课程时间表（Math/PE/Art等）
- flight_itinerary：机票、行程单、航班信息（含MU/CA/CZ等航班号）
- invoice_bill：学费账单、发票、缴费通知
- medical_doc：处方、诊断书、医院文件
- passport_visa：护照、签证、入境卡
- unknown：无法判断

内容：
${textContent?.trim() || '（见图片）'}`

  const key = process.env.GOOGLE_AI_API_KEY
  if (!key) {
    return {
      type: 'unknown',
      confidence: 0,
      reason: 'GOOGLE_AI_API_KEY not configured',
      language: 'mixed',
    }
  }

  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = []
  if (imageBase64) {
    parts.push({
      inline_data: {
        mime_type: mimeType.split(';')[0].trim() || 'image/jpeg',
        data: cleanBase64(imageBase64),
      },
    })
  }
  parts.push({ text: prompt })

  try {
    const response = await fetch(`${geminiGenerateContentUrl(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 200,
        },
      }),
      signal: AbortSignal.timeout(10000),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const msg = data?.error?.message || response.statusText
      console.error('[contentClassifier] Gemini error:', msg)
      return { type: 'unknown', confidence: 0, reason: msg, language: 'mixed' }
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const parsed = parseClassificationJson(text)
    if (parsed) return parsed
  } catch (e) {
    const message = e instanceof Error ? e.message : 'classify failed'
    console.error('[contentClassifier]', message)
  }

  return {
    type: 'unknown',
    confidence: 0,
    reason: '无法解析',
    language: 'mixed',
  }
}

export function getProcessingPath(result: ClassificationResult): {
  handler: string
  targetTable: string
  dimension?: string
} {
  switch (result.type) {
    case 'school_notice':
      return {
        handler: 'processSchoolNotice',
        targetTable: 'todo_items + child_school_calendar',
        dimension: 'education',
      }

    case 'school_calendar':
      return {
        handler: 'processSchoolCalendar',
        targetTable: 'child_school_calendar',
        dimension: 'education',
      }

    case 'class_schedule':
      return {
        handler: 'processClassSchedule',
        targetTable: 'child_profiles.class_schedule',
        dimension: 'education',
      }

    case 'flight_itinerary':
      return {
        handler: 'processFlightItinerary',
        targetTable: 'todo_items',
        dimension: 'mobility',
      }

    case 'invoice_bill':
      return {
        handler: 'processInvoiceBill',
        targetTable: 'todo_items',
        dimension: 'wealth',
      }

    case 'medical_doc':
      return {
        handler: 'processMedicalDoc',
        targetTable: 'child_health_records',
        dimension: 'medical',
      }

    case 'passport_visa':
      return {
        handler: 'processPassportVisa',
        targetTable: 'children',
        dimension: 'compliance',
      }

    default:
      return {
        handler: 'askUser',
        targetTable: 'none',
        dimension: undefined,
      }
  }
}
