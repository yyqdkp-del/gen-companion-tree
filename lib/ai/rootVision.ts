/**
 * 根的眼睛 — 统一视觉文档处理入口（Gemini 2.5 Flash）
 */

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export type VisionMimeType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

const VISION_MIME_TYPES = new Set<VisionMimeType>([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
])

export type DocumentType =
  | 'schedule'
  | 'notice'
  | 'medical'
  | 'passport'
  | 'visa'
  | 'invoice'
  | 'photo'
  | 'unknown'

const DOCUMENT_TYPES = new Set<DocumentType>([
  'schedule', 'notice', 'medical', 'passport', 'visa', 'invoice', 'photo', 'unknown',
])

export type RootVisionAction = {
  type: string
  label: string
  data: unknown
}

export interface RootVisionResult {
  docType: DocumentType
  confidence: number
  data: unknown
  summary: string
  actions: RootVisionAction[]
}

type GeminiGenConfig = { temperature: number; maxOutputTokens: number }

const SCHEDULE_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const
const DAY_NAMES: Record<(typeof SCHEDULE_DAYS)[number], string> = {
  mon: 'Monday周一',
  tue: 'Tuesday周二',
  wed: 'Wednesday周三',
  thu: 'Thursday周四',
  fri: 'Friday周五',
}

export function cleanVisionBase64(imageBase64: string): string {
  return imageBase64
    .replace(/^data:image\/\w+;base64,/, '')
    .replace(/\s/g, '')
}

export function normalizeVisionMimeType(mimeType: string): VisionMimeType {
  const mt = mimeType.split(';')[0].trim().toLowerCase()
  if (VISION_MIME_TYPES.has(mt as VisionMimeType)) return mt as VisionMimeType
  return 'image/jpeg'
}

export async function fetchImageForVision(url: string): Promise<{ base64: string; mimeType: VisionMimeType }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const mimeType = normalizeVisionMimeType(res.headers.get('content-type') || 'image/jpeg')
  return { base64: buf.toString('base64'), mimeType }
}

export async function callGeminiVision(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  generationConfig: GeminiGenConfig,
  label = 'rootVision',
): Promise<string> {
  const key = process.env.GOOGLE_AI_API_KEY
  if (!key) throw new Error('GOOGLE_AI_API_KEY not configured')

  const cleanBase64 = cleanVisionBase64(imageBase64)
  const visionMime = normalizeVisionMimeType(mimeType)
  const requestUrl = `${GEMINI_URL}?key=${key}`

  console.log(`[rootVision] ${label} Gemini request:`, {
    url: GEMINI_URL,
    hasApiKey: !!key,
    imageSize: cleanBase64.length,
    mimeType: visionMime,
  })

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: visionMime, data: cleanBase64 } },
          { text: prompt },
        ],
      }],
      generationConfig,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[rootVision] ${label} Gemini error:`, response.status, errorText)
    throw new Error(`Gemini ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function stripJsonFences(text: string): string {
  return text.replace(/```json|```/g, '').trim()
}

export function parseGeminiJson(text: string): unknown | null {
  const clean = stripJsonFences(text)
  if (!clean) return null
  try {
    return JSON.parse(clean)
  } catch {
    const obj = clean.match(/\{[\s\S]*\}/)
    if (obj) {
      try { return JSON.parse(obj[0]) } catch { /* fall through */ }
    }
    const arr = clean.match(/\[[\s\S]*\]/)
    if (arr) {
      try { return JSON.parse(arr[0]) } catch { /* fall through */ }
    }
    return null
  }
}

function parseGeminiJsonArray(text: string): unknown[] {
  const parsed = parseGeminiJson(text)
  return Array.isArray(parsed) ? parsed : []
}

function normalizeDocType(raw: unknown): DocumentType {
  const s = String(raw || 'unknown').trim().toLowerCase()
  return DOCUMENT_TYPES.has(s as DocumentType) ? (s as DocumentType) : 'unknown'
}

function clampConfidence(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (!Number.isFinite(n)) return 0.5
  return Math.min(1, Math.max(0, n))
}

