'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { UserLocation } from '@/lib/geofence/types'
import { CHINESE_THEME as THEME, CHINESE_LEVELS as LEVELS, LOAD_MSGS, QUICK_CHENGYU, QUICK_WRITING } from '@/app/_shared/_constants/chineseTheme'
import { useApp } from '@/app/context/AppContext'
import { fetchLearnedItems, saveSession } from '@/app/_shared/_services/chineseService'
import HanziResult from './components/HanziResult'
import ChengYuResult from './components/ChengYuResult'
import WritingResult from './components/WritingResult'
import SmartQuickChars from './components/SmartQuickChars'
import TabBar, { type TabType } from './components/TabBar'

const supabase = createClient()

const LOCATION_SCENES: Record<string, string> = {
  TH: '清迈', SG: '新加坡', AU: '澳大利亚',
  GB: '英国', US: '美国', MY: '马来西亚',
  default: '海外华人家庭',
}

type ChildInfo = { id?: string; name: string; grade: string; level: string; school: string }
type LearnedItem = { char?: string; chengyu?: string; type: TabType; mastery: number; learned_at: string }

// ══ 字族 + 延伸词汇 ══
type PopupItem = { word: string; type: 'word' | 'chengyu' | 'cultural'; extra?: any }

// ══ 主页面 ══
export default function DecodePage() {
  const router = useRouter()
  const { activeKid } = useApp()
  const [activeTab, setActiveTab] = useState<TabType>('hanzi')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [userId, setUserId] = useState('')
  const [childInfo, setChildInfo] = useState<ChildInfo>({ id: '', name: '', grade: '', level: 'R2', school: '' })
  const [learnedItems, setLearnedItems] = useState<LearnedItem[]>([])
  const [showProgress, setShowProgress] = useState(false)
  const [locationScene, setLocationScene] = useState('海外华人家庭')
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const loadMsgRef = useRef<NodeJS.Timeout | null>(null)

  const learnedChars = learnedItems.filter(i => i.type === 'hanzi' && i.char).map(i => i.char!)

  const init = useCallback(async () => {
    try {
      const raw = localStorage.getItem('child_assessment') || localStorage.getItem('active_child')
      if (raw) {
        const info = JSON.parse(raw)
        setChildInfo({ id: info.id || '', name: info.name || '', grade: info.grade || '', level: info.level || 'R2', school: info.school || '' })
      }
    } catch {}
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return
      setUserId(uid)
      let sessionQuery = supabase
        .from('chinese_sessions').select('input_type, result, learned_at')
        .eq('user_id', uid)
      if (childInfo.id) sessionQuery = sessionQuery.eq('child_id', childInfo.id)
      const { data: sessions } = await sessionQuery.order('learned_at', { ascending: false }).limit(200)
      if (sessions) {
        setLearnedItems(sessions.filter((s: any) => s.result).map((s: any) => {
          const r = typeof s.result === 'string' ? JSON.parse(s.result) : s.result
          return { char: r?.char, chengyu: r?.chengyu, type: s.input_type as TabType, mastery: 75, learned_at: s.learned_at }
        }))
      }
    } catch {}
  }, [])

  useEffect(() => { init() }, [init])

  useEffect(() => {
    const uid = localStorage.getItem('anon_id') || crypto.randomUUID()
    localStorage.setItem('anon_id', uid)
    fetch('/api/geofence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid }) })
      .then(r => r.json()).then(loc => { if (!loc.error) { setUserLocation(loc); setLocationScene(loc.city ? `${loc.city}华人陪读家庭` : '海外华人家庭') } }).catch(() => {})
  }, [])

  const handleTabChange = (t: TabType) => { setActiveTab(t); setData(null); setError(''); setInput('') }

  const startLoadMsg = (tab: TabType) => {
    const msgs = LOAD_MSGS[tab]; let i = 0; setLoadMsg(msgs[0])
    loadMsgRef.current = setInterval(() => { i = (i + 1) % msgs.length; setLoadMsg(msgs[i]) }, 1200)
  }
  const stopLoadMsg = () => { if (loadMsgRef.current) clearInterval(loadMsgRef.current) }

  const generate = async (overrideInput?: string) => {
    const query = (overrideInput || input).trim()
    if (!query) return
    setInput(query); setLoading(true); setData(null); setError('')
    startLoadMsg(activeTab)
    try {
      const res = await fetch('/api/chinese/decode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: activeTab,
          char: activeTab === 'hanzi' ? query : undefined,
          sentence: activeTab !== 'hanzi' ? query : undefined,
          child_name: childInfo.name, child_grade: childInfo.grade, child_level: childInfo.level,
          location_scene: locationScene, learned_chars: learnedChars,
          geofence: userLocation ? { city: userLocation.city, country: userLocation.country, country_code: userLocation.country_code } : null,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
      if (userId) {
        await supabase.from('chinese_sessions').insert({ user_id: userId, child_id: childInfo.id || null, input_text: query, input_type: activeTab, result: json, location_scene: locationScene, learned_at: new Date().toISOString() })
        await supabase.from('family_learning_dna').upsert({ user_id: userId, last_input_type: activeTab, last_learned_at: new Date().toISOString(), total_sessions: learnedItems.length + 1, preferred_scene: locationScene, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        setLearnedItems(prev => [{ char: json.char, chengyu: json.chengyu, type: activeTab, mastery: 80, learned_at: new Date().toISOString() }, ...prev])
      }
    } catch (e: any) {
      setError(e.message || '生成失败，请重试')
    } finally {
      setLoading(false); stopLoadMsg()
    }
  }

  const handleMomCopy = () => {
    const text = data?.mom_script || data?.mom_questions?.[0] || ''
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const hanziCount = learnedItems.filter(i => i.type === 'hanzi').length
  const chengYuCount = learnedItems.filter(i => i.type === 'chengyu').length
  const writingCount = learnedItems.filter(i => i.type === 'writing').length

    return (
    <main style={{ minHeight: '100dvh', background: THEME.bg, fontFamily: "'Noto Serif SC', Georgia, serif", paddingBottom: 80, backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(200,160,96,0.1) 0%, transparent 55%), radial-gradient(circle at 85% 85%, rgba(192,57,43,0.07) 0%, transparent 55%)' }}>

      {/* 顶部导航 */}
      <div style={{ background: THEME.white, borderBottom: '1px solid rgba(200,160,96,0.2)', padding: '12px 16px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 12px rgba(26,18,8,0.05)' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: THEME.textDim, fontSize: 13, cursor: 'pointer', marginRight: 10, fontFamily: 'sans-serif', padding: '4px 8px' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: THEME.red, textTransform: 'uppercase', marginBottom: 1, fontFamily: 'sans-serif' }}>根·中文</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text }}>字理解码器</div>
        </div>
        {childInfo.name && (
          <div style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(200,160,96,0.1)', border: '1px solid rgba(200,160,96,0.25)', fontSize: 11, color: THEME.textMid, fontFamily: 'sans-serif', marginRight: 8 }}>
            {childInfo.name} · {childInfo.level}
          </div>
        )}
        <button onClick={() => setShowProgress(!showProgress)}
          style={{ background: 'none', border: 'none', color: THEME.textDim, fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif' }}>
          🌳 {hanziCount + chengYuCount + writingCount}
        </button>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 14px' }}>

        {/* 进度展开 */}
        <AnimatePresence>
          {showProgress && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ background: THEME.white, borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(200,160,96,0.2)' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[{ label: '汉字', count: hanziCount, color: THEME.red, emoji: '🧩' }, { label: '成语', count: chengYuCount, color: THEME.gold, emoji: '🌟' }, { label: '文化句', count: writingCount, color: THEME.green, emoji: '📜' }].map(s => (
                    <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: `${s.color}0D`, border: `1px solid ${s.color}25` }}>
                      <div style={{ fontSize: 18 }}>{s.emoji}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'sans-serif' }}>{s.count}</div>
                      <div style={{ fontSize: 10, color: THEME.textDim, fontFamily: 'sans-serif' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {hanziCount > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {learnedItems.filter(i => i.type === 'hanzi' && i.char).slice(0, 20).map((item, i) => (
                      <span key={i} style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(192,57,43,0.07)', fontSize: 15, fontFamily: "'Noto Serif SC', serif", color: THEME.text, cursor: 'pointer' }}
                        onClick={() => { handleTabChange('hanzi'); generate(item.char) }}>
                        {item.char}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <TabBar active={activeTab} onChange={handleTabChange} />

        {/* 输入区 */}
        <div style={{ background: THEME.white, borderRadius: 18, padding: '16px', boxShadow: '0 4px 20px rgba(26,18,8,0.07)', border: '1px solid rgba(200,160,96,0.18)', marginBottom: 12 }}>

          {/* 汉字输入 */}
          {activeTab === 'hanzi' && (
            <>
              {/* 输入行：大字框 + 按钮并排 */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <input
                    value={input}
                    onChange={e => {
                      const val = [...e.target.value].find(c => /\p{Script=Han}/u.test(c)) || e.target.value.slice(-1)
                      setInput(val); setData(null)
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const c = [...input].find(c => /\p{Script=Han}/u.test(c)) || input.trim(); if (c) { setInput(c); generate(c) } } }}
                    maxLength={1}
                    placeholder="字"
                    style={{ width: 72, height: 72, textAlign: 'center', fontSize: 48, border: '2px solid rgba(200,160,96,0.3)', borderRadius: 14, fontFamily: "'Noto Serif SC', serif", color: THEME.text, background: THEME.paper, outline: 'none', caretColor: THEME.gold, cursor: 'text' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, color: THEME.textDim, fontFamily: 'sans-serif', lineHeight: 1.5 }}>
                    输入一个汉字<br />
                    <span style={{ fontSize: 10, color: 'rgba(122,92,72,0.5)' }}>支持手写/拼音输入法</span>
                  </div>
                  <motion.button whileTap={{ scale: 0.96 }}
                    onClick={() => { const c = [...input].find(c => /\p{Script=Han}/u.test(c)) || input.trim(); if (c) { setInput(c); generate(c) } }}
                    disabled={loading || !input.trim()}
                    style={{ padding: '10px 16px', background: loading || !input.trim() ? '#C5B5A5' : THEME.red, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontFamily: "'Noto Serif SC', serif", cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', letterSpacing: 1, boxShadow: !loading && input.trim() ? '0 3px 12px rgba(192,57,43,0.3)' : 'none' }}>
                    {loading ? '解析中…' : '🧩 拆解'}
                  </motion.button>
                </div>
              </div>

              {/* 智能推荐 */}
              <SmartQuickChars level={childInfo.level || 'R2'} learnedChars={learnedChars} onSelect={c => { setInput(c); setData(null); generate(c) }} />
            </>
          )}

          {/* 成语输入 */}
          {activeTab === 'chengyu' && (
            <>
              <textarea value={input} onChange={e => { setInput(e.target.value); setData(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate() } }}
                placeholder="孩子说了什么？英文中文都行&#10;如：very many people / 一下子就做完了"
                rows={3}
                style={{ width: '100%', background: THEME.paper, border: '2px solid rgba(200,160,96,0.25)', borderRadius: 12, padding: '11px 13px', fontSize: 14, color: THEME.text, outline: 'none', resize: 'none', fontFamily: 'sans-serif', lineHeight: 1.7, marginBottom: 10, boxSizing: 'border-box' }} />
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => generate()} disabled={loading || !input.trim()}
                style={{ width: '100%', padding: '12px', background: !input.trim() ? '#C5B5A5' : THEME.red, color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontFamily: "'Noto Serif SC', serif", cursor: !input.trim() ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
                {loading ? '生成中…' : '🌟 生成成语脚本'}
              </motion.button>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_CHENGYU.map((s, i) => (
                  <motion.button key={i} whileTap={{ scale: 0.93 }} onClick={() => { setData(null); generate(s) }}
                    style={{ padding: '5px 11px', borderRadius: 20, background: 'rgba(200,160,96,0.08)', border: '1px solid rgba(200,160,96,0.25)', fontSize: 12, color: THEME.textMid, cursor: 'pointer', fontFamily: 'sans-serif' }}>
                    {s}
                  </motion.button>
                ))}
              </div>
            </>
          )}

          {/* 文化句输入 */}
          {activeTab === 'writing' && (
            <>
              <textarea value={input} onChange={e => { setInput(e.target.value); setData(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate() } }}
                placeholder="孩子今天经历了什么？让他说，你来打&#10;如：今天去夜市，人超多，我吃了芒果糯米饭"
                rows={3}
                style={{ width: '100%', background: THEME.paper, border: '2px solid rgba(200,160,96,0.25)', borderRadius: 12, padding: '11px 13px', fontSize: 14, color: THEME.text, outline: 'none', resize: 'none', fontFamily: 'sans-serif', lineHeight: 1.7, marginBottom: 10, boxSizing: 'border-box' }} />
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => generate()} disabled={loading || !input.trim()}
                style={{ width: '100%', padding: '12px', background: !input.trim() ? '#C5B5A5' : '#2D6A4F', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontFamily: "'Noto Serif SC', serif", cursor: !input.trim() ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
                {loading ? '升华中…' : '📜 生成文化句'}
              </motion.button>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_WRITING.map((s, i) => (
                  <motion.button key={i} whileTap={{ scale: 0.93 }} onClick={() => { setData(null); generate(s) }}
                    style={{ padding: '5px 11px', borderRadius: 20, background: 'rgba(45,106,79,0.06)', border: '1px solid rgba(45,106,79,0.2)', fontSize: 12, color: THEME.green, cursor: 'pointer', fontFamily: 'sans-serif' }}>
                    {s}
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 错误 */}
        {error && (
          <div style={{ background: '#FFF0EE', border: `1px solid ${THEME.red}`, borderRadius: 12, padding: '11px 14px', color: THEME.red, fontSize: 13, marginBottom: 10, fontFamily: 'sans-serif' }}>
            ⚠️ {error}
          </div>
        )}

        {/* 加载动画 */}
        {loading && (
          <div style={{ background: THEME.white, borderRadius: 18, padding: '32px 20px', textAlign: 'center', boxShadow: '0 4px 20px rgba(26,18,8,0.07)', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 14 }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  style={{ width: 9, height: 9, borderRadius: '50%', background: THEME.gold }} />
              ))}
            </div>
            <motion.div key={loadMsg} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: 12, color: THEME.textDim, letterSpacing: 1, fontFamily: 'sans-serif' }}>
              {loadMsg}
            </motion.div>
          </div>
        )}

        {/* 结果 */}
        <AnimatePresence>
          {data && !loading && (
            <>
              {activeTab === 'hanzi' && <HanziResult data={data} char={input} onMomCopy={handleMomCopy} childLevel={childInfo.level} childName={activeKid?.name || childInfo.name} onSentenceSaved={(s) => console.log('sentence saved:', s)} />}
              {activeTab === 'chengyu' && <ChengYuResult data={data} onMomCopy={handleMomCopy} />}
              {activeTab === 'writing' && <WritingResult data={data} onMomCopy={handleMomCopy} />}

              <AnimatePresence>
                {copied && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', background: THEME.text, color: '#fff', padding: '9px 18px', borderRadius: 20, fontSize: 12, fontFamily: 'sans-serif', zIndex: 200, whiteSpace: 'nowrap' }}>
                    ✅ 台词已复制，去跟孩子说吧！
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', gap: 10, marginTop: 4, marginBottom: 20 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/')}
                  style={{ flex: 1, padding: 13, background: THEME.red, color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Noto Serif SC', serif", boxShadow: '0 4px 16px rgba(192,57,43,0.25)' }}>
                  回到根·陪伴 →
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setData(null); setInput('') }}
                  style={{ flex: 1, padding: 13, background: 'transparent', color: THEME.textDim, border: `1px solid rgba(200,160,96,0.3)`, borderRadius: 14, fontSize: 13, cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  再学一个
                </motion.button>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* 空状态 */}
        {!data && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: THEME.textDim }}>
            <div style={{ fontSize: 64, fontFamily: "'Noto Serif SC', serif", color: 'rgba(192,57,43,0.08)', lineHeight: 1, marginBottom: 14 }}>
              {activeTab === 'hanzi' ? '字' : activeTab === 'chengyu' ? '成' : '文'}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.9, fontFamily: 'sans-serif' }}>
              {activeTab === 'hanzi' && <>输入任意汉字，秒懂字的灵魂<br /><span style={{ color: THEME.gold }}>字理拆解 · 中英互通 · 妈妈台词</span></>}
              {activeTab === 'chengyu' && <>孩子怎么说，我们找成语<br /><span style={{ color: THEME.gold }}>中英对照 · 三步解码 · 今天就用</span></>}
              {activeTab === 'writing' && <>孩子的故事，连接古人的智慧<br /><span style={{ color: THEME.gold }}>口述升华 · 文化根脉 · 情感连接</span></>}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Noto+Sans+SC:wght@300;400;500;700&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input, textarea { font-family: 'Noto Sans SC', sans-serif; }
        button:active { opacity: 0.85; }
      `}</style>
    </main>
  )
}
