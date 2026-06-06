'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import type { Child } from '@/app/_shared/_types'

const WeeklyReportSheet = nextDynamic(() => import('@/app/rian/WeeklyReportSheet'), { ssr: false })

const supabase = createClient()

type Achievement = {
  id: string
  title: string | null
  emoji?: string | null
  description?: string | null
  achieved_at?: string | null
  created_at?: string
}

type PathwayReport = {
  key_insight?: string | null
  selected_spike?: { direction?: string } | null
  target_path?: string | null
  narrative?: string | null
}

type Vision = {
  vision_statement?: string | null
  target_path?: string | null
}

type Props = {
  child: Child
  userId: string
}

function GradientCard({
  gradient,
  children,
  onClick,
}: {
  gradient: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        border: 'none',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        background: gradient,
        boxShadow: 'var(--sh-warm)',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </motion.button>
  )
}

export default function GrowthTab({ child, userId }: Props) {
  const router = useRouter()
  const [weekHanzi, setWeekHanzi] = useState(0)
  const [vision, setVision] = useState<Vision | null>(null)
  const [report, setReport] = useState<PathwayReport | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [showWeeklyReport, setShowWeeklyReport] = useState(false)

  useEffect(() => {
    if (!child.id || !userId) return
    let cancelled = false

    const load = async () => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const [sessionsRes, visionRes, reportRes, achRes] = await Promise.all([
        supabase
          .from('chinese_sessions')
          .select('id, result')
          .eq('child_id', child.id)
          .eq('user_id', userId)
          .gte('learned_at', weekAgo.toISOString()),
        supabase.from('family_vision').select('vision_statement, target_path').eq('child_id', child.id).maybeSingle(),
        supabase.from('pathway_reports').select('key_insight, selected_spike, target_path, narrative').eq('child_id', child.id).order('generated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('child_achievements').select('id, title, emoji, description, achieved_at, created_at').eq('child_id', child.id).order('created_at', { ascending: false }).limit(5),
      ])

      if (cancelled) return

      const sessions = sessionsRes.data || []
      const chars = new Set<string>()
      for (const s of sessions) {
        const r = s.result as { char?: string } | null
        if (r?.char) chars.add(r.char)
      }
      setWeekHanzi(chars.size)

      setVision(visionRes.data)
      setReport(reportRes.data)
      setAchievements(achRes.data || [])
    }

    void load()
    return () => { cancelled = true }
  }, [child.id, userId])

  const totalHanzi = (child as Child & { total_hanzi?: number }).total_hanzi ?? 0
  const pathwayLine = report?.selected_spike?.direction
    || report?.key_insight
    || vision?.vision_statement
    || (vision ? '愿景已设定，点击查看完整规划' : '还未设定升学愿景')

  return (
    <>
      <GradientCard
        gradient="linear-gradient(135deg, #d9e6da, #8ca88d)"
        onClick={() => router.push('/learn')}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p className="gc-eyebrow" style={{ margin: '0 0 8px', color: 'rgba(47,64,48,0.7)' }}>汉字进度</p>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: '#2f4030' }}>
              已学 {totalHanzi} 字
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(47,64,48,0.75)', marginTop: 6 }}>
              本周新学 {weekHanzi} 字
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#2f4030', marginTop: 14 }}>
              继续学字 →
            </div>
          </div>
          <ChevronRight size={18} color="rgba(47,64,48,0.45)" />
        </div>
      </GradientCard>

      <GradientCard
        gradient="linear-gradient(135deg, #f5d6d1, #e6a89e)"
        onClick={() => router.push('/growth/academic')}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p className="gc-eyebrow" style={{ margin: '0 0 8px', color: 'rgba(125,63,55,0.7)' }}>升学路径</p>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: '#7d3f37', lineHeight: 1.45 }}>
              {pathwayLine}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#7d3f37', marginTop: 14 }}>
              查看完整规划 →
            </div>
          </div>
          <ChevronRight size={18} color="rgba(125,63,55,0.45)" />
        </div>
      </GradientCard>

      <GradientCard
        gradient="linear-gradient(135deg, #d9e6da, #4F6B5C)"
        onClick={() => setShowWeeklyReport(true)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p className="gc-eyebrow" style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.75)' }}>成长家书</p>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: '#fff' }}>
              本周成长故事
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6, lineHeight: 1.55 }}>
              为国内家人生成温暖的周报
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#fff', marginTop: 14 }}>
              生成 →
            </div>
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.65)" />
        </div>
      </GradientCard>

      {achievements.length > 0 ? (
        <section style={{
          background: '#fff',
          borderRadius: 18,
          boxShadow: 'var(--sh-warm)',
          padding: 20,
          marginBottom: 16,
        }}>
          <h3 style={{ margin: '0 0 14px', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--fg1)' }}>
            里程碑
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {achievements.map((a) => (
              <div key={a.id} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '12px 14px', borderRadius: 14,
                background: 'var(--canvas-light)',
              }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{a.emoji || '⭐'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 500, color: 'var(--fg1)' }}>
                    {a.title || '成就'}
                  </div>
                  {a.description ? (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--fg3)', marginTop: 3, lineHeight: 1.5 }}>
                      {a.description}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {showWeeklyReport ? (
        <WeeklyReportSheet
          childId={child.id}
          childName={child.name}
          onClose={() => setShowWeeklyReport(false)}
        />
      ) : null}
    </>
  )
}
