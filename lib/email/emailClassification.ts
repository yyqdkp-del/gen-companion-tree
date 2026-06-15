import type { TodoDimension } from '@/lib/services/TodoService'
import {
  classifyContent,
  getProcessingPath,
  type ClassificationResult,
  type ContentType,
} from '@/lib/vision/contentClassifier'

export function contentTypeToDimension(type: ContentType): TodoDimension {
  const path = getProcessingPath({
    type,
    confidence: 1,
    reason: '',
    language: 'mixed',
  })
  const dim = path.dimension || 'education'
  const allowed: TodoDimension[] = [
    'compliance', 'medical', 'wealth', 'education', 'mobility', 'logistics', 'estate', 'social', 'selfcare',
  ]
  return allowed.includes(dim as TodoDimension) ? (dim as TodoDimension) : 'education'
}

export function isSchoolRelatedContent(type: ContentType): boolean {
  return type === 'school_notice' || type === 'school_calendar' || type === 'class_schedule'
}

export function contentTypeToEmailDocType(type: ContentType): string {
  switch (type) {
    case 'school_notice':
    case 'school_calendar':
    case 'class_schedule':
      return 'school'
    case 'flight_itinerary':
      return 'flight'
    case 'invoice_bill':
      return 'invoice'
    case 'medical_doc':
      return 'medical'
    case 'passport_visa':
      return 'compliance'
    default:
      return 'other'
  }
}

export function buildEmailTextForClassification(subject: string, body: string): string {
  return [`主题：${subject}`, '', body].join('\n').slice(0, 8000)
}

export async function classifyEmailContent(input: {
  subject: string
  body: string
  attachment?: { data: string; mimeType: string }
}): Promise<ClassificationResult> {
  const text = buildEmailTextForClassification(input.subject, input.body)
  const isImage = input.attachment?.mimeType.startsWith('image/')
  return classifyContent(
    isImage ? input.attachment?.data : undefined,
    text,
    input.attachment?.mimeType || 'image/jpeg',
  )
}
