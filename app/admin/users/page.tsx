import { getAdminSupabase } from '@/lib/admin/supabase'

export const dynamic = 'force-dynamic'

export default async function AdminUsers() {
  const supabase = getAdminSupabase()

  const { data: users } = await supabase
    .from('family_profile')
    .select('user_id, member_name, resident_city, is_pro, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const userIds = (users || []).map((u) => u.user_id).filter(Boolean) as string[]

  let childCountMap: Record<string, number> = {}
  if (userIds.length > 0) {
    const { data: childCounts } = await supabase.from('children').select('user_id').in('user_id', userIds)
    childCounts?.forEach((c) => {
      if (c.user_id) childCountMap[c.user_id] = (childCountMap[c.user_id] || 0) + 1
    })
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, color: '#2d322f' }}>
        用户管理
      </h1>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0ede8' }}>
              {['姓名', '城市', '孩子数', '订阅', '注册时间'].map((h) => (
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
            {(users || []).length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 16, fontSize: 14, color: 'rgba(45,50,47,0.45)' }}>
                  暂无用户
                </td>
              </tr>
            ) : (
              (users || []).map((user) => (
                <tr key={user.user_id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '12px', fontSize: 14, color: '#2d322f' }}>
                    {user.member_name || '未填写'}
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, color: 'rgba(45,50,47,0.6)' }}>
                    {user.resident_city || '—'}
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, color: 'rgba(45,50,47,0.6)' }}>
                    {childCountMap[user.user_id] || 0}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        background: user.is_pro ? '#e8f5ee' : '#f5f4f1',
                        color: user.is_pro ? '#2d7d5a' : 'rgba(45,50,47,0.5)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      {user.is_pro ? 'Pro' : '免费'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: 13, color: 'rgba(45,50,47,0.5)' }}>
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString('zh-CN')
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
