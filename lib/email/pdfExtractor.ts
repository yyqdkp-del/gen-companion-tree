import { geminiGenerateContentUrl } from '@/lib/ai/models'
import type { ContentType } from '@/lib/vision/contentClassifier'

export interface RawEmailTodo {
  title: string
  due_date?: string
  due_date_raw?: string
}

export interface RawEmailExtraction {
  summary: string
  events: Array<{
    title: string
    date: string
    date_raw?: string
    requires_action: boolean
    requires_items?: string[]
    deadline?: string
    deadline_raw?: string
  }>
  amounts: Array<{
    amount: number
    currency: string
    purpose: string
    due_date?: string
    due_date_raw?: string
  }>
  todos: RawEmailTodo[]
}

function schemaForType(contentType: ContentType): string {
  const base = `"todos": [{"title": "待办标题", "due_date": "YYYY-MM-DD或null", "due_date_raw": "原文日期如19号"}]`

  switch (contentType) {
    case 'flight_itinerary':
      return `{
  "summary": "一句话总结，最多30字",
  "events": [],
  "amounts": [],
  "todos": [{"title": "航班 MU9640 清迈→上海", "due_date": "YYYY-MM-DD", "due_date_raw": "19号"}]
}`
    case 'invoice_bill':
      return `{
  "summary": "一句话总结，最多30字",
  "events": [],
  "amounts": [{"amount": 12500, "currency": "THB", "purpose": "学费", "due_date": "YYYY-MM-DD", "due_date_raw": "6月19日"}],
  "todos": []
}`
    case 'school_calendar':
      return `{
  "summary": "一句话总结，最多30字",
  "events": [{"title": "学期开始", "date": "YYYY-MM-DD", "date_raw": "9月1日", "requires_action": false, "requires_items": []}],
  "amounts": [],
  "todos": []
}`
    default:
      return `{
  "summary": "一句话总结，最多30字，中文",
  "events": [{"title": "事件标题", "date": "YYYY-MM-DD", "date_raw": "19号", "requires_action": true, "requires_items": ["物品"], "deadline": "YYYY-MM-DD", "deadline_raw": "18号"}],
  "amounts": [{"amount": 12500, "currency": "THB", "purpose": "学费", "due_date": "YYYY-MM-DD", "due_date_raw": "6月19日"}],
  ${base}
}`
  }
}

function extractionPrompt(contentType: ContentType, context: string): string {
  const typeHint: Record<string, string> = {
    flight_itinerary: '这是机票/行程单邮件。提取每一程航班、出发日期。不要提取学校活动。待办维度是出行。',
    invoice_bill: '这是账单/学费/缴费邮件。提取金额和缴费截止日期。',
    school_notice: '这是学校通知。提取活动日期、家长待办、需携带物品。',
    school_calendar: '这是学期校历/假期表。提取所有学期和假期日期节点。',
    medical_doc: '这是医疗文件。提取就诊日期和复诊待办。',
    passport_visa: '这是护照/签证文件。提取到期日和续签待办。',
  }

  const hint = typeHint[contentType] || '提取邮件中的日期、待办、付款信息。'

  return `${context}

${hint}

规则：
1. due_date_raw / date_raw 保留原文（如「19号」「6月19日」）
2. due_date / date 尽量转为 YYYY-MM-DD；不确定时填 null，保留 raw
3. 只提取事实，不要推断

只返回JSON：
${schemaForType(contentType)}`
}

function parseGeminiJson(text: string): RawEmailExtraction | null {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0]) as RawEmailExtraction
    if (!parsed.summary) return null
    return {
      summary: String(parsed.summary).slice(0, 80),
      events: Array.isArray(parsed.events) ? parsed.events : [],
      amounts: Array.isArray(parsed.amounts) ? parsed.amounts : [],
      todos: Array.isArray(parsed.todos) ? parsed.todos : [],
    }
  } catch {
    return null
  }
}

async function callGeminiExtraction(
  parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>,
): Promise<RawEmailExtraction | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch(geminiGenerateContentUrl(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0, maxOutputTokens: 2000 },
      }),
    })

    if (!response.ok) return null
    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return parseGeminiJson(text)
  } catch (e) {
    console.error('[pdfExtractor]', e)
    return null
  }
}

export async function extractFromAttachment(
  data: string,
  mimeType: string,
  filename: string,
  emailSubject: string,
  contentType: ContentType = 'school_notice',
): Promise<RawEmailExtraction | null> {
  if (!data) return null

  const isImage = mimeType.startsWith('image/')
  const isPDF = mimeType === 'application/pdf'
  if (!isImage && !isPDF) return null

  const context = `这是邮件附件（${isPDF ? 'PDF' : '图片'}），文件名：${filename}\n邮件主题：${emailSubject}`
  const prompt = extractionPrompt(contentType, context)

  return callGeminiExtraction([
    { inline_data: { mime_type: mimeType, data } },
    { text: prompt },
  ])
}

export async function extractFromEmailBody(
  body: string,
  emailSubject: string,
  contentType: ContentType = 'school_notice',
): Promise<RawEmailExtraction | null> {
  const trimmed = String(body || '').trim()
  if (!trimmed || trimmed.length < 20) return null

  const context = `邮件主题：${emailSubject}\n\n正文：\n${trimmed.slice(0, 6000)}`
  const prompt = extractionPrompt(contentType, context)

  return callGeminiExtraction([{ text: prompt }])
}

export function mergeExtractions(extractions: Array<RawEmailExtraction | null | undefined>): {
  allEvents: RawEmailExtraction['events']
  allAmounts: RawEmailExtraction['amounts']
  allTodos: RawEmailExtraction['todos']
  summaryParts: string[]
} {
  const valid = extractions.filter(Boolean) as RawEmailExtraction[]
  return {
    allEvents: valid.flatMap((e) => e.events || []),
    allAmounts: valid.flatMap((e) => e.amounts || []),
    allTodos: valid.flatMap((e) => e.todos || []),
    summaryParts: valid.map((e) => e.summary).filter(Boolean),
  }
}
