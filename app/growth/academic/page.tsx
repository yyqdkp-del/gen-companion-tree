'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Check, Loader, ChevronRight, Sparkles,
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
  navy: '#1A3C5E',
}

const SCHOOL_DB = {
  us_boarding: [
    { name: 'Phillips Exeter Academy', country: '🇺🇸', acceptance: '14%', ssat: '90%+', deadline: '1月15日', note: 'Harkness教学法，Ivy接受率30%' },
    { name: 'Phillips Andover', country: '🇺🇸', acceptance: '13%', ssat: '89%+', deadline: '1月15日', note: '全美最大捐赠基金之一' },
    { name: 'Choate Rosemary Hall', country: '🇺🇸', acceptance: '16%', ssat: '85%+', deadline: '1月15日', note: 'JFK母校，国际生友好' },
    { name: 'Taft School', country: '🇺🇸', acceptance: '22%', ssat: '87%', deadline: '1月15日', note: '录取中位SSAT 87百分位' },
    { name: 'Hotchkiss School', country: '🇺🇸', acceptance: '18%', ssat: '86%+', deadline: '1月15日', note: '艺术项目顶尖' },
    { name: 'Deerfield Academy', country: '🇺🇸', acceptance: '20%', ssat: '85%+', deadline: '1月15日', note: '体育奖学金丰厚' },
  ],
  uk_boarding: [
    { name: 'Eton College', country: '🇬🇧', fee: '£63,300/年', deadline: 'Year5前注册', note: '20位英国首相，需提前4-5年注册' },
    { name: 'Winchester College', country: '🇬🇧', fee: '£60,000/年', deadline: 'Year5前注册', note: '学术顶尖，A*/A 86.95%' },
    { name: 'Harrow School', country: '🇬🇧', fee: '£62,000/年', deadline: '提前2年', note: '丘吉尔母校，体育艺术均强' },
    { name: 'Brighton College', country: '🇬🇧', fee: '~£55,000/年', deadline: '提前1-2年', note: 'Sunday Times年度学校，A-Level 99.3% A*-B' },
    { name: 'Wycombe Abbey', country: '🇬🇧', fee: '£55,350/年', deadline: '提前2年', note: '英国顶尖女校，GCSE 97.60% A*/A' },
  ],
  us_university: [
    { name: 'MIT', country: '🇺🇸', acceptance: '3.9%', sat: '1570+', deadline: '11月1日 EA', note: 'STEM绝对顶尖，需竞赛级别课外' },
    { name: 'Stanford', country: '🇺🇸', acceptance: '3.7%', sat: '1570+', deadline: '11月1日 REA', note: '最难进，Spike模式' },
    { name: 'Harvard', country: '🇺🇸', acceptance: '3.6%', sat: '1580+', deadline: '11月1日 REA', note: '综合全面型，领导力权重极高' },
    { name: 'Yale', country: '🇺🇸', acceptance: '4.6%', sat: '1560+', deadline: '11月1日 REA', note: '艺术人文顶尖，戏剧音乐强' },
    { name: 'Princeton', country: '🇺🇸', acceptance: '4.7%', sat: '1570+', deadline: '11月1日 REA', note: '数学物理传统强校' },
    { name: 'Columbia', country: '🇺🇸', acceptance: '3.9%', sat: '1550+', deadline: '11月1日 ED', note: '纽约，通识教育著名' },
  ],
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
  { value: 'resources', emoji: '📍', label: '清迈资源有限' },
  { value: 'chinese', emoji: '📖', label: '中文水平跟不上' },
  { value: 'competition', emoji: '🌏', label: '国际竞争太激烈' },
]

const TARGET_PATHS = [
  { value: 'us_boarding', emoji: '🏫', label: '美国寄宿高中', desc: 'G9申请，1月15日截止，SSAT 80-90%+' },
  { value: 'us_university', emoji: '🎓', label: '美国本科T50', desc: 'G12申请，SAT/ACT，EA/ED优势大' },
  { value: 'uk_school', emoji: '🎩', label: '英国独立学校', desc: '11+/13+，Eton需Year5前注册' },
  { value: 'uk_university', emoji: '🏛️', label: '英国罗素大学群', desc: 'A-Level/IB，牛剑10月15日截止' },
  { value: 'flexible', emoji: '🌐', label: '多路并进，保持灵活', desc: '同时布局美英，视孩子特长决定' },
  { value: 'other', emoji: '🗺️', label: '其他路径', desc: '加拿大 / 澳洲 / 新加坡' },
]

