'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/context/AppContext'
import { toast } from '@/app/components/Toast'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { PLANS } from '@/lib/stripe/plans'

type PaddleCheckoutItem = { priceId: string; quantity: number }
type PaddleCheckoutEvent = { name?: string; data?: unknown }

type PaddleCheckoutOptions = {
  items: PaddleCheckoutItem[]
  customer?: { email?: string }
  customData?: Record<string, string | undefined>
  settings?: { successUrl?: string }
  eventCallback?: (event: PaddleCheckoutEvent) => void
}

type PaddleSDK = {
  Environment: { set(env: 'production' | 'sandbox'): void }
  Initialize(options: { token?: string }): void
  Checkout: { open(options: PaddleCheckoutOptions): void }
}

declare global {
  interface Window {
    Paddle?: PaddleSDK
  }
}

const PADDLE_SCRIPT_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js'

export default function UpgradePage() {
  const router = useRouter()
  const { userId, sessionReady } = useApp()
  const [loading, setLoading] = useState(false)
  const [paddleReady, setPaddleReady] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!sessionReady) return
    if (!userId) {
      router.push('/auth?next=/upgrade')
    }
  }, [userId, sessionReady, router])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initialize = () => {
      if (initializedRef.current) {
        setPaddleReady(true)
        return
      }
      if (!window.Paddle) return
      // 测试阶段强制 sandbox；上线真实支付时在 Vercel 设
      // NEXT_PUBLIC_PADDLE_SANDBOX=false 即可切换到 production，无需改代码。
      const env: 'production' | 'sandbox' =
        process.env.NEXT_PUBLIC_PADDLE_SANDBOX === 'false' ? 'production' : 'sandbox'
      window.Paddle.Environment.set(env)
      window.Paddle.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
      })
      initializedRef.current = true
      setPaddleReady(true)
    }

    if (window.Paddle) {
      initialize()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PADDLE_SCRIPT_SRC}"]`,
    )
    if (existing) {
      existing.addEventListener('load', initialize, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = PADDLE_SCRIPT_SRC
    script.async = true
    script.onload = initialize
    script.onerror = () => console.error('Paddle.js failed to load')
    document.head.appendChild(script)
  }, [])

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      console.log('1. 开始结账')
      console.log('Paddle ready:', paddleReady)
      console.log('Window.Paddle:', !!window.Paddle)

      const res = await fetchWithAuth('/api/paddle/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      console.log('2. checkout API 返回:', data, 'status:', res.status)

      if (!res.ok || !data.priceId) {
        console.error('checkout API 失败:', data)
        if (res.status === 401) {
          router.push('/auth?next=/upgrade')
          return
        }
        toast('结账初始化失败，请重试', 'error')
        return
      }

      if (!window.Paddle) {
        console.error('结账错误: Paddle SDK 未加载')
        return
      }

      window.Paddle.Checkout.open({
        items: [{ priceId: data.priceId, quantity: 1 }],
        customer: data.email ? { email: data.email } : undefined,
        customData: { user_id: data.userId },
        settings: { successUrl: data.successUrl },
        eventCallback: (event) => {
          console.log('Paddle event:', event)
        },
      })
    } catch (e) {
      console.error('结账错误:', e)
    } finally {
      setLoading(false)
    }
  }

  const plan = PLANS.pro

  return (
    <main style={{
      minHeight: '100dvh',
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
          解锁全部功能，让根真正成为<br />你的家庭专属助手
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
              30天免费试用，到期自动续费，随时取消
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

        {/* 省钱计算器 */}
        <div style={{
          background: 'rgba(92,122,94,0.06)',
          border: '1px solid rgba(92,122,94,0.15)',
          borderRadius: 16,
          padding: '16px 18px',
          marginBottom: 20,
        }}>
          <div style={{
            fontSize: 13,
            color: '#5c7a5e',
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 500,
            marginBottom: 12,
          }}>
            💰 和补习班比一比
          </div>
          {[
            { label: '一节中文私教课', cost: '$50', period: '/节' },
            { label: '线上中文课程', cost: '$30', period: '/月' },
            { label: '根陪伴 Pro', cost: '$9.99', period: '/月', highlight: true },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: i < 2 ? '1px solid rgba(45,50,47,0.06)' : 'none',
            }}>
              <span style={{
                fontSize: 13,
                color: item.highlight ? '#5c7a5e' : 'rgba(45,50,47,0.6)',
                fontFamily: 'sans-serif',
                fontWeight: item.highlight ? 500 : 400,
              }}>
                {item.label}
              </span>
              <span style={{
                fontSize: 14,
                color: item.highlight ? '#5c7a5e' : 'rgba(45,50,47,0.5)',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: item.highlight ? 600 : 400,
              }}>
                {item.cost}<span style={{ fontSize: 11 }}>{item.period}</span>
              </span>
            </div>
          ))}
          <div style={{
            marginTop: 10,
            fontSize: 12,
            color: '#5c7a5e',
            fontFamily: 'sans-serif',
            textAlign: 'center',
          }}>
            ✓ 根 随时陪伴 · 无需预约 · 孩子自己学
          </div>
        </div>

        {/* 升级按钮 */}
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={loading || !paddleReady}
          style={{
            width: '100%',
            padding: '16px',
            background: loading || !paddleReady ? 'rgba(45,50,47,0.15)' : '#a46355',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            fontSize: 16,
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 500,
            cursor: loading || !paddleReady ? 'not-allowed' : 'pointer',
            boxShadow: loading || !paddleReady ? 'none' : '0 6px 20px rgba(164,99,85,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          {loading
            ? '跳转中...'
            : !paddleReady
              ? '加载支付组件中...'
              : `免费试用30天 → 之后 $${plan.price}/月`}
        </button>

        {/* 备用直接结账按钮（手机测试 Paddle sandbox） */}
        <a
          href="https://sandbox-buy.paddle.com/checkout?items[0][priceId]=pri_01kss5c225qmn8ztj87gc3jyaw&items[0][quantity]=1"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            textAlign: 'center',
            marginTop: 12,
            padding: '12px 24px',
            background: 'rgba(164,99,85,0.1)',
            color: '#a46355',
            borderRadius: 12,
            textDecoration: 'none',
            fontSize: 14,
            fontFamily: 'sans-serif',
          }}
        >
          直接结账（测试）
        </a>
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
        {['每天3次汉字解码', '木棉树洞根陪伴', '基础家庭档案', '手动热点巡逻'].map((f, i) => (
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
        由 Paddle 提供安全支付保障<br />
        随时可在设置中取消订阅
      </div>

    </main>
  )
}