/** 第一步：文档类型识别 */
export async function detectDocumentType(
  imageBase64: string,
  mimeType: string,
): Promise<{ docType: DocumentType; confidence: number; reason?: string }> {
  const prompt = `请仔细看这张图片。

判断它最像哪种文件：
- schedule：任何课程表、时间表、Weekly Schedule
  特征：有时间格式（7:50/8:00等数字）
  有星期（Monday/Tuesday/周一/周二等）
  有课程名称（Math/ELA/Science等）
- notice：学校通知、活动通知、信件
- medical：病历、处方、医疗文件
- passport：护照（有照片+证件号）
- visa：签证、居留证
- invoice：账单、收据、学费
- photo：普通生活照片
- unknown：完全无法判断

重要：如果图片里有任何时间数字和星期信息，
优先判断为 schedule。

只返回JSON，不要其他文字：
{
  "docType": "schedule",
  "confidence": 0.9,
  "reason": "图片包含时间列和星期列"
}`

  const rawText = await callGeminiVision(
    imageBase64,
    mimeType,
    prompt,
    { maxOutputTokens: 200, temperature: 0 },
    'detect-type',
  )

  console.log('[rootVision] detect raw:', rawText)

  const result = parseGeminiJson(rawText) as { docType?: unknown; confidence?: unknown; reason?: string } | null
  if (!result) {
    return { docType: 'unknown', confidence: 0, reason: 'parse failed' }
  }

  return {
    docType: normalizeDocType(result.docType),
    confidence: clampConfidence(result.confidence),
    reason: result.reason,
  }
}

/** 课表：5 路并发，每天一段 */
export async function processSchedule(imageBase64: string, mimeType: string): Promise<Record<string, unknown[]>> {
  const results = await Promise.all(
    SCHEDULE_DAYS.map(async (day) => {
      try {
        const raw = await callGeminiVision(
          imageBase64,
          mimeType,
          `只提取${DAY_NAMES[day]}这一天的课程。
每个时间段只有一节课，时间格式HH:MM。
Breakfast/Morning Routine/Snack/Lunch/Rest Time/Pick up/Outdoor Play 设 category: break 或 transition。
真实课程设 category: class 或 activity。
只返回JSON数组：
[{"time":"07:50","subject":"Breakfast","category":"break"}]`,
          { maxOutputTokens: 1000, temperature: 0.1 },
          `schedule-${day}`,
        )
        return { day, classes: parseGeminiJsonArray(raw) }
      } catch (e) {
        console.error(`[rootVision] schedule-${day} failed:`, e)
        return { day, classes: [] as unknown[] }
      }
    }),
  )

  return Object.fromEntries(results.map((r) => [r.day, r.classes]))
}

async function processNotice(imageBase64: string, mimeType: string) {
  const [metaRaw, todosRaw, eventsRaw] = await Promise.all([
    callGeminiVision(
      imageBase64,
      mimeType,
      '只提取通知标题、发件方、通知日期。JSON: {"title":"","sender":"","date":""}',
      { maxOutputTokens: 300, temperature: 0 },
      'notice-meta',
    ),
    callGeminiVision(
      imageBase64,
      mimeType,
      '只提取家长需要做的事和截止日期。JSON数组: [{"action":"","deadline":"","required":""}]',
      { maxOutputTokens: 800, temperature: 0.1 },
      'notice-todos',
    ),
    callGeminiVision(
      imageBase64,
      mimeType,
      '只提取通知里所有日期和对应事件。JSON数组: [{"date":"","event":"","location":""}]',
      { maxOutputTokens: 500, temperature: 0.1 },
      'notice-events',
    ),
  ])

  const meta = (parseGeminiJson(metaRaw) as Record<string, unknown>) || { title: '', sender: '', date: '' }
  const todos = parseGeminiJsonArray(todosRaw)
  const events = parseGeminiJsonArray(eventsRaw)

  return { meta, todos, events }
}

async function processMedical(imageBase64: string, mimeType: string) {
  const [diagnosisRaw, medicationsRaw, followupRaw] = await Promise.all([
    callGeminiVision(
      imageBase64,
      mimeType,
      '只提取诊断结果和医生姓名。JSON: {"diagnosis":"","doctor":"","hospital":"","date":""}',
      { maxOutputTokens: 400, temperature: 0 },
      'medical-diagnosis',
    ),
    callGeminiVision(
      imageBase64,
      mimeType,
      '只提取药物清单。JSON数组: [{"name":"","dosage":"","frequency":"","days":"","warning":""}]',
      { maxOutputTokens: 800, temperature: 0.1 },
      'medical-meds',
    ),
    callGeminiVision(
      imageBase64,
      mimeType,
      '只提取复诊日期和注意事项。JSON: {"followupDate":"","instructions":""}',
      { maxOutputTokens: 400, temperature: 0 },
      'medical-followup',
    ),
  ])

  return {
    diagnosis: (parseGeminiJson(diagnosisRaw) as Record<string, unknown>) || {},
    medications: parseGeminiJsonArray(medicationsRaw),
    followup: (parseGeminiJson(followupRaw) as Record<string, unknown>) || {},
  }
}

