'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Check, Loader, ChevronRight,
  Sparkles, ChevronDown, ChevronUp, Plus, Target,
} from 'lucide-react'

const supabase = createClient()

const T = {
  bg: '#0F1A14',
  bgCard: 'rgba(255,255,255,0.04)',
  bgCardHover: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.08)',
  borderGold: 'rgba(240,192,64,0.3)',
  gold: '#F0C040',
  goldDim: 'rgba(240,192,64,0.6)',
  teal: '#4ECDC4',
  coral: '#FF6B6B',
  text: '#F5F0E8',
  textDim: 'rgba(245,240,232,0.5)',
  textFaint: 'rgba(245,240,232,0.25)',
  green: '#4ADE80',
}

const PERSON_TYPES = [
  { value: 'global_leader', emoji: '🌍', label: '有全球视野的领导者', desc: '在世界舞台上有影响力' },
  { value: 'innovator', emoji: '🔬', label: '改变世界的创新者', desc: 'STEM领域的探索者' },
  { value: 'artist', emoji: '🎨', label: '有影响力的艺术创作者', desc: '用创意表达改变人心' },
  { value: 'changemaker', emoji: '⚖️', label: '推动社会进步的变革者', desc: '让世界更公平' },
  { value: 'excellence', emoji: '🏆', label: '某领域极致卓越的人', desc: '在一件事上做到顶尖' },
  { value: 'custom', emoji: '✨', label: '我有自己的描述', desc: '用我自己的话来说' },
]

const PRIORITIES = [
  { value: 'top_university', emoji: '🎓', label: '进入顶尖学府' },
  { value: 'scholarship', emoji: '💰', label: '获得奖学金' },
  { value: 'happy_childhood', emoji: '🌈', label: '快乐健康的童年' },
  { value: 'elite_skill', emoji: '⭐', label: '培养世界级特长' },
  { value: 'bilingual', emoji: '🗣️', label: '成为双语精英' },
  { value: 'international', emoji: '✈️', label: '拥有国际化视野' },
]

const CONCERNS = [
  { value: 'pressure', emoji: '😰', label: '孩子课业压力太大' },
  { value: 'missed_window', emoji: '⏰', label: '错过关键培养窗口期' },
  { value: 'direction', emoji: '🧭', label: '不知道往哪个方向走' },
  { value: 'resources', emoji: '📍', label: '当地资源有限' },
  { value: 'chinese', emoji: '📖', label: '中文水平跟不上' },
  { value: 'competition', emoji: '🌏', label: '国际竞争太激烈' },
]

const TARGET_PATHS = [
  { value: 'us_boarding', emoji: '🏫', label: '美国寄宿高中', desc: 'G9申请，1月15日截止' },
  { value: 'us_university', emoji: '🎓', label: '美国本科T50', desc: 'G12申请，EA/ED优势大' },
  { value: 'uk_school', emoji: '🎩', label: '英国独立学校', desc: '11+/13+，顶校需提前注册' },
  { value: 'uk_university', emoji: '🏛️', label: '英国罗素大学群', desc: 'A-Level/IB，牛剑10月截止' },
  { value: 'flexible', emoji: '🌐', label: '多路并进，保持灵活', desc: '同时布局，视特长决定' },
  { value: 'other', emoji: '🗺️', label: '其他路径', desc: '加拿大 / 澳洲 / 新加坡' },
]

const urgencyColor = (u: string) =>
  u === 'critical' ? T.coral : u === 'high' ? T.gold : u === 'medium' ? T.teal : T.textDim

const urgencyLabel = (u: string) =>
  u === 'critical' ? '紧急' : u === 'high' ? '重要' : u === 'medium' ? '中期' : '长期'

// ── 小组件 ──
function Card({ children, style = {}, onClick }: any) {
  return (
    <motion.div whileTap={onClick ? { scale: 0.98 } : undefined} onClick={onClick}
      style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: '16px', cursor: onClick ? 'pointer' : 'default', ...style }}>
      {children}
    </motion.div>
  )
}

