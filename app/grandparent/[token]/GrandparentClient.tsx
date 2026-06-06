'use client'

import { useState } from 'react'
import { SAFE_BOTTOM_INSET, PAGE_TOP_PADDING } from '@/app/_shared/_constants/layout'

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
    <div style={{
      minHeight: '100dvh',
      background: '#fbf9f6',
      backgroundImage: `
        radial-gradient(at 80% 20%, rgba(245,214,209,0.3) 0px, transparent 50%),
        radial-gradient(at 20% 80%, rgba(217,230,218,0.2) 0px, transparent 50%)
      `,
      fontFamily: "'Noto Serif SC', serif",
      padding: `${PAGE_TOP_PADDING} 16px calc(${SAFE_BOTTOM_INSET} + 24px)`,
      maxWidth: 480,
      margin: '0 auto',
    }}>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{childEmoji}</div>
        <div style={{
          fontSize: 22,
          fontWeight: 500,
          color: '#2d322f',
          letterSpacing: '0.05em',
          marginBottom: 6,
        }}>
          {childName}妈妈发来了
        </div>
        <div style={{
          fontSize: 13,
          color: 'rgba(45,50,47,0.45)',
          fontFamily: 'sans-serif',
          letterSpacing: '0.1em',
        }}>
          {new Date(report.week_start).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} — {new Date(report.week_end).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(10px)',
        borderRadius: 20,
        padding: '24px 20px',
        marginBottom: 16,
        border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: '0 4px 24px rgba(45,50,47,0.06)',
      }}>
        <div style={{
          fontSize: 11,
          letterSpacing: '0.2em',
          color: '#a46355',
          marginBottom: 14,
          fontFamily: 'sans-serif',
          textTransform: 'uppercase',
        }}>
          🌸 妈妈的家书
        </div>
        <div style={{
          fontSize: 17,
          lineHeight: 2,
          color: '#2d322f',
          letterSpacing: '0.03em',
        }}>
          {content.letter?.trim() || '本周暂无信件内容'}
        </div>
      </div>

      {(content.achievements?.length ?? 0) > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 16,
          padding: '18px 20px',
          marginBottom: 16,
          border: '1px solid rgba(164,99,85,0.1)',
        }}>
          <div style={{
            fontSize: 11,
            letterSpacing: '0.2em',
            color: '#a46355',
            marginBottom: 12,
            fontFamily: 'sans-serif',
            textTransform: 'uppercase',
          }}>
            🏆 这周的小瞬间
          </div>
          {(content.achievements ?? []).map((achievement: string, i: number) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 8, fontSize: 15, color: '#2d322f', lineHeight: 1.6,
            }}>
              <span style={{ fontSize: 18 }}>✨</span>
              {achievement}
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 24 }}>
        {showHeart && (
          <div style={{
            fontSize: 48,
            animation: 'heartFloat 2s ease-out forwards',
            marginBottom: 8,
          }}>❤️</div>
        )}
        <button type="button" onClick={handleLike} disabled={liked} style={{
          width: '100%', padding: '18px',
          background: liked ? 'rgba(164,99,85,0.1)' : '#a46355',
          color: liked ? '#a46355' : '#ffffff',
          border: liked ? '1.5px solid #a46355' : 'none',
          borderRadius: 20, fontSize: 18,
          fontFamily: "'Noto Serif SC', serif", fontWeight: 500,
          cursor: liked ? 'default' : 'pointer', letterSpacing: '0.05em',
          boxShadow: liked ? 'none' : '0 6px 20px rgba(164,99,85,0.3)',
          transition: 'all 0.3s ease', marginBottom: 12,
        }}>
          {liked ? `❤️ 已送出爱心 (${likeCount})` : `❤️ 给${childName}点个赞`}
        </button>
        <div style={{
          fontSize: 12, color: 'rgba(45,50,47,0.4)',
          fontFamily: 'sans-serif', letterSpacing: '0.05em',
        }}>点赞后妈妈会收到通知 🌳</div>
      </div>

      <div style={{
        textAlign: 'center', fontSize: 11,
        color: 'rgba(45,50,47,0.3)', fontFamily: 'sans-serif',
        letterSpacing: '0.15em', marginTop: 32,
      }}>根陪伴 · Gen Companion Tree</div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;500&display=swap');
        @keyframes heartFloat {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(1.5); }
        }
      `}</style>
    </div>
  )
}
