import type { TodoDimension } from '@/lib/services/TodoService'
import type { ClassificationResult, ContentType } from '@/lib/vision/contentClassifier'
import {
  classifyEmailContent,
  contentTypeToDimension,
  contentTypeToEmailDocType,
  isSchoolRelatedContent,
} from '@/lib/email/emailClassification'
import { normalizeEmailDate, normalizeEmailDatesInText } from '@/lib/email/emailDateParser'
import {
  extractFromAttachment,
  extractFromEmailBody,
  mergeExtractions,
  type RawEmailExtraction,
} from '@/lib/email/pdfExtractor'
import type { EmailExtraction, EmailTodoItem } from '@/lib/email/persistEmailExtraction'

export type StructuredEmailInput = {
  subject: string
  body: string
  from: string
  date: string
  messageId: string
  attachments: Array<{ filename: string; mimeType: string; data: string }>
}

function normalizeRawExtraction(
  raw: RawEmailExtraction,
  contentType: ContentType,
  dimension: TodoDimension,
  receivedAt: string,
): Pick<EmailExtraction, 'events' | 'amounts' | 'todos' | 'requirements'> {
  const ref = receivedAt

  const events = raw.events
    .filter((e) => e.title)
    .map((e) => ({
      title: e.title,
      date: normalizeEmailDate(e.date, ref) || normalizeEmailDate(e.date_raw, ref) || '',
      requires_action: e.requires_action,
      requires_items: e.requires_items || [],
      deadline: normalizeEmailDate(e.deadline, ref) || normalizeEmailDate(e.deadline_raw, ref) || undefined,
    }))
    .filter((e) => e.date)

  const amounts = raw.amounts
    .filter((a) => a.amount)
    .map((a) => ({
      amount: a.amount,
      currency: a.currency || 'THB',
      purpose: a.purpose,
      due_date: normalizeEmailDate(a.due_date, ref) || normalizeEmailDate(a.due_date_raw, ref) || undefined,
    }))

  const todos: EmailTodoItem[] = raw.todos
    .filter((t) => t.title?.trim())
    .map((t) => ({
      title: t.title.trim(),
      dimension,
      due_date: normalizeEmailDate(t.due_date, ref)
        || normalizeEmailDate(t.due_date_raw, ref)
        || normalizeEmailDatesInText(t.title, ref)
        || null,
      priority: 'orange' as const,
    }))

  for (const event of events) {
    if (event.requires_action && contentType !== 'flight_itinerary') {
      todos.push({
        title: event.title,
        dimension,
        due_date: event.deadline || event.date || null,
        priority: 'yellow',
      })
    }
  }

  return {
    events: contentType === 'flight_itinerary' ? [] : events,
    amounts,
    todos,
    requirements: todos.map((t) => t.title),
  }
}

export async function buildStructuredEmailExtraction(
  input: StructuredEmailInput,
): Promise<EmailExtraction | null> {
  const firstImage = input.attachments.find((a) => a.mimeType.startsWith('image/'))

  const classification = await classifyEmailContent({
    subject: input.subject,
    body: input.body,
    attachment: firstImage ? { data: firstImage.data, mimeType: firstImage.mimeType } : undefined,
  })

  console.log('[emailPipeline] classified:', classification.type, classification.confidence)

  const contentType = classification.confidence >= 0.5 ? classification.type : 'school_notice'
  const dimension = contentTypeToDimension(contentType)

  const bodyExtraction = await extractFromEmailBody(input.body, input.subject, contentType)
  const attachmentExtractions = await Promise.all(
    input.attachments.map((att) =>
      extractFromAttachment(att.data, att.mimeType, att.filename, input.subject, contentType),
    ),
  )

  const merged = mergeExtractions([bodyExtraction, ...attachmentExtractions])
  const hasContent =
    merged.summaryParts.length > 0
    || merged.allEvents.length > 0
    || merged.allAmounts.length > 0
    || merged.allTodos.length > 0

  if (!hasContent) return null

  const receivedAt = input.date ? new Date(input.date).toISOString() : new Date().toISOString()
  const summary = merged.summaryParts.filter(Boolean).join('；') || input.subject

  const normalizedFromBody = bodyExtraction
    ? normalizeRawExtraction(bodyExtraction, contentType, dimension, receivedAt)
    : { events: [], amounts: [], todos: [], requirements: [] }

  const normalizedAttachments = attachmentExtractions
    .filter(Boolean)
    .map((ext) => normalizeRawExtraction(ext!, contentType, dimension, receivedAt))

  const events = [
    ...normalizedFromBody.events,
    ...normalizedAttachments.flatMap((e) => e.events),
  ]
  const amounts = [
    ...normalizedFromBody.amounts,
    ...normalizedAttachments.flatMap((e) => e.amounts),
  ]
  const todos = [
    ...normalizedFromBody.todos,
    ...normalizedAttachments.flatMap((e) => e.todos),
  ]

  const dedupedTodos = todos.filter((todo, idx, arr) =>
    arr.findIndex((t) => t.title === todo.title && t.due_date === todo.due_date) === idx,
  )

  return {
    emailId: input.messageId,
    subject: input.subject,
    fromAddress: input.from,
    receivedAt,
    summary,
    docType: contentTypeToEmailDocType(contentType),
    contentType,
    classification,
    dimension,
    isSchoolRelated: isSchoolRelatedContent(contentType),
    events,
    amounts,
    todos: dedupedTodos,
    requirements: dedupedTodos.map((t) => t.title),
    hasAttachments: input.attachments.length > 0,
  }
}

export { classifyEmailContent, type ClassificationResult }
