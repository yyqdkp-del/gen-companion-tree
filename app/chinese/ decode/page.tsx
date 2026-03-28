'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const THEME = {
  bg: '#F5F0E8',
  white: '#FFFFFF',
  red: '#C03A2B',
  gold: '#C8A060',
  text: '#1A1208',
  textMid: '#4A3728',
  textDim: '#907060',
  paper: '#FDFBF7',
}

const QUICK_CHARS = ['明','休','森','闻','家','笑','飞','鱼','山','水']

const LEVELS: Record<string, { color: string; bg: string; label: string }> = {
  R1: { color:'#922B21', bg:'#FFF0EE', label:'入门' },
  R2: { color:'#BA4A00', bg:'#FFF6EE', label:'基础' },
  R3: { color:'#1E8449', bg:'#EDFAF1', label:'进阶' },
  R4: { color:'#2874A2', bg:'#EBF5FB', label:'提升' },
  R5: { color:'#6C3483', bg:'#F4ECF7', label:'高阶' },
}

type HanziData = {
  pinyin: string
  meaning: string
  level: string
  parts: { char: string; name: string; image: string }[]
  story: string
  scene: string
  mom_questions: string[]
  extension: string[]
  chengyu: string
  cy_story: string
}

export default function DecodePage() {
  const router = useRouter()
  const [char, setChar] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<HanziData | null>(null)
  const [error, setError] = useState('')
  const [momOpen, setMomOpen] = useState(false)
  const [showMerged, setShowMerged] = useState(false)

  const generate = async (c?: string) => {
    const target = (c || char).trim()
    if (!target) return
    setChar(target)
    setLoading(true)
    setData(null)
    setError('')
    setShowMerged(false)
    setMomOpen(false)

    try {
      const res = await fetch('/api/chinese/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'hanzi', char: target }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
      // 触发合字动画
      setTimeout(() => setShowMerged(true), 900)
    } catch (e: any) {
      setError(e.message || '生成失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const lv = data?.level || 'R1'
  const lvCfg = LEVELS[lv] || LEVELS.R1
  const exts = Array.isArray(data?.extension) ? data.extension : data?.extension ? [data.extension] : []

  return (
    <main style={{ minHeight:'100dvh', background: THEME.bg, fontFamily:"'Noto Serif SC', Georgia, serif", paddingBottom:'80px',
      backgroundImage:'radial-gradient(circle at 15% 15%, rgba(200,160,96,0.1) 0%, transparent 55%), radial-gradient(circle at 85% 85%, rgba(192,57,43,0.07) 0%, transparent 55%)',
    }}>

      {/* 顶부 */}
      <div style={{ background: THEME.white, borderBottom:'1px solid rgba(200,160,96,0.2)', padding:'14px 20px', display:'flex', alignItems:'center', position:'sticky', top:0, zIndex:50 }}>
        <button onClick={() => router.back()} style={{ background:'none', border:'none', color: THEME.textDim, fontSize:'13px', cursor:'pointer', marginRight:'12px', fontFamily:"'Noto Serif SC', serif" }}>←</button>
        <div>
          <div style={{ fontSize:'10px', letterSpacing:'4px', color: THEME.red, textTransform:'uppercase', marginBottom:'2px' }}>根·中文</div>
          <div style={{ fontSize:'16px', fontWeight:700, color: THEME.text }}>汉字拆解器</div>
        </div>
        <span style={{ marginLeft:'auto', fontSize:'11px', color: THEME.textDim }}>自然拼读 × 文化意象</span>
      </div>

      <div style={{ maxWidth:'560px', margin:'0 auto', padding:'20px 16px' }}>

        {/* 输入区 */}
        <div style={{ background: THEME.white, borderRadius:'20px', padding:'18px 20px', boxShadow:'0 4px 24px rgba(26,18,8,0.07)', border:'1px solid rgba(200,160,96,0.18)', marginBottom:'14px' }}>
          <div style={{ display:'flex', gap:'10px', marginBottom:'14px' }}>
            <input
              value={char}
              onChange={e => setChar(e.target.value.slice(-1))}
              onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder="字"
              maxLength={1}
              style={{ width:'68px', textAlign:'center', fontSize:'48px', border:'2px solid rgba(200,160,96,0.3)', borderRadius:'12px', padding:'6px 0', fontFamily:"'Noto Serif SC', serif", color: THEME.text, background: THEME.paper, outline:'none', flexShrink:0 }}
            />
            <motion.button whileTap={{ scale:0.96 }}
              onClick={() => generate()}
              disabled={loading || !char.trim()}
              style={{ flex:1, background: loading || !char.trim() ? '#C5B5A5' : THEME.red, color:'#fff', border:'none', borderRadius:'12px', fontSize:'16px', fontFamily:"'Noto Serif SC', serif", cursor: loading || !char.trim() ? 'not-allowed' : 'pointer', letterSpacing:'1px', boxShadow: loading || !char.trim() ? 'none' : '0 4px 16px rgba(192,57,43,0.28)' }}>
              {loading ? '生成中…' : '🔍 拆解'}
            </motion.button>
          </div>

          <div style={{ fontSize:'10px', color: THEME.textDim, letterSpacing:'3px', marginBottom:'8px', textTransform:'uppercase' }}>快速体验</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'7px' }}>
            {QUICK_CHARS.map(c => (
              <motion.div key={c} whileTap={{ scale:0.88 }}
                onClick={() => generate(c)}
                style={{ width:'38px', height:'38px', background: THEME.paper, border:'1.5px solid rgba(200,160,96,0.28)', borderRadius:'10px', fontSize:'20px', fontFamily:"'Noto Serif SC', serif", color: THEME.textMid, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {c}
              </motion.div>
            ))}
          </div>
        </div>

        {/* 错误 */}
        {error && (
          <div style={{ background:'#FFF0EE', border:`1px solid ${THEME.red}`, borderRadius:'12px', padding:'12px 16px', color: THEME.red, fontSize:'13px', marginBottom:'12px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* 加载动画 */}
        {loading && (
          <div style={{ background: THEME.white, borderRadius:'20px', padding:'40px 24px', textAlign:'center', boxShadow:'0 4px 24px rgba(26,18,8,0.07)', marginBottom:'14px' }}>
            <div style={{ fontSize:'12px', color: THEME.textDim, letterSpacing:'1px', marginBottom:'16px' }}>正在生成「{char}」的拆解卡片…</div>
            <div style={{ display:'flex', justifyContent:'center', gap:'8px' }}>
              {[0,1,2].map(i => (
                <motion.div key={i} animate={{ opacity:[0.3,1,0.3], scale:[0.8,1.2,0.8] }} transition={{ duration:1.2, repeat:Infinity, delay:i*0.2 }}
                  style={{ width:'8px', height:'8px', borderRadius:'50%', background: THEME.gold }} />
              ))}
            </div>
          </div>
        )}

        {/* 结果 */}
        <AnimatePresence>
          {data && !loading && (
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}>

              {/* 动画卡 */}
              <div style={{ background: THEME.white, borderRadius:'20px', padding:'24px 20px', boxShadow:'0 4px 24px rgba(26,18,8,0.07)', border:'1px solid rgba(200,160,96,0.13)', marginBottom:'12px', textAlign:'center' }}>

                {/* 部首 → 合字动画 */}
                <AnimatePresence mode="wait">
                  {!showMerged ? (
                    <motion.div key="parts" exit={{ opacity:0, scale:0.8 }} transition={{ duration:0.4 }}
                      style={{ display:'flex', justifyContent:'center', gap:'32px', marginBottom:'12px' }}>
                      {data.parts.map((p, i) => (
                        <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'5px' }}>
                          <div style={{ width:'64px', height:'64px', borderRadius:'14px', background:'rgba(192,57,43,0.08)', border:'2px solid rgba(192,57,43,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', fontFamily:"'Noto Serif SC', serif", color: THEME.red, boxShadow:'0 4px 16px rgba(192,57,43,0.1)' }}>
                            {p.char}
                          </div>
                          <div style={{ fontSize:'10px', color: THEME.textDim, textAlign:'center', maxWidth:'68px', fontFamily:'sans-serif' }}>{p.image}</div>
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div key="merged" initial={{ opacity:0, scale:0.3 }} animate={{ opacity:1, scale:1 }} transition={{ type:'spring', stiffness:180, damping:18 }}
                      style={{ fontSize:'88px', fontFamily:"'Noto Serif SC', serif", color: THEME.text, lineHeight:1, marginBottom:'12px', textShadow:'0 6px 32px rgba(26,18,8,0.12)' }}>
                      {char}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 拼音 + 级别 */}
                <div style={{ display:'flex', justifyContent:'center', gap:'10px', flexWrap:'wrap', marginBottom:'10px' }}>
                  <span style={{ padding:'5px 16px', borderRadius:'20px', fontSize:'14px', background: THEME.paper, border:'1px solid rgba(200,160,96,0.3)', color: THEME.textMid }}>{data.pinyin}</span>
                  <span style={{ padding:'5px 16px', borderRadius:'20px', fontSize:'14px', background: lvCfg.bg, border:`1px solid ${lvCfg.color}44`, color: lvCfg.color }}>{lv} · {lvCfg.label}</span>
                </div>

                <div style={{ fontSize:'18px', fontWeight:600, color: THEME.text, marginBottom:'14px' }}>{data.meaning}</div>

                {/* 部首标签 */}
                <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:'6px' }}>
                  {data.parts.map((p, i) => (
                    <div key={i} style={{ padding:'6px 12px', background:'rgba(192,57,43,0.06)', borderRadius:'10px', fontSize:'12px', color: THEME.textMid, display:'inline-flex', alignItems:'center', gap:'5px', fontFamily:'sans-serif' }}>
                      <span style={{ fontSize:'17px', fontFamily:"'Noto Serif SC', serif" }}>{p.char}</span>
                      <span style={{ color: THEME.textDim }}>{p.name} · {p.image}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 文化故事 */}
              <div style={{ background: THEME.white, borderRadius:'20px', padding:'22px 20px', boxShadow:'0 4px 24px rgba(26,18,8,0.07)', border:'1px solid rgba(200,160,96,0.13)', marginBottom:'12px' }}>
                <div style={{ fontSize:'10px', letterSpacing:'3px', color: THEME.red, textTransform:'uppercase', marginBottom:'10px', fontFamily:'sans-serif' }}>📖 文化故事</div>
                <div style={{ fontSize:'14px', color: THEME.text, lineHeight:1.85 }}>{data.story}</div>
                <div style={{ background:'rgba(200,160,96,0.08)', borderRadius:'12px', padding:'12px 14px', borderLeft:'3px solid #C8A060', marginTop:'14px' }}>
                  <div style={{ fontSize:'10px', letterSpacing:'3px', color: THEME.gold, textTransform:'uppercase', marginBottom:'4px', fontFamily:'sans-serif' }}>🌴 清迈场景</div>
                  <div style={{ fontSize:'13px', color: THEME.textMid, lineHeight:1.75, fontStyle:'italic' }}>{data.scene}</div>
                </div>
              </div>

              {/* 延伸 + 成语 */}
              <div style={{ background: THEME.white, borderRadius:'20px', padding:'22px 20px', boxShadow:'0 4px 24px rgba(26,18,8,0.07)', border:'1px solid rgba(200,160,96,0.13)', marginBottom:'12px' }}>
                <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:'140px' }}>
                    <div style={{ fontSize:'10px', letterSpacing:'3px', color: THEME.red, textTransform:'uppercase', marginBottom:'10px', fontFamily:'sans-serif' }}>🔤 延伸词汇</div>
                    {exts.filter(Boolean).map((e, i) => (
                      <div key={i} style={{ fontSize:'13px', color: THEME.textMid, lineHeight:1.9, fontFamily:'sans-serif' }}>· {e}</div>
                    ))}
                  </div>
                  <div style={{ flex:1, minWidth:'140px' }}>
                    <div style={{ fontSize:'10px', letterSpacing:'3px', color: THEME.red, textTransform:'uppercase', marginBottom:'10px', fontFamily:'sans-serif' }}>🌟 成语</div>
                    <div style={{ fontSize:'19px', fontFamily:"'Noto Serif SC', serif", color: THEME.text, marginBottom:'4px' }}>{data.chengyu}</div>
                    <div style={{ fontSize:'11px', color: THEME.textDim, lineHeight:1.7, fontFamily:'sans-serif' }}>{data.cy_story}</div>
                  </div>
                </div>
              </div>

              {/* 妈妈台词 */}
              <div style={{ background: THEME.white, borderRadius:'20px', border:'1.5px solid rgba(200,160,96,0.3)', overflow:'hidden', boxShadow:'0 4px 24px rgba(26,18,8,0.06)', marginBottom:'12px' }}>
                <button onClick={() => setMomOpen(!momOpen)}
                  style={{ width:'100%', padding:'16px 20px', background:'none', border:'none', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', textAlign:'left' }}>
                  <div>
                    <div style={{ fontSize:'14px', color: THEME.textMid, fontFamily:"'Noto Serif SC', serif", fontWeight:600 }}>👩 妈妈台词</div>
                    <div style={{ fontSize:'11px', color: THEME.textDim, marginTop:'2px', fontFamily:'sans-serif' }}>{momOpen ? '点击收起' : '点击展开 · 3个引导问题'}</div>
                  </div>
                  <motion.span animate={{ rotate: momOpen ? 180 : 0 }} style={{ fontSize:'20px', color: THEME.gold, display:'inline-block' }}>⌄</motion.span>
                </button>
                <AnimatePresence>
                  {momOpen && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.3 }}
                      style={{ overflow:'hidden' }}>
                      <div style={{ padding:'0 20px 20px', borderTop:'1px solid rgba(200,160,96,0.2)' }}>
                        <div style={{ fontSize:'10px', letterSpacing:'3px', color: THEME.gold, textTransform:'uppercase', margin:'14px 0 12px', fontFamily:'sans-serif' }}>自然聊天，不是考试</div>
                        {(data.mom_questions || []).map((q, i) => (
                          <div key={i} style={{ display:'flex', gap:'10px', marginBottom:'12px', alignItems:'flex-start' }}>
                            <div style={{ width:'24px', height:'24px', borderRadius:'50%', background: THEME.gold, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', flexShrink:0, marginTop:'2px', fontFamily:'sans-serif' }}>{i+1}</div>
                            <div style={{ fontSize:'13px', color: THEME.text, lineHeight:1.75, fontFamily:'sans-serif' }}>{q}</div>
                          </div>
                        ))}
                        <div style={{ background:'rgba(192,57,43,0.06)', borderRadius:'10px', padding:'10px 13px' }}>
                          <div style={{ fontSize:'10px', letterSpacing:'2px', color: THEME.red, fontFamily:'sans-serif', marginBottom:'4px' }}>💡 小贴士</div>
                          <div style={{ fontSize:'12px', color: THEME.textMid, lineHeight:1.7, fontFamily:'sans-serif' }}>问完后，让孩子用「{char}」造一个句子。不需要正确，有趣就好。</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 跳转基地 */}
              <motion.button whileTap={{ scale:0.97 }}
                onClick={() => router.push('/')}
                style={{ width:'100%', padding:'14px', background: THEME.red, color:'#fff', border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:"'Noto Serif SC', serif", boxShadow:'0 4px 16px rgba(192,57,43,0.25)', letterSpacing:'0.5px' }}>
                进入根·Companion，开启专属陪伴 →
              </motion.button>

              <button onClick={() => setData(null)}
                style={{ width:'100%', marginTop:'10px', padding:'12px', background:'transparent', color: THEME.textDim, border:`1px solid rgba(200,160,96,0.3)`, borderRadius:'12px', fontSize:'13px', cursor:'pointer', fontFamily:"'Noto Serif SC', serif" }}>
                再拆一个字
              </button>

            </motion.div>
          )}
        </AnimatePresence>

        {/* 空状态 */}
        {!data && !loading && !error && (
          <div style={{ textAlign:'center', padding:'48px 20px', color: THEME.textDim }}>
            <div style={{ fontSize:'72px', fontFamily:"'Noto Serif SC', serif", color:'rgba(192,57,43,0.1)', lineHeight:1, marginBottom:'14px' }}>字</div>
            <div style={{ fontSize:'13px', lineHeight:1.9, fontFamily:'sans-serif' }}>
              输入任意汉字，或点击上方快速体验<br/>
              <span style={{ color: THEME.gold }}>自然拼读 · 文化故事 · 清迈场景 · 妈妈台词</span>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
      `}</style>
    </main>
  )
}
