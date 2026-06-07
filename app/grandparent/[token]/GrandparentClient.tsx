'use client'

import { useState } from 'react'
import { SAFE_BOTTOM_INSET, PAGE_TOP_PADDING } from '@/app/_shared/_constants/layout'
import { SOLID_CARD } from '@/app/_shared/_constants/chineseTheme'

const LETTER_STAMP = '根陪伴 · 成长家书'
const FOOTER_TAGLINE = '根陪伴 · 陪你在异乡'
const CLAY = 'var(--clay)'

type ReportRow = {
  week_start: string
  week_end: string
  grandparent_likes?: number
  content?: {
    letter?: string
    achievements?: string[]
    child_name?: string
  }
  children?: { name?: string; emoji?: string } | null
}

function AchievementList({ items }: { items: string[] }) {
  return (
    <div style={{
      ...SOLID_CARD,
      padding: '18px 20px',
      marginBottom: 16,
    }}>
      <div className="gc-eyebrow" style={{ margin: '0 0 12px', color: CLAY }}>
        这周的小瞬间
      </div>
      {items.map((achievement, i) => (
        <div key={i} style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          marginBottom: 8,
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--fg2)',
          lineHeight: 1.55,
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: CLAY,
            flexShrink: 0,
            marginTop: 8,
          }} />
          <span>{achievement}</span>
        </div>
      ))}
    </div>
  )
}

export default function GrandparentClient({
  report,
  token,
}: {
  report: ReportRow
  token: string
}) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(report.grandparent_likes || 0)
  const [showHeart, setShowHeart] = useState(false)

  const content = report.content || {}
  const childName = content.child_name || report.children?.name || '宝宝'
  const childEmoji = report.children?.emoji || '🌟'
  const weekRange = `${new Date(report.week_start).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} — ${new Date(report.week_end).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}`

  const handleLike = async () => {
    if (liked) return
    setLiked(true)
    setLikeCount(prev => prev + 1)
    setShowHeart(true)
    setTimeout(() => setShowHeart(false), 2000)

    await fetch('/api/growth/grandparent-like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
  }

  return (
    <div className="canvas-texture" style={{
      minHeight: '100dvh',
      background: 'var(--canvas-mist)',
      fontFamily: 'var(--font-body)',
      padding: `${PAGE_TOP_PADDING} 16px calc(${SAFE_BOTTOM_INSET} + 24px)`,
      maxWidth: 480,
      margin: '0 auto',
    }}>
      <div style={{
        height: 4,
        borderRadius: 2,
        background: 'linear-gradient(90deg, #e6a89e, #8ca88d)',
        marginBottom: 24,
      }} />

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{childEmoji}</div>
        <div style={{
          fontSize: 22,
          fontWeight: 500,
          color: 'var(--fg1)',
          fontFamily: 'var(--font-serif)',
          letterSpacing: '0.05em',
          marginBottom: 6,
        }}>
          {childName}妈妈发来了
        </div>
        <div style={{
          fontSize: 13,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.1em',
        }}>
          {weekRange}
        </div>
      </div>

      <div style={{
        ...SOLID_CARD,
        padding: '24px 20px',
        marginBottom: 16,
      }}>
        <div style={{
          textAlign: 'center',
          fontSize: 11,
          letterSpacing: '0.2em',
          color: CLAY,
          marginBottom: 14,
          fontFamily: 'var(--font-body)',
        }}>
          {LETTER_STAMP}
        </div>
        <div style={{
          fontSize: 17,
          lineHeight: 2,
          color: 'var(--fg1)',
          fontFamily: 'var(--font-serif)',
          letterSpacing: '0.03em',
        }}>
          {content.letter?.trim() || '本周暂无信件内容'}
        </div>
      </div>

      {(content.achievements?.length ?? 0) > 0 && (
        <AchievementList items={content.achievements ?? []} />
      )}

      <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 24 }}>
        {showHeart && (
          <div style={{
            fontSize: 48,
            animation: 'heartFloat 2s ease-out forwards',
            marginBottom: 8,
          }}>❤️</div>
        )}
        <button
          type="button"
          onClick={handleLike}
          disabled={liked}
          className={liked ? 'gc-btn gc-btn--ghost' : 'gc-btn'}
          style={{ width: '100%', marginBottom: 12, cursor: liked ? 'default' : 'pointer' }}
        >
          {liked ? `❤️ 已送出爱心 (${likeCount})` : `❤️ 给${childName}点个赞`}
        </button>
        <div style={{
          fontSize: 12,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.05em',
        }}>点赞后妈妈会收到通知 🌳</div>
      </div>

      <div style={{
        textAlign: 'center',
        fontSize: 11,
        color: 'var(--fg3)',
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.12em',
        marginTop: 32,
      }}>{FOOTER_TAGLINE}</div>
      <style>{`
        @keyframes heartFloat {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(1.5); }
        }
      `}</style>
    </div>
  )
}