const PROFILE_DIMS = [
  { key: 'academic', label: '学术能力', icon: '📚', target: 85 },
  { key: 'spike_depth', label: '特长深度', icon: '⭐', target: 80 },
  { key: 'leadership', label: '领导力', icon: '👑', target: 75 },
  { key: 'language', label: '语言能力', icon: '🗣️', target: 90 },
  { key: 'community', label: '社区贡献', icon: '🤝', target: 70 },
  { key: 'diversity', label: '多元性', icon: '🌍', target: 75 },
]

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

function SectionTitle({ icon, title }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: '0.05em' }}>{title}</span>
    </div>
  )
}

// ── 愿景设定（安全版：用 getUser() 不用 getSession()）──
function VisionSetup({ childName, childId, onComplete }: {
  childName: string; childId: string; onComplete: (vision: any) => void
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
    // ✅ 安全：用 getUser() 服务端验证，不用 getSession()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = {
      child_id: childId,
      user_id: user.id,
      person_type: personType,
      vision_statement: personType === 'custom' ? customVision : PERSON_TYPES.find(p => p.value === personType)?.label || '',
      priorities,
      concerns,
      target_school_type: targetPath,
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

  const OptionPill = ({ value, label, emoji, selected, onSelect, desc }: any) => (
    <motion.div whileTap={{ scale: 0.97 }} onClick={() => onSelect(value)}
      style={{ padding: '14px 16px', borderRadius: 14, cursor: 'pointer', marginBottom: 10, background: selected ? `${T.gold}12` : T.bgCard, border: `1.5px solid ${selected ? T.gold : T.border}`, display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s' }}>
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
            <motion.div key={i}
              animate={{ width: i === step ? 28 : 6, background: i <= step ? T.gold : T.border }}
              style={{ height: 4, borderRadius: 2, transition: 'all 0.3s' }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {step === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 3, repeat: Infinity }}
                  style={{ fontSize: 72, marginBottom: 28 }}>🌱</motion.div>
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
                  {PERSON_TYPES.map(p => (
                    <OptionPill key={p.value} value={p.value} label={p.label} emoji={p.emoji} desc={p.desc}
                      selected={personType === p.value} onSelect={setPersonType} />
                  ))}
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
                  {PRIORITIES.map(p => (
                    <OptionPill key={p.value} value={p.value} label={p.label} emoji={p.emoji}
                      selected={priorities.includes(p.value)}
                      onSelect={(v: string) => setPriorities(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])} />
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 6 }}>你最担心什么？</div>
                <div style={{ fontSize: 13, color: T.textDim, marginBottom: 24 }}>诚实说，根会帮你应对</div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {CONCERNS.map(c => (
                    <OptionPill key={c.value} value={c.value} label={c.label} emoji={c.emoji}
                      selected={concerns.includes(c.value)}
                      onSelect={(v: string) => setConcerns(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])} />
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 6, lineHeight: 1.4 }}>倾向的升学路径？</div>
                <div style={{ fontSize: 13, color: T.textDim, marginBottom: 24 }}>不确定也没关系，可以随时调整</div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {TARGET_PATHS.map(p => (
                    <OptionPill key={p.value} value={p.value} label={p.label} emoji={p.emoji} desc={p.desc}
                      selected={targetPath === p.value} onSelect={setTargetPath} />
                  ))}
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

// ── 今日仪表盘 ──
function DashboardSection({ report, vision, childName }: any) {
  const thisMonth = report?.this_semester || []
  const gaps = report?.gaps || []
  const targetLabel = TARGET_PATHS.find(p => p.value === vision?.target_school_type)?.label || '升学目标'
  const gradeToYears: Record<string, number> = { 'K1': 9, 'K2': 8, 'K3': 7, 'G1': 8, 'G2': 7, 'G3': 6, 'G4': 5, 'G5': 4, 'G6': 3, 'G7': 3, 'G8': 2, 'G9': 1 }
  const storedChild = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('active_child') || '{}') : {}
  const years = gradeToYears[storedChild.grade] || 6

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: `linear-gradient(135deg, ${T.gold}18 0%, rgba(78,205,196,0.08) 100%)`, borderRadius: 20, padding: '20px', marginBottom: 16, border: `1px solid ${T.borderGold}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: `${T.gold}08` }} />
        <div style={{ fontSize: 11, color: T.goldDim, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 8 }}>妈妈的愿景</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: T.gold, marginBottom: 6, fontFamily: "'Noto Serif SC', serif", lineHeight: 1.3 }}>
          {PERSON_TYPES.find(p => p.value === vision?.person_type)?.label || vision?.vision_statement}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge text={targetLabel} color={T.teal} />
          <Badge text={`距申请约 ${years} 年`} color={T.goldDim} />
        </div>
      </motion.div>

      {thisMonth.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: 16 }}>
          <SectionTitle icon="⚡" title="本学期重点" />
          {thisMonth.map((item: any, i: number) => (
            <Card key={i} style={{ marginBottom: 8, borderColor: item.urgency === 'high' ? T.borderGold : T.border }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: item.urgency === 'high' ? T.gold : T.bgCardHover, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: item.urgency === 'high' ? '#0F1A14' : T.textDim, flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{item.action}</div>
                  <div style={{ fontSize: 11, color: T.textDim }}>{item.why}</div>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {gaps.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginBottom: 16 }}>
          <SectionTitle icon="⚠️" title="需要关注" />
          <Card style={{ borderColor: 'rgba(255,107,107,0.2)' }}>
            {gaps.map((gap: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < gaps.length - 1 ? 10 : 0, paddingBottom: i < gaps.length - 1 ? 10 : 0, borderBottom: i < gaps.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ color: T.coral, flexShrink: 0, marginTop: 1 }}>•</span>
                <span style={{ fontSize: 13, color: T.textDim, lineHeight: 1.6 }}>{gap}</span>
              </div>
            ))}
          </Card>
        </motion.div>
      )}

      {report?.narrative && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <SectionTitle icon="📖" title="申请故事主线" />
          <Card style={{ borderLeft: `3px solid ${T.gold}` }}>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.9, fontStyle: 'italic' }}>"{report.narrative}"</div>
          </Card>
        </motion.div>
      )}

      {!report && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
          <div style={{ fontSize: 14, color: T.textDim, marginBottom: 20, lineHeight: 1.7 }}>
            根正在根据{childName}的信息<br />撰写专属升学规划
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: T.goldDim }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>🌱</motion.div>
            正在撰写中，完成后自动显示
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ── 成长画像 ──
function ProfileSection({ report }: any) {
  const scores = report?.profile_scores || {}
  return (
    <div>
      {report?.profile_summary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ fontSize: 13, color: T.textDim, marginBottom: 20, lineHeight: 1.7, padding: '12px 14px', background: T.bgCard, borderRadius: 12, border: `1px solid ${T.border}` }}>
          {report.profile_summary}
        </motion.div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PROFILE_DIMS.map((dim, i) => {
          const score = scores[dim.key] || 0
          const color = score >= 70 ? T.green : score >= 40 ? T.gold : T.coral
          const gap = dim.target - score
          return (
            <motion.div key={dim.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{dim.icon}</span>
                  <span style={{ fontSize: 13, color: T.text }}>{dim.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {gap > 20 && <span style={{ fontSize: 10, color: T.coral }}>距目标 {gap}分</span>}
                  <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'Space Mono', monospace" }}>{score || '—'}</span>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: `${dim.target}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.2)', zIndex: 2 }} />
                <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }}
                  transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${color}80, ${color})` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 9, color: T.textFaint }}>0</span>
                <span style={{ fontSize: 9, color: T.textFaint }}>目标 {dim.target}</span>
                <span style={{ fontSize: 9, color: T.textFaint }}>100</span>
              </div>
            </motion.div>
          )
        })}
      </div>
      {!report && <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textDim, fontSize: 14 }}>生成规划后，成长画像自动计算</div>}
    </div>
  )
}

// ── 升学路径 ──
function RoadmapSection({ report, generating, onGenerate }: any) {
  const roadmap = report?.roadmap || []
  const tierColor = (t: number) => t === 1 ? T.gold : t === 2 ? T.teal : T.textDim

  return (
    <div>
      {roadmap.length > 0 ? (
        <div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 10, top: 16, bottom: 0, width: 1, background: `linear-gradient(to bottom, ${T.gold}40, transparent)` }} />
            {roadmap.map((period: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }} style={{ paddingLeft: 32, marginBottom: 24, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 4, width: 20, height: 20, borderRadius: '50%', background: i === 0 ? T.gold : T.bgCard, border: `2px solid ${i === 0 ? T.gold : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {i === 0 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0F1A14' }} />}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? T.gold : T.textDim, marginBottom: 10, letterSpacing: '0.05em' }}>{period.period}</div>
                {period.actions?.map((action: any, j: number) => (
                  <Card key={j} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: `${tierColor(action.tier)}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: tierColor(action.tier), flexShrink: 0, marginTop: 1, fontFamily: "'Space Mono', monospace" }}>
                        T{action.tier}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{action.action}</div>
                        <div style={{ fontSize: 11, color: T.textDim, marginBottom: 4, lineHeight: 1.5 }}>{action.reason}</div>
                        {action.resource && <div style={{ fontSize: 11, color: T.teal }}>📍 {action.resource}</div>}
                      </div>
                    </div>
                  </Card>
                ))}
              </motion.div>
            ))}
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 12, background: T.bgCard, border: `1px solid ${T.border}`, fontSize: 11, color: T.textDim, lineHeight: 1.7, marginTop: 8 }}>
            💡 T1=顶级权重（全国/国际级）· T2=重要 · T3=有益 · T4=锦上添花
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={onGenerate} disabled={generating}
            style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 14, border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {generating ? <Loader size={14} /> : <Sparkles size={14} />}
            {generating ? '正在撰写中…' : '重新撰写规划'}
          </motion.button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          {generating ? (
            <div>
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ fontSize: 48, marginBottom: 16 }}>🌱</motion.div>
              <div style={{ fontSize: 14, color: T.textDim, lineHeight: 1.7 }}>正在撰写专属升学路线图<br /><span style={{ fontSize: 11, color: T.textFaint }}>通常需要30-60秒</span></div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
              <div style={{ fontSize: 14, color: T.textDim, marginBottom: 24 }}>点击生成专属升学路线图</div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onGenerate}
                style={{ padding: '13px 28px', borderRadius: 20, background: T.gold, color: '#0F1A14', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto' }}>
                <Sparkles size={16} /> 开始撰写规划
              </motion.button>
            </div>
          )}
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
    { icon: '🎯', label: '课外活动', desc: '兴趣班 · 补习课 · 参与年限', color: '#A78BFA', path: childId ? `/children/${childId}/activities` : '/children' },
    { icon: '📝', label: '文书素材库', desc: '故事碎片 · 申请角度 · 文书准备', color: '#FB923C', path: '/growth/academic/essays' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {modules.map((m, i) => (
        <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }} whileTap={{ scale: 0.98 }}
          onClick={() => router.push(m.path)}
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

// ── 目标院校库 ──
function SchoolsSection({ vision }: any) {
  const [activeCategory, setActiveCategory] = useState('us_boarding')
  const categories = [
    { key: 'us_boarding', label: '美高', emoji: '🏫' },
    { key: 'uk_boarding', label: '英高', emoji: '🎩' },
    { key: 'us_university', label: '美本T50', emoji: '🎓' },
  ]
  const schools = SCHOOL_DB[activeCategory as keyof typeof SCHOOL_DB] || []

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <motion.button key={cat.key} whileTap={{ scale: 0.93 }} onClick={() => setActiveCategory(cat.key)}
            style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: activeCategory === cat.key ? T.gold : T.bgCard, color: activeCategory === cat.key ? '#0F1A14' : T.textDim, fontSize: 12, fontWeight: activeCategory === cat.key ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            {cat.emoji} {cat.label}
          </motion.button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {schools.map((school: any, i: number) => (
          <motion.div key={school.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{school.country}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{school.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {school.acceptance && <Badge text={`录取率 ${school.acceptance}`} color={T.coral} />}
                    {school.ssat && <Badge text={`SSAT ${school.ssat}`} color={T.teal} />}
                    {school.sat && <Badge text={`SAT ${school.sat}`} color={T.teal} />}
                    {school.fee && <Badge text={school.fee} color={T.textDim} />}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.5, flex: 1 }}>{school.note}</div>
                {school.deadline && (
                  <div style={{ fontSize: 10, color: T.goldDim, flexShrink: 0, marginLeft: 10, textAlign: 'right' }}>
                    截止<br />{school.deadline}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: T.bgCard, border: `1px solid ${T.border}`, fontSize: 11, color: T.textFaint, lineHeight: 1.7 }}>
        📡 院校数据来源：各校官方网站 2025-26学年数据，每学期更新
      </div>
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
  const [activeTab, setActiveTab] = useState('dashboard')
  const [activities, setActivities] = useState<any[]>([])

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!childId) return
    const channel = supabase.channel('pathway_watch')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'pathway_reports',
        filter: `child_id=eq.${childId}`,
      }, (payload) => {
        setReport(payload.new)
        setGenerating(false)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [childId])

  const loadData = async () => {
    // ✅ 安全：getUser() 服务端验证，middleware 已保护路由，这里静默返回
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const stored = localStorage.getItem('active_child_id')
    const storedChild = localStorage.getItem('active_child')
    if (stored) {
      setChildId(stored)
      if (storedChild) {
        const c = JSON.parse(storedChild)
        setChildName(c.name || '')
      }
    }

    if (stored) {
      const [visionRes, reportRes, activitiesRes] = await Promise.all([
        supabase.from('family_vision').select('*').eq('child_id', stored).maybeSingle(),
        supabase.from('pathway_reports').select('*').eq('child_id', stored).order('generated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('child_activities').select('*').eq('child_id', stored),
      ])
      if (visionRes.data) { setHasVision(true); setVision(visionRes.data) }
      if (reportRes.data) setReport(reportRes.data)
      if (activitiesRes.data) setActivities(activitiesRes.data)
    }
    setLoading(false)
  }

  const generateReport = async (visionData: any) => {
    if (!childId) return
    setGenerating(true)

    // ✅ 安全：不传 uid 给 API，服务端从 Authorization header 自己取
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token

    const [childRes, activitiesRes, achievementsRes, assessmentRes] = await Promise.all([
      supabase.from('children').select('*').eq('id', childId).single(),
      supabase.from('child_activities').select('*').eq('child_id', childId),
      supabase.from('child_achievements').select('*').eq('child_id', childId),
      supabase.from('assessments').select('report').eq('child_id', childId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    await fetch('/api/children/pathway', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ✅ 安全：token 放 header，服务端验证后自己取 uid
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        child: childRes.data,
        activities: activitiesRes.data || [],
        achievements: achievementsRes.data || [],
        assessment: assessmentRes.data?.report || null,
        vision: visionData,
        childId,
        // ✅ uid 不再从客户端传，服务端自己从 token 解析
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
      setVision(v)
      setHasVision(true)
      generateReport(v)
    }} />
  )

  const TABS = [
    { key: 'dashboard', label: '今日', emoji: '⚡' },
    { key: 'profile', label: '画像', emoji: '📊' },
    { key: 'roadmap', label: '路径', emoji: '🗺️' },
    { key: 'records', label: '档案', emoji: '📁' },
    { key: 'schools', label: '院校', emoji: '🏛️' },
  ]

  return (
    <main style={{ minHeight: '100dvh', background: T.bg, fontFamily: "'Noto Sans SC', sans-serif", paddingBottom: 80 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15,26,20,0.92)', backdropFilter: 'blur(24px)', borderBottom: `1px solid ${T.border}` }}>
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
          <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {activeTab === 'dashboard' && <DashboardSection report={report} vision={vision} childName={childName} activities={activities} />}
            {activeTab === 'profile' && <ProfileSection report={report} />}
            {activeTab === 'roadmap' && <RoadmapSection report={report} vision={vision} generating={generating} onGenerate={() => generateReport(vision)} />}
            {activeTab === 'records' && <RecordsSection childId={childId} router={router} />}
            {activeTab === 'schools' && <SchoolsSection vision={vision} />}
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
  return (
    <Suspense>
      <AcademicContent />
    </Suspense>
  )
}
