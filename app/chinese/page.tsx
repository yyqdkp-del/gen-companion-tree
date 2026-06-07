'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getUserLocation, updateUserLocationByGPS } from '@/lib/geofence'
import type { UserLocation } from '@/lib/geofence/types'
import { SOLID_CARD } from '@/app/_shared/_constants/chineseTheme'

const CARD: React.CSSProperties = {
  ...SOLID_CARD,
  padding: '24px 20px',
  marginBottom: 16,
}

// 学校 placeholder 按围栏城市定制
const SCHOOL_PLACEHOLDER: Record<string, string> = {
  'Chiang Mai':   '如 BCIS、Prem、Lanna、CMIC...',
  'Bangkok':      '如 NIST、Bangkok Patana、ISB...',
  'Singapore':    '如 SAS、UWCSEA、Tanglin、AIS...',
  'Kuala Lumpur': '如 ISKL、Garden International、Alice Smith...',
  'Hong Kong':    '如 ESF、HKIS、CIS、ISF...',
  'Vancouver':    '如 UHill、Crofton House、St. George\'s...',
  'Los Angeles':  '如 CAIS、Polytechnic、Walnut...',
  'Bali':         '如 Green School、BIIS、Canggu Community...',
}

const LANGUAGE_OPTIONS: Record<string, string[]> = {
  'SG': ['主要说中文', '中英混用', '主要说英文', '粤语为主', '闽南语为主'],
  'MY': ['主要说中文', '中英混用', '主要说英文', '粤语为主', '三语（中/英/马来）'],
  'HK': ['主要说粤语', '粤普混用', '主要说普通话', '中英混用'],
  'TH': ['主要说中文', '中英混用', '主要说英文', '三语都有（中/英/泰）'],
  'ID': ['主要说中文', '中英混用', '主要说英文', '三语都有（中/英/印尼）'],
  'PH': ['主要说中文', '中英混用', '主要说英文', '三语都有（中/英/菲）'],
}
const DEFAULT_LANGUAGE_OPTIONS = ['主要说中文', '中英混用', '主要说英文', '多语言混用']

function buildQuestions(loc: UserLocation | null) {
  const city = loc?.city || ''
  const cc   = loc?.country_code || ''

  return [
    { id: 0, label: 'Q0 · 认识一下', type: 'text', text: '孩子叫什么名字？', placeholder: '输入孩子的名字或昵称' },
    { id: 1, label: 'Q1 · 基本信息', type: 'options', text: '孩子现在几年级？', options: ['K1-K2','K3','G1','G2','G3','G4','G5','G6及以上'] },
    { id: 2, label: 'Q2 · 基本信息', type: 'text', text: '孩子在哪所学校就读？', placeholder: SCHOOL_PLACEHOLDER[city] || '输入学校名称' },
    { id: 3, label: 'Q3 · 家庭语言', type: 'options', text: '家里跟孩子平时怎么说话？', options: LANGUAGE_OPTIONS[cc] || DEFAULT_LANGUAGE_OPTIONS },
    { id: 4, label: 'Q4 · 阅读能力', type: 'options', text: '给孩子一本中文绘本，他能自己读下来吗？', options: ['能，完全没问题','能读，但有些字要问我','只能读几个字，大部分靠猜图','基本不会读'] },
    { id: 5, label: 'Q5 · 理解能力', type: 'options', text: '给孩子看一段中文文字（不带图），他能大概理解意思吗？', options: ['能理解80%以上','能理解一半左右','只能认出几个单字','完全看不懂'] },
    { id: 6, label: 'Q6 · 认字数量', type: 'options', text: '孩子大概认识多少个汉字？', options: ['50个以下','50－200个','200－500个','500个以上'] },
    { id: 7, label: 'Q7 · 拼音依赖', type: 'options', text: '孩子读中文时，拼音对他来说：', options: ['完全不需要，直接认字','有拼音会好很多','有拼音也还是很吃力','还不会拼音'] },
    { id: 8, label: 'Q7.5 · 字理意识', type: 'options', text: '你把「休」这个字写给孩子看，他会怎么说？', options: ['觉得像一幅画——一个人靠在树旁边休息','觉得就是两个符号拼在一起，没特别感觉','从来没想过这个问题'] },
    { id: 9, label: 'Q8 · 书写能力', type: 'options', text: '孩子能自己写出一句完整的中文句子吗？', options: ['能，而且写得挺好','能写，但错别字很多','只能写几个单字','基本不会写'] },
    { id: 10, label: 'Q9 · 阅读意愿', type: 'options', text: '拿出一本中文书让孩子读，他的反应一般是？', options: ['愿意读，读得挺顺','愿意读，但写作业时完全词穷、写不出来','能读，但觉得很累，慢慢开始抗拒','强烈抗拒，每次都是一场战争'] },
    { id: 11, label: 'Q10 · 中英对比', type: 'options', text: '孩子的中文和英文读写能力相比：', options: ['中文更强','差不多','英文明显更强','英文强太多了，中文完全跟不上'] },
  ]
}

