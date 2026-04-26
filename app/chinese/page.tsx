'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getUserLocation, updateUserLocationByGPS } from '@/lib/geofence'
import type { UserLocation } from '@/lib/geofence/types'

const THEME = {
  navy:   '#1A3C5E',
  orange: '#E8892A',
  bg:     '#F5F9FC',
  white:  '#FFFFFF',
  text:   '#1A2B3C',
  muted:  '#6B8BAA',
  border: '#D0DFF0',
  forest: '#3A7A2A',
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

// 家庭语言选项按国家代码定制
const LANGUAGE_OPTIONS: Record<string, string[]> = {
  'SG': ['主要说中文', '中英混用', '主要说英文', '粤语为主', '闽南语为主'],
  'MY': ['主要说中文', '中英混用', '主要说英文', '粤语为主', '三语（中/英/马来）'],
  'HK': ['主要说粤语', '粤普混用', '主要说普通话', '中英混用'],
  'TH': ['主要说中文', '中英混用', '主要说英文', '三语都有（中/英/泰）'],
  'ID': ['主要说中文', '中英混用', '主要说英文', '三语都有（中/英/印尼）'],
  'PH': ['主要说中文', '中英混用', '主要说英文', '三语都有（中/英/菲）'],
}
const DEFAULT_LANGUAGE_OPTIONS = ['主要说中文', '中英混用', '主要说英文', '多语言混用']

// 问卷动态构建
function buildQuestions(loc: UserLocation | null) {
  const city = loc?.city || 'Chiang Mai'
  const cc   = loc?.country_code || 'TH'

  return [
    {
      id: 0, label: 'Q0 · 认识一下', type: 'text',
      text: '孩子叫什么名字？',
      placeholder: '输入孩子的名字或昵称',
    },
    {
      id: 1, label: 'Q1 · 基本信息', type: 'options',
      text: '孩子现在几年级？',
      options: ['K1-K2','K3','G1','G2','G3','G4','G5','G6及以上'],
    },
    {
      id: 2, label: 'Q2 · 基本信息', type: 'text',
      text: '孩子在哪所学校就读？',
      placeholder: SCHOOL_PLACEHOLDER[city] || '输入学校名称',
    },
    {
      id: 3, label: 'Q3 · 家庭语言', type: 'options',
      text: '家里跟孩子平时怎么说话？',
      options: LANGUAGE_OPTIONS[cc] || DEFAULT_LANGUAGE_OPTIONS,
    },
    {
      id: 4, label: 'Q4 · 阅读能力', type: 'options',
      text: '给孩子一本中文绘本，他能自己读下来吗？',
      options: ['能，完全没问题','能读，但有些字要问我','只能读几个字，大部分靠猜图','基本不会读'],
    },
    {
      id: 5, label: 'Q5 · 理解能力', type: 'options',
      text: '给孩子看一段中文文字（不带图），他能大概理解意思吗？',
      options: ['能理解80%以上','能理解一半左右','只能认出几个单字','完全看不懂'],
    },
    {
      id: 6, label: 'Q6 · 认字数量', type: 'options',
      text: '孩子大概认识多少个汉字？',
      options: ['50个以下','50－200个','200－500个','500个以上'],
    },
    {
      id: 7, label: 'Q7 · 拼音依赖', type: 'options',
      text: '孩子读中文时，拼音对他来说：',
      options: ['完全不需要，直接认字','有拼音会好很多','有拼音也还是很吃力','还不会拼音'],
    },
    {
      id: 8, label: 'Q7.5 · 字理意识', type: 'options',
      text: '你把「休」这个字写给孩子看，他会怎么说？',
      options: ['觉得像一幅画——一个人靠在树旁边休息','觉得就是两个符号拼在一起，没特别感觉','从来没想过这个问题'],
    },
    {
      id: 9, label: 'Q8 · 书写能力', type: 'options',
      text: '孩子能自己写出一句完整的中文句子吗？',
      options: ['能，而且写得挺好','能写，但错别字很多','只能写几个单字','基本不会写'],
    },
    {
      id: 10, label: 'Q9 · 阅读意愿', type: 'options',
      text: '拿出一本中文书让孩子读，他的反应一般是？',
      options: ['愿意读，读得挺顺','愿意读，但写作业时完全词穷、写不出来','能读，但觉得很累，慢慢开始抗拒','强烈抗拒，每次都是一场战争'],
    },
    {
      id: 11, label: 'Q10 · 中英对比', type: 'options',
      text: '孩子的中文和英文读写能力相比：',
      options: ['中文更强','差不多','英文明显更强','英文强太多了，中文完全跟不上'],
    },
  ]
}

const FALLBACK_REPORT = {
  level: 'R3', level_desc: '句子理解期',
  standard_level: '初等三级',
  standard_desc: '能读简单句，理解基本语义，开始出现抗拒',
  insight: '孩子正处于中文学习的关键突破期，已经有了基础，只差一把钥匙。',
  blockpoint: '汉字对孩子来说还是符号，还没变成有意义的画面和故事。',
  action: '今晚用「休」字和孩子玩一个游戏：让他猜这个字在说什么故事。',
  local_line: '清迈的孩子每天看见榕树，「休」就是人靠着树——字就是画。',
  feature_rec: '从汉字拆解器开始，每天一个字，让汉字从符号变成故事。',
  cta: '领取你的专属学习路线图，开启第一个汉字故事 🌿',
  _is_fallback: true,
}
type Report = typeof FALLBACK_REPORT

const LOAD_STEPS = [
  '读取孩子的学习信号',
  '定位当前级别与卡点',
  '结合当地生活场景匹配',
  '生成本周专属行动',
]

export default function ChinesePage() {
  const router = useRouter()
  const [current,  setCurrent]  = useState(0)
  const [answers,  setAnswers]  = useState<Record<string, string>>({})
  const [phase,    setPhase]    = useState<'quiz' | 'loading' | 'report'>('quiz')
  const [report,   setReport]   = useState<Report | null>(null)
  const [loadStep, setLoadStep] = useState(0)
  const [textVal,  setTextVal]  = useState('')
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)

  // ── 地理围栏初始化 ──
  useEffect(() => {
    const userId = localStorage.getItem('anon_id') || crypto.randomUUID()
    localStorage.setItem('anon_id', userId)

    // 先读 24h 缓存
    getUserLocation(userId).then(setUserLocation)

    // 再尝试 GPS 精确更新（用户拒绝则静默降级）
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const fresh = await updateUserLocationByGPS(
          userId,
          pos.coords.latitude,
          pos.coords.longitude
        )
        setUserLocation(fresh)
      },
      () => {}
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
    // 孩子基本信息不落 localStorage，只在内存使用
    const childInfo = {
      name:  finalAnswers['q0'] || '',
      grade: finalAnswers['q1'] || '',
      school: finalAnswers['q2'] || '',
    }

    setPhase('loading')
    setLoadStep(0)
    const steps = [600, 1200, 1800, 2400]
    steps.forEach((ms, i) => setTimeout(() => setLoadStep(i + 1), ms))

    try {
      const res = await fetch('/api/chinese/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: finalAnswers,
          // 围栏数据从 userLocation 取，服务端直接用
          geofence: userLocation ? {
            city:          userLocation.city,
            country:       userLocation.country,
            country_code:  userLocation.country_code,
            timezone:      userLocation.timezone,
            geofence_id:   userLocation.geofence_id,
          } : null,
        }),
      })

      const data = await res.json()
      const reportData: Report = data.level ? data : FALLBACK_REPORT

      // 存档（不含敏感信息落地）
      try {
        await fetch('/api/chinese/save-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child_name:     childInfo.name,
            child_age:      childInfo.grade,
            level:          reportData.level,
            standard_level: reportData.standard_level,
            answers:        finalAnswers,
            report:         JSON.stringify(reportData),
            geofence_id:    userLocation?.geofence_id || null,
          }),
        })
      } catch {}

      setTimeout(() => {
        setReport(reportData)
        setPhase('report')
      }, 2800)

    } catch {
      setTimeout(() => {
        setReport(FALLBACK_REPORT)
        setPhase('report')
      }, 2800)
    }
  }

  const KEYS = ['A','B','C','D','E','F','G','H']

  // ── 问卷页 ──
  if (phase === 'quiz') return (
    <main style={{ minHeight:'100dvh', background: THEME.bg, fontFamily:"'Noto Sans SC', sans-serif", paddingBottom:'60px' }}>

      <div style={{ background: THEME.navy, padding:'14px 20px', display:'flex', alignItems:'center' }}>
        <span style={{ fontFamily:"'Noto Serif SC', serif", fontSize:'18px', fontWeight:700, color:'#fff', letterSpacing:'2px' }}>根·中文</span>
        <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)', marginLeft:'auto' }}>
          {userLocation ? `${userLocation.city} · 陪读家庭` : '海外陪读家庭专属'}
        </span>
      </div>

      <div style={{ maxWidth:'560px', margin:'0 auto', padding:'24px 16px' }}>

        {/* 进度条 */}
        <div style={{ marginBottom:'24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color: THEME.muted, marginBottom:'6px' }}>
            <span>已完成 {current} / {total} 题</span>
            <span>{pct}%</span>
          </div>
          <div style={{ height:'4px', background: THEME.border, borderRadius:'2px', overflow:'hidden' }}>
            <motion.div animate={{ width: `${pct}%` }} transition={{ duration:0.4 }}
              style={{ height:'100%', background: THEME.orange, borderRadius:'2px' }} />
          </div>
          {/* 快完成时的鼓励文案 */}
          {current >= total - 3 && (
            <div style={{ fontSize:'11px', color: THEME.orange, marginTop:'6px', textAlign:'right' }}>
              快完成了！我们正在为孩子定制方案 🌿
            </div>
          )}
        </div>

        {/* 问题卡片 */}
        <AnimatePresence mode="wait">
          <motion.div key={current}
            initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
            transition={{ duration:0.3 }}
            style={{ background: THEME.white, borderRadius:'16px', padding:'24px 20px', boxShadow:'0 4px 24px rgba(26,60,94,0.10)', marginBottom:'16px' }}
          >
            <div style={{ fontSize:'11px', color: THEME.orange, fontWeight:500, marginBottom:'8px', letterSpacing:'1px' }}>{q.label}</div>
            <div style={{ fontFamily:"'Noto Serif SC', serif", fontSize:'18px', fontWeight:700, color: THEME.navy, lineHeight:1.6, marginBottom:'20px' }}>{q.text}</div>

            {q.type === 'options' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {(q as any).options.map((opt: string, i: number) => (
                  <motion.div key={opt} whileTap={{ scale:0.98 }}
                    onClick={() => selectOption(opt)}
                    style={{
                      padding:'13px 15px', borderRadius:'10px', cursor:'pointer',
                      border: `1.5px solid ${currentAnswer === opt ? THEME.navy : THEME.border}`,
                      background: currentAnswer === opt ? 'rgba(26,60,94,0.06)' : THEME.white,
                      display:'flex', alignItems:'center', gap:'12px',
                      fontSize:'14px', color: THEME.text, transition:'all 0.2s',
                    }}
                  >
                    <div style={{ width:'26px', height:'26px', borderRadius:'6px', background: currentAnswer===opt ? THEME.navy : THEME.border, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color: currentAnswer===opt ? '#fff' : THEME.navy, flexShrink:0 }}>
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
                  placeholder={(q as any).placeholder}
                  style={{ width:'100%', padding:'13px 15px', border:`1.5px solid ${THEME.border}`, borderRadius:'10px', fontSize:'14px', fontFamily:"'Noto Sans SC', sans-serif", color: THEME.text, outline:'none' }}
                  autoFocus
                />
                <motion.button whileTap={{ scale:0.97 }} onClick={nextQ}
                  disabled={!textVal.trim()}
                  style={{ width:'100%', marginTop:'12px', padding:'13px', background: textVal.trim() ? THEME.navy : THEME.border, color:'#fff', border:'none', borderRadius:'10px', fontSize:'15px', fontWeight:700, cursor: textVal.trim() ? 'pointer' : 'not-allowed', fontFamily:"'Noto Sans SC', sans-serif" }}
                >
                  下一题 →
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {current > 0 && (
          <button onClick={() => { setCurrent(c => c - 1); setTextVal('') }}
            style={{ background:'none', border:'none', color: THEME.muted, fontSize:'13px', cursor:'pointer', padding:'8px 0' }}>
            ← 上一题
          </button>
        )}
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Noto+Sans+SC:wght@300;400;500;700&display=swap');`}</style>
    </main>
  )

  // ── 加载页 ──
  if (phase === 'loading') return (
    <main style={{ minHeight:'100dvh', background: THEME.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Noto Sans SC', sans-serif" }}>
      <div style={{ maxWidth:'400px', width:'100%', margin:'0 16px', background: THEME.white, borderRadius:'16px', padding:'40px 28px', boxShadow:'0 4px 24px rgba(26,60,94,0.10)', textAlign:'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}
          style={{ width:'48px', height:'48px', border:`4px solid ${THEME.border}`, borderTopColor: THEME.navy, borderRadius:'50%', margin:'0 auto 20px' }} />
        <div style={{ fontFamily:"'Noto Serif SC', serif", fontSize:'20px', fontWeight:700, color: THEME.navy, marginBottom:'6px' }}>
          正在为孩子生成专属报告...
        </div>
        <div style={{ fontSize:'13px', color: THEME.muted, marginBottom:'24px' }}>
          根·顾问正在解读孩子的学习密码
        </div>
        <div style={{ textAlign:'left' }}>
          {LOAD_STEPS.map((s, i) => (
            <div key={i} style={{ padding:'10px 0', fontSize:'14px', borderBottom:`1px solid ${THEME.border}`, display:'flex', alignItems:'center', gap:'10px', color: loadStep > i ? THEME.navy : loadStep === i ? THEME.orange : THEME.muted, fontWeight: loadStep > i ? 500 : 400 }}>
              <span style={{ fontSize:'18px', width:'24px', textAlign:'center' }}>
                {['📊','🧠','🌿','📋'][i]}
              </span>
              {s}
              {loadStep > i && <span style={{ marginLeft:'auto', color: THEME.forest }}>✓</span>}
            </div>
          ))}
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Noto+Sans+SC:wght@300;400;500;700&display=swap');`}</style>
    </main>
  )

  // ── 报告页 ──
  const r = report!
  const childName = answers['q0'] || ''

  return (
    <main style={{ minHeight:'100dvh', background: THEME.bg, fontFamily:"'Noto Sans SC', sans-serif", paddingBottom:'60px' }}>
      <div style={{ background: THEME.navy, padding:'14px 20px', display:'flex', alignItems:'center' }}>
        <span style={{ fontFamily:"'Noto Serif SC', serif", fontSize:'18px', fontWeight:700, color:'#fff', letterSpacing:'2px' }}>根·中文</span>
        <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)', marginLeft:'auto' }}>专属报告</span>
      </div>

      <div style={{ maxWidth:'560px', margin:'0 auto', padding:'24px 16px' }}>
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          style={{ background: THEME.white, borderRadius:'16px', padding:'28px 22px', boxShadow:'0 4px 24px rgba(26,60,94,0.10)', marginBottom:'14px' }}>

          {/* Fallback 提示 banner */}
          {r._is_fallback && (
            <div style={{ background:'#FFF3E0', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#854F0B', marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span>网络波动，当前显示参考报告</span>
              <button onClick={() => window.location.reload()}
                style={{ background:'none', border:'none', color: THEME.orange, cursor:'pointer', fontWeight:500, fontSize:'12px' }}>
                点此重新生成 →
              </button>
            </div>
          )}

          {/* 报告头部 */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'20px' }}>
            <div>
              <div style={{ fontSize:'12px', color: THEME.muted, marginBottom:'6px' }}>
                {childName ? `${childName} 的中文成长报告` : '根·中文 专属报告'} · {new Date().toLocaleDateString('zh-CN')}
              </div>
              <div style={{ fontFamily:"'Noto Serif SC', serif", fontSize:'22px', fontWeight:500, color: THEME.navy }}>{r.level_desc}</div>
            </div>
            <div style={{ background: THEME.navy, color:'#fff', fontSize:'13px', padding:'5px 14px', borderRadius:'20px' }}>{r.level}</div>
          </div>

          {/* 国际标准对照 */}
          <div style={{ background:'#FFF3E0', borderRadius:'8px', padding:'12px 16px', marginBottom:'16px', borderLeft:'3px solid #E8892A' }}>
            <div style={{ fontSize:'11px', fontWeight:500, color:'#BA7517', letterSpacing:'0.1em', marginBottom:'4px' }}>《国际中文教育标准》{r.standard_level}</div>
            <div style={{ fontSize:'13px', color:'#633806', lineHeight:1.6 }}>{r.standard_desc}</div>
          </div>

          {/* 级别进度条 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'6px', marginBottom:'20px', paddingBottom:'20px', borderBottom:`1px solid ${THEME.border}` }}>
            {['R1','R2','R3','R4','R5'].map((lv) => (
              <div key={lv} style={{ textAlign:'center' }}>
                <div style={{ height:'4px', background: lv === r.level ? THEME.orange : lv < r.level ? THEME.navy : THEME.border, borderRadius:'2px', marginBottom:'5px' }} />
                <div style={{ fontSize:'10px', fontWeight: lv === r.level ? 500 : 400, color: lv === r.level ? THEME.orange : THEME.muted }}>
                  {lv === r.level ? `${lv} ←` : lv}
                </div>
              </div>
            ))}
          </div>

          {/* 核心内容块 */}
          {[
            { title:'📍 现状洞察', content: r.insight },
            { title:'🔍 核心卡点', content: r.blockpoint },
            { title:'✅ 本周行动', content: r.action },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.15 }}
              style={{ background: THEME.bg, borderRadius:'12px', padding:'16px', marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color: THEME.orange, letterSpacing:'2px', marginBottom:'8px', textTransform:'uppercase' }}>{s.title}</div>
              <div style={{ fontSize:'14px', lineHeight:1.8, color: THEME.text }}>{s.content}</div>
            </motion.div>
          ))}

          {/* 本地金句 */}
          <div style={{ background:'rgba(26,60,94,0.06)', borderLeft:`3px solid ${THEME.navy}`, padding:'13px 15px', borderRadius:'0 10px 10px 0', fontSize:'13px', fontStyle:'italic', color: THEME.navy, lineHeight:1.7, marginBottom:'12px' }}>
            🌿 {r.local_line}
          </div>

          {/* 功能推荐 */}
          <div style={{ background: THEME.bg, borderRadius:'12px', padding:'16px', marginBottom:'20px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color: THEME.orange, letterSpacing:'2px', marginBottom:'8px', textTransform:'uppercase' }}>🌟 功能推荐</div>
            <div style={{ fontSize:'14px', lineHeight:1.8, color: THEME.text }}>{r.feature_rec}</div>
          </div>

          {/* CTA */}
          <div style={{ background: THEME.navy, borderRadius:'12px', padding:'22px', textAlign:'center' }}>
            <div style={{ fontSize:'14px', lineHeight:1.7, color:'rgba(255,255,255,0.88)', marginBottom:'14px' }}>{r.cta}</div>
            <motion.button whileTap={{ scale:0.96 }}
              onClick={() => router.push('/auth')}
              style={{ background: THEME.orange, color:'#fff', border:'none', borderRadius:'8px', padding:'12px 28px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:"'Noto Sans SC', sans-serif", width:'100%' }}>
              免费领取 {childName ? `${childName}的` : ''}专属学习路线图 →
            </motion.button>
          </div>

          {/* 副 CTA */}
          <button onClick={() => router.push('/chinese/decode')}
            style={{ width:'100%', marginTop:'10px', padding:'12px', background: THEME.bg, color: THEME.muted, border:`1.5px solid ${THEME.border}`, borderRadius:'8px', fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:"'Noto Sans SC', sans-serif" }}>
            今晚试试：把「休」讲给孩子听 🌿
          </button>

        </motion.div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Noto+Sans+SC:wght@300;400;500;700&display=swap');`}</style>
    </main>
  )
}
