/**
 * 根的眼睛 — 分类优先的内容处理入口（Gemini 2.5 Flash）
 */

import { geminiVisionGenerateContentUrl } from '@/lib/ai/models'
import {
  classifyContent,
  getProcessingPath,
  type ClassificationResult,
  type ContentType,
} from '@/lib/vision/contentClassifier'

const GEMINI_URL = geminiVisionGenerateContentUrl()

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
  detection?: DocumentDetection
  contentType?: ContentType
  classification?: ClassificationResult
}

export type UploadContent = {
  imageBase64?: string
  text?: string
  mimeType?: string
}

export type ProcessUploadResult =
  | {
      needsClarification: true
      question: string
      suggestedTypes?: ContentType[]
      classification: ClassificationResult
    }
  | {
      needsClarification: false
      classification: ClassificationResult
      path: ReturnType<typeof getProcessingPath>
      vision: RootVisionResult
    }

export interface DocumentDetection {
  docType: DocumentType
  confidence: number
  childName?: string
  schoolName?: string
  grade?: string
  reason: string
}

type GeminiGenConfig = { temperature: number; maxOutputTokens: number }

const SCHEDULE_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const

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

/** 第一步：文档类型识别（含孩子/学校/年级） */
export async function detectDocumentType(
  imageBase64: string,
  mimeType: string,
): Promise<DocumentDetection> {
  const prompt = `请分析这张图片：

1. 判断文件类型：
   schedule/notice/medical/passport/visa/invoice/photo/unknown

2. 如果图片里有人名，提取出来
   （英文名如 William、中文名如 王梓睿）

3. 如果有学校名称，提取出来

4. 如果有年级信息，提取出来（如 K3、Grade 3）

类型说明：
- schedule：课表（有时间+星期）
- notice：学校通知、活动通知
- medical：病历/处方
- passport：护照
- visa：签证/居留证
- invoice：账单/收据
- photo：普通生活照片
- unknown：无法判断

只返回JSON：
{
  "docType": "schedule",
  "confidence": 0.95,
  "childName": "William",
  "schoolName": "Lanna International School",
  "grade": "K3",
  "reason": "这是一张K3班级的周课表"
}`

  const rawText = await callGeminiVision(
    imageBase64,
    mimeType,
    prompt,
    { maxOutputTokens: 400, temperature: 0 },
    'detect-type',
  )

  console.log('[rootVision] detect raw:', rawText)

  const result = parseGeminiJson(rawText) as {
    docType?: unknown
    confidence?: unknown
    childName?: unknown
    schoolName?: unknown
    grade?: unknown
    reason?: unknown
  } | null

  if (!result) {
    return { docType: 'unknown', confidence: 0, reason: 'parse failed' }
  }

  return {
    docType: normalizeDocType(result.docType),
    confidence: clampConfidence(result.confidence),
    childName: result.childName ? String(result.childName).trim() : undefined,
    schoolName: result.schoolName ? String(result.schoolName).trim() : undefined,
    grade: result.grade ? String(result.grade).trim() : undefined,
    reason: result.reason ? String(result.reason) : '',
  }
}

