import { getAdminSupabase } from '@/lib/admin/supabase'

export const dynamic = 'force-dynamic'

export default async function AdminHotspots() {
  const supabase = getAdminSupabase()

  const { data: hotspots } = await supabase
    .from('hotspot_items')
    .select('id, user_id, title, category, urgency, source_url, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, color: '#2d322f' }}>
        热点内容审核
      </h1>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0ede8' }}>
              {['时间', '用户', '标题', '类别', '紧急度', '来源'].map((h) => (
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
            {(hotspots || []).length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 16, fontSize: 14, color: 'rgba(45,50,47,0.45)' }}>
                  暂无热点
                </td>
              </tr>
            ) : (
              (hotspots || []).map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(45,50,47,0.5)' }}>
                    {new Date(h.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(45,50,47,0.5)' }}>
                    {h.user_id ? `${h.user_id.slice(0, 8)}…` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#2d322f', maxWidth: 300 }}>
                    {h.title}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(45,50,47,0.5)' }}>
                    {h.category || '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        background:
                          h.urgency === 'urgent'
                            ? '#fee'
                            : h.urgency === 'important'
                              ? '#fef9ee'
                              : '#f5f4f1',
                        color:
                          h.urgency === 'urgent'
                            ? '#c0632e'
                            : h.urgency === 'important'
                              ? '#8c6b2e'
                              : 'rgba(45,50,47,0.5)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      {h.urgency || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>
                    {h.source_url ? (
                      <a href={h.source_url} target="_blank" rel="noreferrer" style={{ color: '#a46355' }}>
                        查看
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
