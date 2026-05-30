'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronRight, Target, Trophy } from 'lucide-react'
import { useApp } from '@/app/context/AppContext'

const GLASS_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(255,255,255,0.6)',
  borderRadius: 18,
  backdropFilter: 'blur(10px)',
  boxShadow: '0 4px 20px rgba(45,50,47,0.05)',
}

export default function AcademicContent() {
  const router = useRouter()
  const { activeKid } = useApp()

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
        <Trophy size={15} />
        学业成长
      </div>

      <h2 style={{
        margin: '0 0 10px',
        fontSize: 26,
        lineHeight: 1.25,
        color: '#2d322f',
        fontFamily: "'Noto Serif SC', serif",
        fontWeight: 500,
      }}>
        {activeKid ? `${activeKid.name}的学业规划与成长档案` : '学业规划与成长档案'}
      </h2>

      <p style={{
        margin: '0 0 24px',
        fontSize: 15,
        lineHeight: 1.85,
        color: 'rgba(45,50,47,0.55)',
        fontFamily: 'sans-serif',
      }}>
        记录升学目标、学术轨迹与成长瞬间，帮你在海外华人家庭里把孩子的长期路径理清楚。
      </p>

      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => router.push('/growth/academic')}
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
        }}>🏆</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2d322f', fontFamily: "'Noto Serif SC', serif" }}>
            进入学业成长档案
          </div>
          <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.5)', marginTop: 4, fontFamily: 'sans-serif' }}>
            升学规划 · 目标设定 · 成长记录
          </div>
        </div>
        <ChevronRight size={20} color="rgba(45,50,47,0.35)" />
      </motion.button>

      <div style={{ display: 'grid', gap: 10 }}>
        {[
          { icon: <Target size={18} color="#a46355" />, title: '设定升学目标', desc: '顶尖学府、奖学金或自定义方向' },
          { icon: <span style={{ fontSize: 16 }}>📊</span>, title: '学术记录', desc: '成绩、考试与语言成绩轨迹（逐步完善）' },
          { icon: <span style={{ fontSize: 16 }}>✨</span>, title: '成长瞬间', desc: '比赛、项目与可申请素材' },
        ].map((item) => (
          <div key={item.title} style={{
            ...GLASS_CARD,
            padding: '14px 16px',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: 'rgba(164,99,85,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {item.icon}
            </div>
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
