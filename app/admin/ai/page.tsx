import { getAdminSupabase } from '@/lib/admin/supabase'

export const dynamic = 'force-dynamic'

export default async function AdminAI() {
  const supabase = getAdminSupabase()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: events } = await supabase
    .from('analytics_events')
    .select('event_type, created_at, user_id')
    .gte('created_at', yesterday)
    .order('created_at', { ascending: false })
    .limit(100)

  const typeCounts: Record<string, number> = {}
  events?.forEach((e) => {
    if (e.event_type) {
      typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1
    }
  })

  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, color: '#2d322f' }}>
        根 使用监控（过去24小时）
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {sortedTypes.length === 0 ? (
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              color: 'rgba(45,50,47,0.45)',
              fontSize: 14,
            }}
          >
            暂无事件
          </div>
        ) : (
          sortedTypes.map(([type, count]) => (
            <div
              key={type}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ fontSize: 13, color: 'rgba(45,50,47,0.5)', marginBottom: 8 }}>{type}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#a46355' }}>{count}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#2d322f' }}>
          最近事件
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0ede8' }}>
              {['时间', '事件类型', '用户'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontSize: 13,
                    color: 'rgba(45,50,47,0.5)',
                    fontWeight: 500,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(events || []).slice(0, 20).map((event) => (
              <tr key={`${event.created_at}-${event.event_type}-${event.user_id}`} style={{ borderBottom: '1px solid #f0ede8' }}>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'rgba(45,50,47,0.5)' }}>
                  {new Date(event.created_at).toLocaleTimeString('zh-CN')}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 14, color: '#2d322f' }}>{event.event_type}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'rgba(45,50,47,0.5)' }}>
                  {event.user_id ? `${event.user_id.slice(0, 8)}…` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
