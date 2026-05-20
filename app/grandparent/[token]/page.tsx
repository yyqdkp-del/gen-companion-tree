import { createClient } from '@supabase/supabase-js'
import GrandparentClient from './GrandparentClient'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type ReportRow = {
  week_start: string
  week_end: string
  grandparent_views?: number
  grandparent_likes?: number
  content?: Record<string, unknown>
  children?: { name?: string; emoji?: string } | null
}

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function GrandparentPage({ params }: PageProps) {
  const { token } = await params

  const { data: report } = await supabase
    .from('growth_reports')
    .select('*, children(name, emoji)')
    .eq('share_token', token)
    .gt('token_expires_at', new Date().toISOString())
    .single()

  if (!report) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fbf9f6',
          fontFamily: "'Noto Serif SC', serif",
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🌳</div>
        <div style={{ fontSize: 18, color: '#2d322f', marginBottom: 8 }}>
          这份成长周报已过期
        </div>
        <div style={{ fontSize: 14, color: 'rgba(45,50,47,0.5)' }}>
          请让孩子的妈妈重新生成一份新的周报
        </div>
      </div>
    )
  }

  await supabase
    .from('growth_reports')
    .update({ grandparent_views: (report.grandparent_views || 0) + 1 })
    .eq('share_token', token)

  return (
    <GrandparentClient report={report as ReportRow} token={token} />
  )
}