function Badge({ text, color = T.gold }: { text: string; color?: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: `${color}20`, color, letterSpacing: '0.05em' }}>
      {text}
    </span>
  )
}

// ── 愿景设定 ──
function VisionSetup({ childName, childId, onComplete }: {
  childName: string; childId: string; onComplete: (v: any) => void
}) {
  const [step, setStep] = useState(0)
  const [personType, setPersonType] = useState('')
  const [customVision, setCustomVision] = useState('')
  const [priorities, setPriorities] = useState<string[]>([])
  const [concerns, setConcerns] = useState<string[]>([])
  const [targetPath, setTargetPath] = useState('')
  const [saving, setSaving] = useState(false)
  const TOTAL = 5

  const canNext = () => {
    if (step === 0) return true
    if (step === 1) return !!personType && (personType !== 'custom' || customVision.trim().length > 5)
    if (step === 2) return priorities.length > 0
    if (step === 3) return concerns.length > 0
    if (step === 4) return !!targetPath
    return false
  }

  const save = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = {
      child_id: childId, user_id: user.id, person_type: personType,
      vision_statement: personType === 'custom' ? customVision : PERSON_TYPES.find(p => p.value === personType)?.label || '',
      priorities, concerns, target_school_type: targetPath,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase.from('family_vision').select('id').eq('child_id', childId).maybeSingle()
    if (existing) {
      await supabase.from('family_vision').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('family_vision').insert(payload)
    }
    setSaving(false)
    onComplete(payload)
  }

  const Pill = ({ value, label, emoji, selected, onSelect, desc }: any) => (
    <motion.div whileTap={{ scale: 0.97 }} onClick={() => onSelect(value)}
      style={{ padding: '14px 16px', borderRadius: 14, cursor: 'pointer', marginBottom: 10,
        background: selected ? `${T.gold}12` : T.bgCard,
        border: `1.5px solid ${selected ? T.gold : T.border}`,
        display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s' }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: selected ? 600 : 400, color: selected ? T.gold : T.text }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{desc}</div>}
      </div>
      {selected && <Check size={15} color={T.gold} />}
    </motion.div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, fontFamily: "'Noto Sans SC', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', padding: '52px 20px 32px' }}>
        <div style={{ display: 'flex', gap: 5, marginBottom: 40 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <motion.div key={i} animate={{ width: i === step ? 28 : 6, background: i <= step ? T.gold : T.border }}
              style={{ height: 4, borderRadius: 2 }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {step === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 3, repeat: Infinity }} style={{ fontSize: 72, marginBottom: 28 }}>🌱</motion.div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, marginBottom: 14, lineHeight: 1.3, fontFamily: "'Noto Serif SC', serif" }}>
                  {childName}的<br />学业成长档案
                </h1>
                <p style={{ fontSize: 14, color: T.textDim, lineHeight: 1.9, marginBottom: 32, maxWidth: 300 }}>
                  在开始之前，根想先了解<br />你对{childName}最深的期待。<br />这将成为所有规划的北极星。
                </p>
                <div style={{ fontSize: 11, color: T.goldDim, letterSpacing: '0.15em' }}>约需 3 分钟 · 可随时修改</div>
              </div>
            )}

            {step === 1 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 6, lineHeight: 1.4 }}>
                  你希望{childName}<br />成为什么样的人？
                </div>
                <div style={{ fontSize: 13, color: T.textDim, marginBottom: 24, lineHeight: 1.7 }}>不是去哪所学校，而是成为什么人。</div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {PERSON_TYPES.map(p => <Pill key={p.value} value={p.value} label={p.label} emoji={p.emoji} desc={p.desc} selected={personType === p.value} onSelect={setPersonType} />)}
                  {personType === 'custom' && (
                    <motion.textarea initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      value={customVision} onChange={e => setCustomVision(e.target.value)}
                      placeholder={`用你自己的话描述对${childName}的期待…`} rows={3}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${T.borderGold}`, background: `${T.gold}08`, color: T.text, fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginTop: 4 }} />
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 6, lineHeight: 1.4 }}>最核心的期待是什么？</div>
                <div style={{ fontSize: 13, color: T.textDim, marginBottom: 24 }}>可以多选</div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {PRIORITIES.map(p => <Pill key={p.value} value={p.value} label={p.label} emoji={p.emoji} selected={priorities.includes(p.value)}
                    onSelect={(v: string) => setPriorities(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])} />)}
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 6 }}>你最担心什么？</div>
                <div style={{ fontSize: 13, color: T.textDim, marginBottom: 24 }}>诚实说，根会帮你应对</div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {CONCERNS.map(c => <Pill key={c.value} value={c.value} label={c.label} emoji={c.emoji} selected={concerns.includes(c.value)}
                    onSelect={(v: string) => setConcerns(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])} />)}
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 6, lineHeight: 1.4 }}>倾向的升学路径？</div>
                <div style={{ fontSize: 13, color: T.textDim, marginBottom: 24 }}>不确定也没关系，可以随时调整</div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {TARGET_PATHS.map(p => <Pill key={p.value} value={p.value} label={p.label} emoji={p.emoji} desc={p.desc} selected={targetPath === p.value} onSelect={setTargetPath} />)}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
          {step > 0 && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(step - 1)}
              style={{ flex: 1, padding: '14px', borderRadius: 14, border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, fontSize: 14, cursor: 'pointer' }}>
              上一步
            </motion.button>
          )}
          {step < TOTAL - 1 ? (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => canNext() && setStep(step + 1)}
              style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none', background: canNext() ? T.gold : T.bgCard, color: canNext() ? '#0F1A14' : T.textFaint, fontSize: 14, fontWeight: 700, cursor: canNext() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {step === 0 ? '开始设定愿景' : '下一步'} <ArrowRight size={16} />
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.97 }} onClick={save} disabled={!canNext() || saving}
              style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none', background: canNext() ? T.gold : T.bgCard, color: '#0F1A14', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {saving ? <Loader size={16} /> : <Sparkles size={16} />}
              {saving ? '正在保存…' : '完成，开始规划'}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 今日指令（首屏）──
function TodaySection({ report, vision, childName, childId }: any) {
  const [memo, setMemo] = useState('')
  const [savingMemo, setSavingMemo] = useState(false)
  const [memoSaved, setMemoSaved] = useState(false)

  const todayPriority = report?.today_priority || (report?.this_semester?.[0] ? {
    action: report.this_semester[0].action,
    reason: report.this_semester[0].why,
    urgency: report.this_semester[0].urgency,
  } : null)

  const urgentNode = report?.roadmap?.find((n: any) => n.urgency === 'critical' || n.urgency === 'high')
  const yearsToApply = report?.years_to_apply || 6

  const saveMemo = async () => {
    if (!memo.trim() || !childId) return
    setSavingMemo(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('essay_materials').insert({
      child_id: childId, user_id: user?.id,
      content: memo, tags: ['日常记录'],
      created_at: new Date().toISOString(),
    })
    setMemo('')
    setSavingMemo(false)
    setMemoSaved(true)
    setTimeout(() => setMemoSaved(false), 2000)
  }

  return (
    <div>
      {/* 顶部状态条 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: `linear-gradient(135deg, ${T.gold}15 0%, rgba(78,205,196,0.06) 100%)`, borderRadius: 18, padding: '16px 18px', marginBottom: 14, border: `1px solid ${T.borderGold}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: T.goldDim, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>妈妈的愿景</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.gold, lineHeight: 1.3, fontFamily: "'Noto Serif SC', serif" }}>
              {PERSON_TYPES.find(p => p.value === vision?.person_type)?.label || vision?.vision_statement}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
            <div style={{ fontSize: 10, color: T.textDim, marginBottom: 3 }}>距申请</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.gold, fontFamily: "'Space Mono', monospace" }}>{yearsToApply}</div>
            <div style={{ fontSize: 10, color: T.textDim }}>年</div>
          </div>
        </div>
        {urgentNode && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.borderGold}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: urgencyColor(urgentNode.urgency), flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: T.textDim }}>
              下一关键节点：<span style={{ color: urgencyColor(urgentNode.urgency), fontWeight: 600 }}>{urgentNode.title}</span>
              <span style={{ color: T.textFaint }}>（{urgentNode.year_target}年）</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* 顾问洞见 */}
      {report?.key_insight && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ background: T.bgCard, borderRadius: 14, padding: '14px 16px', marginBottom: 14, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.teal}` }}>
          <div style={{ fontSize: 10, color: T.teal, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>根的判断</div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.8, fontStyle: 'italic' }}>"{report.key_insight}"</div>
        </motion.div>
      )}

      {/* 今天最重要的一件事 */}
      {todayPriority && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>⚡ 今天最重要的一件事</div>
          <Card style={{ borderColor: T.borderGold, background: `${T.gold}08` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.gold, marginBottom: 6 }}>{todayPriority.action}</div>
            <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>{todayPriority.reason}</div>
          </Card>
        </motion.div>
      )}

      {/* 本月重点 */}
      {report?.this_semester?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>📋 本月重点</div>
          {report.this_semester.map((item: any, i: number) => (
            <Card key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: item.urgency === 'high' ? T.gold : T.bgCardHover, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: item.urgency === 'high' ? '#0F1A14' : T.textDim, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 3 }}>{item.action}</div>
                  <div style={{ fontSize: 11, color: T.textDim, marginBottom: item.local_resource ? 4 : 0 }}>{item.why}</div>
                  {item.local_resource && <div style={{ fontSize: 10, color: T.teal }}>📍 {item.local_resource}</div>}
                </div>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {/* 需要关注 */}
      {report?.gaps?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>⚠️ 需要关注</div>
          <Card style={{ borderColor: 'rgba(255,107,107,0.15)' }}>
            {report.gaps.map((gap: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < report.gaps.length - 1 ? 8 : 0, paddingBottom: i < report.gaps.length - 1 ? 8 : 0, borderBottom: i < report.gaps.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ color: T.coral, flexShrink: 0 }}>•</span>
                <span style={{ fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>{gap}</span>
              </div>
            ))}
          </Card>
        </motion.div>
      )}

      {/* 申请故事主线 */}
      {report?.narrative && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>📖 申请故事主线</div>
          <Card style={{ borderLeft: `3px solid ${T.gold}` }}>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.9, fontStyle: 'italic' }}>"{report.narrative}"</div>
          </Card>
        </motion.div>
      )}

      {/* 快速记录今天 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T.textDim, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>✏️ 记录今天</div>
        <Card>
          <div style={{ fontSize: 12, color: T.textDim, marginBottom: 10 }}>
            {childName}今天有什么亮点？随手记，都是未来文书的素材。
          </div>
          <textarea value={memo} onChange={e => setMemo(e.target.value)}
            placeholder="今天他说了一句很有趣的话… 第一次赢了比赛… 帮助了同学…"
            rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.bgCardHover, color: T.text, fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          <motion.button whileTap={{ scale: 0.97 }} onClick={saveMemo} disabled={!memo.trim() || savingMemo}
            style={{ marginTop: 10, padding: '9px 20px', borderRadius: 10, border: 'none', background: memo.trim() ? T.gold : T.bgCard, color: memo.trim() ? '#0F1A14' : T.textFaint, fontSize: 12, fontWeight: 700, cursor: memo.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6 }}>
            {memoSaved ? <><Check size={13} /> 已保存到素材库</> : savingMemo ? <><Loader size={13} /> 保存中…</> : <><Plus size={13} /> 存入素材库</>}
          </motion.button>
        </Card>
      </motion.div>

      {!report && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{ fontSize: 40, marginBottom: 14, display: 'inline-block' }}>🌱</motion.div>
          <div style={{ fontSize: 14, color: T.textDim, lineHeight: 1.7 }}>
            根正在撰写{childName}的专属规划<br />
            <span style={{ fontSize: 11, color: T.textFaint }}>完成后自动显示，通常需要30-60秒</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 路线图 ──
function RoadmapSection({ report, childId, generating, onGenerate }: any) {
  const [expandedNode, setExpandedNode] = useState<string | null>(null)
  const [conditions, setConditions] = useState<Record<string, boolean>>({})

  const roadmap: any[] = report?.roadmap || []

  useEffect(() => {
    if (!childId || !roadmap.length) return
    loadConditions()
  }, [childId, roadmap.length])

  const loadConditions = async () => {
    const { data } = await supabase.from('pathway_node_conditions')
      .select('node_id, condition_id, completed')
      .eq('child_id', childId)
    if (data) {
      const map: Record<string, boolean> = {}
      data.forEach((r: any) => { map[`${r.node_id}_${r.condition_id}`] = r.completed })
      setConditions(map)
    }
  }

  const toggleCondition = async (nodeId: string, condId: string, currentVal: boolean) => {
    const key = `${nodeId}_${condId}`
    setConditions(prev => ({ ...prev, [key]: !currentVal }))

    const { data: { user } } = await supabase.auth.getUser()
    const { data: existing } = await supabase.from('pathway_node_conditions')
      .select('id').eq('child_id', childId).eq('node_id', nodeId).eq('condition_id', condId).maybeSingle()

    if (existing) {
      await supabase.from('pathway_node_conditions').update({
        completed: !currentVal,
        completed_at: !currentVal ? new Date().toISOString() : null,
      }).eq('id', existing.id)
    } else {
      await supabase.from('pathway_node_conditions').insert({
        child_id: childId, user_id: user?.id,
        node_id: nodeId, condition_id: condId,
        completed: !currentVal,
        completed_at: !currentVal ? new Date().toISOString() : null,
      })
    }
  }

  const getNodeCompletion = (node: any) => {
    if (!node.conditions?.length) return node.completion || 0
    const manualDone = node.conditions.filter((c: any) =>
      conditions[`${node.id}_${c.id}`]
    ).length
    const autoDone = node.conditions.filter((c: any) =>
      c.type !== 'manual' && conditions[`${node.id}_${c.id}`]
    ).length
    return Math.round(((manualDone) / node.conditions.length) * 100)
  }

  if (!roadmap.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        {generating ? (
          <div>
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ fontSize: 48, marginBottom: 16 }}>🌱</motion.div>
            <div style={{ fontSize: 14, color: T.textDim }}>正在撰写升学路线图…</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onGenerate}
              style={{ padding: '13px 28px', borderRadius: 20, background: T.gold, color: '#0F1A14', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, margin: '16px auto 0' }}>
              <Sparkles size={16} /> 开始撰写规划
            </motion.button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 11, top: 24, bottom: 0, width: 1, background: `linear-gradient(to bottom, ${T.gold}50, transparent)` }} />

        {roadmap.map((node: any, i: number) => {
          const completion = getNodeCompletion(node)
          const isExpanded = expandedNode === node.id
          const color = urgencyColor(node.urgency)
          const isCurrent = i === 0

          return (
            <motion.div key={node.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              style={{ paddingLeft: 30, marginBottom: 12, position: 'relative' }}>

              {/* 节点圆点 */}
              <div style={{ position: 'absolute', left: 0, top: 16, width: 22, height: 22, borderRadius: '50%', background: isCurrent ? color : T.bgCard, border: `2px solid ${isCurrent ? color : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {completion === 100
                  ? <Check size={12} color={isCurrent ? '#0F1A14' : T.textDim} />
                  : isCurrent && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0F1A14' }} />}
              </div>

              {/* 节点卡片 */}
              <Card onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                style={{ cursor: 'pointer', borderColor: isCurrent ? `${color}40` : T.border }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isCurrent ? color : T.text }}>{node.title}</span>
                      <Badge text={urgencyLabel(node.urgency)} color={color} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: T.textDim }}>{node.grade_target} · {node.year_target}年</span>
                      <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: completion === 100 ? T.green : color, width: `${completion}%`, transition: 'width 0.5s' }} />
                      </div>
                      <span style={{ fontSize: 10, color: completion === 100 ? T.green : color, fontFamily: "'Space Mono', monospace", flexShrink: 0 }}>{completion}%</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={14} color={T.textFaint} /> : <ChevronDown size={14} color={T.textFaint} />}
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}>
                      <div style={{ paddingTop: 12, marginTop: 12, borderTop: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 12, color: T.textDim, marginBottom: 10, lineHeight: 1.6 }}>{node.description}</div>
                        <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>达成条件</div>
                        {node.conditions?.map((cond: any) => {
                          const key = `${node.id}_${cond.id}`
                          const done = conditions[key] || false
                          return (
                            <motion.div key={cond.id} whileTap={{ scale: 0.98 }}
                              onClick={e => { e.stopPropagation(); toggleCondition(node.id, cond.id, done) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}>
                              <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${done ? T.green : T.border}`, background: done ? T.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                                {done && <Check size={11} color="#0F1A14" />}
                              </div>
                              <span style={{ fontSize: 12, color: done ? T.green : T.textDim, textDecoration: done ? 'line-through' : 'none', lineHeight: 1.5 }}>{cond.text}</span>
                              {cond.type === 'manual' && <span style={{ fontSize: 9, color: T.textFaint, flexShrink: 0, marginLeft: 'auto' }}>手动</span>}
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <motion.button whileTap={{ scale: 0.97 }} onClick={onGenerate} disabled={generating}
        style={{ width: '100%', marginTop: 8, padding: '11px', borderRadius: 14, border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {generating ? <Loader size={13} /> : <Sparkles size={13} />}
        {generating ? '正在撰写中…' : '重新撰写规划'}
      </motion.button>
    </div>
  )
}

// ── Spike 战略 ──
function SpikeSection({ report, childId, vision }: any) {
  const [selectedSpike, setSelectedSpike] = useState<any>(null)
  const [locking, setLocking] = useState(false)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    if (report?.selected_spike) {
      setSelectedSpike(report.selected_spike)
      setLocked(true)
    }
  }, [report])

  const lockSpike = async (spike: any) => {
    setLocking(true)
    setSelectedSpike(spike)

    // 先查最新报告 ID
    const { data: latestReport } = await supabase.from('pathway_reports')
      .select('id').eq('child_id', childId)
      .order('generated_at', { ascending: false }).limit(1).maybeSingle()

    if (latestReport) {
      await supabase.from('pathway_reports')
        .update({ selected_spike: spike })
        .eq('id', latestReport.id)
    }

    setLocked(true)
    setLocking(false)
  }

  const spikes = report?.spike_options || []

  if (!spikes.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textDim, fontSize: 14 }}>
        先生成规划，Spike方向自动出现
      </div>
    )
  }

  return (
    <div>
      {locked && selectedSpike ? (
        <div>
          <div style={{ fontSize: 11, color: T.green, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>✅ 已锁定Spike方向</div>
          <Card style={{ borderColor: `${T.green}40`, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.green, marginBottom: 6 }}>{selectedSpike.direction}</div>
            <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7, marginBottom: 8 }}>{selectedSpike.rationale}</div>
            <div style={{ fontSize: 12, color: T.gold, fontWeight: 600, marginBottom: 4 }}>第一步：</div>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.6 }}>{selectedSpike.first_step}</div>
          </Card>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setLocked(false); setSelectedSpike(null) }}
            style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, fontSize: 12, cursor: 'pointer' }}>
            重新选择方向
          </motion.button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7, marginBottom: 16 }}>
            根基于{vision?.vision_statement || '你的愿景'}和孩子现有情况，分析了以下Spike方向。选择一个方向锁定后，所有建议都会围绕这个方向展开。
          </div>
          {spikes.map((spike: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              style={{ marginBottom: 10 }}>
              <Card style={{ borderColor: selectedSpike?.direction === spike.direction ? T.borderGold : T.border, background: selectedSpike?.direction === spike.direction ? `${T.gold}08` : T.bgCard }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{spike.direction}</div>
                  <Target size={14} color={T.goldDim} style={{ flexShrink: 0, marginLeft: 8 }} />
                </div>
                <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7, marginBottom: 8 }}>{spike.rationale}</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: `${T.green}10`, border: `1px solid ${T.green}20` }}>
                    <div style={{ fontSize: 9, color: T.green, fontWeight: 700, marginBottom: 3 }}>优势</div>
                    <div style={{ fontSize: 11, color: T.textDim }}>{spike.pros}</div>
                  </div>
                  <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: `${T.coral}10`, border: `1px solid ${T.coral}20` }}>
                    <div style={{ fontSize: 9, color: T.coral, fontWeight: 700, marginBottom: 3 }}>挑战</div>
                    <div style={{ fontSize: 11, color: T.textDim }}>{spike.cons}</div>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => lockSpike(spike)} disabled={locking}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: T.gold, color: '#0F1A14', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {locking ? <Loader size={12} /> : <Check size={12} />}
                  选择并锁定这个方向
                </motion.button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 档案记录 ──
function RecordsSection({ childId, router }: any) {
  const modules = [
    { icon: '🏆', label: '荣誉奖项', desc: '比赛 · 考级 · 竞赛 · 申请权重', color: T.gold, path: '/growth/academic/achievements' },
    { icon: '📊', label: '学术记录', desc: '成绩轨迹 · 考试 · 语言成绩', color: T.teal, path: '/growth/academic/records' },
    { icon: '🎯', label: '课外活动', desc: '兴趣班 · 参与年限 · Spike积累', color: '#A78BFA', path: childId ? `/children/${childId}/activities` : '/children' },
    { icon: '📝', label: '文书素材库', desc: '故事碎片 · 申请角度 · 文书准备', color: '#FB923C', path: '/growth/academic/essays' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {modules.map((m, i) => (
        <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
          whileTap={{ scale: 0.98 }} onClick={() => router.push(m.path)}
          style={{ background: T.bgCard, borderRadius: 16, padding: '16px', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{m.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 11, color: T.textDim }}>{m.desc}</div>
          </div>
          <ChevronRight size={16} color={T.textFaint} />
        </motion.div>
      ))}
    </div>
  )
}

// ── 主组件 ──
function AcademicContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [hasVision, setHasVision] = useState(false)
  const [childId, setChildId] = useState<string | null>(null)
  const [childName, setChildName] = useState('')
  const [vision, setVision] = useState<any>(null)
  const [report, setReport] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('today')

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!childId) return
    const channel = supabase.channel('pathway_watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pathway_reports', filter: `child_id=eq.${childId}` },
        (payload) => { setReport(payload.new); setGenerating(false) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [childId])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const stored = localStorage.getItem('active_child_id')
    const storedChild = localStorage.getItem('active_child')
    if (stored) {
      setChildId(stored)
      if (storedChild) setChildName(JSON.parse(storedChild)?.name || '')
    }

    if (stored) {
      const [visionRes, reportRes] = await Promise.all([
        supabase.from('family_vision').select('*').eq('child_id', stored).maybeSingle(),
        supabase.from('pathway_reports').select('*').eq('child_id', stored).order('generated_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (visionRes.data) { setHasVision(true); setVision(visionRes.data) }
      if (reportRes.data) setReport(reportRes.data)
    }
    setLoading(false)
  }

  const generateReport = async (visionData: any) => {
    if (!childId) return
    setGenerating(true)

    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    const storedChild = localStorage.getItem('active_child')
    const geofence = storedChild ? JSON.parse(storedChild)?.geofence || null : null

    const [childRes, activitiesRes, achievementsRes, assessmentRes, essaysRes] = await Promise.all([
      supabase.from('children').select('*').eq('id', childId).single(),
      supabase.from('child_activities').select('*').eq('child_id', childId),
      supabase.from('child_achievements').select('*').eq('child_id', childId),
      supabase.from('assessments').select('report').eq('child_id', childId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('essay_materials').select('*').eq('child_id', childId),
    ])

    await fetch('/api/children/pathway', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        child: childRes.data,
        activities: activitiesRes.data || [],
        achievements: achievementsRes.data || [],
        essays: essaysRes.data || [],
        assessment: assessmentRes.data?.report || null,
        vision: visionData,
        childId,
        geofence,
      }),
    })
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
        style={{ fontSize: 13, color: T.goldDim, letterSpacing: '0.2em', fontFamily: "'Noto Sans SC', sans-serif" }}>
        加载中…
      </motion.div>
    </div>
  )

  if (!hasVision) return (
    <VisionSetup childName={childName} childId={childId!} onComplete={(v) => {
      setVision(v); setHasVision(true); generateReport(v)
    }} />
  )

  const TABS = [
    { key: 'today', label: '今日', emoji: '⚡' },
    { key: 'roadmap', label: '路径', emoji: '🗺️' },
    { key: 'spike', label: 'Spike', emoji: '⭐' },
    { key: 'records', label: '档案', emoji: '📁' },
  ]

  return (
    <main style={{ minHeight: '100dvh', background: T.bg, fontFamily: "'Noto Sans SC', sans-serif", paddingBottom: 80 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15,26,20,0.94)', backdropFilter: 'blur(24px)', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text, padding: 4 }}>
            <ArrowLeft size={20} />
          </motion.button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{childName}的学业成长</div>
            {generating && (
              <div style={{ fontSize: 10, color: T.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}>🌱</motion.span>
                正在撰写规划…
              </div>
            )}
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setHasVision(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textDim, fontSize: 12 }}>
            调整愿景
          </motion.button>
        </div>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 12px', display: 'flex', gap: 4 }}>
          {TABS.map(tab => (
            <motion.button key={tab.key} whileTap={{ scale: 0.93 }} onClick={() => setActiveTab(tab.key)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 12, border: 'none', background: activeTab === tab.key ? `${T.gold}18` : 'transparent', color: activeTab === tab.key ? T.gold : T.textFaint, fontSize: 10, fontWeight: activeTab === tab.key ? 700 : 400, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 0.2s' }}>
              <span style={{ fontSize: 14 }}>{tab.emoji}</span>
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 14px' }}>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {activeTab === 'today' && <TodaySection report={report} vision={vision} childName={childName} childId={childId} />}
            {activeTab === 'roadmap' && <RoadmapSection report={report} childId={childId} generating={generating} onGenerate={() => generateReport(vision)} />}
            {activeTab === 'spike' && <SpikeSection report={report} childId={childId} vision={vision} />}
            {activeTab === 'records' && <RecordsSection childId={childId} router={router} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;800&family=Noto+Sans+SC:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        ::-webkit-scrollbar { display: none; }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
      `}</style>
    </main>
  )
}

export default function AcademicPage() {
  return <Suspense><AcademicContent /></Suspense>
}
