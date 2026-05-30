'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BookOpen, ChevronRight } from 'lucide-react'
import { useApp } from '@/app/context/AppContext'

const GLASS_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(255,255,255,0.6)',
  borderRadius: 18,
  backdropFilter: 'blur(10px)',
  boxShadow: '0 4px 20px rgba(45,50,47,0.05)',
}

export default function HanziContent() {
  const router = useRouter()
  const { activeKid } = useApp()
  const hanziCount = activeKid?.total_hanzi ?? 0

  return (
    <section style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 999,
        background: 'rgba(164,99,85,0.08)',
        border: '1px solid rgba(164,99,85,0.12)',
        color: '#a46355',
        fontSize: 12,
        fontWeight: 600,
        marginBottom: 18,
        letterSpacing: '0.05em',
      }}>
        <BookOpen size={15} />
        根·中文
      </div>

      <h2 style={{
        margin: '0 0 10px',
        fontSize: 26,
        lineHeight: 1.25,
        color: '#2d322f',
        fontFamily: "'Noto Serif SC', serif",
        fontWeight: 500,
      }}>
        字理解码 · 成语 · 文化句
      </h2>

      <p style={{
        margin: '0 0 24px',
        fontSize: 15,
        lineHeight: 1.85,
        color: 'rgba(45,50,47,0.55)',
        fontFamily: 'sans-serif',
      }}>
        输入任意汉字，根帮你拆解字源、笔画和妈妈台词；和孩子一起走完 5 分钟学字流程。
      </p>

      {activeKid && hanziCount > 0 && (
        <div style={{
          ...GLASS_CARD,
          padding: '12px 16px',
          marginBottom: 16,
          fontSize: 13,
          color: '#a46355',
          fontFamily: 'sans-serif',
        }}>
          {activeKid.name} 已学 {hanziCount} 个汉字 🌳
        </div>
      )}

      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => router.push('/learn')}
        style={{
          ...GLASS_CARD,
          cursor: 'pointer',
          width: '100%',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 12,
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          background: 'rgba(164,99,85,0.12)',
          border: '1px solid rgba(164,99,85,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          flexShrink: 0,
        }}>📖</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2d322f', fontFamily: "'Noto Serif SC', serif" }}>
            进入字理解码器
          </div>
          <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.5)', marginTop: 4, fontFamily: 'sans-serif' }}>
            解码汉字 · 描红造句 · 分享卡片
          </div>
        </div>
        <ChevronRight size={20} color="rgba(45,50,47,0.35)" />
      </motion.button>

      <div style={{ display: 'grid', gap: 10 }}>
        {[
          { emoji: '🔤', title: '单字解码', desc: '字源、部件、笔顺与妈妈台词' },
          { emoji: '📜', title: '成语文化', desc: '成语释义与海外华人语境' },
          { emoji: '✍️', title: '一起学字', desc: '四步互动流程，生成爷奶分享卡' },
        ].map((item) => (
          <div key={item.title} style={{
            ...GLASS_CARD,
            padding: '14px 16px',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 22 }}>{item.emoji}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2d322f', fontFamily: "'Noto Serif SC', serif" }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.5)', marginTop: 3, fontFamily: 'sans-serif' }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
