'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Loader, ChevronRight, Sparkles } from 'lucide-react'

const supabase = createClient()

const THEME = {
  bg: 'linear-gradient(160deg, #1A3C5E 0%, #2D5016 50%, #1A3C5E 100%)',
  gold: '#F0C040',
  navy: '#1A3C5E',
  text: '#FDF8F3',
  muted: 'rgba(253,248,243,0.55)',
  card: 'rgba(253,248,243,0.08)',
  border: 'rgba(253,248,243,0.15)',
}

// ── 愿景选项 ──
const PERSON_TYPES = [
  { value: 'global_leader', emoji: '🌍', label: '有全球视野的领导者', desc: '在世界舞台上有影响力' },
  { value: 'innovator', emoji: '🔬', label: '改变世界的创新者', desc: 'STEM领域的探索者和建设者' },
  { value: 'artist', emoji: '🎨', label: '有影响力的艺术创作者', desc: '用创意表达改变人心' },
  { value: 'changemaker', emoji: '⚖️', label: '推动社会进步的变革者', desc: '让世界更公平的行动者' },
  { value: 'excellence', emoji: '🏆', label: '某领域极致卓越的人', desc: '在一件事上做到世界顶尖' },
  { value: 'custom', emoji: '✨', label: '我有自己的描述', desc: '用我自己的话来说' },
]

const PRIORITIES = [
  { value: 'top_university', emoji: '🎓', label: '进入顶尖学府', desc: 'T50 / 牛津剑桥' },
  { value: 'scholarship', emoji: '💰', label: '获得奖学金', desc: '体育 / 艺术 / 学术' },
  { value: 'happy_childhood', emoji: '🌈', label: '快乐健康的童年', desc: '平衡学习和玩耍' },
  { value: 'elite_skill', emoji: '⭐', label: '培养世界级特长', desc: '在某项能力上突破极限' },
  { value: 'bilingual', emoji: '🗣️', label: '成为双语精英', desc: '中英文都达到母语水平' },
  { value: 'international', emoji: '✈️', label: '拥有国际化视野', desc: '跨文化的全球公民' },
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
  { value: 'us_boarding', emoji: '🏫', label: '美国寄宿高中', desc: 'G9申请，1-2月截止' },
  { value: 'us_university', emoji: '🎓', label: '美国本科T50', desc: 'G12申请，SAT/ACT' },
  { value: 'uk_school', emoji: '🎩', label: '英国独立学校', desc: '11+/13+/16+入学' },
  { value: 'uk_university', emoji: '🏛️', label: '英国罗素大学群', desc: 'A-Level/IB，UCAS' },
  { value: 'flexible', emoji: '🌐', label: '保持灵活，多路并进', desc: '暂不锁定，广泛布局' },
  { value: 'other', emoji: '🗺️', label: '其他路径', desc: '加拿大 / 澳洲 / 新加坡' },
]

