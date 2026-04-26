export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// ══ 主入口 ══
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action_type, user_id } = body

    if (!user_id) {
      return NextResponse.json({ ok: false, error: 'Missing user_id' }, { status: 400 })
    }

    switch (action_type) {
      case 'fill_pdf':
        return await handleFillPDF(body)
      case 'mark_done':
        return await handleMarkDone(body)
      case 'convert_to_todo':
        return await handleConvertToTodo(body, user_id)
      default:
        return NextResponse.json({ ok: false, error: `Unknown action_type: ${action_type}` }, { status: 400 })
    }
  } catch (e: any) {
    console.error('Perform error:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

// ══ PDF 预填下载 ══
async function handleFillPDF(body: any) {
  const { form_type, prefilled_fields, user_id } = body

  // 读取模板
  const { data: template } = await supabase
    .from('form_templates')
    .select('*')
    .eq('form_type', form_type)
    .single()

  if (!template) {
    // 没有模板，直接重定向到官方页面
    return NextResponse.json({
      ok: false,
      error: 'Template not found',
      fallback_url: `https://www.google.com/search?q=${encodeURIComponent(form_type + ' fillable PDF Thailand')}`,
    }, { status: 404 })
  }

  try {
    // 用 pdf-lib 填写 PDF
    const { PDFDocument, StandardFonts } = await import('pdf-lib')

    // 下载原始 PDF
    const pdfRes = await fetch(template.download_url || template.official_url)
    if (!pdfRes.ok) throw new Error('Failed to download PDF template')

    const pdfBytes = await pdfRes.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const form = pdfDoc.getForm()

    // 填写字段
    const fields = prefilled_fields || {}
    for (const [fieldName, value] of Object.entries(fields)) {
      try {
        const field = form.getTextField(fieldName)
        if (field && value) field.setText(String(value))
      } catch {
        // 字段不存在，跳过
      }
    }

    // 生成填好的 PDF
    const filledPdfBytes = await pdfDoc.save()

    return new NextResponse(filledPdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${form_type}_prefilled.pdf"`,
      },
    })
  } catch (e: any) {
    console.error('PDF fill error:', e?.message)
    // 降级：返回官方链接
    return NextResponse.json({
      ok: false,
      error: 'PDF fill failed',
      fallback_url: template.official_url || template.download_url,
    }, { status: 500 })
  }
}

// ══ 标记完成 ══
async function handleMarkDone(body: any) {
  const { action_queue_id, source_type, source_id, user_id } = body

  // 更新 action_queue
  if (action_queue_id) {
    await supabase.from('action_queue').update({
      status: 'done',
      executed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', action_queue_id).eq('user_id', user_id)
  }

  // 同步更新原始来源
  if (source_type === 'todo' && source_id) {
    await supabase.from('todo_items').update({
      status: 'done',
      completed_at: new Date().toISOString(),
    }).eq('id', source_id).eq('user_id', user_id)
  }

  if (source_type === 'hotspot' && source_id) {
    await supabase.from('hotspot_items').update({
      status: 'read',
    }).eq('id', source_id).eq('user_id', user_id)
  }

  return NextResponse.json({ ok: true })
}

// ══ 热点转待办 ══
async function handleConvertToTodo(body: any, userId: string) {
  const { hotspot_id, custom_title } = body

  const { data: hotspot } = await supabase
    .from('hotspot_items')
    .select('*')
    .eq('id', hotspot_id)
    .single()

  if (!hotspot) {
    return NextResponse.json({ ok: false, error: 'Hotspot not found' }, { status: 404 })
  }

  const categoryMap: Record<string, string> = {
    safety: 'compliance', education: 'education', visa: 'compliance',
    finance: 'wealth', health: 'medical', shopping: 'logistics',
    weather: 'mobility', mom: 'selfcare',
  }

  const priorityMap: Record<string, string> = {
    urgent: 'red', important: 'orange', lifestyle: 'yellow',
  }

  const { data: todo } = await supabase.from('todo_items').insert({
    user_id: userId,
    title: custom_title || `跟进：${hotspot.title}`,
    description: hotspot.summary,
    category: categoryMap[hotspot.category] || 'other',
    priority: priorityMap[hotspot.urgency] || 'yellow',
    status: 'pending',
    source: 'hotspot',
    source_ref_id: hotspot_id,
    ai_action_data: {
      brain_instruction: {
        dimension: categoryMap[hotspot.category] || 'other',
        intent: hotspot.title,
        context: hotspot.summary,
        relevance: hotspot.relevance_reason,
      }
    },
    one_tap_ready: false,
  }).select().single()

  // 标记热点已读
  await supabase.from('hotspot_items').update({ status: 'read' }).eq('id', hotspot_id)

  return NextResponse.json({ ok: true, todo_id: todo?.id })
}
