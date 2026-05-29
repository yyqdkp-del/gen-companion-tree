import { getAdminSupabase } from '@/lib/admin/supabase'

export const dynamic = 'force-dynamic'

export default async function AdminSubscriptions() {
  const supabase = getAdminSupabase()

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, color: '#2d322f' }}>
        订阅管理
      </h1>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0ede8' }}>
              {['用户ID', '计划', '状态', 'Paddle ID', '到期时间'].map((h) => (
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
            {(subs || []).length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 16, fontSize: 14, color: 'rgba(45,50,47,0.45)' }}>
                  暂无订阅记录
                </td>
              </tr>
            ) : (
              (subs || []).map((sub) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '12px', fontSize: 13, color: 'rgba(45,50,47,0.6)' }}>
                    {sub.user_id ? `${sub.user_id.slice(0, 8)}…` : '—'}
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, color: '#2d322f' }}>{sub.plan || '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        background: sub.status === 'active' ? '#e8f5ee' : '#fef3ee',
                        color: sub.status === 'active' ? '#2d7d5a' : '#c0632e',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: 12, color: 'rgba(45,50,47,0.5)' }}>
                    {(sub.paddle_subscription_id || sub.stripe_subscription_id || '—').toString().slice(0, 20)}
                  </td>
                  <td style={{ padding: '12px', fontSize: 13, color: 'rgba(45,50,47,0.5)' }}>
                    {sub.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString('zh-CN')
                      : '—'}
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