type Report = {
  level: string
  level_desc: string
  standard_level: string
  standard_desc: string
  insight: string
  blockpoint: string
  action: string
  local_line: string
  feature_rec: string
  cta: string
  _is_fallback?: boolean
}

const LOAD_STEPS = [
  '读取孩子的学习信号',
  '定位当前级别与卡点',
  '结合当地生活场景匹配',
  '生成本周专属行动',
]

function renderContent(content: unknown): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (typeof content === 'object' && content !== null) {
    const obj = content as Record<string, unknown>
    if (obj.main || obj.game) {
      const parts: string[] = []
      if (obj.main) parts.push(String(obj.main))
      if (obj.game) parts.push('游戏练习：' + String(obj.game))
      if (obj.follow_up) parts.push('跟进：' + String(obj.follow_up))
      return parts.join('\n')
    }
    return JSON.stringify(content)
  }
  return String(content)
}

const HEADER_BAR: React.CSSProperties = {
  background: 'var(--clay)',
  padding: '14px 20px',
  display: 'flex',
  alignItems: 'center',
}

export default function ChinesePage() {
  const router = useRouter()
  const [current,  setCurrent]  = useState(0)
  const [answers,  setAnswers]  = useState<Record<string, string>>({})
  const [phase,    setPhase]    = useState<'quiz' | 'loading' | 'report'>('quiz')
  const [report,   setReport]   = useState<Report | null>(null)
  const [assessError, setAssessError] = useState<string | null>(null)
  const [loadStep, setLoadStep] = useState(0)
  const [textVal,  setTextVal]  = useState('')
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)

  useEffect(() => {
    const userId = localStorage.getItem('anon_id') || crypto.randomUUID()
    localStorage.setItem('anon_id', userId)
    getUserLocation(userId).then(setUserLocation)
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const fresh = await updateUserLocationByGPS(userId, pos.coords.latitude, pos.coords.longitude)
        setUserLocation(fresh)
      },
      () => {},
    )
  }, [])

  const QUESTIONS = buildQuestions(userLocation)
  const q     = QUESTIONS[current]
  const total = QUESTIONS.length
  const pct   = Math.round(((current + 1) / total) * 100)
  const currentAnswer = answers[`q${q.id}`] || ''

  const selectOption = async (val: string) => {
    const newAnswers = { ...answers, [`q${q.id}`]: val }
    setAnswers(newAnswers)
    setTimeout(async () => {
      if (current < total - 1) {
        setCurrent(c => c + 1)
        setTextVal('')
      } else {
        await submit(newAnswers)
      }
    }, 280)
  }

  const nextQ = async () => {
    const val = q.type === 'text' ? textVal : currentAnswer
    if (!val.trim()) return
    const newAnswers = { ...answers, [`q${q.id}`]: val }
    setAnswers(newAnswers)
    if (current < total - 1) {
      setCurrent(c => c + 1)
      setTextVal('')
    } else {
      await submit(newAnswers)
    }
  }

  const submit = async (finalAnswers: Record<string, string>) => {
    const childInfo = {
      name:  finalAnswers['q0'] || '',
      grade: finalAnswers['q1'] || '',
      school: finalAnswers['q2'] || '',
    }

    setPhase('loading')
    setLoadStep(0)
    setAssessError(null)
    const steps = [600, 1200, 1800, 2400]
    steps.forEach((ms, i) => setTimeout(() => setLoadStep(i + 1), ms))

    try {
      const res = await fetch('/api/chinese/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: finalAnswers,
          geofence: userLocation ? {
            city: userLocation.city,
            country: userLocation.country,
            country_code: userLocation.country_code,
            timezone: userLocation.timezone,
            geofence_id: userLocation.geofence_id,
          } : null,
        }),
      })

      const data = await res.json()

      if (res.status === 429 || data._rate_limited) {
        window.alert(typeof data.error === 'string' ? data.error : '今日免费次数已用完，请登录后继续')
        setPhase('quiz')
        return
      }

      if (data._failed || (data.error && !data.level)) {
        setAssessError(data.error || '评估生成失败，请重试')
        setPhase('quiz')
        return
      }

      if (!res.ok) {
        setAssessError('评估生成失败，请重试')
        setPhase('quiz')
        return
      }

      const reportData: Report = data

      try {
        await fetch('/api/chinese/save-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child_name: childInfo.name,
            child_age: childInfo.grade,
            level: reportData.level,
            standard_level: reportData.standard_level,
            answers: finalAnswers,
            report: JSON.stringify(reportData),
            geofence_id: userLocation?.geofence_id || null,
          }),
        })
      } catch { /* ignore */ }

      setTimeout(() => {
        setReport(reportData)
        setPhase('report')
      }, 2800)
    } catch {
      setAssessError('评估失败，请重试')
      setPhase('quiz')
    }
  }

  const KEYS = ['A','B','C','D','E','F','G','H']

  if (phase === 'quiz') return (
    <main className="canvas-texture" style={{ minHeight: '100dvh', fontFamily: 'var(--font-body)', paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
      {assessError && (
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '12px 16px 0' }}>
          <div style={{ background: 'var(--pri-red-bg)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--pri-red-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span>{assessError}</span>
            <button type="button" onClick={() => setAssessError(null)}
              style={{ background: 'none', border: 'none', color: 'var(--clay)', cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>
              重新评估 →
            </button>
          </div>
        </div>
      )}

      <div style={HEADER_BAR}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.08em' }}>根·中文</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginLeft: 'auto', fontFamily: 'var(--font-body)' }}>
          {userLocation ? `${userLocation.city} · 陪读家庭` : '海外陪读家庭专属'}
        </span>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg3)', marginBottom: 6, fontFamily: 'var(--font-latin)' }}>
            <span>已完成 {current} / {total} 题</span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: 4, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }}
              style={{ height: '100%', background: 'var(--clay)', borderRadius: 2 }} />
          </div>
          {current >= total - 3 && (
            <div style={{ fontSize: 11, color: 'var(--clay)', marginTop: 6, textAlign: 'right', fontFamily: 'var(--font-body)' }}>
              快完成了！我们正在为孩子定制方案 🌿
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={current}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            style={CARD}
          >
            <div style={{ fontSize: 11, color: 'var(--clay)', fontWeight: 500, marginBottom: 8, letterSpacing: '0.08em', fontFamily: 'var(--font-body)' }}>{q.label}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, color: 'var(--fg1)', lineHeight: 1.6, marginBottom: 20 }}>{q.text}</div>

            {q.type === 'options' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(q as { options: string[] }).options.map((opt: string, i: number) => (
                  <motion.div key={opt} whileTap={{ scale: 0.98 }}
                    onClick={() => selectOption(opt)}
                    style={{
                      padding: '13px 15px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${currentAnswer === opt ? 'var(--clay)' : 'var(--line)'}`,
                      background: currentAnswer === opt ? 'var(--clay-tint)' : '#fff',
                      display: 'flex', alignItems: 'center', gap: 12,
                      fontSize: 14, color: 'var(--fg1)', transition: 'all 0.2s', fontFamily: 'var(--font-body)',
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 6,
                      background: currentAnswer === opt ? 'var(--clay)' : 'var(--line)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-latin)',
                      color: currentAnswer === opt ? '#fff' : 'var(--fg2)', flexShrink: 0,
                    }}>
                      {KEYS[i]}
                    </div>
                    {opt}
                  </motion.div>
                ))}
              </div>
            )}

            {q.type === 'text' && (
              <div>
                <input
                  value={textVal}
                  onChange={e => setTextVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && nextQ()}
                  placeholder={(q as { placeholder: string }).placeholder}
                  style={{ width: '100%', padding: '13px 15px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--fg1)', outline: 'none' }}
                  autoFocus
                />
                <motion.button whileTap={{ scale: 0.97 }} onClick={nextQ}
                  disabled={!textVal.trim()}
                  className="gc-btn"
                  style={{ width: '100%', marginTop: 12, opacity: textVal.trim() ? 1 : 0.45, cursor: textVal.trim() ? 'pointer' : 'not-allowed' }}
                >
                  下一题 →
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {current > 0 && (
          <button type="button" onClick={() => { setCurrent(c => c - 1); setTextVal('') }}
            style={{ background: 'none', border: 'none', color: 'var(--fg3)', fontSize: 13, cursor: 'pointer', padding: '8px 0', fontFamily: 'var(--font-body)' }}>
            ← 上一题
          </button>
        )}
      </div>
    </main>
  )

  if (phase === 'loading') return (
    <main className="canvas-texture" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)' }}>
      <div style={{ ...SOLID_CARD, maxWidth: 400, width: '100%', margin: '0 16px', padding: '40px 28px', textAlign: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 48, height: 48, border: '4px solid var(--line)', borderTopColor: 'var(--clay)', borderRadius: '50%', margin: '0 auto 20px' }} />
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, color: 'var(--fg1)', marginBottom: 6 }}>
          正在为孩子生成专属报告...
        </div>
        <div style={{ fontSize: 13, color: 'var(--fg3)', marginBottom: 24 }}>
          根·顾问正在解读孩子的学习密码
        </div>
        <div style={{ textAlign: 'left' }}>
          {LOAD_STEPS.map((s, i) => (
            <div key={i} style={{
              padding: '10px 0', fontSize: 14, borderBottom: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', gap: 10,
              color: loadStep > i ? 'var(--fg1)' : loadStep === i ? 'var(--clay)' : 'var(--fg3)',
              fontWeight: loadStep > i ? 500 : 400, fontFamily: 'var(--font-body)',
            }}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{['📊','🧠','🌿','📋'][i]}</span>
              {s}
              {loadStep > i && <span style={{ marginLeft: 'auto', color: 'var(--accent-jade)' }}>✓</span>}
            </div>
          ))}
        </div>
      </div>
    </main>
  )

  const r = report!
  const childName = answers['q0'] || ''

  return (
    <main className="canvas-texture" style={{ minHeight: '100dvh', fontFamily: 'var(--font-body)', paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
      <div style={HEADER_BAR}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.08em' }}>根·中文</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginLeft: 'auto', fontFamily: 'var(--font-body)' }}>专属报告</span>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ ...CARD, padding: '28px 22px' }}>

          {r._is_fallback && (
            <div style={{ background: 'var(--pri-orange-bg)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--pri-orange-text)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>网络波动，当前显示参考报告</span>
              <button type="button" onClick={() => window.location.reload()}
                style={{ background: 'none', border: 'none', color: 'var(--clay)', cursor: 'pointer', fontWeight: 500, fontSize: 12, fontFamily: 'var(--font-body)' }}>
                点此重新生成 →
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 6, fontFamily: 'var(--font-body)' }}>
                {childName ? `${childName} 的中文成长报告` : '根·中文 专属报告'} · {new Date().toLocaleDateString('zh-CN')}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: 'var(--fg1)' }}>{r.level_desc}</div>
            </div>
            <div style={{ background: 'var(--clay)', color: '#fff', fontSize: 13, padding: '5px 14px', borderRadius: 20, fontFamily: 'var(--font-latin)' }}>{r.level}</div>
          </div>

          <div style={{ background: 'var(--pri-orange-bg)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, borderLeft: '3px solid var(--clay)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--pri-orange-text)', letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'var(--font-body)' }}>《国际中文教育标准》{r.standard_level}</div>
            <div style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.6 }}>{r.standard_desc}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--line)' }}>
            {['R1','R2','R3','R4','R5'].map((lv) => (
              <div key={lv} style={{ textAlign: 'center' }}>
                <div style={{ height: 4, background: lv === r.level ? 'var(--clay)' : lv < r.level ? 'var(--fg2)' : 'var(--line)', borderRadius: 2, marginBottom: 5 }} />
                <div style={{ fontSize: 10, fontWeight: lv === r.level ? 500 : 400, color: lv === r.level ? 'var(--clay)' : 'var(--fg3)', fontFamily: 'var(--font-latin)' }}>
                  {lv === r.level ? `${lv} ←` : lv}
                </div>
              </div>
            ))}
          </div>

          {[
            { title: '📍 现状洞察', content: r.insight },
            { title: '🔍 核心卡点', content: r.blockpoint },
            { title: '✅ 本周行动', content: r.action },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
              style={{ background: 'var(--canvas-mist)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--clay)', letterSpacing: '0.12em', marginBottom: 8, fontFamily: 'var(--font-body)' }}>{s.title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--fg1)', whiteSpace: 'pre-line', fontFamily: 'var(--font-body)' }}>{renderContent(s.content)}</div>
            </motion.div>
          ))}

          <div style={{ background: 'var(--clay-tint)', borderLeft: '3px solid var(--clay)', padding: '13px 15px', borderRadius: '0 10px 10px 0', fontSize: 13, fontStyle: 'italic', color: 'var(--fg1)', lineHeight: 1.7, marginBottom: 12, fontFamily: 'var(--font-serif)' }}>
            🌿 {r.local_line}
          </div>

          <div style={{ background: 'var(--canvas-mist)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--clay)', letterSpacing: '0.12em', marginBottom: 8, fontFamily: 'var(--font-body)' }}>🌟 功能推荐</div>
            <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--fg1)', fontFamily: 'var(--font-body)' }}>{r.feature_rec}</div>
          </div>

          <div style={{ background: 'var(--clay-tint)', borderRadius: 12, padding: 22, textAlign: 'center', border: '1px solid var(--line-clay)' }}>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--fg2)', marginBottom: 14, fontFamily: 'var(--font-body)' }}>{r.cta}</div>
            <motion.button whileTap={{ scale: 0.96 }} className="gc-btn" onClick={() => router.push('/auth')}
              style={{ width: '100%' }}>
              免费领取 {childName ? `${childName}的` : ''}专属学习路线图 →
            </motion.button>
          </div>

          <button type="button" className="gc-btn gc-btn--ghost" onClick={() => router.push('/learn')}
            style={{ width: '100%', marginTop: 10 }}>
            今晚试试：把「休」讲给孩子听 🌿
          </button>
        </motion.div>
      </div>
    </main>
  )
}
