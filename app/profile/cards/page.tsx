'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'

export default function CardsPage() {
  const router = useRouter()
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWithAuth('/api/children')
      .then((r) => r.json())
      .then((data) => setChildren(data.children ?? []))
      .finally(() => setLoading(false))
  }, [])

  const openCard = async (type: 'visa' | 'medical', childId?: string) => {
    const res = await fetchWithAuth(
      `/api/cards/token?type=${type}${childId ? `&child_id=${encodeURIComponent(childId)}` : ''}`,
    )
    const data = await res.json().catch(() => ({}))
    if (typeof data.url === 'string') window.open(data.url, '_blank')
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#fbf9f6',
        paddingBottom: 'calc(80px + max(env(safe-area-inset-bottom), 20px))',
      }}
    >
      {/* 顶部导航 */}
      <div
        style={{
          background: 'rgba(251,249,246,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(45,50,47,0.06)',
          padding: `max(env(safe-area-inset-top), 12px) 16px 12px`,
          display: 'flex',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            marginRight: 12,
            color: '#2d322f',
          }}
          aria-label="返回"
        >
          ←
        </button>
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 4,
              color: '#a46355',
              fontFamily: 'sans-serif',
              textTransform: 'uppercase',
              marginBottom: 2,
            }}
          >
            重要卡片
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#2d322f', fontFamily: "'Noto Serif SC', serif" }}>
            证件与医疗
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 14px' }}>
        {/* 证件与签证 */}
        <div
          style={{
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(12px)',
            borderRadius: 22,
            padding: '20px',
            marginBottom: 14,
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 8px 32px rgba(45,50,47,0.05)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 3,
              color: '#a46355',
              marginBottom: 12,
              fontFamily: 'sans-serif',
              textTransform: 'uppercase',
            }}
          >
            🛂 证件与签证
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'rgba(45,50,47,0.6)',
              fontFamily: 'sans-serif',
              marginBottom: 16,
              lineHeight: 1.6,
            }}
          >
            签证填写指引、到期提醒、护照信息
          </div>
          <button
            type="button"
            onClick={() => void openCard('visa')}
            style={{
              width: '100%',
              padding: '12px',
              background: '#a46355',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              fontSize: 14,
              fontFamily: "'Noto Serif SC', serif",
              cursor: 'pointer',
            }}
          >
            查看签证指引
          </button>
        </div>

        {/* 孩子医疗卡 */}
        <div
          style={{
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(12px)',
            borderRadius: 22,
            padding: '20px',
            marginBottom: 14,
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 8px 32px rgba(45,50,47,0.05)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 3,
              color: '#a46355',
              marginBottom: 12,
              fontFamily: 'sans-serif',
              textTransform: 'uppercase',
            }}
          >
            🏥 孩子医疗卡
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'rgba(45,50,47,0.6)',
              fontFamily: 'sans-serif',
              marginBottom: 16,
              lineHeight: 1.6,
            }}
          >
            血型、过敏原、用药记录、紧急联系人，支持多语言，就医时出示或打印
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 16, color: 'rgba(45,50,47,0.4)', fontSize: 13 }}>载入中...</div>
          ) : children.length === 0 ? (
            <button
              type="button"
              onClick={() => router.push('/children')}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: '1px dashed rgba(164,99,85,0.35)',
                borderRadius: 14,
                fontSize: 14,
                color: '#a46355',
                fontFamily: 'sans-serif',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              先添加孩子档案 →
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {children.map((child) => (
                <button
                  type="button"
                  key={child.id}
                  onClick={() => void openCard('medical', child.id)}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(164,99,85,0.06)',
                    border: '1px solid rgba(164,99,85,0.15)',
                    borderRadius: 14,
                    fontSize: 14,
                    color: '#2d322f',
                    fontFamily: "'Noto Serif SC', serif",
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{child.emoji || '👶'}</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{child.name} 的医疗卡</div>
                    <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.5)', marginTop: 2 }}>多语言 · 可打印</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
