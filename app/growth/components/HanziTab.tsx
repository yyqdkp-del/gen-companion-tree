'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { CARD } from './growthShared'

export default function HanziTab() {
  const router = useRouter()

  return (
    <section style={CARD}>
      <p className="gc-eyebrow" style={{ margin: '0 0 8px', color: 'rgba(47,64,48,0.7)' }}>汉字学习</p>
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 20,
        fontWeight: 500,
        color: '#2f4030',
        lineHeight: 1.5,
        marginBottom: 8,
      }}>
        字理解码 · 成语 · 文化句
      </div>
      <p style={{
        margin: '0 0 16px',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        color: 'var(--fg3)',
        lineHeight: 1.6,
      }}>
        进入解码器，和孩子一起探索每个汉字背后的故事。
      </p>
      <button
        type="button"
        onClick={() => router.push('/learn')}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 14,
          border: 'none',
          background: 'linear-gradient(135deg, #d9e6da, #8ca88d)',
          boxShadow: 'var(--sh-warm)',
          cursor: 'pointer',
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          fontWeight: 600,
          color: '#2f4030',
        }}
      >
        <span>开始今日学字 →</span>
        <ChevronRight size={18} color="rgba(47,64,48,0.45)" />
      </button>
    </section>
  )
}
