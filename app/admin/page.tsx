import { getAdminSupabase } from '@/lib/admin/supabase'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = getAdminSupabase()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: proUsers },
    { count: totalChildren },
    { count: todayPatrols },
    { data: recentPatrols },
    { data: lastHotspot },
  ] = await Promise.all([
    supabase.from('family_profile').select('*', { count: 'exact', head: true }),
    supabase.from('family_profile').select('*', { count: 'exact', head: true }).eq('is_pro', true),
    supabase.from('children').select('*', { count: 'exact', head: true }),
    supabase.from('hotspot_items').select('*', { count: 'exact', head: true }).gte('created_at', since24h),
    supabase
      .from('hotspot_items')
      .select('created_at, status, user_id, title')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('hotspot_items')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const lastPatrolTime = lastHotspot?.created_at
  const hoursSincePatrol = lastPatrolTime
    ? Math.floor((Date.now() - new Date(lastPatrolTime).getTime()) / 3600000)
    : 999
  const patrolHealth =
    hoursSincePatrol < 2 ? '正常' : hoursSincePatrol < 6 ? '警告' : '异常'
  const patrolHealthBg =
    patrolHealth === '正常' ? '#e8f5ee' : patrolHealth === '警告' ? '#fef9ee' : '#fee'
  const patrolHealthColor =
    patrolHealth === '正常' ? '#2d7d5a' : patrolHealth === '警告' ? '#8c6b2e' : '#c0632e'

  const cards = [
    { label: '总用户', value: totalUsers || 0, color: '#a46355' },
    { label: 'Pro用户', value: proUsers || 0, color: '#2d7d5a' },
    { label: '孩子档案', value: totalChildren || 0, color: '#5a6e8c' },
    { label: '今日热点', value: todayPatrols || 0, color: '#8c5a2d' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, color: '#2d322f' }}>
        系统概览
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {cards.map((card) => (
          <div
            key={card.label}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ fontSize: 13, color: 'rgba(45,50,47,0.5)', marginBottom: 8 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
        <div
          style={{
            background: patrolHealthBg,
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontSize: 13, color: 'rgba(45,50,47,0.55)', marginBottom: 8 }}>热点巡逻</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: patrolHealthColor }}>{patrolHealth}</div>
          <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7, color: '#2d322f' }}>
            {lastPatrolTime ? `${hoursSincePatrol} 小时前` : '从未巡逻'}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#2d322f' }}>
          最近热点推送
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0ede8' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 13, color: 'rgba(45,50,47,0.5)', fontWeight: 500 }}>时间</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 13, color: 'rgba(45,50,47,0.5)', fontWeight: 500 }}>用户</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 13, color: 'rgba(45,50,47,0.5)', fontWeight: 500 }}>标题</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 13, color: 'rgba(45,50,47,0.5)', fontWeight: 500 }}>状态</th>
            </tr>
          </thead>
          <tbody>
            {(recentPatrols || []).length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 16, fontSize: 14, color: 'rgba(45,50,47,0.45)' }}>
                  暂无记录
                </td>
              </tr>
            ) : (
              (recentPatrols || []).map((row) => (
                <tr key={row.created_at + (row.user_id || '')} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: '#2d322f' }}>
                    {new Date(row.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'rgba(45,50,47,0.6)' }}>
                    {row.user_id ? `${row.user_id.slice(0, 8)}…` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#2d322f', maxWidth: 280 }}>
                    {row.title || '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        background: row.status === 'unread' ? '#fef3ee' : '#e8f5ee',
                        color: row.status === 'unread' ? '#c0632e' : '#2d7d5a',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      {row.status || '—'}
                    </span>
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