/** 课表：单次全表识别 */
export async function processSchedule(imageBase64: string, mimeType: string): Promise<Record<string, unknown[]>> {
  const prompt = `这是一张学校周课表图片。

请仔细分析表格结构，提取周一到周五（mon/tue/wed/thu/fri）每天的课程。

重要规则：
1. 每个时间段每天只有一节课，绝对不要重复
2. 相同课程名在同一天只出现一次
3. 时间只取开始时间，格式 HH:MM
4. 课程名拼写错误请纠正（如 Reddling→Reading）
5. 以下是日常安排不是课程：
   Breakfast、Morning Routine、Snack、Lunch、
   Rest Time、Pick up、Outdoor Play
   这些设 category: "break" 或 "transition"
6. 真实课程设 category: "class" 或 "activity"

只返回JSON，格式：
{
  "mon": [{"time":"07:50","subject":"Breakfast","category":"break"},...],
  "tue": [...],
  "wed": [...],
  "thu": [...],
  "fri": [...]
}

不要返回其他任何文字。`

  try {
    const raw = await callGeminiVision(
      imageBase64,
      mimeType,
      prompt,
      { maxOutputTokens: 8192, temperature: 0.1 },
      'schedule-full',
    )

    console.log('[rootVision] schedule-full raw:', raw.slice(0, 2000))

    const parsed = parseGeminiJson(raw) as Record<string, unknown> | null
    if (!parsed || typeof parsed !== 'object') {
      return Object.fromEntries(SCHEDULE_DAYS.map((d) => [d, []]))
    }

    return Object.fromEntries(
      SCHEDULE_DAYS.map((day) => {
        const dayData = parsed[day]
        return [day, Array.isArray(dayData) ? dayData : []]
      }),
    )
  } catch (e) {
    console.error('[rootVision] schedule-full failed:', e)
    return Object.fromEntries(SCHEDULE_DAYS.map((d) => [d, []]))
  }
}

