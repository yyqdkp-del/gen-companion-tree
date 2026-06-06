import { createClient } from '@supabase/supabase-js'
import type { DocumentDetection, DocumentType } from '@/lib/ai/rootVision'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

export type AutoArchiveResult = {
  childId: string | null
  archiveType: string
  archiveData: unknown
  summary: string
  requiresConfirm: boolean
  detection: DocumentDetection
}

type ChildRow = {
  id: string
  name: string
  school_name?: string | null
  grade?: string | null
}

function getArchiveType(docType: DocumentType): string {
  const map: Record<string, string> = {
    schedule: 'class_schedule',
    notice: 'school_calendar',
    medical: 'health_record',
    passport: 'family_document',
    visa: 'family_document',
    invoice: 'payment_todo',
  }
  return map[docType] || 'todo'
}

function buildSummary(detection: DocumentDetection, childId: string | null): string {
  const childText = childId ? '已自动归档到孩子档案' : '请确认是哪个孩子的'

  const typeText: Record<string, string> = {
    schedule: '课表',
    notice: '学校通知',
    medical: '病历',
    passport: '护照',
    visa: '签证',
    invoice: '账单',
    photo: '照片',
    unknown: '文件',
  }

  const label = typeText[detection.docType] || '文件'
  const hint = detection.childName ? `（识别到 ${detection.childName}）` : ''
  return `我看到了${label}${hint}，${childText}`
}

async function matchChild(
  detection: DocumentDetection,
  userId: string,
  activeChildId?: string,
): Promise<string | null> {
  const { data: children } = await supabase
    .from('children')
    .select('id, name, school_name, grade')
    .eq('user_id', userId)

  if (!children?.length) return null
  if (children.length === 1) return children[0].id

  for (const child of children as ChildRow[]) {
    if (detection.childName) {
      const detected = detection.childName.toLowerCase()
      const childName = child.name.toLowerCase()
      const firstName = child.name.split(/\s+/)[0]?.toLowerCase() || ''
      const nameMatch =
        childName.includes(detected) ||
        detected.includes(childName) ||
        (firstName && (detected.includes(firstName) || firstName.includes(detected)))
      if (nameMatch) return child.id
    }

    if (detection.schoolName && child.school_name) {
      const schoolMatch = child.school_name
        .toLowerCase()
        .includes(detection.schoolName.toLowerCase().slice(0, 6))
      if (schoolMatch) return child.id
    }

    if (detection.grade && child.grade && child.grade === detection.grade) {
      return child.id
    }
  }

  return activeChildId || null
}

export async function autoArchive(
  detection: DocumentDetection,
  processedData: unknown,
  userId: string,
  activeChildId?: string,
): Promise<AutoArchiveResult> {
  const childId = await matchChild(detection, userId, activeChildId)
  const archiveType = getArchiveType(detection.docType)
  const requiresConfirm =
    !childId ||
    detection.confidence < 0.8 ||
    detection.docType === 'unknown' ||
    detection.docType === 'photo'

  return {
    childId,
    archiveType,
    archiveData: processedData,
    summary: buildSummary(detection, childId),
    requiresConfirm,
    detection,
  }
}
