import { geminiGenerateContentUrl } from '@/lib/ai/models'

export interface EmailExtraction {
  docType: 'notice' | 'invoice' | 'schedule' | 'other'
  summary: string
  events: Array<{
    title: string
    date: string
    requires_action: boolean
    requires_items?: string[]
    deadline?: string
  }>
  amounts: Array<{
    amount: number
    currency: string
    purpose: string
    due_date?: string
  }>
  requirements: string[]
}

const EXTRACTION_JSON_SCHEMA = `{
  "docType": "notice|invoice|schedule|other",
  "summary": "一句话总结，最多30字，中文",
  "events": [
    {
      "title": "事件标题",
      "date": "YYYY-MM-DD",
      "requires_action": true,
      "requires_items": ["物品"],
      "deadline": "YYYY-MM-DD"
    }
  ],
  "amounts": [
    {
      "amount": 12500,
      "currency": "THB",
      "purpose": "学费",
      "due_date": "YYYY-MM-DD"
    }
  ],
  "requirements": ["家长必须做的事"]
}`

function parseGeminiJson(text: string): EmailExtraction | null {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0]) as EmailExtraction
    if (!parsed.summary) return null
    return {
      docType: parsed.docType || 'other',
      summary: String(parsed.summary).slice(0, 30),
      events: Array.isArray(parsed.events) ? parsed.events : [],
      amounts: Array.isArray(parsed.amounts) ? parsed.amounts : [],
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
    }
  } catch {
    return null
  }
}

async function callGeminiExtraction(
  parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>,
): Promise<EmailExtraction | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch(
      geminiGenerateContentUrl(apiKey),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0, maxOutputTokens: 1500 },
        }),
      },
    )

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
): Promise<EmailExtraction | null> {
  if (!data) return null

  const isImage = mimeType.startsWith('image/')
  const isPDF = mimeType === 'application/pdf'
  if (!isImage && !isPDF) return null

  const prompt = `这是学校发给家长的${isPDF ? 'PDF文件' : '图片'}，文件名：${filename}
邮件主题：${emailSubject}

请提取关键信息（只提取事实，不要推断）：
1. 文件类型
2. 一句话总结（最多30字，中文）
3. 所有日期和事件
4. 需要付款的金额
5. 家长必须做的事

只返回JSON：
${EXTRACTION_JSON_SCHEMA}`

  return callGeminiExtraction([
    { inline_data: { mime_type: mimeType, data } },
    { text: prompt },
  ])
}

export async function extractFromEmailBody(
  body: string,
  emailSubject: string,
): Promise<EmailExtraction | null> {
  const trimmed = String(body || '').trim()
  if (!trimmed || trimmed.length < 20) return null

  const prompt = `这是学校发给家长的邮件正文。
邮件主题：${emailSubject}

正文：
${trimmed.slice(0, 6000)}

请提取关键信息（只提取事实，不要推断）：
1. 文件类型
2. 一句话总结（最多30字，中文）
3. 所有日期和事件
4. 需要付款的金额
5. 家长必须做的事

只返回JSON：
${EXTRACTION_JSON_SCHEMA}`

  return callGeminiExtraction([{ text: prompt }])
}

export function mergeExtractions(extractions: Array<EmailExtraction | null | undefined>): {
  allEvents: EmailExtraction['events']
  allAmounts: EmailExtraction['amounts']
  allRequirements: string[]
  summaryParts: string[]
} {
  const valid = extractions.filter(Boolean) as EmailExtraction[]
  return {
    allEvents: valid.flatMap((e) => e.events || []),
    allAmounts: valid.flatMap((e) => e.amounts || []),
    allRequirements: valid.flatMap((e) => e.requirements || []),
    summaryParts: valid.map((e) => e.summary).filter(Boolean),
  }
}