export async function processNotice(imageBase64: string, mimeType: string) {
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

function contentTypeToLegacyDocType(type: ContentType): DocumentType {
  switch (type) {
    case 'class_schedule':
      return 'schedule'
    case 'school_notice':
    case 'school_calendar':
      return 'notice'
    case 'medical_doc':
      return 'medical'
    case 'passport_visa':
      return 'passport'
    case 'invoice_bill':
      return 'invoice'
    case 'flight_itinerary':
      return 'unknown'
    default:
      return 'unknown'
  }
}

function classificationToDetection(classification: ClassificationResult): DocumentDetection {
  return {
    docType: contentTypeToLegacyDocType(classification.type),
    confidence: classification.confidence,
    reason: classification.reason,
  }
}

function requireImage(content: UploadContent): { imageBase64: string; mimeType: string } {
  if (!content.imageBase64) {
    throw new Error('processUpload: image required for extraction')
  }
  return {
    imageBase64: content.imageBase64,
    mimeType: content.mimeType || 'image/jpeg',
  }
}

function buildVisionResult(
  classification: ClassificationResult,
  data: unknown,
  summary: string,
  actions: RootVisionAction[],
): RootVisionResult {
  const detection = classificationToDetection(classification)
  return {
    docType: detection.docType,
    confidence: classification.confidence,
    data,
    summary,
    actions,
    detection,
    contentType: classification.type,
    classification,
  }
}

async function extractSchoolCalendarEvents(imageBase64: string, mimeType: string) {
  const raw = await callGeminiVision(
    imageBase64,
    mimeType,
    `这是一份学期校历或假期安排表。
提取所有学期起止、假期、重要日期。
JSON数组: [{"title":"","date_start":"YYYY-MM-DD","date_end":"YYYY-MM-DD","event_type":"term_start|term_end|holiday|break|other"}]
只返回JSON数组。`,
    { maxOutputTokens: 1500, temperature: 0.1 },
    'school-calendar',
  )
  return parseGeminiJsonArray(raw)
}

async function extractFlightItinerary(imageBase64: string, mimeType: string) {
  const raw = await callGeminiVision(
    imageBase64,
    mimeType,
    `这是机票或行程单。提取每一程航班信息。
JSON数组: [{"flightNumber":"","airline":"","departureCity":"","arrivalCity":"","departureDate":"YYYY-MM-DD","departureTime":"HH:MM","passengerName":""}]
这是出行信息，不是学校校历。
只返回JSON数组。`,
    { maxOutputTokens: 1000, temperature: 0 },
    'flight-itinerary',
  )
  return parseGeminiJsonArray(raw)
}

async function processSchoolNoticeHandler(content: UploadContent, classification: ClassificationResult) {
  const { imageBase64, mimeType } = requireImage(content)
  const data = await processNotice(imageBase64, mimeType)
  const notice = data as { meta: Record<string, unknown>; todos: unknown[]; events: unknown[] }

  const actions: RootVisionAction[] = notice.todos.map((t) => ({
    type: 'add_todo',
    label: safeStr((t as Record<string, unknown>)?.action, '待办事项'),
    data: { ...(t as Record<string, unknown>), dimension: 'education' },
  }))

  if (notice.events.length > 0) {
    actions.push({
      type: 'save_calendar_events',
      label: '保存校历活动',
      data: notice.events,
    })
  }

  const summary = `学校通知「${safeStr(notice.meta?.title, '未命名通知')}」，${notice.todos.length} 件待办、${notice.events.length} 个日期`
  return buildVisionResult(classification, data, summary, actions)
}

async function processSchoolCalendarHandler(content: UploadContent, classification: ClassificationResult) {
  const { imageBase64, mimeType } = requireImage(content)
  const events = await extractSchoolCalendarEvents(imageBase64, mimeType)
  const actions: RootVisionAction[] = events.length
    ? [{ type: 'save_calendar_events', label: '保存学期校历', data: events }]
    : []

  return buildVisionResult(
    classification,
    events,
    events.length ? `学期校历，共 ${events.length} 个日期节点` : '校历内容未能提取日期',
    actions,
  )
}

async function processClassScheduleHandler(content: UploadContent, classification: ClassificationResult) {
  const { imageBase64, mimeType } = requireImage(content)
  const data = await processSchedule(imageBase64, mimeType)
  return buildVisionResult(
    classification,
    data,
    '周课表已整理，可保存到孩子档案',
    [{ type: 'save_schedule', label: '保存课表', data }],
  )
}

async function processFlightItineraryHandler(content: UploadContent, classification: ClassificationResult) {
  const { imageBase64, mimeType } = requireImage(content)
  const flights = await extractFlightItinerary(imageBase64, mimeType)

  const actions: RootVisionAction[] = flights.map((f) => {
    const row = f as Record<string, unknown>
    const flightNo = safeStr(row.flightNumber)
    const route = [row.departureCity, row.arrivalCity].map((c) => safeStr(c)).filter(Boolean).join('→')
    const label = flightNo ? `航班 ${flightNo}` : route || '出行航班'
    const actionText = [flightNo, route].filter(Boolean).join(' ')
    return {
      type: 'add_todo',
      label,
      data: {
        action: actionText || label,
        deadline: safeStr(row.departureDate),
        required: safeStr(row.departureTime) ? `起飞 ${safeStr(row.departureTime)}` : undefined,
        dimension: 'mobility',
      },
    }
  })

  return buildVisionResult(
    classification,
    flights,
    flights.length ? `行程单 ${flights.length} 程，已生成出行待办（不写校历）` : '未能识别航班信息',
    actions,
  )
}

async function processInvoiceBillHandler(content: UploadContent, classification: ClassificationResult) {
  const { imageBase64, mimeType } = requireImage(content)
  const data = await processInvoice(imageBase64, mimeType)
  const inv = data as { header: Record<string, unknown>; items: unknown[] }
  const summary = `账单：${safeStr(inv.header?.merchant, '商户')} ${safeStr(inv.header?.total, '')}${safeStr(inv.header?.currency, '')}`

  return buildVisionResult(classification, data, summary, [{
    type: 'add_payment_reminder',
    label: '设置付款提醒',
    data: { ...(inv.header || {}), dimension: 'wealth' },
  }])
}

async function processMedicalDocHandler(content: UploadContent, classification: ClassificationResult) {
  const { imageBase64, mimeType } = requireImage(content)
  const data = await processMedical(imageBase64, mimeType)
  const med = data as {
    diagnosis: Record<string, unknown>
    medications: unknown[]
    followup: Record<string, unknown>
  }

  const actions: RootVisionAction[] = [
    { type: 'save_medical', label: '保存病历', data },
    ...(med.followup?.followupDate
      ? [{ type: 'add_reminder', label: '设置复诊提醒', data: med.followup }]
      : []),
  ]

  return buildVisionResult(
    classification,
    data,
    `病历：${safeStr(med.diagnosis?.diagnosis, '已识别')}，共 ${med.medications.length} 种药`,
    actions,
  )
}

async function processPassportVisaHandler(content: UploadContent, classification: ClassificationResult) {
  const { imageBase64, mimeType } = requireImage(content)
  const data = await processPassport(imageBase64, mimeType)
  const doc = data as Record<string, unknown>
  const docKind = safeStr(doc.type, 'passport')

  return buildVisionResult(
    classification,
    data,
    `${docKind === 'visa' ? '签证' : '护照'}到期日：${safeStr(doc.expiryDate, '未知')}`,
    [
      { type: 'save_document', label: '保存证件', data },
      { type: 'add_reminder', label: '设置到期提醒', data },
    ],
  )
}

/** 分类优先的统一上传入口 */
export async function processUpload(
  content: UploadContent,
  _userId: string,
  _childId: string,
): Promise<ProcessUploadResult> {
  const mimeType = content.mimeType || 'image/jpeg'

  const classification = await classifyContent(content.imageBase64, content.text, mimeType)

  console.log('[rootVision] classified as:', classification.type, classification.confidence)

  if (classification.confidence < 0.6) {
    return {
      needsClarification: true,
      question: '根没看清楚这是什么，这是学校通知、机票还是其他文件？',
      suggestedTypes: ['school_notice', 'flight_itinerary', 'invoice_bill'],
      classification,
    }
  }

  const path = getProcessingPath(classification)
  console.log('[rootVision] processing path:', path.handler)

  let vision: RootVisionResult

  switch (path.handler) {
    case 'processSchoolNotice':
      vision = await processSchoolNoticeHandler(content, classification)
      break
    case 'processSchoolCalendar':
      vision = await processSchoolCalendarHandler(content, classification)
      break
    case 'processClassSchedule':
      vision = await processClassScheduleHandler(content, classification)
      break
    case 'processFlightItinerary':
      vision = await processFlightItineraryHandler(content, classification)
      break
    case 'processInvoiceBill':
      vision = await processInvoiceBillHandler(content, classification)
      break
    case 'processMedicalDoc':
      vision = await processMedicalDocHandler(content, classification)
      break
    case 'processPassportVisa':
      vision = await processPassportVisaHandler(content, classification)
      break
    default:
      return {
        needsClarification: true,
        question: '这份文件是什么？帮根了解一下',
        classification,
      }
  }

  return { needsClarification: false, classification, path, vision }
}

/** 兼容旧调用：内部分类优先 */
export async function processDocument(
  imageBase64: string,
  mimeType: string,
  _knownDetection?: DocumentDetection,
): Promise<RootVisionResult> {
  const result = await processUpload({ imageBase64, mimeType }, '', '')

  if (result.needsClarification) {
    const detection = classificationToDetection(result.classification)
    return {
      docType: 'unknown',
      confidence: result.classification.confidence,
      data: { clarification: result },
      summary: result.question,
      actions: [],
      detection,
      contentType: result.classification.type,
      classification: result.classification,
    }
  }

  return result.vision
}

/** 供 Claude worker 使用的上下文摘要 */
export function buildRootVisionContext(result: RootVisionResult): string {
  const dataPreview = JSON.stringify(result.data).slice(0, 3500)
  const typeLabel = result.contentType || result.docType
  const mobilityNote = result.contentType === 'flight_itinerary'
    ? '\n注意：这是出行/机票，只生成 mobility 待办，禁止写入 child_school_calendar。'
    : ''
  return [
    '【根的眼睛】',
    result.summary,
    `分类：${typeLabel}（置信度 ${Math.round(result.confidence * 100)}%）`,
    `建议动作：${result.actions.map((a) => a.label).join('、') || '无'}`,
    mobilityNote,
    `结构化数据：${dataPreview}`,
  ].filter(Boolean).join('\n')
}
