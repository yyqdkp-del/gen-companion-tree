'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserLocation } from '@/lib/geofence/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const THEME = {
  bg: '#F5F0E8',
  white: '#FFFFFF',
  red: '#E05C45',
  gold: '#C8A060',
  text: '#1A1208',
  textMid: '#4A3728',
  textDim: '#7A5C48',
  paper: '#FDFBF7',
  green: '#2D6A4F',
  blue: '#1A3C5E',
  navy: '#1A3C5E',
  orange: '#E8892A',
}

const LEVELS: Record<string, { color: string; bg: string; label: string }> = {
  R1: { color: '#C03A2B', bg: '#FFF0EE', label: '入门' },
  R2: { color: '#BA6A00', bg: '#FFF6EE', label: '基础' },
  R3: { color: '#A07800', bg: '#FFFBEE', label: '进阶' },
  R4: { color: '#5C6E00', bg: '#F5F9EE', label: '提升' },
  R5: { color: '#2D6A4F', bg: '#EDFAF1', label: '高阶' },
}

const LOCATION_SCENES: Record<string, string> = {
  TH: '清迈', SG: '新加坡', AU: '澳大利亚',
  GB: '英国', US: '美国', MY: '马来西亚',
  default: '海外华人家庭',
}

const LOAD_MSGS: Record<string, string[]> = {
  hanzi: ['正在查阅字理古籍…', '翻阅《说文解字》…', '正在拆解字的骨架…', '绘制汉字画面中…'],
  chengyu: ['正在连接中英智慧…', '寻找最贴切的成语…', '编写妈妈台词中…', '正在生成场景…'],
  writing: ['感受孩子的经历…', '连接古人的智慧…', '正在寻找共鸣古诗…', '为妈妈准备台词中…'],
}

type TabType = 'hanzi' | 'chengyu' | 'writing'
type ChildInfo = { name: string; grade: string; level: string; school: string }
type LearnedItem = { char?: string; chengyu?: string; type: TabType; mastery: number; learned_at: string }

