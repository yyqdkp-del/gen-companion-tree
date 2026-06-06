'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CARD,
  SectionTitle,
  getDailyQuote,
  getHanziTargetByGrade,
  type EnrichedChild,
} from './growthShared'

const supabase = createClient()

type LearnedChar = {
  char: string
  learned_at: string
}

type Props = {
  child: EnrichedChild
  userId: string
}

export default function HanziTab({ child, userId }: Props) {
  const router = useRouter()
  const [weekHanzi, setWeekHanzi] = useState(0)
  const [recentChars, setRecentChars] = useState<LearnedChar[]>([])

  const totalHanzi = child.total_hanzi ?? 0
  const target = getHanziTargetByGrade(child.grade)
  const progressPct = Math.min(100, Math.round((totalHanzi / target) * 100))
  const dailyQuote = useMemo(() => getDailyQuote(), [])

  useEffect(() => {
    if (!child.id || !userId) return
    let cancelled = false

    const load = async () => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const { data: sessions } = await supabase
        .from('chinese_sessions')
        .select('result, learned_at')
        .eq('child_id', child.id)
        .eq('user_id', userId)
        .order('learned_at', { ascending: false })
        .limit(50)

      if (cancelled || !sessions) return

      const weekChars = new Set<string>()
      const recent: LearnedChar[] = []
      const seen = new Set<string>()

      for (const s of sessions) {
        let r = s.result
        if (typeof r === 'string') {
          try { r = JSON.parse(r) } catch { continue }
        }
        const ch = (r as { char?: string } | null)?.char
        if (!ch) continue
        if (s.learned_at && new Date(s.learned_at) >= weekAgo) {
          weekChars.add(ch)
        }
        if (!seen.has(ch)) {
          seen.add(ch)
          recent.push({ char: ch, learned_at: s.learned_at || '' })
        }
        if (recent.length >= 12) break
      }

      setWeekHanzi(weekChars.size)
      setRecentChars(recent)
    }

    void load()
    return () => { cancelled = true }
  }, [child.id, userId])

  return (
    <>
      <motion.section
        style={{
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          background: 'linear-gradient(135deg, #d9e6da, #8ca88d)',
          boxShadow: 'var(--sh-warm)',
        }}
      >
        <p className="gc-eyebrow" style={{ margin: '0 0 8px', color: 'rgba(47,64,48,0.7)' }}>汉字进度</p>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: '#2f4030' }}>
          已学 {totalHanzi} 个字
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(47,64,48,0.75)', marginTop: 6 }}>
          本周新学 {weekHanzi} 字
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(47,64,48,0.65)' }}>
              年级目标 {target} 字
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(47,64,48,0.65)' }}>
              {progressPct}%
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.45)', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPct}%`,
              height: '100%',
              borderRadius: 3,
              background: 'linear-gradient(90deg, #5c7a5e, #2f4030)',
              transition: 'width 0.35s ease',
            }} />
          </div>
        </div>
      </motion.section>

      <section style={CARD}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/learn')}
          style={{
            width: '100%',
            padding: '18px 20px',
            borderRadius: 16,
            border: 'none',
            background: 'var(--clay)',
            color: '#fff',
            cursor: 'pointer',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(164,99,85,0.25)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500 }}>
            开始今日学字
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, marginTop: 6, opacity: 0.9 }}>
            每天5分钟，根陪你学
          </div>
        </motion.button>
      </section>

      {recentChars.length > 0 ? (
        <section style={CARD}>
          <SectionTitle>学字记录</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recentChars.map((item) => (
              <div
                key={`${item.char}-${item.learned_at}`}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: 'var(--canvas-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 22,
                  color: 'var(--fg1)',
                }}
              >
                {item.char}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={CARD}>
        <SectionTitle>文化句 / 成语</SectionTitle>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 24,
          fontWeight: 500,
          color: 'var(--fg1)',
          lineHeight: 1.5,
          letterSpacing: '0.06em',
        }}>
          {dailyQuote.text}
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--fg3)',
          marginTop: 10,
        }}>
          —— {dailyQuote.source}
        </div>
      </section>
    </>
  )
}