async function processPassport(imageBase64: string, mimeType: string) {
  const result = await callGeminiVision(
    imageBase64,
    mimeType,
    `提取证件信息。JSON: {
      "type": "passport|visa",
      "name": "",
      "passportNumber": "",
      "nationality": "",
      "issueDate": "",
      "expiryDate": "",
      "visaType": "",
      "entries": ""
    }`,
    { maxOutputTokens: 500, temperature: 0 },
    'passport',
  )
  return (parseGeminiJson(result) as Record<string, unknown>) || {}
}

async function processInvoice(imageBase64: string, mimeType: string) {
  const [headerRaw, itemsRaw] = await Promise.all([
    callGeminiVision(
      imageBase64,
      mimeType,
      '只提取账单头部：商户名、日期、总金额、币种。JSON: {"merchant":"","date":"","total":"","currency":""}',
      { maxOutputTokens: 300, temperature: 0 },
      'invoice-header',
    ),
    callGeminiVision(
      imageBase64,
      mimeType,
      '只提取账单明细条目。JSON数组: [{"item":"","amount":"","currency":""}]',
      { maxOutputTokens: 800, temperature: 0.1 },
      'invoice-items',
    ),
  ])

  return {
    header: (parseGeminiJson(headerRaw) as Record<string, unknown>) || {},
    items: parseGeminiJsonArray(itemsRaw),
  }
}

function safeStr(v: unknown, fallback = ''): string {
  if (v == null) return fallback
  return String(v)
}

function safeArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

/** 第三步：统一入口 */
export async function processDocument(
  imageBase64: string,
  mimeType: string,
): Promise<RootVisionResult> {
  const { docType, confidence } = await detectDocumentType(imageBase64, mimeType)

  let data: unknown
  let summary: string
  let actions: RootVisionAction[] = []

  switch (docType) {
    case 'schedule': {
      data = await processSchedule(imageBase64, mimeType)
      summary = '我看到了一张课表，已帮你整理好每天的课程'
      actions = [{ type: 'save_schedule', label: '保存课表', data }]
      break
    }

    case 'notice': {
      data = await processNotice(imageBase64, mimeType)
      const notice = data as { meta: Record<string, unknown>; todos: unknown[] }
      summary = `我看到了学校通知「${safeStr(notice.meta?.title, '未命名通知')}」，已提取${notice.todos.length}件待办`
      actions = notice.todos.map((t) => ({
        type: 'add_todo',
        label: safeStr((t as Record<string, unknown>)?.action, '待办事项'),
        data: t,
      }))
      break
    }

    case 'medical': {
      data = await processMedical(imageBase64, mimeType)
      const med = data as {
        diagnosis: Record<string, unknown>
        medications: unknown[]
        followup: Record<string, unknown>
      }
      summary = `病历：${safeStr(med.diagnosis?.diagnosis, '已识别')}，共${med.medications.length}种药`
      actions = [
        { type: 'save_medical', label: '保存病历', data },
        ...(med.followup?.followupDate
          ? [{ type: 'add_reminder', label: '设置复诊提醒', data: med.followup }]
          : []),
      ]
      break
    }

    case 'passport':
    case 'visa': {
      data = await processPassport(imageBase64, mimeType)
      const doc = data as Record<string, unknown>
      summary = `${docType === 'passport' ? '护照' : '签证'}到期日：${safeStr(doc.expiryDate, '未知')}`
      actions = [
        { type: 'save_document', label: '保存证件', data },
        { type: 'add_reminder', label: '设置到期提醒', data },
      ]
      break
    }

    case 'invoice': {
      data = await processInvoice(imageBase64, mimeType)
      const inv = data as { header: Record<string, unknown>; items: unknown[] }
      summary = `账单：${safeStr(inv.header?.merchant, '商户')} ${safeStr(inv.header?.total, '')}${safeStr(inv.header?.currency, '')}`
      actions = [{ type: 'add_payment_reminder', label: '设置付款提醒', data }]
      break
    }

    case 'photo':
      data = { description: '普通照片' }
      summary = '这是一张普通照片，不是需要处理的文件'
      actions = []
      break

    default:
      data = { raw: '无法识别的文件类型' }
      summary = '我看了这张图片，但不确定是什么类型的文件'
      actions = []
  }

  return { docType, confidence, data, summary, actions }
}

/** 供 Claude worker 使用的上下文摘要 */
export function buildRootVisionContext(result: RootVisionResult): string {
  const dataPreview = JSON.stringify(result.data).slice(0, 3500)
  return [
    '【根的眼睛】',
    result.summary,
    `类型：${result.docType}（置信度 ${Math.round(result.confidence * 100)}%）`,
    `建议动作：${result.actions.map((a) => a.label).join('、') || '无'}`,
    `结构化数据：${dataPreview}`,
  ].join('\n')
}
