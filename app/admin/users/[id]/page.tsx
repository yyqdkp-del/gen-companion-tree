import Link from 'next/link'
import { getAdminSupabase } from '@/lib/admin/supabase'

export const dynamic = 'force-dynamic'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('zh-CN')
}

export default async function UserDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: userId } = await params
  const supabase = getAdminSupabase()

  const [
    { data: profile },
    { data: children },
    { data: todos },
    { data: hotspots },
    { data: subscription },
    { count: sessionCount },
  ] = await Promise.all([
    supabase.from('family_profile').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('children')
      .select('id, name, grade, chinese_level, level, total_hanzi')
      .eq('user_id', userId),
    supabase
      .from('todo_items')
      .select('id, title, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('hotspot_items')
      .select('id, title, urgency, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('chinese_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  if (!profile) {
    return (
      <div>
        <Link href="/admin/users" style={{ color: '#a46355', fontSize: 14, textDecoration: 'none' }}>
          ← 返回用户列表
        </Link>
        <p style={{ marginTop: 24, color: 'rgba(45,50,47,0.6)' }}>未找到该用户档案</p>
      </div>
    )
  }

  return (
    <div>
      <Link href="/admin/users" style={{ color: '#a46355', fontSize: 14, textDecoration: 'none' }}>
        ← 返回用户列表
      </Link>

      <h1 style={{ fontSize: 24, fontWeight: 600, margin: '16px 0 24px', color: '#2d322f' }}>
        用户详情
      </h1>
      <p style={{ fontSize: 12, color: 'rgba(45,50,47,0.45)', marginBottom: 24, fontFamily: 'monospace' }}>
        {userId}
      </p>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#2d322f' }}>基本信息</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['姓名', profile.member_name || '未填写'],
            ['城市', profile.resident_city || '—'],
            ['电话', profile.phone || '—'],
            ['Pro状态', profile.is_pro ? '✅ Pro' : '免费'],
            ['签证类型', profile.visa_type || '—'],
            ['签证到期', formatDate(profile.visa_expiry as string | null)],
            ['汉字学习次数', String(sessionCount ?? 0)],
            ['注册时间', formatDate(profile.created_at as string | null)],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.5)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, color: '#2d322f' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#2d322f' }}>
          孩子（{children?.length || 0}）
        </h2>
        {!children?.length ? (
          <p style={{ fontSize: 14, color: 'rgba(45,50,47,0.45)' }}>暂无孩子档案</p>
        ) : (
          children.map((child) => (
            <div
              key={child.id}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid #f0ede8',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 14, color: '#2d322f' }}>
                {child.name} · {child.grade || '—'}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(45,50,47,0.5)' }}>
                学了 {child.total_hanzi ?? 0} 个字 · {child.chinese_level || child.level || '—'}
              </span>
            </div>
          ))
        )}
      </div>

      {subscription && (
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 24,
            marginBottom: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#2d322f' }}>订阅</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.5)' }}>计划</div>
              <div style={{ fontSize: 14 }}>{subscription.plan || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.5)' }}>状态</div>
              <div style={{ fontSize: 14 }}>{subscription.status}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.5)' }}>到期</div>
              <div style={{ fontSize: 14 }}>
                {subscription.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString('zh-CN')
                  : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#2d322f' }}>最近待办</h2>
        {!todos?.length ? (
          <p style={{ fontSize: 14, color: 'rgba(45,50,47,0.45)' }}>暂无待办</p>
        ) : (
          todos.map((t) => (
            <div
              key={t.id}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid #f0ede8',
                fontSize: 14,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span>{t.title}</span>
              <span style={{ fontSize: 12, color: 'rgba(45,50,47,0.5)' }}>{t.status}</span>
            </div>
          ))
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#2d322f' }}>最近热点</h2>
        {!hotspots?.length ? (
          <p style={{ fontSize: 14, color: 'rgba(45,50,47,0.45)' }}>暂无热点</p>
        ) : (
          hotspots.map((h) => (
            <div
              key={h.id}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid #f0ede8',
                fontSize: 14,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span>{h.title}</span>
              <span style={{ fontSize: 12, color: 'rgba(45,50,47,0.5)' }}>{h.urgency || '—'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
