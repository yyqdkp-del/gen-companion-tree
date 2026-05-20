'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { PLANS } from '@/lib/stripe/plans'

export default function UpgradePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.url) window.location.href = data.url as string
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const plan = PLANS.pro

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#fbf9f6',
      backgroundImage: `
        radial-gradient(at 90% 10%, rgba(245,214,209,0.25) 0px, transparent 50%),
        radial-gradient(at 10% 90%, rgba(217,230,218,0.2) 0px, transparent 50%)
      `,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 16px',
    }}
    >
      {/* 返回 */}
      <div style={{ width: '100%', maxWidth: 480, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', fontSize: 14, color: 'rgba(45,50,47,0.5)', cursor: 'pointer', fontFamily: 'sans-serif' }}
        >
          ← 返回
        </button>
      </div>

      {/* 标题 */}
      <div style={{ textAlign: 'center', marginBottom: 40, maxWidth: 480 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🌳</div>
        <div style={{ fontSize: 26, fontWeight: 500, color: '#2d322f', fontFamily: "'Noto Serif SC', serif", marginBottom: 8 }}>
          升级根陪伴 Pro
        </div>
        <div style={{ fontSize: 15, color: 'rgba(45,50,47,0.6)', fontFamily: 'sans-serif', lineHeight: 1.7 }}>
          解锁全部功能，让 AI 真正成为<br />你的家庭专属助手
        </div>
      </div>

      {/* 价格卡片 */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        borderRadius: 24,
        padding: '28px 24px',
        border: '1px solid rgba(164,99,85,0.15)',
        boxShadow: '0 8px 32px rgba(45,50,47,0.06)',
        marginBottom: 16,
      }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#2d322f', fontFamily: "'Noto Serif SC', serif" }}>
              {plan.name}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(45,50,47,0.5)', fontFamily: 'sans-serif', marginTop: 4 }}>
              按月订阅，随时取消
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 32, fontWeight: 600, color: '#a46355', fontFamily: "'Montserrat', sans-serif" }}>
              ${plan.price}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.4)', fontFamily: 'sans-serif' }}>
              / 月
            </div>
          </div>
        </div>

        {/* 功能列表 */}
        <div style={{ marginBottom: 28 }}>
          {plan.features.map((feature, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
              fontSize: 14,
              color: '#2d322f',
              fontFamily: 'sans-serif',
            }}
            >
              <span style={{ color: '#a46355', fontSize: 16 }}>✓</span>
              {feature}
            </div>
          ))}
        </div>

        {/* 升级按钮 */}
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            background: loading ? 'rgba(45,50,47,0.15)' : '#a46355',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            fontSize: 16,
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 6px 20px rgba(164,99,85,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          {loading ? '跳转中...' : `立即升级 $${plan.price}/月`}
        </button>
      </div>

      {/* 免费版说明 */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'rgba(255,255,255,0.6)',
        borderRadius: 18,
        padding: '20px 24px',
        border: '1px solid rgba(45,50,47,0.08)',
        marginBottom: 24,
      }}
      >
        <div style={{ fontSize: 13, color: 'rgba(45,50,47,0.5)', fontFamily: 'sans-serif', marginBottom: 12 }}>
          免费版包含：
        </div>
        {['每月5次汉字解码', '木棉树洞每天3条消息', '基础家庭档案', '热点巡逻'].map((f, i) => (
          <div key={i} style={{
            fontSize: 13,
            color: 'rgba(45,50,47,0.5)',
            fontFamily: 'sans-serif',
            marginBottom: 6,
          }}
          >
            · {f}
          </div>
        ))}
      </div>

      {/* 安全说明 */}
      <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.4)', fontFamily: 'sans-serif', textAlign: 'center', lineHeight: 1.8 }}>
        由 Stripe 提供安全支付保障<br />
        随时可在设置中取消订阅
      </div>

    </main>
  )
}