// ══ 手风琴组件 ══
function Accordion({
  title, emoji, children, defaultOpen = false,
  titleStyle, borderColor
}: {
  title: string; emoji?: string; children: React.ReactNode
  defaultOpen?: boolean; titleStyle?: React.CSSProperties; borderColor?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${borderColor || 'rgba(200,160,96,0.2)'}`, overflow: 'hidden', marginBottom: 8 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '13px 16px', background: open ? 'rgba(200,160,96,0.06)' : THEME.white, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {emoji && <span style={{ fontSize: 16 }}>{emoji}</span>}
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textMid, fontFamily: 'sans-serif', ...titleStyle }}>{title}</span>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          style={{ fontSize: 16, color: THEME.gold, display: 'inline-block', lineHeight: 1 }}>⌄</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${borderColor || 'rgba(200,160,96,0.15)'}`, background: THEME.white }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══ 词组弹窗 ══
function WordPopup({ word, onClose, childLevel }: { word: string; onClose: () => void; childLevel?: string }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const char = [...word].find(c => /\p{Script=Han}/u.test(c)) || word[0]
        // 先查缓存
        const { data: cached } = await supabase
          .from('hanzi_library').select('*').eq('char', char).maybeSingle()
        if (cached?.result) {
          const result = typeof cached.result === 'string' ? JSON.parse(cached.result) : cached.result
          setData(result); setLoading(false); return
        }
        // 没有缓存则调用 API
        const res = await fetch('/api/chinese/decode', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'hanzi', char, child_level: childLevel || 'R2' }),
        })
        const json = await res.json()
        setData(json.error ? null : json)
      } catch { setData(null) }
      setLoading(false)
    }
    load()
  }, [word])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,8,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 80px' }}
      onClick={onClose}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ background: THEME.white, borderRadius: 20, padding: '20px', width: '100%', maxWidth: 440, margin: '0 16px', maxHeight: '70vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(26,18,8,0.12)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 32, fontFamily: "'Noto Serif SC', serif", color: THEME.text }}>{word}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: THEME.textDim, cursor: 'pointer' }}>✕</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: THEME.textDim, fontFamily: 'sans-serif', fontSize: 13 }}>正在查询…</div>
        ) : data ? (
          <div style={{ fontFamily: 'sans-serif' }}>
            {data.pinyin && <div style={{ fontSize: 13, color: THEME.textDim, marginBottom: 8 }}>{data.pinyin}</div>}
            {data.meaning && <div style={{ fontSize: 15, fontWeight: 600, color: THEME.text, marginBottom: 10, fontFamily: "'Noto Serif SC', serif" }}>{data.meaning}</div>}
            {data.story && <div style={{ fontSize: 13, color: THEME.textMid, lineHeight: 1.85, marginBottom: 10 }}>{data.story}</div>}
            {data.scene && <div style={{ fontSize: 12, color: THEME.textMid, lineHeight: 1.75, fontStyle: 'italic', padding: '9px 12px', borderRadius: 10, background: 'rgba(200,160,96,0.07)', marginBottom: 10 }}>{data.scene}</div>}
            {data.mom_script && (
              <div style={{ padding: '12px', borderRadius: 12, background: 'rgba(200,160,96,0.08)', border: '1px solid rgba(200,160,96,0.2)', fontSize: 13, color: THEME.text, lineHeight: 1.8, fontStyle: 'italic' }}>
                👩 {data.mom_script}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: THEME.textDim, fontFamily: 'sans-serif', fontSize: 13 }}>暂无数据</div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ══ 部件展示（两侧分布）+ 造字演变手风琴 ══
function PartsDisplay({ parts, char, evolution }: { parts: any[]; char: string; evolution?: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [showEvolution, setShowEvolution] = useState(false)

  if (!parts?.length) return null

  return (
    <div style={{ background: THEME.white, borderRadius: 16, padding: '18px 16px', marginBottom: 8, border: '1px solid rgba(200,160,96,0.15)' }}>
      {/* 部件 + 大字居中布局 */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginBottom: evolution ? 12 : 0 }}>
        {/* 左侧部件 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {parts.slice(0, Math.ceil(parts.length / 2)).map((p: any, i: number) => (
            <button key={i} onClick={() => setOpenIdx(openIdx === i ? null : i)}
              style={{ background: openIdx === i ? 'rgba(192,57,43,0.08)' : THEME.paper, border: `1.5px solid ${openIdx === i ? 'rgba(192,57,43,0.3)' : 'rgba(200,160,96,0.2)'}`, borderRadius: 10, padding: '8px 10px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
              <div style={{ fontSize: 26, fontFamily: "'Noto Serif SC', serif", color: THEME.red, lineHeight: 1 }}>{p.char}</div>
              <div style={{ fontSize: 10, color: THEME.textDim, marginTop: 3, fontFamily: 'sans-serif' }}>{p.name}</div>
            </button>
          ))}
        </div>

        {/* 中央大字 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 72, fontFamily: "'Noto Serif SC', serif", color: THEME.text, lineHeight: 1, textShadow: '0 4px 20px rgba(26,18,8,0.1)' }}>{char}</div>
        </div>

        {/* 右侧部件 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {parts.slice(Math.ceil(parts.length / 2)).map((p: any, i: number) => {
            const idx = i + Math.ceil(parts.length / 2)
            return (
              <button key={idx} onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                style={{ background: openIdx === idx ? 'rgba(192,57,43,0.08)' : THEME.paper, border: `1.5px solid ${openIdx === idx ? 'rgba(192,57,43,0.3)' : 'rgba(200,160,96,0.2)'}`, borderRadius: 10, padding: '8px 10px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                <div style={{ fontSize: 26, fontFamily: "'Noto Serif SC', serif", color: THEME.red, lineHeight: 1 }}>{p.char}</div>
                <div style={{ fontSize: 10, color: THEME.textDim, marginTop: 3, fontFamily: 'sans-serif' }}>{p.name}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 展开的部件说明 */}
      <AnimatePresence>
        {openIdx !== null && parts[openIdx] && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ background: 'rgba(192,57,43,0.05)', borderRadius: 10, padding: '10px 13px', marginTop: 8, borderLeft: '3px solid rgba(192,57,43,0.3)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.red, marginBottom: 4, fontFamily: 'sans-serif' }}>
                {parts[openIdx].char} · {parts[openIdx].name}
              </div>
              <div style={{ fontSize: 12, color: THEME.textMid, lineHeight: 1.75, fontFamily: 'sans-serif' }}>
                {parts[openIdx].image || parts[openIdx].meaning || '像古人观察自然所得的象形符号'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 造字演变手风琴 */}
      {evolution && (
        <div style={{ marginTop: 10, borderRadius: 10, border: '1px solid rgba(200,160,96,0.2)', overflow: 'hidden' }}>
          <button onClick={() => setShowEvolution(o => !o)}
            style={{ width: '100%', padding: '10px 14px', background: showEvolution ? 'rgba(200,160,96,0.06)' : 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontSize: 12, color: THEME.gold, fontFamily: 'sans-serif', fontWeight: 700 }}>📜 造字演变</span>
            <motion.span animate={{ rotate: showEvolution ? 180 : 0 }} style={{ fontSize: 14, color: THEME.gold, display: 'inline-block' }}>⌄</motion.span>
          </button>
          <AnimatePresence initial={false}>
            {showEvolution && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                <div style={{ padding: '0 14px 12px', borderTop: '1px solid rgba(200,160,96,0.15)', background: THEME.white }}>
                  <div style={{ fontSize: 12, color: THEME.text, lineHeight: 1.85, marginTop: 10, fontFamily: 'sans-serif' }}>{evolution}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ══ 字族 + 延伸词汇 ══
type PopupItem = { word: string; type: 'word' | 'chengyu' | 'cultural'; extra?: any }

function FamilyWords({ family, extension, chengyu, cy_story, cultural_sentence, cultural_author, cultural_meaning, overseas_connection, childLevel }: {
  family?: string[]; extension?: string[]; chengyu?: string; cy_story?: string
  cultural_sentence?: string; cultural_author?: string; cultural_meaning?: string; overseas_connection?: string
  childLevel?: string
}) {
  const [popup, setPopup] = useState<PopupItem | null>(null)
  const familyWords = (family || []).slice(0, 3)
  if (!familyWords.length && !chengyu && !cultural_sentence) return null

  return (
    <>
      <div style={{ background: THEME.white, borderRadius: 16, padding: '16px', marginBottom: 8, border: '1px solid rgba(200,160,96,0.15)' }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.red, marginBottom: 10, fontFamily: 'sans-serif' }}>🌳 字族 · 延伸</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {familyWords.map((w, i) => (
            <button key={i} onClick={() => setPopup({ word: w, type: 'word' })}
              style={{ padding: '6px 13px', borderRadius: 20, background: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.2)', fontSize: 14, fontFamily: "'Noto Serif SC', serif", color: THEME.green, cursor: 'pointer' }}>
              {w}
            </button>
          ))}
          {chengyu && (
            <button onClick={() => setPopup({ word: chengyu, type: 'chengyu', extra: { cy_story } })}
              style={{ padding: '6px 13px', borderRadius: 20, background: 'rgba(200,160,96,0.1)', border: '1px solid rgba(200,160,96,0.3)', fontSize: 14, fontFamily: "'Noto Serif SC', serif", color: THEME.gold, cursor: 'pointer' }}>
              🌟 {chengyu}
            </button>
          )}
          {cultural_sentence && (
            <button onClick={() => setPopup({ word: '文化句', type: 'cultural', extra: { cultural_sentence, cultural_author, cultural_meaning, overseas_connection } })}
              style={{ padding: '6px 13px', borderRadius: 20, background: 'rgba(26,60,94,0.07)', border: '1px solid rgba(26,60,94,0.2)', fontSize: 12, fontFamily: 'sans-serif', color: THEME.navy, cursor: 'pointer' }}>
              📜 文化句
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {popup && (
          <FamilyPopup item={popup} onClose={() => setPopup(null)} childLevel={childLevel} />
        )}
      </AnimatePresence>
    </>
  )
}

function FamilyPopup({ item, onClose, childLevel }: { item: PopupItem; onClose: () => void; childLevel?: string }) {
  const [loading, setLoading] = useState(item.type === 'word')
  const [wordData, setWordData] = useState<any>(null)

  useEffect(() => {
    if (item.type !== 'word') return
    async function load() {
      setLoading(true)
      try {
        const char = [...item.word].find(c => /\p{Script=Han}/u.test(c)) || item.word[0]
        const { data: cached } = await supabase.from('hanzi_library').select('*').eq('char', char).maybeSingle()
        if (cached?.result) {
          setWordData(typeof cached.result === 'string' ? JSON.parse(cached.result) : cached.result)
          setLoading(false); return
        }
        const res = await fetch('/api/chinese/decode', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'hanzi', char, child_level: childLevel || 'R2' }),
        })
        const json = await res.json()
        setWordData(json.error ? null : json)
      } catch { setWordData(null) }
      setLoading(false)
    }
    load()
  }, [item.word])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,8,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 80px' }}
      onClick={onClose}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ background: THEME.white, borderRadius: 20, padding: '20px', width: '100%', maxWidth: 440, margin: '0 16px', maxHeight: '72vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 26, fontFamily: "'Noto Serif SC', serif", color: THEME.text }}>{item.word}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: THEME.textDim, cursor: 'pointer' }}>✕</button>
        </div>

        {item.type === 'word' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: THEME.textDim, fontFamily: 'sans-serif', fontSize: 13 }}>正在查询…</div>
          ) : wordData ? (
            <div style={{ fontFamily: 'sans-serif' }}>
              {wordData.pinyin && <div style={{ fontSize: 13, color: THEME.textDim, marginBottom: 8 }}>{wordData.pinyin}</div>}
              {wordData.meaning && <div style={{ fontSize: 15, fontWeight: 600, color: THEME.text, marginBottom: 10, fontFamily: "'Noto Serif SC', serif" }}>{wordData.meaning}</div>}
              {wordData.story && <div style={{ fontSize: 13, color: THEME.textMid, lineHeight: 1.85, marginBottom: 10 }}>{wordData.story}</div>}
              {wordData.scene && <div style={{ fontSize: 12, color: THEME.textMid, lineHeight: 1.75, fontStyle: 'italic', padding: '9px 12px', borderRadius: 10, background: 'rgba(200,160,96,0.07)', marginBottom: 10 }}>🌍 {wordData.scene}</div>}
              {(wordData.mom_questions || []).length > 0 && (
                <div style={{ padding: '12px', borderRadius: 12, background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.1)' }}>
                  <div style={{ fontSize: 11, color: THEME.red, marginBottom: 8 }}>💬 聊天引导</div>
                  {wordData.mom_questions.slice(0, 2).map((q: string, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: THEME.textMid, lineHeight: 1.75, marginBottom: 6 }}>· {q}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: THEME.textDim, fontFamily: 'sans-serif', fontSize: 13 }}>暂无数据</div>
          )
        )}

        {item.type === 'chengyu' && (
          <div style={{ fontFamily: 'sans-serif' }}>
            {item.extra?.cy_story && <div style={{ fontSize: 14, color: THEME.textMid, lineHeight: 1.85, marginBottom: 12 }}>{item.extra.cy_story}</div>}
            <div style={{ padding: '10px 13px', borderRadius: 10, background: 'rgba(200,160,96,0.07)', fontSize: 12, color: THEME.textMid, lineHeight: 1.7 }}>
              💡 试着今天跟孩子用一次这个成语
            </div>
          </div>
        )}

        {item.type === 'cultural' && item.extra && (
          <div style={{ fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: 18, fontFamily: "'Noto Serif SC', serif", fontWeight: 700, color: THEME.text, lineHeight: 1.8, marginBottom: 8 }}>{item.extra.cultural_sentence}</div>
            {item.extra.cultural_author && <div style={{ fontSize: 12, color: THEME.textDim, marginBottom: 10 }}>—— {item.extra.cultural_author}</div>}
            {item.extra.cultural_meaning && <div style={{ fontSize: 13, color: THEME.textMid, lineHeight: 1.75, marginBottom: 10, borderTop: '1px dashed rgba(200,160,96,0.3)', paddingTop: 10 }}>{item.extra.cultural_meaning}</div>}
            {item.extra.overseas_connection && (
              <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(26,60,94,0.05)', fontSize: 12, color: THEME.navy, lineHeight: 1.75 }}>
                🌍 {item.extra.overseas_connection}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}


// ══ 汉字结果 ══
function HanziResult({ data, char, onMomCopy, childLevel }: { data: any; char: string; onMomCopy: () => void; childLevel?: string }) {
  const lv = data?.level || 'R2'
  const lvCfg = LEVELS[lv] || LEVELS.R2
  const exts = Array.isArray(data?.extension) ? data.extension : []

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

      {/* 拼音 + 级别 + 含义 */}
      <div style={{ background: THEME.white, borderRadius: 16, padding: '14px 16px', marginBottom: 8, border: '1px solid rgba(200,160,96,0.15)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 14, background: THEME.paper, border: '1px solid rgba(200,160,96,0.3)', color: THEME.textMid, fontFamily: 'sans-serif' }}>{data.pinyin}</span>
        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, background: lvCfg.bg, border: `1px solid ${lvCfg.color}44`, color: lvCfg.color, fontFamily: 'sans-serif' }}>{lv} · {lvCfg.label}</span>
        {data.traditional && data.traditional !== char && (
          <span style={{ fontSize: 12, color: THEME.textDim, fontFamily: 'sans-serif' }}>繁 <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 16, color: THEME.textMid }}>{data.traditional}</span></span>
        )}
        <div style={{ width: '100%', fontSize: 16, fontWeight: 700, color: THEME.text, fontFamily: "'Noto Serif SC', serif", marginTop: 4 }}>{data.meaning}</div>
      </div>

      {/* 部件拆解（两侧） + 造字演变 */}
      <PartsDisplay parts={data.parts || []} char={char} evolution={data.evolution} />

      {/* 中英互通 */}
      {(data.english_link || data.phonics_bridge) && (
        <Accordion title="中英互通" emoji="🔗" borderColor="rgba(26,60,94,0.15)">
          <div style={{ paddingTop: 12 }}>
            {data.english_link && <div style={{ fontSize: 13, color: THEME.blue, lineHeight: 1.85, fontStyle: 'italic', fontFamily: 'sans-serif' }}>{data.english_link}</div>}
            {data.phonics_bridge && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(26,60,94,0.05)', fontSize: 12, color: THEME.textMid, lineHeight: 1.7, fontFamily: 'sans-serif' }}>
                💡 {data.phonics_bridge}
              </div>
            )}
          </div>
        </Accordion>
      )}

      {/* 妈妈台词（默认展开） */}
      {data.mom_script && (
        <Accordion title="妈妈台词" emoji="👩" defaultOpen={true} borderColor="rgba(200,160,96,0.35)" titleStyle={{ color: THEME.textMid }}>
          <div style={{ paddingTop: 12 }}>
            <div style={{ padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(200,160,96,0.1), rgba(192,57,43,0.05))', border: '1px solid rgba(200,160,96,0.2)', marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.9, fontStyle: 'italic', fontFamily: 'sans-serif' }}>「{data.mom_script}」</div>
            </div>
            {(data.mom_questions || []).length > 0 && (
              <>
                <div style={{ fontSize: 10, color: THEME.gold, letterSpacing: 2, marginBottom: 8, fontFamily: 'sans-serif' }}>自然聊天，不是考试</div>
                {(data.mom_questions || []).map((q: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: THEME.gold, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, marginTop: 2, fontFamily: 'sans-serif' }}>{i + 1}</div>
                    <div style={{ fontSize: 12, color: THEME.text, lineHeight: 1.75, fontFamily: 'sans-serif' }}>{q}</div>
                  </div>
                ))}
              </>
            )}
            <div style={{ background: 'rgba(192,57,43,0.06)', borderRadius: 10, padding: '9px 12px', marginTop: 4 }}>
              <div style={{ fontSize: 11, color: THEME.textMid, lineHeight: 1.7, fontFamily: 'sans-serif' }}>💡 让孩子用「{char}」造一个句子，不需要正确，有趣就好。</div>
            </div>
            <button onClick={onMomCopy}
              style={{ width: '100%', marginTop: 10, padding: '9px', borderRadius: 10, border: `1px solid ${THEME.gold}`, background: 'transparent', fontSize: 12, color: THEME.gold, fontWeight: 600, cursor: 'pointer', fontFamily: 'sans-serif' }}>
              📋 复制台词
            </button>
          </div>
        </Accordion>
      )}

      {/* 文化故事 + 生活场景（合并手风琴） */}
      {(data.story || data.scene) && (
        <Accordion title="文化故事 · 生活场景" emoji="📖">
          <div style={{ paddingTop: 10 }}>
            {data.story && <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.85, fontFamily: 'sans-serif', marginBottom: data.scene ? 10 : 0 }}>{data.story}</div>}
            {data.scene && (
              <div style={{ background: 'rgba(200,160,96,0.08)', borderRadius: 10, padding: '10px 13px', borderLeft: '3px solid #C8A060' }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: THEME.gold, marginBottom: 4, fontFamily: 'sans-serif' }}>🌍 生活场景</div>
                <div style={{ fontSize: 12, color: THEME.textMid, lineHeight: 1.75, fontStyle: 'italic', fontFamily: 'sans-serif' }}>{data.scene}</div>
              </div>
            )}
          </div>
        </Accordion>
      )}

      {/* 字族 + 延伸词汇（合并，点击弹窗） */}
      <FamilyWords family={data.family} extension={exts} chengyu={data.chengyu} cy_story={data.cy_story} cultural_sentence={data.cultural_sentence} cultural_author={data.cultural_author} cultural_meaning={data.cultural_meaning} overseas_connection={data.overseas_connection} childLevel={childLevel} />

    </motion.div>
  )
}

