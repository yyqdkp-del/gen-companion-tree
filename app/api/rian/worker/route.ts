export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { drainQueuedJobs, runProcessJobById } from '@/lib/rian/workerCore'

// ══ Worker 主入口（HTTP / cron）══
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const rawInputId = req.headers.get('x-raw-input-id')?.trim()
    if (rawInputId) {
      const ran = await runProcessJobById(rawInputId)
      return NextResponse.json({
        ok: true,
        processed: ran ? 1 : 0,
        job_ids: ran ? [rawInputId] : [],
        message: ran ? 'single job' : 'job not queued or missing',
      })
    }

    const jobs = await drainQueuedJobs(3)
    if (!jobs.length) {
      return NextResponse.json({ ok: true, processed: 0, message: '队列为空' })
    }

    return NextResponse.json({
      ok: true,
      processed: jobs.length,
      job_ids: jobs.map((j: { id: string }) => j.id),
    })

  } catch (e: any) {
    console.error('Worker 错误:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
