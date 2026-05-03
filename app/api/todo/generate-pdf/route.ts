export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

function formatDate(dateStr: string | null): { day: string; month: string; year: string } {
    if (!dateStr) return { day: '___', month: '___', year: '______' }
    const d = new Date(dateStr)
    return {
          day: String(d.getDate()).padStart(2, '0'),
          month: String(d.getMonth() + 1).padStart(2, '0'),
          year: String(d.getFullYear()),
    }
}

function calcAge(birthday: string | null): string {
    if (!birthday) return ''
    const today = new Date()
    const bday = new Date(birthday)
    let age = today.getFullYear() - bday.getFullYear()
    const m = today.getMonth() - bday.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) age--
    return String(age)
}

async function generateTM7PDF(profile: any, address: string, visaType: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const page = pdfDoc.addPage([595, 842])
    const { width, height } = page.getSize()

  const drawLabel = (text: string, x: number, y: number) => {
        page.drawText(text, { x, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) })
  }
    const drawValue = (text: string, x: number, y: number, size = 11) => {
          page.drawText(text || '', { x, y, size, font: fontBold, color: rgb(0, 0, 0.6) })
    }
    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
          page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.4, color: rgb(0.75, 0.75, 0.75) })
    }
    const drawBox = (x: number, y: number, w: number, h: number) => {
          page.drawRectangle({ x, y, width: w, height: h, borderWidth: 0.5, borderColor: rgb(0.8, 0.8, 0.8), color: rgb(0.98, 0.98, 0.98) })
    }

  // Header
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.1, 0.25, 0.5) })
    page.drawText('APPLICATION FOR EXTENSION OF TEMPORARY STAY IN THE KINGDOM', {
          x: 50, y: height - 38, size: 12, font: fontBold, color: rgb(1, 1, 1),
    })
    page.drawText('Form TM.7  |  Royal Thai Immigration Bureau', {
          x: 50, y: height - 56, size: 9, font, color: rgb(0.7, 0.85, 1),
    })
    page.drawText('Pre-filled by Gen Companion App  |  Please verify, print and sign', {
          x: 50, y: height - 70, size: 8, font, color: rgb(0.6, 0.75, 0.9),
    })

  let y = height - 110

  // Section 1: Personal Information
  page.drawText('PERSONAL INFORMATION', { x: 40, y, size: 9, font: fontBold, color: rgb(0.1, 0.25, 0.5) })
    drawLine(40, y - 4, width - 40, y - 4)
    y -= 22

  // Name
  const nameParts = (profile.member_name || '').trim().split(' ')
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : profile.member_name || ''
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''

  drawBox(40, y - 28, 230, 40)
    drawLabel('Family Name', 46, y - 8)
    drawValue(lastName, 46, y - 22)

  drawBox(280, y - 28, 275, 40)
    drawLabel('First Name', 286, y - 8)
    drawValue(firstName, 286, y - 22)
    y -= 50

  // Age, DOB, Nationality
  const dob = formatDate(profile.member_birthday)
    const age = calcAge(profile.member_birthday)

  drawBox(40, y - 28, 80, 40)
    drawLabel('Age', 46, y - 8)
    drawValue(age, 46, y - 22)

  drawBox(130, y - 28, 170, 40)
    drawLabel('Date of Birth (DD/MM/YYYY)', 136, y - 8)
    drawValue(`${dob.day} / ${dob.month} / ${dob.year}`, 136, y - 22)

  drawBox(310, y - 28, 245, 40)
    drawLabel('Nationality', 316, y - 8)
    drawValue(profile.member_nationality || '', 316, y - 22)
    y -= 50

  // Passport section
  page.drawText('PASSPORT INFORMATION', { x: 40, y, size: 9, font: fontBold, color: rgb(0.1, 0.25, 0.5) })
    drawLine(40, y - 4, width - 40, y - 4)
    y -= 22

  drawBox(40, y - 28, 200, 40)
    drawLabel('Passport Number', 46, y - 8)
    drawValue(profile.passport_number || '', 46, y - 22, 13)

  const issueDate = formatDate(profile.passport_issue_date)
    drawBox(250, y - 28, 155, 40)
    drawLabel('Date of Issue (DD/MM/YYYY)', 256, y - 8)
    drawValue(`${issueDate.day} / ${issueDate.month} / ${issueDate.year}`, 256, y - 22)

  const expiry = formatDate(profile.passport_expiry)
    drawBox(415, y - 28, 140, 40)
    drawLabel('Valid Until (DD/MM/YYYY)', 421, y - 8)
    drawValue(`${expiry.day} / ${expiry.month} / ${expiry.year}`, 421, y - 22)
    y -= 50

  drawBox(40, y - 28, 265, 40)
    drawLabel('Place of Issue', 46, y - 8)
    drawValue(profile.passport_issue_place || '', 46, y - 22)

  drawBox(315, y - 28, 240, 40)
    drawLabel('Type of Visa', 321, y - 8)
    drawValue(visaType || profile.visa_type || 'Tourist Visa', 321, y - 22)
    y -= 50

  // Address section
  page.drawText('ADDRESS IN THAILAND', { x: 40, y, size: 9, font: fontBold, color: rgb(0.1, 0.25, 0.5) })
    drawLine(40, y - 4, width - 40, y - 4)
    y -= 22

  drawBox(40, y - 28, width - 80, 40)
    drawLabel('Current Address in Thailand', 46, y - 8)
    drawValue(address || '', 46, y - 22, 10)
    y -= 50

  // Extension request
  page.drawText('EXTENSION REQUEST', { x: 40, y, size: 9, font: fontBold, color: rgb(0.1, 0.25, 0.5) })
    drawLine(40, y - 4, width - 40, y - 4)
    y -= 22

  drawBox(40, y - 28, 120, 40)
    drawLabel('Days Requested', 46, y - 8)
    drawValue('30', 46, y - 22, 14)

  drawBox(170, y - 28, 385, 40)
    drawLabel('Reason for Extension', 176, y - 8)
    drawValue('Tourism', 176, y - 22)
    y -= 60

  // Documents checklist
  page.drawText('REQUIRED DOCUMENTS CHECKLIST', { x: 40, y, size: 9, font: fontBold, color: rgb(0.1, 0.25, 0.5) })
    drawLine(40, y - 4, width - 40, y - 4)
    y -= 20

  const docs = [
        'Passport (original + 1 copy of bio page + visa stamp page)',
        'Completed TM.7 form (this document) + 1 photo (4x6cm)',
        'Copy of TM.6 Departure Card',
        'Fee: 1,900 THB (cash only)',
      ]
    docs.forEach((doc) => {
          page.drawRectangle({ x: 40, y: y - 4, width: 10, height: 10, borderWidth: 0.5, borderColor: rgb(0.5, 0.5, 0.5) })
          page.drawText(doc, { x: 56, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) })
          y -= 18
    })
    y -= 20

  // Signature
  drawLine(40, y, width - 40, y)
    y -= 20
    drawLabel('Applicant Signature', 40, y)
    drawLine(40, y - 16, 250, y - 16)

  drawLabel('Date', 320, y)
    drawLine(320, y - 16, 555, y - 16)
    y -= 40

  // Footer
  page.drawRectangle({ x: 0, y: 0, width, height: 44, color: rgb(0.95, 0.96, 0.98) })
    drawLine(0, 44, width, 44)
    page.drawText('Chiang Mai Immigration Office  |  71 M.3 Airport Road, Suthep, Muang, Chiang Mai 50200', {
          x: 60, y: 28, size: 8, font, color: rgb(0.4, 0.4, 0.4),
    })
    page.drawText('Tel: 053-201-755  |  Mon-Fri 08:30-16:30  |  Fee: 1,900 THB', {
          x: 100, y: 14, size: 8, font, color: rgb(0.4, 0.4, 0.4),
    })

  return await pdfDoc.save()
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
    try {
          const { user_id, todo_id, form_type = 'tm7' } = await req.json()

      if (!user_id) {
              return NextResponse.json({ ok: false, error: 'Missing user_id' }, { status: 400 })
      }

      const [{ data: profiles }, { data: places }, todoResult] = await Promise.all([
              supabase.from('family_profile').select('*').eq('user_id', user_id),
              supabase.from('family_places').select('*').eq('user_id', user_id),
              todo_id
                ? supabase.from('todo_items').select('*').eq('id', todo_id).eq('user_id', user_id).single()
                : Promise.resolve({ data: null }),
            ])

      if (!profiles || profiles.length === 0) {
              return NextResponse.json({ ok: false, error: 'Please complete your family profile (passport info) first' }, { status: 400 })
      }

      const profile = profiles.find((p: any) => p.member_role === 'mom' || p.member_role === 'parent') || profiles[0]
          const homePlace = places?.find((p: any) =>
                  p.label?.toLowerCase().includes('home') || p.label?.includes('home')
                                             )
          const address = homePlace?.address || places?.[0]?.address || ''

      const todo = todoResult?.data
          const visaType = (todo as any)?.ai_action_data?.brain_instruction?.context?.includes('ED')
            ? 'Non-Immigrant ED'
                  : (todo as any)?.ai_action_data?.brain_instruction?.context?.includes('Guardian')
              ? 'Non-Immigrant O (Guardian)'
                    : profile.visa_type || 'Tourist Visa'

      const pdfBytes = await generateTM7PDF(profile, address, visaType)

      const filename = `TM7_${(profile.member_name || 'applicant').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('companion-files')
        .upload(`pdfs/${filename}`, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('companion-files')
        .getPublicUrl(`pdfs/${filename}`)

      if (todo_id && todo) {
        const existingData = (todo as any)?.ai_action_data || {}
        await supabase.from('todo_items').update({
          ai_action_data: {
            ...existingData,
            pdf_url: urlData.publicUrl,
            pdf_form_type: form_type,
            pdf_generated_at: new Date().toISOString(),
          }
        }).eq('id', todo_id).eq('user_id', user_id)
      }

      return NextResponse.json({
        ok: true,
        pdf_url: urlData.publicUrl,
        filename,
        message: 'TM.7 form has been pre-filled. Please download, print and sign.',
      })

  } catch (e: any) {
    console.error('PDF generation error:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
