'use client'

import { useCallback, useEffect, useState } from 'react'

type AdminUser = {
  user_id: string
  member_name: string | null
  resident_city: string | null
  is_pro: boolean | null
  created_at: string | null
  updated_at: string | null
  child_count: number
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '加载失败')
      }
      setUsers(data.users || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const togglePro = async (userId: string, nextPro: boolean) => {
    setTogglingId(userId)
    try {
      const res = await fetch('/api/admin/users/pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, is_pro: nextPro }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '操作失败')
      }
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, is_pro: nextPro } : u)),
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, color: '#2d322f' }}>
        用户管理
      </h1>

      {error && (
        <p style={{ color: '#c0632e', fontSize: 14, marginBottom: 16 }}>{error}</p>
      )}

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {loading ? (
          <p style={{ fontSize: 14, color: 'rgba(45,50,47,0.5)' }}>加载中…</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0ede8' }}>
                {['姓名', '城市', '孩子数', '订阅', '注册时间', '操作'].map((h) => (
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
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 16, fontSize: 14, color: 'rgba(45,50,47,0.45)' }}>
                    暂无用户
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isPro = !!user.is_pro
                  const busy = togglingId === user.user_id
                  return (
                    <tr key={user.user_id} style={{ borderBottom: '1px solid #f0ede8' }}>
                      <td style={{ padding: '12px', fontSize: 14, color: '#2d322f' }}>
                        {user.member_name || '未填写'}
                      </td>
                      <td style={{ padding: '12px', fontSize: 14, color: 'rgba(45,50,47,0.6)' }}>
                        {user.resident_city || '—'}
                      </td>
                      <td style={{ padding: '12px', fontSize: 14, color: 'rgba(45,50,47,0.6)' }}>
                        {user.child_count}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            background: isPro ? '#e8f5ee' : '#f5f4f1',
                            color: isPro ? '#2d7d5a' : 'rgba(45,50,47,0.5)',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          {isPro ? 'Pro' : '免费'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: 13, color: 'rgba(45,50,47,0.5)' }}>
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString('zh-CN')
                          : '—'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          type="button"
                          onClick={() => void togglePro(user.user_id, !isPro)}
                          disabled={busy}
                          style={{
                            background: isPro ? 'rgba(45,50,47,0.06)' : 'rgba(164,99,85,0.12)',
                            color: isPro ? 'rgba(45,50,47,0.6)' : '#a46355',
                            border: `1px solid ${isPro ? 'rgba(45,50,47,0.15)' : 'rgba(164,99,85,0.35)'}`,
                            borderRadius: 8,
                            padding: '6px 12px',
                            fontSize: 12,
                            cursor: busy ? 'default' : 'pointer',
                            fontFamily: 'sans-serif',
                          }}
                        >
                          {busy ? '处理中…' : isPro ? '关闭 Pro' : '开启 Pro'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
