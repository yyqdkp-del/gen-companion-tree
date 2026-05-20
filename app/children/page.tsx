'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Plus, ChevronRight, Check } from 'lucide-react'

const supabase = createClient()

const GLASS_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.8)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 20px rgba(45,50,47,0.05)',
}

const PAGE = {
  bg: '#fbf9f6',
  ink: '#2d322f',
  accent: '#a46355',
  gold: '#8a7355',
  muted: 'rgba(45,50,47,0.45)',
}

const LEVEL_COLORS: Record<string, { color: string; bg: string }> = {
  R1: { color: '#922B21', bg: '#FFF0EE' },
  R2: { color: '#BA6A00', bg: '#FFF6EE' },
  R3: { color: '#A07800', bg: '#FFFBEE' },
  R4: { color: '#5C6E00', bg: '#F5F9EE' },
  R5: { color: '#2D6A4F', bg: '#EDFAF1' },
}

type Child = {
  id: string
  name: string
  grade: string
  school: string
  emoji: string
  status: string
  chinese_level?: string
}

export default function ChildrenPage() {
  const router = useRouter()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('active_child_id')
    if (stored) setActiveId(stored)
    loadChildren()
  }, [])

  const loadChildren = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) { setLoading(false); return }

    const { data } = await supabase
      .from('children')
      .select('id, name, grade, school, emoji, status')
      .eq('user_id', session.user.id)
      .order('created_at')

    // 读取每个孩子的中文水平（从 assessments 表）
    if (data) {
      const enriched = await Promise.all(data.map(async (child) => {
        const { data: assessment } = await supabase
  .from('assessments')
  .select('report')
  .eq('user_id', session.user.id)
  .eq('child_name', child.name)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()

        let chinese_level = ''
        if (assessment?.report) {
          try {
            const r = typeof assessment.report === 'string'
              ? JSON.parse(assessment.report) : assessment.report
            chinese_level = r?.level || ''
          } catch {}
        }
        return { ...child, chinese_level }
      }))
      setChildren(enriched)
    }
    setLoading(false)
  }

  const selectChild = (child: Child) => {
    localStorage.setItem('active_child_id', child.id)
    localStorage.setItem('active_child', JSON.stringify({
      id: child.id,
      name: child.name,
      grade: child.grade,
      level: child.chinese_level || 'R2',
      emoji: child.emoji || '🌟',
      school: child.school,
    }))
    setActiveId(child.id)
  }

  return (
    <main style={{ minHeight: '100dvh', backgroundColor: PAGE.bg, fontFamily: "'Noto Sans SC', sans-serif" }}>

      {/* 顶部 */}
      <motion.div style={{ position: 'sticky', top: 0, zIndex: 50, ...GLASS_CARD, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: PAGE.ink }}>←</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: PAGE.ink, fontFamily: "'Noto Serif SC', serif" }}>孩子资料</span>
        <div style={{ width: 28 }} />
      </motion.div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: PAGE.muted, fontSize: 14 }}>加载中…</div>
        ) : children.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🌱</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: PAGE.ink, marginBottom: 8 }}>还没有孩子资料</div>
            <div style={{ fontSize: 13, color: PAGE.muted, marginBottom: 24 }}>添加孩子后，解码器和测评会自动带入信息</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: PAGE.muted, marginBottom: 12, letterSpacing: '0.05em' }}>
              点击孩子卡片切换当前使用的孩子
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {children.map(child => {
                const isActive = child.id === activeId
                const lvCfg = LEVEL_COLORS[child.chinese_level || ''] || null

                return (
                  <motion.div key={child.id} whileTap={{ scale: 0.98 }}
                    style={{ ...GLASS_CARD, padding: '16px 18px', border: isActive ? `2px solid ${PAGE.accent}` : '1px solid rgba(255,255,255,0.6)', boxShadow: isActive ? '0 4px 20px rgba(164,99,85,0.15)' : '0 4px 20px rgba(45,50,47,0.05)', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                    onClick={() => selectChild(child)}
                  >
                    {/* Emoji 头像 */}
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: isActive ? 'rgba(164,99,85,0.12)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                      {child.emoji || '🌟'}
                    </div>

                    {/* 信息 */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: PAGE.ink }}>{child.name}</span>
                        {child.grade && <span style={{ fontSize: 11, color: PAGE.muted, background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 8 }}>{child.grade}</span>}
                        {lvCfg && child.chinese_level && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: lvCfg.bg, color: lvCfg.color, fontWeight: 600 }}>{child.chinese_level}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: PAGE.muted }}>{child.school || '未填写学校'}</div>
                    </div>

                    {/* 右侧 */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      {isActive && (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: PAGE.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={12} color="#fff" />
                        </div>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/children/${child.id}`) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: PAGE.muted, display: 'flex', alignItems: 'center', gap: 2, fontSize: 12 }}>
                        编辑 <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </>
        )}

        {/* 添加孩子 */}
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/children/new')}
          style={{ width: '100%', padding: '16px', borderRadius: 18, border: '2px dashed rgba(164,99,85,0.35)', background: 'rgba(255,255,255,0.5)', color: PAGE.accent, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Plus size={18} /> 添加孩子
        </motion.button>

      </div>
    </main>
  )
}
