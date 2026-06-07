import { createClient } from '@supabase/supabase-js'
import type { AutoArchiveResult } from '@/lib/ai/autoArchive'
import { CalendarService } from '@/lib/services/CalendarService'
import { ScheduleService } from '@/lib/services/ScheduleService'
import { TodoService } from '@/lib/services/TodoService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

function str(v: unknown): string | null {
  if (v == null || v === '') return null
  return String(v)
}

function dateOnly(v: unknown): string | null {
  const s = str(v)
  if (!s) return null
  return s.slice(0, 10)
}

export async function executeArchive(
  result: AutoArchiveResult,
  userId: string,
): Promise<void> {
  if (!result.childId && result.archiveType !== 'family_document' && result.archiveType !== 'payment_todo') {
    throw new Error('executeArchive: missing childId')
  }

  switch (result.archiveType) {
    case 'class_schedule': {
      if (!result.childId) break
      const saved = await ScheduleService.save(
        result.childId,
        userId,
        result.archiveData as Record<string, unknown[]>,
        'archive',
        { enrich: false, client: supabase },
      )
      if (!saved.ok) throw new Error(saved.error || 'schedule archive failed')
      break
    }

    case 'school_calendar': {
      if (!result.childId) break
      const notice = result.archiveData as {
        meta?: Record<string, unknown>
        todos?: Record<string, unknown>[]
        events?: Record<string, unknown>[]
      }

      for (const event of notice.events || []) {
        const title = str(event.event || event.title)
        const dateStart = dateOnly(event.date)
        if (!title || !dateStart) continue

        await CalendarService.upsertEvent({
          userId,
          childId: result.childId,
          title,
          dateStart,
          dateEnd: dateStart,
          description: str(event.location) || str(notice.meta?.title) || undefined,
          eventType: 'other',
          source: 'root_vision',
          client: supabase,
        })
      }

      for (const todo of notice.todos || []) {
        const title = str(todo.action)
        if (!title) continue

        await TodoService.create({
          userId,
          childId: result.childId,
          title,
          description: str(todo.required) || undefined,
          dimension: 'education',
          priority: 'orange',
          dueDate: dateOnly(todo.deadline) || undefined,
          source: 'root_vision',
          client: supabase,
        })
      }
      break
    }

    case 'health_record': {
      if (!result.childId) break
      const med = result.archiveData as {
        diagnosis?: Record<string, unknown>
        medications?: unknown[]
        followup?: Record<string, unknown>
      }
      const diagnosis = med.diagnosis || {}
      const followup = med.followup || {}
      const meds = Array.isArray(med.medications) ? med.medications : []

      await supabase.from('child_health_records').insert({
        child_id: result.childId,
        user_id: userId,
        date: dateOnly(diagnosis.date) || new Date().toISOString().slice(0, 10),
        type: 'visit',
        description: str(diagnosis.diagnosis) || '病历记录',
        doctor_name: str(diagnosis.doctor),
        hospital: str(diagnosis.hospital),
        follow_up_date: dateOnly(followup.followupDate),
        notes: [
          meds.length ? `药物 ${meds.length} 种` : '',
          str(followup.instructions),
        ].filter(Boolean).join('；') || null,
      })

      const followDate = dateOnly(followup.followupDate)
      if (followDate) {
        await TodoService.create({
          userId,
          title: `复诊预约${str(diagnosis.hospital) ? ` - ${str(diagnosis.hospital)}` : ''}`,
          dimension: 'medical',
          priority: 'orange',
          dueDate: followDate,
          source: 'root_vision',
          client: supabase,
        })
      }
      break
    }

    case 'family_document': {
      const doc = result.archiveData as Record<string, unknown>
      const docType = str(doc.type) || result.detection.docType || 'passport'
      const patch: Record<string, unknown> = { user_id: userId }

      if (doc.name) patch.member_name = str(doc.name)
      if (doc.passportNumber) patch.passport_number = str(doc.passportNumber)
      if (doc.issueDate) patch.passport_issue_date = dateOnly(doc.issueDate)
      if (doc.nationality) patch.member_nationality = str(doc.nationality)
      if (doc.visaType) patch.visa_type = str(doc.visaType)

      if (doc.expiryDate) {
        if (docType === 'visa') patch.visa_expiry = str(doc.expiryDate)
        else patch.passport_expiry = str(doc.expiryDate)
      }

      await supabase.from('family_profile').upsert(patch, { onConflict: 'user_id' })

      await supabase.from('family_documents').insert({
        user_id: userId,
        member_name: str(doc.name),
        doc_type: docType === 'visa' ? 'visa' : 'passport',
        title: docType === 'visa' ? '签证' : '护照',
        expiry_date: dateOnly(doc.expiryDate),
        reminder_days_before: [90, 30, 7],
        metadata: {
          passportNumber: doc.passportNumber,
          entries: doc.entries,
          source: 'root_vision',
        },
      })

      const expiry = dateOnly(doc.expiryDate)
      if (expiry) {
        await TodoService.create({
          userId,
          title: `${docType === 'visa' ? '签证' : '护照'}到期续签`,
          dimension: 'compliance',
          priority: 'orange',
          dueDate: expiry,
          source: 'root_vision',
          client: supabase,
        })
      }
      break
    }

    case 'payment_todo': {
      const inv = result.archiveData as {
        header?: Record<string, unknown>
        items?: unknown[]
      }
      const header = inv.header || {}
      const merchant = str(header.merchant) || '账单'
      const total = str(header.total)
      const currency = str(header.currency) || ''

      await TodoService.create({
        userId,
        childId: result.childId || undefined,
        title: `支付：${merchant}${total ? ` ${total}${currency}` : ''}`,
        description: Array.isArray(inv.items) && inv.items.length
          ? `共 ${inv.items.length} 项明细`
          : undefined,
        dimension: 'wealth',
        priority: 'orange',
        dueDate: dateOnly(header.date) || undefined,
        amount: total ? Number(total) : undefined,
        currency: currency || undefined,
        source: 'root_vision',
        client: supabase,
      })
      break
    }

    default:
      break
  }
}
