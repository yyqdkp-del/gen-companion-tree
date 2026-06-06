'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { CARD, SectionTitle, getChildAge, getHanziTarget, type EnrichedChild } from './growthShared'
import type { InputMode } from '@/app/components/InputSheet'

const WeeklyReportSheet = nextDynamic(() => import('@/app/rian/WeeklyReportSheet'), { ssr: false })
const InputSheet = nextDynamic(() => import('@/app/components/InputSheet'), { ssr: false })

const supabase = createClient()

type Achievement = {
  id: string
  title: string | null
  emoji?: string | null
  description?: string | null
  date?: string | null
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
  target_school_type?: string | null
}

type Props = {
  child: EnrichedChild
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

function formatAchievedDate(a: Achievement): string {
  const raw = a.date || a.created_at
  if (!raw) return ''
  return new Date(raw).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

export default function GrowthTab({ child, userId }: Props) {
  const router = useRouter()
  const [vision, setVision] = useState<Vision | null>(null)
  const [report, setReport] = useState<PathwayReport | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [weekHanzi, setWeekHanzi] = useState(0)
  const [showWeeklyReport, setShowWeeklyReport] = useState(false)
  const [inputOpen, setInputOpen] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('text')

  const totalHanzi = child.total_hanzi ?? 0
  const age = getChildAge(child.birthdate, child.grade)
  const hanziTarget = getHanziTarget(age, child.grade)
  const progressPct = Math.min(100, Math.round((totalHanzi / hanziTarget.yearlyTarget) * 100))

  useEffect(() => {
    if (!child.id || !userId) return
    let cancelled = false

    const loadWeekHanzi = async () => {
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
      }
      setWeekHanzi(weekChars.size)
    }

    void loadWeekHanzi()
    return () => { cancelled = true }
  }, [child.id, userId])

  useEffect(() => {
    if (!child.id || !userId) return
    let cancelled = false

    const load = async () => {
      const [visionRes, reportRes, achRes] = await Promise.all([
        supabase.from('family_vision').select('vision_statement, target_school_type').eq('child_id', child.id).maybeSingle(),
        supabase.from('pathway_reports').select('key_insight, selected_spike, target_path, narrative').eq('child_id', child.id).order('generated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('child_achievements').select('id, title, emoji, description, date, created_at').eq('child_id', child.id).order('created_at', { ascending: false }).limit(5),
      ])

      if (cancelled) return

      if (visionRes.error) {
        console.error('query failed:', visionRes.error.message)
        setVision(null)
      } else {
        setVision(visionRes.data)
      }

      setReport(reportRes.data)

      if (achRes.error) {
        console.error('query failed:', achRes.error.message)
        setAchievements([])
      } else {
        setAchievements(achRes.data || [])
      }
    }

    void load()
    return () => { cancelled = true }
  }, [child.id, userId])

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
          <div style={{ flex: 1, minWidth: 0 }}>
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
                  今年目标 {hanziTarget.yearlyTarget} 字 · {hanziTarget.level}
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
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'rgba(47,64,48,0.7)',
              marginTop: 12,
            }}>
              {age}岁 · {hanziTarget.level} · 今年目标 {hanziTarget.yearlyTarget} 字
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#2f4030', marginTop: 14 }}>
              开始今日学字 →
            </div>
          </div>
          <ChevronRight size={18} color="rgba(47,64,48,0.45)" />
        </div>
      </GradientCard>

      <GradientCard
        gradient="linear-gradient(135deg, #f5d6d1, #e6a89e)"
        onClick={() => setShowWeeklyReport(true)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p className="gc-eyebrow" style={{ margin: '0 0 8px', color: 'rgba(125,63,55,0.7)' }}>成长家书</p>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: '#7d3f37' }}>
              成长家书
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(125,63,55,0.8)', marginTop: 6, lineHeight: 1.55 }}>
              为国内家人生成温暖的周报
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#7d3f37', marginTop: 14 }}>
              为家人生成 →
            </div>
          </div>
          <ChevronRight size={18} color="rgba(125,63,55,0.45)" />
        </div>
      </GradientCard>

      <GradientCard
        gradient="linear-gradient(135deg, #d9e6da, #4F6B5C)"
        onClick={() => router.push('/growth/academic')}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p className="gc-eyebrow" style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.75)' }}>升学路径</p>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: '#fff', lineHeight: 1.45 }}>
              {pathwayLine}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#fff', marginTop: 14 }}>
              查看完整规划 →
            </div>
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.65)" />
        </div>
      </GradientCard>

      {achievements.length > 0 ? (
        <section style={CARD}>
          <SectionTitle>成就里程碑</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {achievements.map((a) => (
              <div key={a.id} style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 14,
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
                {formatAchievedDate(a) ? (
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--fg3)', flexShrink: 0 }}>
                    {formatAchievedDate(a)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={CARD}>
        <SectionTitle>成长记录</SectionTitle>
        <button
          type="button"
          onClick={() => {
            setInputMode('text')
            setInputOpen(true)
          }}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 14,
            border: '1.5px dashed rgba(164,99,85,0.25)',
            background: 'rgba(164,99,85,0.04)',
            color: 'var(--clay)',
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          记录今天的瞬间
        </button>
      </section>

      {showWeeklyReport ? (
        <WeeklyReportSheet
          childId={child.id}
          childName={child.name}
          onClose={() => setShowWeeklyReport(false)}
        />
      ) : null}

      {inputOpen ? (
        <InputSheet
          open={inputOpen}
          onClose={() => setInputOpen(false)}
          mode={inputMode}
          onModeChange={setInputMode}
        />
      ) : null}
    </>
  )
}