// ── 步骤组件 ──
function StepScreen({ step, total, children }: {
  step: number; total: number; children: React.ReactNode
}) {
  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      {/* 进度点 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: i === step ? 20 : 6, height: 6, borderRadius: 3,
            background: i <= step ? THEME.gold : THEME.border,
            transition: 'all 0.3s',
          }} />
        ))}
      </div>
      {children}
    </motion.div>
  )
}

function OptionCard({ selected, onClick, emoji, label, desc }: {
  selected: boolean; onClick: () => void
  emoji: string; label: string; desc?: string
}) {
  return (
    <motion.div whileTap={{ scale: 0.97 }} onClick={onClick}
      style={{
        padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
        background: selected ? 'rgba(240,192,64,0.15)' : THEME.card,
        border: `1.5px solid ${selected ? THEME.gold : THEME.border}`,
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
        transition: 'all 0.2s',
      }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: selected ? 600 : 400, color: selected ? THEME.gold : THEME.text }}>
          {label}
        </div>
        {desc && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{desc}</div>}
      </div>
      {selected && <Check size={16} color={THEME.gold} style={{ flexShrink: 0 }} />}
    </motion.div>
  )
}

// ── 主页面 ──
function AcademicContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [hasVision, setHasVision] = useState(false)
  const [childId, setChildId] = useState<string | null>(null)
  const [childName, setChildName] = useState('')
  const [childGrade, setChildGrade] = useState('')

  // 愿景设定状态
  const [step, setStep] = useState(0)
  const [personType, setPersonType] = useState('')
  const [customVision, setCustomVision] = useState('')
  const [priorities, setPriorities] = useState<string[]>([])
  const [concerns, setConcerns] = useState<string[]>([])
  const [targetPath, setTargetPath] = useState('')
  const [saving, setSaving] = useState(false)

  // 主页面状态
  const [vision, setVision] = useState<any>(null)
  const [report, setReport] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('roadmap')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) { router.push('/auth'); return }

    const stored = localStorage.getItem('active_child_id')
    const storedChild = localStorage.getItem('active_child')
    if (stored) {
      setChildId(stored)
      if (storedChild) {
        const c = JSON.parse(storedChild)
        setChildName(c.name || '')
        setChildGrade(c.grade || '')
      }
    }

    if (stored) {
      const { data: visionData } = await supabase
        .from('family_vision')
        .select('*')
        .eq('child_id', stored)
        .single()

      if (visionData) {
        setHasVision(true)
        setVision(visionData)
      }

      const { data: reportData } = await supabase
        .from('pathway_reports')
        .select('*')
        .eq('child_id', stored)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single()

      if (reportData) setReport(reportData)
    }

    setLoading(false)
  }

  const saveVision = async () => {
    if (!childId || !personType || !targetPath) return
    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id
    if (!uid) return

    const payload = {
      child_id: childId,
      user_id: uid,
      person_type: personType,
      vision_statement: personType === 'custom' ? customVision : PERSON_TYPES.find(p => p.value === personType)?.label || '',
      priorities,
      concerns,
      target_school_type: targetPath,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('family_vision')
      .select('id')
      .eq('child_id', childId)
      .single()

    if (existing) {
      await supabase.from('family_vision').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('family_vision').insert(payload)
    }

    setHasVision(true)
    setVision(payload)
    setSaving(false)
    generateReport(payload)
  }

  const generateReport = async (visionData: any) => {
    if (!childId) return
    setGenerating(true)

    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id

    const { data: child } = await supabase.from('children').select('*').eq('id', childId).single()
    const { data: activities } = await supabase.from('child_activities').select('*').eq('child_id', childId)
    const { data: achievements } = await supabase.from('child_achievements').select('*').eq('child_id', childId)
    const { data: assessment } = await supabase.from('assessments').select('report').eq('child_id', childId).order('created_at', { ascending: false }).limit(1).single()

    const prompt = `你是一位顶尖的国际升学规划专家，有20年帮助海外华人家庭孩子申请美高、英国独立学校和欧美T50大学的经验。

请根据以下信息，为这个孩子生成一份完整的升学规划报告。

【孩子基本信息】
姓名：${child?.name}
年级：${child?.grade || '未知'}
学校：${child?.school_name || child?.school || '国际学校'}
语言：${(child?.languages || []).join('、') || '未知'}
当前所在地：清迈，泰国

【妈妈的愿景】
期待孩子成为：${visionData.vision_statement}
目标路径：${visionData.target_school_type}
核心期待：${(visionData.priorities || []).join('、')}
主要担忧：${(visionData.concerns || []).join('、')}

【现有课外活动】
${activities?.length ? activities.map((a: any) => `- ${a.name}（${a.category}，每周${a.days?.join('/')}，已参与${Math.round((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))}个月）`).join('\n') : '暂无课外活动记录'}

【荣誉奖项】
${achievements?.length ? achievements.map((a: any) => `- ${a.title}（${a.level}级别，${a.date}）`).join('\n') : '暂无记录'}

【中文水平】
${assessment?.report ? JSON.stringify(assessment.report) : '暂无测评记录'}

请用JSON格式返回，直接{开头}结尾，不加任何其他文字：

{
  "profile_scores": {
    "academic": 数字0-100,
    "spike_depth": 数字0-100,
    "leadership": 数字0-100,
    "language": 数字0-100,
    "community": 数字0-100,
    "diversity": 数字0-100
  },
  "profile_summary": "一句话总结孩子现在的画像（20字以内）",
  "narrative": "基于现有信息，这个孩子的申请故事主线是什么（3-5句话，要感性有力）",
  "strengths": ["优势1", "优势2", "优势3"],
  "gaps": ["缺口1（加具体说明）", "缺口2", "缺口3"],
  "risks": ["风险1（加时间节点）", "风险2"],
  "roadmap": [
    {
      "period": "时间段（如：现在-G1）",
      "priority": "high/medium/low",
      "actions": [
        {
          "action": "具体行动",
          "reason": "为什么重要（一句话）",
          "resource": "清迈可用的具体资源（机构名+地点）",
          "tier": 数字1-4
        }
      ]
    }
  ],
  "this_semester": [
    {
      "action": "本学期最重要的事（具体可执行）",
      "why": "申请价值说明",
      "urgency": "high/medium"
    }
  ],
  "key_deadlines": [
    {
      "event": "重要节点",
      "date": "时间",
      "note": "备注"
    }
  ]
}`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()
      const raw = data.content?.[0]?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) {
        const reportData = JSON.parse(match[0])

        const { data: savedReport } = await supabase.from('pathway_reports').insert({
          child_id: childId,
          user_id: uid,
          profile_scores: reportData.profile_scores,
          narrative: reportData.narrative,
          gaps: reportData.gaps,
          roadmap: reportData.roadmap,
          this_semester: reportData.this_semester,
          generated_at: new Date().toISOString(),
        }).select().single()

        setReport({ ...reportData, ...savedReport })
      }
    } catch (e) {
      console.error('生成报告失败', e)
    }
    setGenerating(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: THEME.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
        style={{ fontSize: 13, color: THEME.gold, letterSpacing: '0.2em' }}>加载中…</motion.div>
    </div>
  )

  // ── 愿景设定引导流程 ──
  if (!hasVision) {
    const TOTAL_STEPS = 5
    const canNext = () => {
      if (step === 0) return true
      if (step === 1) return !!personType && (personType !== 'custom' || customVision.trim().length > 5)
      if (step === 2) return priorities.length > 0
      if (step === 3) return concerns.length > 0
      if (step === 4) return !!targetPath
      return false
    }

    return (
      <main style={{ minHeight: '100dvh', background: THEME.bg, fontFamily: "'Noto Sans SC', sans-serif", display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 40px' }}>

          <AnimatePresence mode="wait">

            {/* Step 0：欢迎 */}
            {step === 0 && (
              <StepScreen step={0} total={TOTAL_STEPS}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    style={{ fontSize: 64, marginBottom: 32 }}>
                    🌱
                  </motion.div>
                  <h1 style={{ fontSize: 24, fontWeight: 700, color: THEME.text, marginBottom: 16, lineHeight: 1.4 }}>
                    {childName}的<br />学业成长规划
                  </h1>
                  <p style={{ fontSize: 14, color: THEME.muted, lineHeight: 1.8, marginBottom: 32 }}>
                    在开始之前，根想先了解<br />
                    你对{childName}最深的期待是什么。<br />
                    这将成为所有规划建议的出发点。
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(240,192,64,0.7)', letterSpacing: '0.1em' }}>
                    大约需要 3 分钟
                  </p>
                </div>
              </StepScreen>
            )}

            {/* Step 1：孩子要成为什么样的人 */}
            {step === 1 && (
              <StepScreen step={1} total={TOTAL_STEPS}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: THEME.text, marginBottom: 8 }}>
                  你希望{childName}成为<br />什么样的人？
                </h2>
                <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 24, lineHeight: 1.7 }}>
                  不是去哪所学校，而是成为什么样的人。这是一切的起点。
                </p>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {PERSON_TYPES.map(p => (
                    <OptionCard key={p.value} selected={personType === p.value}
                      onClick={() => setPersonType(p.value)}
                      emoji={p.emoji} label={p.label} desc={p.desc} />
                  ))}
                  {personType === 'custom' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <textarea
                        value={customVision}
                        onChange={e => setCustomVision(e.target.value)}
                        placeholder={`用你自己的话描述你对${childName}的期待…`}
                        rows={3}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginTop: 4 }}
                      />
                    </motion.div>
                  )}
                </div>
              </StepScreen>
            )}

            {/* Step 2：核心期待 */}
            {step === 2 && (
              <StepScreen step={2} total={TOTAL_STEPS}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: THEME.text, marginBottom: 8 }}>
                  你对{childName}的<br />核心期待是什么？
                </h2>
                <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 24 }}>可以多选，按你的真实想法来</p>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {PRIORITIES.map(p => (
                    <OptionCard key={p.value}
                      selected={priorities.includes(p.value)}
                      onClick={() => setPriorities(prev =>
                        prev.includes(p.value) ? prev.filter(x => x !== p.value) : [...prev, p.value]
                      )}
                      emoji={p.emoji} label={p.label} desc={p.desc} />
                  ))}
                </div>
              </StepScreen>
            )}

            {/* Step 3：主要担忧 */}
            {step === 3 && (
              <StepScreen step={3} total={TOTAL_STEPS}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: THEME.text, marginBottom: 8 }}>
                  你最担心什么？
                </h2>
                <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 24 }}>诚实地说，根会帮你正视和应对</p>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {CONCERNS.map(c => (
                    <OptionCard key={c.value}
                      selected={concerns.includes(c.value)}
                      onClick={() => setConcerns(prev =>
                        prev.includes(c.value) ? prev.filter(x => x !== c.value) : [...prev, c.value]
                      )}
                      emoji={c.emoji} label={c.label} />
                  ))}
                </div>
              </StepScreen>
            )}

            {/* Step 4：目标路径 */}
            {step === 4 && (
              <StepScreen step={4} total={TOTAL_STEPS}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: THEME.text, marginBottom: 8 }}>
                  你现在倾向的<br />升学路径是什么？
                </h2>
                <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 24 }}>不确定也没关系，可以随时调整</p>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {TARGET_PATHS.map(p => (
                    <OptionCard key={p.value} selected={targetPath === p.value}
                      onClick={() => setTargetPath(p.value)}
                      emoji={p.emoji} label={p.label} desc={p.desc} />
                  ))}
                </div>
              </StepScreen>
            )}

          </AnimatePresence>

          {/* 底部按钮 */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${THEME.border}` }}>
            {step > 0 && (
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(step - 1)}
                style={{ flex: 1, padding: '14px', borderRadius: 14, border: `1px solid ${THEME.border}`, background: 'transparent', color: THEME.muted, fontSize: 14, cursor: 'pointer' }}>
                上一步
              </motion.button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => canNext() && setStep(step + 1)}
                style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none', background: canNext() ? THEME.gold : THEME.border, color: canNext() ? '#1A3C5E' : THEME.muted, fontSize: 14, fontWeight: 700, cursor: canNext() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {step === 0 ? '开始设定愿景' : '下一步'}
                <ArrowRight size={16} />
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={saveVision}
                disabled={!canNext() || saving}
                style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none', background: canNext() ? THEME.gold : THEME.border, color: '#1A3C5E', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saving ? <Loader size={16} /> : <Sparkles size={16} />}
                {saving ? '根正在分析…' : '生成我的规划'}
              </motion.button>
            )}
          </div>
        </div>
      </main>
    )
  }

  // ── 主页面（有愿景后显示） ──
  const TABS = [
    { key: 'roadmap', label: '升学路径' },
    { key: 'profile', label: '成长画像' },
    { key: 'actions', label: '本学期' },
    { key: 'records', label: '档案记录' },
  ]

  const personTypeLabel = PERSON_TYPES.find(p => p.value === vision?.person_type)?.label || vision?.vision_statement
  const targetPathLabel = TARGET_PATHS.find(p => p.value === vision?.target_school_type)?.label || ''

  return (
    <main style={{ minHeight: '100dvh', background: THEME.bg, fontFamily: "'Noto Sans SC', sans-serif", paddingBottom: 80 }}>

      {/* 顶部 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(26,60,94,0.9)', backdropFilter: 'blur(20px)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${THEME.border}` }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: THEME.text, padding: 4 }}>
          <ArrowLeft size={20} />
        </motion.button>
        <span style={{ fontSize: 15, fontWeight: 700, color: THEME.text }}>
          {childName}的学业成长
        </span>
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => setHasVision(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: THEME.muted, fontSize: 12 }}>
          调整愿景
        </motion.button>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 14px' }}>

        {/* 愿景摘要卡片 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'rgba(240,192,64,0.12)', borderRadius: 20, padding: '18px 18px', marginBottom: 20, border: `1px solid rgba(240,192,64,0.3)` }}>
          <div style={{ fontSize: 11, color: 'rgba(240,192,64,0.7)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>妈妈的愿景</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: THEME.gold, marginBottom: 6, lineHeight: 1.4 }}>
            {personTypeLabel}
          </div>
          <div style={{ fontSize: 12, color: THEME.muted }}>
            目标路径：{targetPathLabel}
          </div>
          {generating && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: THEME.gold }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                🌱
              </motion.div>
              根正在分析，生成专属规划…
            </div>
          )}
        </motion.div>

        {/* Tab 导航 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <motion.button key={tab.key} whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.key)}
              style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: activeTab === tab.key ? THEME.gold : THEME.card, color: activeTab === tab.key ? '#1A3C5E' : THEME.muted, fontSize: 12, fontWeight: activeTab === tab.key ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Tab 内容 */}
        <AnimatePresence mode="wait">

          {/* 升学路径 Tab */}
          {activeTab === 'roadmap' && (
            <motion.div key="roadmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!report ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  {generating ? (
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
                      style={{ fontSize: 14, color: THEME.muted }}>AI正在生成你的专属规划…</motion.div>
                  ) : (
                    <>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
                      <div style={{ fontSize: 14, color: THEME.muted, marginBottom: 20 }}>点击生成专属升学路线图</div>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => generateReport(vision)}
                        style={{ padding: '12px 28px', borderRadius: 20, background: THEME.gold, color: '#1A3C5E', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto' }}>
                        <Sparkles size={16} /> 生成规划
                      </motion.button>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  {/* 叙事 */}
                  {report.narrative && (
                    <div style={{ background: THEME.card, borderRadius: 16, padding: '16px', marginBottom: 16, border: `1px solid ${THEME.border}`, borderLeft: `3px solid ${THEME.gold}` }}>
                      <div style={{ fontSize: 11, color: THEME.gold, fontWeight: 700, marginBottom: 8, letterSpacing: '0.1em' }}>申请故事主线</div>
                      <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.8 }}>{report.narrative}</div>
                    </div>
                  )}

                  {/* 缺口和风险 */}
                  {(report.gaps?.length > 0 || report.risks?.length > 0) && (
                    <div style={{ background: THEME.card, borderRadius: 16, padding: '16px', marginBottom: 16, border: `1px solid ${THEME.border}` }}>
                      <div style={{ fontSize: 11, color: '#FB7185', fontWeight: 700, marginBottom: 10, letterSpacing: '0.1em' }}>需要关注</div>
                      {report.gaps?.map((gap: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, color: THEME.muted }}>
                          <span style={{ color: '#FACC15', flexShrink: 0 }}>⚠️</span> {gap}
                        </div>
                      ))}
                      {report.risks?.map((risk: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, color: THEME.muted }}>
                          <span style={{ color: '#FB7185', flexShrink: 0 }}>🔴</span> {risk}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 路线图 */}
                  {report.roadmap?.map((period: any, i: number) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.gold, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: THEME.gold, flexShrink: 0 }} />
                        {period.period}
                      </div>
                      {period.actions?.map((action: any, j: number) => (
                        <div key={j} style={{ background: THEME.card, borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: `1px solid ${THEME.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: action.tier === 1 ? '#F0C040' : action.tier === 2 ? '#60A8E0' : 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: action.tier <= 2 ? '#1A3C5E' : THEME.muted, flexShrink: 0, marginTop: 1 }}>
                              T{action.tier}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text, marginBottom: 4 }}>{action.action}</div>
                              <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>{action.reason}</div>
                              {action.resource && (
                                <div style={{ fontSize: 11, color: 'rgba(96,168,224,0.8)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  📍 {action.resource}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* 重新生成按钮 */}
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => generateReport(vision)}
                    disabled={generating}
                    style={{ width: '100%', padding: '12px', borderRadius: 14, border: `1px solid ${THEME.border}`, background: 'transparent', color: THEME.muted, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                    {generating ? <Loader size={14} /> : <Sparkles size={14} />}
                    {generating ? '重新分析中…' : '重新生成规划'}
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* 成长画像 Tab */}
          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {report?.profile_scores ? (
                <div>
                  <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 4 }}>
                    {report.profile_summary}
                  </div>
                  {Object.entries({
                    academic: '学术能力', spike_depth: '特长深度',
                    leadership: '领导力', language: '语言能力',
                    community: '社区贡献', diversity: '多元性',
                  }).map(([key, label]) => {
                    const score = report.profile_scores[key] || 0
                    return (
                      <div key={key} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, color: THEME.text }}>{label}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: score >= 70 ? '#4ADE80' : score >= 40 ? THEME.gold : '#FB7185' }}>{score}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${score}%` }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            style={{ height: '100%', borderRadius: 3, background: score >= 70 ? '#4ADE80' : score >= 40 ? THEME.gold : '#FB7185' }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: THEME.muted, fontSize: 14 }}>
                  先生成升学规划，画像会自动出现
                </div>
              )}
            </motion.div>
          )}

          {/* 本学期 Tab */}
          {activeTab === 'actions' && (
            <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {report?.this_semester?.length > 0 ? (
                <div>
                  <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 16 }}>本学期最重要的三件事</div>
                  {report.this_semester.map((item: any, i: number) => (
                    <div key={i} style={{ background: THEME.card, borderRadius: 16, padding: '16px', marginBottom: 12, border: `1px solid ${item.urgency === 'high' ? 'rgba(240,192,64,0.4)' : THEME.border}` }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: item.urgency === 'high' ? THEME.gold : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: item.urgency === 'high' ? '#1A3C5E' : THEME.muted, flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text, marginBottom: 6 }}>{item.action}</div>
                          <div style={{ fontSize: 12, color: THEME.muted }}>{item.why}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: THEME.muted, fontSize: 14 }}>
                  先生成升学规划，本学期行动会自动出现
                </div>
              )}
            </motion.div>
          )}

          {/* 档案记录 Tab */}
          {activeTab === 'records' && (
            <motion.div key="records" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: '🏆', label: '荣誉奖项', desc: '比赛 / 考级 / 竞赛', path: `/growth/academic/achievements` },
                  { icon: '📊', label: '学术记录', desc: '成绩 / 考试 / 语言', path: `/growth/academic/records` },
                  { icon: '🎯', label: '课外活动', desc: '兴趣班 / 补习课管理', path: childId ? `/children/${childId}/activities` : '/children' },
                  { icon: '📝', label: '素材库', desc: '文书碎片 / 故事积累', path: `/growth/academic/essays` },
                ].map(item => (
                  <motion.div key={item.label} whileTap={{ scale: 0.97 }}
                    onClick={() => router.push(item.path)}
                    style={{ background: THEME.card, borderRadius: 16, padding: '16px', border: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                    <span style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>{item.desc}</div>
                    </div>
                    <ChevronRight size={16} color={THEME.muted} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
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