// ══ 成语结果 ══
function ChengYuResult({ data, onMomCopy }: { data: any; onMomCopy: () => void }) {
  const [popup, setPopup] = useState<string | null>(null)
  const relatedWords = [
    ...(data.related_words || []).map((w: string) => ({ word: w, type: 'family' as const })),
    ...(data.extensions || []).map((w: string) => ({ word: w.split('：')[0] || w, type: 'ext' as const })),
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

      {/* 成语主卡 */}
      <div style={{ background: THEME.white, borderRadius: 16, padding: '20px 16px', marginBottom: 8, border: '1px solid rgba(200,160,96,0.15)', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 150, damping: 15 }}
          style={{ fontSize: 44, fontFamily: "'Noto Serif SC', serif", fontWeight: 900, color: THEME.text, letterSpacing: 4, marginBottom: 8 }}>
          {data.chengyu}
        </motion.div>
        {data.pinyin && <div style={{ fontSize: 13, color: THEME.textDim, marginBottom: 10, fontFamily: 'sans-serif' }}>{data.pinyin}</div>}
        {data.level && (
          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: 'rgba(200,160,96,0.12)', color: THEME.gold, fontSize: 11, fontWeight: 700, fontFamily: 'sans-serif', marginBottom: 10 }}>
            {data.level === '画面级' ? '🎨 画面级' : data.level === '感受级' ? '💭 感受级' : '🧠 智慧级'}
          </span>
        )}
        <div style={{ fontSize: 15, fontWeight: 600, color: THEME.text, fontFamily: "'Noto Serif SC', serif" }}>{data.meaning}</div>
      </div>

      {/* 中英对照 */}
      {data.english_idiom && (
        <Accordion title="中英互通" emoji="🔗" borderColor="rgba(26,60,94,0.15)">
          <div style={{ paddingTop: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'rgba(26,60,94,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: THEME.textDim, marginBottom: 4, fontFamily: 'sans-serif' }}>English</div>
                <div style={{ fontSize: 12, color: THEME.navy, fontStyle: 'italic', fontFamily: 'sans-serif' }}>"{data.english_idiom}"</div>
              </div>
              <div style={{ fontSize: 16, color: THEME.gold }}>⟷</div>
              <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'rgba(192,57,43,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: THEME.textDim, marginBottom: 4, fontFamily: 'sans-serif' }}>中文</div>
                <div style={{ fontSize: 18, color: THEME.red, fontFamily: "'Noto Serif SC', serif", fontWeight: 700 }}>{data.chengyu}</div>
              </div>
            </div>
            {data.idiom_comparison && <div style={{ marginTop: 8, fontSize: 12, color: THEME.textMid, lineHeight: 1.75, fontStyle: 'italic', fontFamily: 'sans-serif' }}>💡 {data.idiom_comparison}</div>}
          </div>
        </Accordion>
      )}

      {/* 妈妈台词（默认展开） */}
      {data.mom_script && (
        <Accordion title="妈妈台词" emoji="👩" defaultOpen={true} borderColor="rgba(200,160,96,0.35)">
          <div style={{ paddingTop: 12 }}>
            <div style={{ padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(200,160,96,0.1), rgba(192,57,43,0.05))', border: '1px solid rgba(200,160,96,0.2)', marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.9, fontStyle: 'italic', fontFamily: 'sans-serif' }}>「{data.mom_script}」</div>
            </div>
            <button onClick={onMomCopy} style={{ width: '100%', padding: '9px', borderRadius: 10, border: `1px solid ${THEME.gold}`, background: 'transparent', fontSize: 12, color: THEME.gold, fontWeight: 600, cursor: 'pointer', fontFamily: 'sans-serif' }}>
              📋 复制台词
            </button>
          </div>
        </Accordion>
      )}

      {/* 来源 + 场景（合并） */}
      {(data.origin || data.image || data.local_scene || data.child_use) && (
        <Accordion title="故事 · 场景" emoji="📖">
          <div style={{ paddingTop: 10 }}>
            {data.origin && <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.85, fontFamily: 'sans-serif', marginBottom: 8 }}>{data.origin}</div>}
            {data.image && <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(45,106,79,0.06)', fontSize: 12, color: THEME.textMid, lineHeight: 1.75, fontFamily: 'sans-serif', marginBottom: 8 }}>🎨 {data.image}</div>}
            {data.local_scene && <div style={{ fontSize: 12, color: THEME.textMid, lineHeight: 1.75, fontStyle: 'italic', fontFamily: 'sans-serif', marginBottom: 8 }}>{data.local_scene}</div>}
            {data.child_use && (
              <div style={{ padding: '10px 13px', borderRadius: 10, background: 'rgba(200,160,96,0.07)', border: '1px solid rgba(200,160,96,0.2)' }}>
                <div style={{ fontSize: 10, color: THEME.gold, marginBottom: 4, fontFamily: 'sans-serif' }}>✨ 孩子今天可以说：</div>
                <div style={{ fontSize: 14, color: THEME.text, fontFamily: "'Noto Serif SC', serif", fontWeight: 600 }}>「{data.child_use}」</div>
              </div>
            )}
          </div>
        </Accordion>
      )}

      {/* 相关词（点击弹窗） */}
      {relatedWords.length > 0 && (
        <>
          <div style={{ background: THEME.white, borderRadius: 16, padding: '14px 16px', marginBottom: 8, border: '1px solid rgba(200,160,96,0.15)' }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.red, marginBottom: 10, fontFamily: 'sans-serif' }}>🌳 相关词汇</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {relatedWords.map((item, i) => (
                <button key={i} onClick={() => setPopup(item.word)}
                  style={{ padding: '6px 13px', borderRadius: 20, background: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.2)', fontSize: 13, fontFamily: "'Noto Serif SC', serif", color: THEME.green, cursor: 'pointer' }}>
                  {item.word}
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence>{popup && <WordPopup word={popup} onClose={() => setPopup(null)} />}</AnimatePresence>
        </>
      )}
    </motion.div>
  )
}

// ══ 文化句结果 ══
function WritingResult({ data, onMomCopy }: { data: any; onMomCopy: () => void }) {
  const [popup, setPopup] = useState<string | null>(null)
  const keyWords = data?.key_words || []

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

      {/* 书面版 */}
      {data.draft && (
        <div style={{ background: THEME.white, borderRadius: 16, padding: '16px', marginBottom: 8, border: '1px solid rgba(26,60,94,0.1)' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.navy, marginBottom: 10, fontFamily: 'sans-serif' }}>✍️ 书面升华版</div>
          <div style={{ fontSize: 14, color: THEME.text, lineHeight: 2.1, fontFamily: "'Noto Serif SC', serif" }}>{data.draft}</div>
        </div>
      )}

      {/* 文化根脉 */}
      {data.cultural_sentence && (
        <div style={{ background: THEME.white, borderRadius: 16, padding: '16px', marginBottom: 8, border: '2px solid rgba(200,160,96,0.3)' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.gold, marginBottom: 10, fontFamily: 'sans-serif' }}>📜 文化根脉</div>
          <div style={{ fontSize: 19, fontFamily: "'Noto Serif SC', serif", fontWeight: 700, color: THEME.text, lineHeight: 1.8, marginBottom: 6 }}>{data.cultural_sentence}</div>
          {data.cultural_author && <div style={{ fontSize: 12, color: THEME.textDim, marginBottom: 8, fontFamily: 'sans-serif' }}>—— {data.cultural_author}</div>}
          {data.cultural_meaning && <div style={{ fontSize: 13, color: THEME.textMid, lineHeight: 1.75, fontFamily: 'sans-serif', borderTop: '1px dashed rgba(200,160,96,0.3)', paddingTop: 8 }}>{data.cultural_meaning}</div>}
          {(data.ancient_connection || data.overseas_connection) && (
            <div style={{ marginTop: 8 }}>
              {data.ancient_connection && <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(200,160,96,0.07)', fontSize: 12, color: THEME.textMid, lineHeight: 1.75, fontFamily: 'sans-serif', marginBottom: 6 }}>🌊 {data.ancient_connection}</div>}
              {data.overseas_connection && <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(26,60,94,0.05)', fontSize: 12, color: THEME.navy, lineHeight: 1.75, fontFamily: 'sans-serif' }}>🌍 {data.overseas_connection}</div>}
            </div>
          )}
        </div>
      )}

      {/* 妈妈台词（默认展开） */}
      {data.mom_script && (
        <Accordion title="妈妈三步台词" emoji="👩" defaultOpen={true} borderColor="rgba(200,160,96,0.35)">
          <div style={{ paddingTop: 12 }}>
            <div style={{ padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(200,160,96,0.1), rgba(192,57,43,0.05))', border: '1px solid rgba(200,160,96,0.2)', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: THEME.gold, fontWeight: 700, marginBottom: 6, fontFamily: 'sans-serif' }}>① 先念 → ② 解释 → ③ 连接孩子经历</div>
              <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.9, fontStyle: 'italic', fontFamily: 'sans-serif' }}>「{data.mom_script}」</div>
            </div>
            {data.tips && <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(192,57,43,0.06)', fontSize: 12, color: THEME.textMid, lineHeight: 1.7, fontFamily: 'sans-serif', marginBottom: 10 }}>💡 {data.tips}</div>}
            <button onClick={onMomCopy} style={{ width: '100%', padding: '9px', borderRadius: 10, border: `1px solid ${THEME.gold}`, background: 'transparent', fontSize: 12, color: THEME.gold, fontWeight: 600, cursor: 'pointer', fontFamily: 'sans-serif' }}>
              📋 复制台词
            </button>
          </div>
        </Accordion>
      )}

      {/* 关键词（点击弹窗） */}
      {keyWords.length > 0 && (
        <>
          <div style={{ background: THEME.white, borderRadius: 16, padding: '14px 16px', marginBottom: 8, border: '1px solid rgba(200,160,96,0.15)' }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.red, marginBottom: 10, fontFamily: 'sans-serif' }}>🌳 关键词</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {keyWords.map((w: string, i: number) => (
                <button key={i} onClick={() => setPopup(w)}
                  style={{ padding: '6px 13px', borderRadius: 20, background: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.2)', fontSize: 13, fontFamily: "'Noto Serif SC', serif", color: THEME.green, cursor: 'pointer' }}>
                  {w}
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence>{popup && <WordPopup word={popup} onClose={() => setPopup(null)} />}</AnimatePresence>
        </>
      )}

      {/* 填空练习 */}
      {data.fill_blanks && (
        <Accordion title="填空练习" emoji="✏️" borderColor="rgba(45,106,79,0.2)">
          <div style={{ paddingTop: 10, fontSize: 13, color: THEME.text, lineHeight: 1.85, fontFamily: 'sans-serif' }}>{data.fill_blanks}</div>
        </Accordion>
      )}
    </motion.div>
  )
}

// ══ Tab 导航 ══
function TabBar({ active, onChange }: { active: TabType; onChange: (t: TabType) => void }) {
  const tabs: { key: TabType; label: string; emoji: string }[] = [
    { key: 'hanzi', label: '汉字拆解', emoji: '🧩' },
    { key: 'chengyu', label: '成语解读', emoji: '🌟' },
    { key: 'writing', label: '文化句', emoji: '📜' },
  ]
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
      {tabs.map(t => (
        <motion.button key={t.key} whileTap={{ scale: 0.95 }} onClick={() => onChange(t.key)}
          style={{ flex: 1, padding: '10px 6px', borderRadius: 12, border: 'none', background: active === t.key ? THEME.red : 'rgba(192,57,43,0.06)', color: active === t.key ? '#fff' : THEME.textMid, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Noto Sans SC', sans-serif", transition: 'all 0.2s', boxShadow: active === t.key ? '0 4px 12px rgba(192,57,43,0.25)' : 'none' }}>
          <div style={{ fontSize: 18, marginBottom: 3 }}>{t.emoji}</div>
          <div>{t.label}</div>
        </motion.button>
      ))}
    </div>
  )
}

// ══ 智能推荐字（从 hanzi_library 按孩子级别推荐未学字） ══
function SmartQuickChars({ level, learnedChars, onSelect }: { level: string; learnedChars: string[]; onSelect: (c: string) => void }) {
  const [chars, setChars] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('hanzi_library')
          .select('char')
          .eq('level_tag', level)
          .not('char', 'in', `(${learnedChars.slice(0, 50).join(',') || 'x'})`)
          .order('hit_count', { ascending: false })
          .limit(10)
        if (data?.length) {
          setChars(data.map((d: any) => d.char))
        } else {
          // fallback：按难度顺序的常用字
          const fallbacks: Record<string, string[]> = {
            R1: ['山', '水', '日', '月', '火', '木', '人', '口', '手', '心'],
            R2: ['明', '休', '家', '笑', '飞', '鱼', '花', '草', '风', '云'],
            R3: ['森', '闻', '静', '思', '望', '梦', '情', '意', '声', '影'],
            R4: ['觉', '察', '缘', '德', '境', '智', '善', '悟', '慧', '诚'],
            R5: ['蕴', '醇', '澄', '廉', '谦', '逸', '渊', '翰', '璞', '骥'],
          }
          setChars(fallbacks[level] || fallbacks.R2)
        }
      } catch {
        setChars(['山', '水', '日', '月', '火', '木', '人', '口', '手', '心'])
      }
    }
    load()
  }, [level, learnedChars.length])

  if (!chars.length) return null

  return (
    <>
      <div style={{ fontSize: 10, color: THEME.textDim, letterSpacing: 3, marginBottom: 8, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
        {level} 推荐
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {chars.map(c => (
          <motion.button key={c} whileTap={{ scale: 0.88 }} onClick={() => onSelect(c)}
            style={{ width: 38, height: 38, background: THEME.paper, border: '1.5px solid rgba(200,160,96,0.28)', borderRadius: 10, fontSize: 20, fontFamily: "'Noto Serif SC', serif", color: THEME.textMid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {c}
          </motion.button>
        ))}
      </div>
    </>
  )
}

// ══ 主页面 ══
export default function DecodePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('hanzi')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [userId, setUserId] = useState('')
  const [childInfo, setChildInfo] = useState<ChildInfo>({ name: '', grade: '', level: 'R2', school: '' })
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
        setChildInfo({ name: info.name || '', grade: info.grade || '', level: info.level || 'R2', school: info.school || '' })
      }
    } catch {}
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return
      setUserId(uid)
      const { data: sessions } = await supabase
        .from('chinese_sessions').select('input_type, result, learned_at')
        .eq('user_id', uid).order('learned_at', { ascending: false }).limit(200)
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
        await supabase.from('chinese_sessions').insert({ user_id: userId, input_text: query, input_type: activeTab, result: json, location_scene: locationScene, learned_at: new Date().toISOString() })
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

  const QUICK_CHENGYU = ['very many people', '突然下好大的雨', '今天作业多到写不完']
  const QUICK_WRITING = ['今天去夜市，人超多，好开心', '下雨天在家，有点无聊', '今天考试考得很好']

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
              {activeTab === 'hanzi' && <HanziResult data={data} char={input} onMomCopy={handleMomCopy} childLevel={childInfo.level} />}
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
