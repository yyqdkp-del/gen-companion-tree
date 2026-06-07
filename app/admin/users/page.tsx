'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

type AdminUser = {
  user_id: string
  member_name: string | null
  resident_city: string | null
  email: string | null
  auth_email: string | null
  auth_email_label: string
  is_pro: boolean | null
  created_at: string | null
  updated_at: string | null
  child_count: number
}

export default function AdminUsers() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

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
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [router])

  // 进入页面时拉取
  useEffect(() => {
    void loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时拉取
  }, [])

  // 从详情页返回或切回标签页时重新拉取
  useEffect(() => {
    const handleFocus = () => void loadUsers()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadUsers])

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return users
    return users.filter(
      (u) =>
        u.member_name?.includes(q) ||
        u.resident_city?.includes(q) ||
        u.user_id.includes(q) ||
        u.auth_email?.includes(q) ||
        u.email?.includes(q) ||
        u.auth_email_label.includes(q),
    )
  }, [users, search])

  const togglePro = async (userId: string, isPro: boolean) => {
    setTogglingId(userId)
    try {
      const res = await fetch('/api/admin/users/pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, is_pro: isPro }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '操作失败')
      }
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, is_pro: isPro } : u)),
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

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索姓名、邮箱或城市..."
        style={{
          padding: '8px 16px',
          borderRadius: 8,
          border: '1px solid #e0ddd8',
          fontSize: 14,
          marginBottom: 16,
          width: 300,
          fontFamily: 'sans-serif',
        }}
      />

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
                {['姓名', '注册邮箱', '城市', '孩子数', '订阅', '注册时间', '操作'].map((h) => (
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 16, fontSize: 14, color: 'rgba(45,50,47,0.45)' }}>
                    {search.trim() ? '无匹配用户' : '暂无用户'}
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const isPro = !!user.is_pro
                  const busy = togglingId === user.user_id
                  return (
                    <tr key={user.user_id} style={{ borderBottom: '1px solid #f0ede8' }}>
                      <td style={{ padding: '12px', fontSize: 14, color: '#2d322f' }}>
                        {user.member_name || '未填写'}
                      </td>
                      <td style={{ padding: '12px', fontSize: 13, color: 'rgba(45,50,47,0.65)' }}>
                        {user.auth_email_label}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <Link
                            href={`/admin/users/${user.user_id}`}
                            style={{ color: '#a46355', fontSize: 13, textDecoration: 'none' }}
                          >
                            详情 →
                          </Link>
                          <button
                            type="button"
                            onClick={() => void togglePro(user.user_id, !isPro)}
                            disabled={busy}
                            style={{
                              background: isPro ? '#fee' : '#e8f5ee',
                              color: isPro ? '#c0632e' : '#2d7d5a',
                              border: 'none',
                              borderRadius: 6,
                              padding: '4px 10px',
                              fontSize: 12,
                              cursor: busy ? 'default' : 'pointer',
                              fontFamily: 'sans-serif',
                            }}
                          >
                            {busy ? '处理中…' : isPro ? '关闭Pro' : '开启Pro'}
                          </button>
                        </div>
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
