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
// ══════════════════════════════════════════════
// 美学系统：纸质感+红金（教育气质）
// ══════════════════════════════════════════════
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
  mint: '#F0F9F4',
}

const LEVELS: Record<string, { color: string; bg: string; label: string }> = {
  R1: { color: '#C03A2B', bg: '#FFF0EE', label: '入门' },
  R2: { color: '#BA6A00', bg: '#FFF6EE', label: '基础' },
  R3: { color: '#A07800', bg: '#FFFBEE', label: '进阶' },
  R4: { color: '#5C6E00', bg: '#F5F9EE', label: '提升' },
  R5: { color: '#2D6A4F', bg: '#EDFAF1', label: '高阶' },
}

// ══ 地理围栏场景映射 ══
const LOCATION_SCENES: Record<string, string> = {
  TH: '清迈', SG: '新加坡', AU: '澳大利亚',
  GB: '英国', US: '美国', MY: '马来西亚',
  default: '海外华人家庭',
}

// ══ 快速体验 ══
const QUICK_CHARS_R1 = ['山', '水', '日', '月', '火', '木', '人', '口', '手', '心']
const QUICK_CHARS_R2 = ['明', '休', '家', '笑', '飞', '鱼', '花', '草', '风', '云']
const QUICK_CHARS_R3 = ['森', '闻', '静', '思', '望', '梦', '情', '意', '声', '影']
const QUICK_CHARS = QUICK_CHARS_R2  // 默认展示R2，初始化后按孩子级别替换

const QUICK_CHENGYU = ['very many people', '突然下好大的雨', '今天作业多到写不完']
const QUICK_WRITING = ['今天去夜市，人超多，好开心', '下雨天在家，有点无聊', '今天考试考得很好']

// ══ 加载文案 ══
const LOAD_MSGS: Record<string, string[]> = {
  hanzi: ['正在查阅字理古籍…', '翻阅《说文解字》…', '正在拆解字的骨架…', '绘制汉字画面中…'],
  chengyu: ['正在连接中英智慧…', '寻找最贴切的成语…', '编写妈妈台词中…', '正在生成场景…'],
  writing: ['感受孩子的经历…', '连接古人的智慧…', '正在寻找共鸣古诗…', '为妈妈准备台词…'],
}
// ══ 数据类型 ══
type TabType = 'hanzi' | 'chengyu' | 'writing'
type ChildInfo = {
  name: string
  grade: string
  level: string  // R1-R5
  school: string
}
type LearnedItem = {
  char?: string
  chengyu?: string
  type: TabType
  mastery: number
  learned_at: string
}

// ══════════════════════════════════════════════
// 子组件：Tab导航
// ══════════════════════════════════════════════
function TabBar({ active, onChange }: { active: TabType; onChange: (t: TabType) => void }) {
  const tabs: { key: TabType; label: string; emoji: string; hint: string }[] = [
    { key: 'hanzi', label: '汉字拆解', emoji: '🧩', hint: '输入一个字' },
    { key: 'chengyu', label: '成语解读', emoji: '🌟', hint: '孩子怎么说' },
    { key: 'writing', label: '文化句', emoji: '📜', hint: '孩子的故事' },
  ]
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
      {tabs.map(t => (
        <motion.button
          key={t.key}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(t.key)}
          style={{
            flex: 1, padding: '10px 6px', borderRadius: 12, border: 'none',
            background: active === t.key
              ? THEME.red
              : 'rgba(192,57,43,0.06)',
            color: active === t.key ? '#fff' : THEME.textMid,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Noto Sans SC', sans-serif",
            transition: 'all 0.2s',
            boxShadow: active === t.key ? '0 4px 12px rgba(192,57,43,0.25)' : 'none',
          }}
        >
          <div style={{ fontSize: 18, marginBottom: 3 }}>{t.emoji}</div>
          <div>{t.label}</div>
        </motion.button>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════
// 子组件：汉字拆解结果
// ══════════════════════════════════════════════
function HanziResult({ data, char, onMomCopy }: { data: any; char: string; onMomCopy: () => void }) {
  const [showMerged, setShowMerged] = useState(false)
  const [momOpen, setMomOpen] = useState(false)
  const [phonicsOpen, setPhonicsOpen] = useState(false)
  const lv = data?.level || 'R2'
  const lvCfg = LEVELS[lv] || LEVELS.R2
  const exts = Array.isArray(data?.extension) ? data.extension : []

  useEffect(() => {
  const t1 = setTimeout(() => setShowMerged(true), 3000)
  return () => clearTimeout(t1)
}, [])

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

      {/* ── 合字动画卡 ── */}
      <div style={{ background: THEME.white, borderRadius: 20, padding: '24px 20px', boxShadow: '0 4px 24px rgba(26,18,8,0.07)', border: '1px solid rgba(200,160,96,0.13)', marginBottom: 12, textAlign: 'center' }}>

        <AnimatePresence mode="wait">
          {!showMerged ? (
            <motion.div key="parts" exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.35 }}
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 12, minHeight: 90 }}>
              {(data.parts || []).map((p: any, i: number) => (
                <React.Fragment key={i}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 14, background: 'rgba(192,57,43,0.08)', border: '2px solid rgba(192,57,43,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontFamily: "'Noto Serif SC', serif", color: THEME.red }}>
                      {p.char}
                    </div>
                    <div style={{ fontSize: 10, color: THEME.textDim, textAlign: 'center', maxWidth: 68, fontFamily: 'sans-serif', lineHeight: 1.4 }}>{p.image}</div>
                  </div>
                  {i < (data.parts || []).length - 1 && (
                    <span style={{ fontSize: 20, color: THEME.gold, opacity: 0.6 }}>+</span>
                  )}
                </React.Fragment>
              ))}
              <span style={{ fontSize: 20, color: THEME.gold, opacity: 0.6 }}>=</span>
              <div style={{ fontSize: 48, fontFamily: "'Noto Serif SC', serif", color: 'rgba(192,57,43,0.15)' }}>{char}</div>
            </motion.div>
          ) : (
            <motion.div key="merged"
              initial={{ opacity: 0, scale: 0.2, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 16 }}
              style={{ fontSize: 88, fontFamily: "'Noto Serif SC', serif", color: THEME.text, lineHeight: 1, marginBottom: 12, textShadow: '0 6px 32px rgba(26,18,8,0.12)' }}>
              {char}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 繁体对比 */}
        {data.traditional && data.traditional !== char && (
          <div style={{ fontSize: 12, color: THEME.textDim, marginBottom: 8, fontFamily: 'sans-serif' }}>
            繁体：<span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 16, color: THEME.textMid }}>{data.traditional}</span>
          </div>
        )}

        {/* 拼音+级别 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ padding: '5px 16px', borderRadius: 20, fontSize: 14, background: THEME.paper, border: '1px solid rgba(200,160,96,0.3)', color: THEME.textMid, fontFamily: 'sans-serif' }}>{data.pinyin}</span>
          <span style={{ padding: '5px 16px', borderRadius: 20, fontSize: 13, background: lvCfg.bg, border: `1px solid ${lvCfg.color}44`, color: lvCfg.color, fontFamily: 'sans-serif' }}>{lv} · {lvCfg.label}</span>
        </div>

        <div style={{ fontSize: 17, fontWeight: 600, color: THEME.text, marginBottom: 14, fontFamily: "'Noto Serif SC', serif" }}>{data.meaning}</div>

        {/* 部件标签 */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
          {(data.parts || []).map((p: any, i: number) => (
            <div key={i} style={{ padding: '6px 12px', background: 'rgba(192,57,43,0.06)', borderRadius: 10, fontSize: 12, color: THEME.textMid, display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'sans-serif' }}>
              <span style={{ fontSize: 17, fontFamily: "'Noto Serif SC', serif" }}>{p.char}</span>
              <span style={{ color: THEME.textDim }}>{p.name} · {p.image}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 造字演变 ── */}
      {data.evolution && (
        <div style={{ background: THEME.white, borderRadius: 16, padding: '16px 18px', marginBottom: 10, border: '1px solid rgba(200,160,96,0.13)' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.gold, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'sans-serif' }}>📜 造字演变</div>
          <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.85, fontFamily: 'sans-serif' }}>{data.evolution}</div>
        </div>
      )}

      {/* ── Phonics桥梁（可展开） ── */}
      {data.english_link && (
        <div style={{ background: THEME.white, borderRadius: 16, overflow: 'hidden', marginBottom: 10, border: '1px solid rgba(26,60,94,0.1)' }}>
          <button onClick={() => setPhonicsOpen(!phonicsOpen)}
            style={{ width: '100%', padding: '14px 18px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔗</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.navy, fontFamily: 'sans-serif' }}>英文自然拼读连接</div>
                <div style={{ fontSize: 11, color: THEME.textDim, fontFamily: 'sans-serif' }}>Phonics × 字理，双语解锁</div>
              </div>
            </div>
            <motion.span animate={{ rotate: phonicsOpen ? 180 : 0 }} style={{ fontSize: 18, color: THEME.gold, display: 'inline-block' }}>⌄</motion.span>
          </button>
          <AnimatePresence>
            {phonicsOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
                <div style={{ padding: '0 18px 16px', borderTop: '1px solid rgba(200,160,96,0.15)', fontFamily: 'sans-serif' }}>
                  <div style={{ fontSize: 13, color: THEME.blue, lineHeight: 1.85, marginTop: 12, fontStyle: 'italic' }}>{data.english_link}</div>
                  {data.phonics_bridge && (
                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(26,60,94,0.05)', fontSize: 12, color: THEME.textMid, lineHeight: 1.7 }}>
                      💡 {data.phonics_bridge}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── 文化故事 ── */}
      {data.story && (
        <div style={{ background: THEME.white, borderRadius: 16, padding: '16px 18px', marginBottom: 10, border: '1px solid rgba(200,160,96,0.13)' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.red, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'sans-serif' }}>📖 文化故事</div>
          <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.85, fontFamily: 'sans-serif' }}>{data.story}</div>
          {data.scene && (
            <div style={{ background: 'rgba(200,160,96,0.08)', borderRadius: 10, padding: '10px 13px', borderLeft: '3px solid #C8A060', marginTop: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: THEME.gold, marginBottom: 4, fontFamily: 'sans-serif' }}>🌍 生活场景</div>
              <div style={{ fontSize: 12, color: THEME.textMid, lineHeight: 1.75, fontStyle: 'italic', fontFamily: 'sans-serif' }}>{data.scene}</div>
            </div>
          )}
        </div>
      )}

      {/* ── 字族+成语 ── */}
      <div style={{ background: THEME.white, borderRadius: 16, padding: '16px 18px', marginBottom: 10, border: '1px solid rgba(200,160,96,0.13)' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {data.family?.length > 0 && (
            <div style={{ flex: 1, minWidth: 130 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.red, textTransform: 'uppercase', marginBottom: 10, fontFamily: 'sans-serif' }}>🌳 字族家庭</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {data.family.map((f: string, i: number) => (
                  <span key={i} style={{ padding: '3px 10px', borderRadius: 14, background: 'rgba(45,106,79,0.08)', color: THEME.green, fontSize: 13, fontFamily: "'Noto Serif SC', serif", fontWeight: 600 }}>{f}</span>
                ))}
              </div>
            </div>
          )}
          {(exts.length > 0 || data.chengyu) && (
            <div style={{ flex: 1, minWidth: 130 }}>
              {exts.length > 0 && (
                <>
                  <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.red, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'sans-serif' }}>🔤 延伸词汇</div>
                  {exts.filter(Boolean).map((e: string, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: THEME.textMid, lineHeight: 1.9, fontFamily: 'sans-serif' }}>· {e}</div>
                  ))}
                </>
              )}
              {data.chengyu && (
                <div style={{ marginTop: exts.length > 0 ? 12 : 0 }}>
                  <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.red, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'sans-serif' }}>🌟 相关成语</div>
                  <div style={{ fontSize: 18, fontFamily: "'Noto Serif SC', serif", color: THEME.text, marginBottom: 3 }}>{data.chengyu}</div>
                  <div style={{ fontSize: 11, color: THEME.textDim, lineHeight: 1.7, fontFamily: 'sans-serif' }}>{data.cy_story}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 妈妈台词（最重要，永远在最显眼处） ── */}
      <div style={{ background: THEME.white, borderRadius: 16, overflow: 'hidden', border: '2px solid rgba(200,160,96,0.35)', marginBottom: 10, boxShadow: '0 4px 20px rgba(200,160,96,0.12)' }}>
        <button onClick={() => setMomOpen(!momOpen)}
          style={{ width: '100%', padding: '16px 18px', background: momOpen ? 'rgba(200,160,96,0.06)' : 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
          <div>
            <div style={{ fontSize: 15, color: THEME.textMid, fontFamily: "'Noto Serif SC', serif", fontWeight: 700 }}>👩 妈妈台词</div>
            <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 2, fontFamily: 'sans-serif' }}>
              {momOpen ? '点击收起' : '点击展开 · 今天就能用'}
            </div>
          </div>
          <motion.span animate={{ rotate: momOpen ? 180 : 0 }} style={{ fontSize: 20, color: THEME.gold, display: 'inline-block' }}>⌄</motion.span>
        </button>
        <AnimatePresence>
          {momOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(200,160,96,0.2)' }}>
                {/* 主台词 */}
                {data.mom_script && (
                  <div style={{ marginTop: 14, padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(200,160,96,0.1), rgba(192,57,43,0.05))', border: '1px solid rgba(200,160,96,0.2)' }}>
                    <div style={{ fontSize: 11, color: THEME.gold, fontWeight: 700, marginBottom: 8, letterSpacing: '0.1em', fontFamily: 'sans-serif' }}>📢 主台词</div>
                    <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.9, fontStyle: 'italic', fontFamily: 'sans-serif' }}>「{data.mom_script}」</div>
                  </div>
                )}
                {/* 引导问题 */}
                {(data.mom_questions || []).length > 0 && (
                  <>
                    <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.gold, margin: '14px 0 10px', fontFamily: 'sans-serif' }}>自然聊天，不是考试</div>
                    {(data.mom_questions || []).map((q: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: THEME.gold, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, marginTop: 2, fontFamily: 'sans-serif' }}>{i + 1}</div>
                        <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.75, fontFamily: 'sans-serif' }}>{q}</div>
                      </div>
                    ))}
                  </>
                )}
                {/* 小贴士 */}
                <div style={{ background: 'rgba(192,57,43,0.06)', borderRadius: 10, padding: '10px 13px', marginTop: 4 }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: THEME.red, fontFamily: 'sans-serif', marginBottom: 4 }}>💡 小贴士</div>
                  <div style={{ fontSize: 12, color: THEME.textMid, lineHeight: 1.7, fontFamily: 'sans-serif' }}>问完后，让孩子用「{char}」造一个句子。不需要正确，有趣就好。</div>
                </div>
                {/* 复制按钮 */}
                <motion.button whileTap={{ scale: 0.95 }} onClick={onMomCopy}
                  style={{ width: '100%', marginTop: 12, padding: '10px', borderRadius: 10, border: `1px solid ${THEME.gold}`, background: 'transparent', fontSize: 13, color: THEME.gold, fontWeight: 600, cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  📋 复制台词
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  )
}

// ══════════════════════════════════════════════
// 子组件：成语解读结果
// ══════════════════════════════════════════════
function ChengYuResult({ data, onMomCopy }: { data: any; onMomCopy: () => void }) {
  const [momOpen, setMomOpen] = useState(false)

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

      {/* ── 成语主卡 ── */}
      <div style={{ background: THEME.white, borderRadius: 20, padding: '24px 20px', boxShadow: '0 4px 24px rgba(26,18,8,0.07)', border: '1px solid rgba(200,160,96,0.13)', marginBottom: 12, textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 150, damping: 15 }}
          style={{ fontSize: 52, fontFamily: "'Noto Serif SC', serif", fontWeight: 900, color: THEME.text, letterSpacing: 6, marginBottom: 10 }}>
          {data.chengyu}
        </motion.div>
        <div style={{ fontSize: 14, color: THEME.textDim, marginBottom: 12, fontFamily: 'sans-serif' }}>{data.pinyin}</div>
        {data.level && (
          <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: 'rgba(200,160,96,0.12)', color: THEME.gold, fontSize: 12, fontWeight: 700, fontFamily: 'sans-serif', marginBottom: 12 }}>
            {data.level === '画面级' ? '🎨 画面级' : data.level === '感受级' ? '💭 感受级' : '🧠 智慧级'}
          </span>
        )}
        <div style={{ fontSize: 15, fontWeight: 600, color: THEME.text, fontFamily: "'Noto Serif SC', serif" }}>{data.meaning}</div>
      </div>

      {/* ── 中英对照（核心教学维度） ── */}
      {data.english_idiom && (
        <div style={{ background: THEME.white, borderRadius: 16, padding: '16px 18px', marginBottom: 10, border: '1px solid rgba(26,60,94,0.1)' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.navy, textTransform: 'uppercase', marginBottom: 10, fontFamily: 'sans-serif' }}>🔗 中英习语对照</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: 'rgba(26,60,94,0.05)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: THEME.textDim, marginBottom: 4, fontFamily: 'sans-serif' }}>English Idiom</div>
              <div style={{ fontSize: 13, color: THEME.navy, fontStyle: 'italic', fontFamily: 'sans-serif' }}>"{data.english_idiom}"</div>
            </div>
            <div style={{ fontSize: 18, color: THEME.gold }}>⟷</div>
            <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: 'rgba(192,57,43,0.05)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: THEME.textDim, marginBottom: 4, fontFamily: 'sans-serif' }}>中文成语</div>
              <div style={{ fontSize: 20, color: THEME.red, fontFamily: "'Noto Serif SC', serif", fontWeight: 700 }}>{data.chengyu}</div>
            </div>
          </div>
          {data.idiom_comparison && (
            <div style={{ marginTop: 10, fontSize: 12, color: THEME.textMid, lineHeight: 1.75, fontStyle: 'italic', fontFamily: 'sans-serif', paddingLeft: 4 }}>
              💡 {data.idiom_comparison}
            </div>
          )}
        </div>
      )}

      {/* ── 来源+画面 ── */}
      {(data.origin || data.image) && (
        <div style={{ background: THEME.white, borderRadius: 16, padding: '16px 18px', marginBottom: 10, border: '1px solid rgba(200,160,96,0.13)' }}>
          {data.origin && (
            <>
              <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.gold, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'sans-serif' }}>📖 来源</div>
              <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.85, marginBottom: data.image ? 10 : 0, fontFamily: 'sans-serif' }}>{data.origin}</div>
            </>
          )}
          {data.image && (
            <div style={{ padding: '10px 13px', borderRadius: 10, background: 'rgba(45,106,79,0.06)', fontSize: 13, color: THEME.textMid, lineHeight: 1.75, fontFamily: 'sans-serif' }}>
              🎨 {data.image}
            </div>
          )}
        </div>
      )}

      {/* ── 本地场景+孩子用法 ── */}
      {(data.local_scene || data.child_use) && (
        <div style={{ background: THEME.white, borderRadius: 16, padding: '16px 18px', marginBottom: 10, border: '1px solid rgba(200,160,96,0.13)' }}>
          {data.local_scene && (
            <div style={{ marginBottom: data.child_use ? 10 : 0 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.gold, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'sans-serif' }}>🌍 生活场景</div>
              <div style={{ fontSize: 13, color: THEME.textMid, lineHeight: 1.75, fontStyle: 'italic', fontFamily: 'sans-serif' }}>{data.local_scene}</div>
            </div>
          )}
          {data.child_use && (
            <div style={{ padding: '10px 13px', borderRadius: 10, background: 'rgba(200,160,96,0.07)', border: '1px solid rgba(200,160,96,0.2)' }}>
              <div style={{ fontSize: 10, color: THEME.gold, marginBottom: 4, fontFamily: 'sans-serif' }}>✨ 孩子今天可以说：</div>
              <div style={{ fontSize: 14, color: THEME.text, fontFamily: "'Noto Serif SC', serif", fontWeight: 600 }}>「{data.child_use}」</div>
            </div>
          )}
        </div>
      )}

      {/* ── 妈妈台词 ── */}
      <div style={{ background: THEME.white, borderRadius: 16, overflow: 'hidden', border: '2px solid rgba(200,160,96,0.35)', marginBottom: 10, boxShadow: '0 4px 20px rgba(200,160,96,0.12)' }}>
        <button onClick={() => setMomOpen(!momOpen)}
          style={{ width: '100%', padding: '16px 18px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
          <div>
            <div style={{ fontSize: 15, color: THEME.textMid, fontFamily: "'Noto Serif SC', serif", fontWeight: 700 }}>👩 妈妈台词</div>
            <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 2, fontFamily: 'sans-serif' }}>{momOpen ? '点击收起' : '三步法·今天就用'}</div>
          </div>
          <motion.span animate={{ rotate: momOpen ? 180 : 0 }} style={{ fontSize: 20, color: THEME.gold, display: 'inline-block' }}>⌄</motion.span>
        </button>
        <AnimatePresence>
          {momOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(200,160,96,0.2)' }}>
                <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(200,160,96,0.1), rgba(192,57,43,0.05))', border: '1px solid rgba(200,160,96,0.2)' }}>
                  <div style={{ fontSize: 11, color: THEME.gold, fontWeight: 700, marginBottom: 8, fontFamily: 'sans-serif' }}>📢 妈妈这样说：</div>
                  <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.9, fontStyle: 'italic', fontFamily: 'sans-serif' }}>「{data.mom_script}」</div>
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={onMomCopy}
                  style={{ width: '100%', marginTop: 12, padding: '10px', borderRadius: 10, border: `1px solid ${THEME.gold}`, background: 'transparent', fontSize: 13, color: THEME.gold, fontWeight: 600, cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  📋 复制台词
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  )
}

// ══════════════════════════════════════════════
// 子组件：文化句结果
// ══════════════════════════════════════════════
function WritingResult({ data, onMomCopy }: { data: any; onMomCopy: () => void }) {
  const [momOpen, setMomOpen] = useState(false)

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

      {/* ── 书面版 ── */}
      {data.draft && (
        <div style={{ background: THEME.white, borderRadius: 16, padding: '18px', marginBottom: 10, border: '1px solid rgba(26,60,94,0.08)' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.navy, textTransform: 'uppercase', marginBottom: 10, fontFamily: 'sans-serif' }}>✍️ 书面升华版</div>
          <div style={{ fontSize: 14, color: THEME.text, lineHeight: 2.1, fontFamily: "'Noto Serif SC', serif" }}>{data.draft}</div>
        </div>
      )}

      {/* ── 文化根脉（核心） ── */}
      {data.cultural_sentence && (
        <div style={{ background: THEME.white, borderRadius: 16, padding: '18px', marginBottom: 10, border: '2px solid rgba(200,160,96,0.3)', boxShadow: '0 4px 20px rgba(200,160,96,0.1)' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.gold, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'sans-serif' }}>📜 文化根脉</div>
          <div style={{ fontSize: 20, fontFamily: "'Noto Serif SC', serif", fontWeight: 700, color: THEME.text, lineHeight: 1.8, marginBottom: 8 }}>
            {data.cultural_sentence}
          </div>
          {data.cultural_author && (
            <div style={{ fontSize: 12, color: THEME.textDim, marginBottom: 10, fontFamily: 'sans-serif' }}>—— {data.cultural_author}</div>
          )}
          {data.cultural_meaning && (
            <div style={{ fontSize: 13, color: THEME.textMid, lineHeight: 1.75, fontFamily: 'sans-serif', borderTop: '1px dashed rgba(200,160,96,0.3)', paddingTop: 10 }}>
              {data.cultural_meaning}
            </div>
          )}
          {data.ancient_connection && (
            <div style={{ marginTop: 10, padding: '10px 13px', borderRadius: 10, background: 'rgba(200,160,96,0.07)', fontSize: 12, color: THEME.textMid, lineHeight: 1.75, fontStyle: 'italic', fontFamily: 'sans-serif' }}>
              🌊 {data.ancient_connection}
            </div>
          )}
          {data.overseas_connection && (
            <div style={{ marginTop: 8, padding: '10px 13px', borderRadius: 10, background: 'rgba(26,60,94,0.05)', fontSize: 12, color: THEME.navy, lineHeight: 1.75, fontFamily: 'sans-serif' }}>
              🌍 {data.overseas_connection}
            </div>
          )}
        </div>
      )}

      {/* ── 填空练习 ── */}
      {data.fill_blanks && (
        <div style={{ background: THEME.white, borderRadius: 16, padding: '16px 18px', marginBottom: 10, border: '1px solid rgba(45,106,79,0.15)' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: THEME.green, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'sans-serif' }}>✏️ 填空练习</div>
          <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.85, fontFamily: 'sans-serif' }}>{data.fill_blanks}</div>
        </div>
      )}

      {/* ── 妈妈三步台词 ── */}
      <div style={{ background: THEME.white, borderRadius: 16, overflow: 'hidden', border: '2px solid rgba(200,160,96,0.35)', marginBottom: 10, boxShadow: '0 4px 20px rgba(200,160,96,0.12)' }}>
        <button onClick={() => setMomOpen(!momOpen)}
          style={{ width: '100%', padding: '16px 18px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
          <div>
            <div style={{ fontSize: 15, color: THEME.textMid, fontFamily: "'Noto Serif SC', serif", fontWeight: 700 }}>👩 妈妈三步台词</div>
            <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 2, fontFamily: 'sans-serif' }}>{momOpen ? '点击收起' : '念给孩子听，根扎进去了'}</div>
          </div>
          <motion.span animate={{ rotate: momOpen ? 180 : 0 }} style={{ fontSize: 20, color: THEME.gold, display: 'inline-block' }}>⌄</motion.span>
        </button>
        <AnimatePresence>
          {momOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(200,160,96,0.2)' }}>
                <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(200,160,96,0.1), rgba(192,57,43,0.05))', border: '1px solid rgba(200,160,96,0.2)' }}>
                  <div style={{ fontSize: 11, color: THEME.gold, fontWeight: 700, marginBottom: 8, fontFamily: 'sans-serif' }}>① 先念 → ② 解释 → ③ 连接孩子经历</div>
                  <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.9, fontStyle: 'italic', fontFamily: 'sans-serif' }}>「{data.mom_script}」</div>
                </div>
                {data.tips && (
                  <div style={{ marginTop: 10, padding: '10px 13px', borderRadius: 10, background: 'rgba(192,57,43,0.06)', fontSize: 12, color: THEME.textMid, lineHeight: 1.7, fontFamily: 'sans-serif' }}>
                    💡 {data.tips}
                  </div>
                )}
                <motion.button whileTap={{ scale: 0.95 }} onClick={onMomCopy}
                  style={{ width: '100%', marginTop: 12, padding: '10px', borderRadius: 10, border: `1px solid ${THEME.gold}`, background: 'transparent', fontSize: 13, color: THEME.gold, fontWeight: 600, cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  📋 复制台词
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  )
}

// ══════════════════════════════════════════════
// 主页面
// ══════════════════════════════════════════════
export default function DecodePage() {
  const router = useRouter()

  // ── 状态 ──
  const [activeTab, setActiveTab] = useState<TabType>('hanzi')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [composing, setComposing] = useState(false)
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

  // ── 初始化 ──
  const init = useCallback(async () => {
    // 读localStorage孩子信息
    try {
      const raw = localStorage.getItem('child_assessment')
      if (raw) {
        const info = JSON.parse(raw)
        setChildInfo({
          name: info.name || '',
          grade: info.grade || '',
          level: info.level || 'R2',
          school: info.school || '',
        })
      }
    } catch {}

    // 读Supabase用户+学习记录
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return
      setUserId(uid)

      // 读已学记录
      const { data: sessions } = await supabase
        .from('chinese_sessions')
        .select('input_type, result, learned_at')
        .eq('user_id', uid)
        .order('learned_at', { ascending: false })
        .limit(200)

      if (sessions) {
        const items: LearnedItem[] = sessions
          .filter(s => s.result)
          .map(s => {
            const r = typeof s.result === 'string' ? JSON.parse(s.result) : s.result
            return {
              char: r?.char,
              chengyu: r?.chengyu,
              type: s.input_type as TabType,
              mastery: 70 + Math.random() * 30,
              learned_at: s.learned_at,
            }
          })
        setLearnedItems(items)
      }

      // 读家庭DNA的位置
      const { data: dna } = await supabase
        .from('family_learning_dna')
        .select('location')
        .eq('user_id', uid)
        .single()
      if (dna?.location) {
        setLocationScene(LOCATION_SCENES[dna.location] || LOCATION_SCENES.default)
      }
    } catch {}
  }, [])

  useEffect(() => { init() }, [init])
  useEffect(() => {
  const userId = localStorage.getItem('anon_id') || crypto.randomUUID()
  localStorage.setItem('anon_id', userId)

  // 先读缓存
  fetch('/api/geofence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
    .then(r => r.json())
    .then(loc => {
      if (!loc.error) {
        setUserLocation(loc)
        setLocationScene(loc.city ? `${loc.city}华人陪读家庭` : '海外华人家庭')
      }
    })

  // 再用 GPS 精确更新
  navigator.geolocation?.getCurrentPosition(
    (pos) => {
      fetch('/api/geofence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      })
        .then(r => r.json())
        .then(loc => {
          if (!loc.error) {
            setUserLocation(loc)
            setLocationScene(`${loc.city}华人陪读家庭`)
          }
        })
    },
    () => {}
  )
}, [])
  // ── 切tab时清空结果 ──
  const handleTabChange = (t: TabType) => {
    setActiveTab(t)
    setData(null)
    setError('')
    setInput('')
  }

  // ── 加载消息轮播 ──
  const startLoadMsg = (tab: TabType) => {
    const msgs = LOAD_MSGS[tab]
    let i = 0
    setLoadMsg(msgs[0])
    loadMsgRef.current = setInterval(() => {
      i = (i + 1) % msgs.length
      setLoadMsg(msgs[i])
    }, 1200)
  }
  const stopLoadMsg = () => {
    if (loadMsgRef.current) clearInterval(loadMsgRef.current)
  }

  // ── 核心：调用API ──
  const generate = async (overrideInput?: string) => {
    const query = (overrideInput || input).trim()
    if (!query) return

    setInput(query)
    setLoading(true)
    setData(null)
    setError('')
    startLoadMsg(activeTab)

    // 已学的字列表（给API避免重复）
    const learnedChars = learnedItems
  .filter(i => i.type === 'hanzi' && i.char)
  .map(i => i.char!)

try {
  const res = await fetch('/api/chinese/decode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: activeTab,
      char: activeTab === 'hanzi' ? query : undefined,
      sentence: activeTab !== 'hanzi' ? query : undefined,
      child_name: childInfo.name,
      child_grade: childInfo.grade,
      child_level: childInfo.level,
      location_scene: locationScene,
      learned_chars: learnedChars,
      geofence: userLocation ? {
        city:         userLocation.city,
        country:      userLocation.country,
        country_code: userLocation.country_code,
      } : null,
    }),
  })

  const json = await res.json()
  if (json.error) throw new Error(json.error)
  setData(json)

      // ── 写入学习记录 ──
      if (userId) {
        await supabase.from('chinese_sessions').insert({
          user_id: userId,
          input_text: query,
          input_type: activeTab,
          result: json,
          location_scene: locationScene,
          learned_at: new Date().toISOString(),
        })

        // 更新DNA
        await supabase.from('family_learning_dna').upsert({
          user_id: userId,
          last_input_type: activeTab,
          last_learned_at: new Date().toISOString(),
          total_sessions: learnedItems.length + 1,
          preferred_scene: locationScene,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        // 更新本地已学列表
        setLearnedItems(prev => [{
          char: json.char,
          chengyu: json.chengyu,
          type: activeTab,
          mastery: 80,
          learned_at: new Date().toISOString(),
        }, ...prev])
      }

    } catch (e: any) {
      setError(e.message || '生成失败，请重试')
    } finally {
      setLoading(false)
      stopLoadMsg()
    }
  }

  // ── 复制台词 ──
  const handleMomCopy = () => {
    const text = data?.mom_script || data?.mom_questions?.[0] || ''
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── 已学统计 ──
  const hanziCount = learnedItems.filter(i => i.type === 'hanzi').length
  const chengYuCount = learnedItems.filter(i => i.type === 'chengyu').length
  const writingCount = learnedItems.filter(i => i.type === 'writing').length

  return (
    <main style={{
      minHeight: '100dvh',
      background: THEME.bg,
      fontFamily: "'Noto Serif SC', Georgia, serif",
      paddingBottom: 80,
      backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(200,160,96,0.1) 0%, transparent 55%), radial-gradient(circle at 85% 85%, rgba(192,57,43,0.07) 0%, transparent 55%)',
    }}>

      {/* ══ 顶部导航 ══ */}
      <div style={{ background: THEME.white, borderBottom: '1px solid rgba(200,160,96,0.2)', padding: '14px 20px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 12px rgba(26,18,8,0.05)' }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: THEME.textDim, fontSize: 13, cursor: 'pointer', marginRight: 12, fontFamily: 'sans-serif' }}>←</button>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: THEME.red, textTransform: 'uppercase', marginBottom: 2, fontFamily: 'sans-serif' }}>根·中文</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text }}>字理解码器</div>
        </div>
        {/* 孩子信息 */}
        {childInfo.name && (
          <div style={{ marginLeft: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(200,160,96,0.1)', border: '1px solid rgba(200,160,96,0.25)', fontSize: 12, color: THEME.textMid, fontFamily: 'sans-serif' }}>
            {childInfo.name} · {childInfo.level}
          </div>
        )}
        {/* 进度按钮 */}
        <button onClick={() => setShowProgress(!showProgress)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: THEME.textDim, fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
          🌳 {hanziCount + chengYuCount + writingCount}
        </button>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>

        {/* ══ 进度展开 ══ */}
        <AnimatePresence>
          {showProgress && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ background: THEME.white, borderRadius: 16, padding: '16px 18px', border: '1px solid rgba(200,160,96,0.2)' }}>
                <div style={{ fontSize: 12, color: THEME.textDim, marginBottom: 12, fontFamily: 'sans-serif' }}>
                  {childInfo.name || '孩子'}的中文根
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: '汉字', count: hanziCount, color: THEME.red, emoji: '🧩' },
                    { label: '成语', count: chengYuCount, color: THEME.gold, emoji: '🌟' },
                    { label: '文化句', count: writingCount, color: THEME.green, emoji: '📜' },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '10px 6px', borderRadius: 12, background: `${s.color}0D`, border: `1px solid ${s.color}25` }}>
                      <div style={{ fontSize: 20 }}>{s.emoji}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: 'sans-serif' }}>{s.count}</div>
                      <div style={{ fontSize: 10, color: THEME.textDim, fontFamily: 'sans-serif' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* 已学汉字展示 */}
                {hanziCount > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {learnedItems.filter(i => i.type === 'hanzi' && i.char).slice(0, 20).map((item, i) => (
                      <span key={i} style={{ padding: '4px 12px', borderRadius: 14, background: 'rgba(192,57,43,0.07)', fontSize: 16, fontFamily: "'Noto Serif SC', serif", color: THEME.text, cursor: 'pointer' }}
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

        {/* ══ Tab导航 ══ */}
        <TabBar active={activeTab} onChange={handleTabChange} />

        {/* ══ 输入区 ══ */}
        <div style={{ background: THEME.white, borderRadius: 20, padding: '18px 20px', boxShadow: '0 4px 24px rgba(26,18,8,0.07)', border: '1px solid rgba(200,160,96,0.18)', marginBottom: 14 }}>

          {/* 汉字输入 */}
         {activeTab === 'hanzi' && (
  <>
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 68, height: 68, borderRadius: 12, border: '2px solid rgba(200,160,96,0.3)', background: THEME.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontFamily: "'Noto Serif SC', serif", color: THEME.text, flexShrink: 0 }}>
        {input || <span style={{ fontSize: 16, color: 'rgba(200,160,96,0.4)' }}>字</span>}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
  value={input}
  onChange={e => {
    setInput(e.target.value)
    setData(null)
  }}
  onKeyDown={e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const char = [...input].find(c => /\p{Script=Han}/u.test(c)) || input.trim()
      setInput(char)
      generate(char)
    }
  }}
  placeholder="输入一个汉字"
  rows={1}
  style={{ width: 68, textAlign: 'center', fontSize: 48, border: '2px solid rgba(200,160,96,0.3)', borderRadius: 12, padding: '6px 0', fontFamily: "'Noto Serif SC', serif", color: THEME.text, background: THEME.paper, outline: 'none', flexShrink: 0, resize: 'none', caretColor: THEME.gold }}
/>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => {
  const char = [...input].find(c => /\p{Script=Han}/u.test(c)) || input.trim()
  setInput(char)
  generate(char)
}}
          disabled={loading || !input.trim()}
          style={{ flex: 1, padding: '0 14px', height: 32, background: loading || !input.trim() ? '#C5B5A5' : THEME.red, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontFamily: "'Noto Serif SC', serif", cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', letterSpacing: 1 }}>
          {loading ? '解析中…' : '🧩 拆解'}
        </motion.button>
      </div>
    </div>
    <div style={{ fontSize: 10, color: THEME.textDim, letterSpacing: 3, marginBottom: 8, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>快速体验</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {QUICK_CHARS.map(c => (
      <motion.div key={c} whileTap={{ scale: 0.88 }} onClick={() => { setData(null); generate(c) }}
          style={{ width: 38, height: 38, background: THEME.paper, border: '1.5px solid rgba(200,160,96,0.28)', borderRadius: 10, fontSize: 20, fontFamily: "'Noto Serif SC', serif", color: THEME.textMid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {c}
        </motion.div>
      ))}
    </div>
  </>
)}
          {/* 成语输入 */}
          {activeTab === 'chengyu' && (
            <>
              <textarea
                value={input}
                onChange={e => { setInput(e.target.value); setData(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate() } }}
                placeholder="孩子说了什么？英文中文都行&#10;如：very many people / 一下子就做完了"
                rows={3}
                style={{ width: '100%', background: THEME.paper, border: '2px solid rgba(200,160,96,0.25)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: THEME.text, outline: 'none', resize: 'none', fontFamily: 'sans-serif', lineHeight: 1.7, marginBottom: 12 }}
              />
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => generate()}
                disabled={loading || !input.trim()}
                style={{ width: '100%', padding: '13px', background: !input.trim() ? '#C5B5A5' : THEME.red, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontFamily: "'Noto Serif SC', serif", cursor: !input.trim() ? 'not-allowed' : 'pointer', marginBottom: 12, boxShadow: input.trim() ? '0 4px 16px rgba(192,57,43,0.25)' : 'none' }}>
                {loading ? '生成中…' : '🌟 生成成语脚本'}
              </motion.button>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_CHENGYU.map((s, i) => (
                  <motion.button key={i} whileTap={{ scale: 0.93 }} onClick={() => { setData(null); generate(s) }}
                    style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(200,160,96,0.08)', border: '1px solid rgba(200,160,96,0.25)', fontSize: 12, color: THEME.textMid, cursor: 'pointer', fontFamily: 'sans-serif' }}>
                    {s}
                  </motion.button>
                ))}
              </div>
            </>
          )}

          {/* 文化句输入 */}
          {activeTab === 'writing' && (
            <>
              <textarea
                value={input}
                onChange={e => { setInput(e.target.value); setData(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate() } }}
                placeholder="孩子今天经历了什么？让他说，你来打&#10;如：今天去夜市，人超多，我吃了芒果糯米饭"
                rows={3}
                style={{ width: '100%', background: THEME.paper, border: '2px solid rgba(200,160,96,0.25)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: THEME.text, outline: 'none', resize: 'none', fontFamily: 'sans-serif', lineHeight: 1.7, marginBottom: 12 }}
              />
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => generate()}
                disabled={loading || !input.trim()}
                style={{ width: '100%', padding: '13px', background: !input.trim() ? '#C5B5A5' : '#2D6A4F', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontFamily: "'Noto Serif SC', serif", cursor: !input.trim() ? 'not-allowed' : 'pointer', marginBottom: 12, boxShadow: input.trim() ? '0 4px 16px rgba(45,106,79,0.3)' : 'none' }}>
                {loading ? '升华中…' : '📜 生成文化句'}
              </motion.button>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_WRITING.map((s, i) => (
                  <motion.button key={i} whileTap={{ scale: 0.93 }} onClick={() => { setData(null); generate(s) }}
                    style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(45,106,79,0.06)', border: '1px solid rgba(45,106,79,0.2)', fontSize: 12, color: THEME.green, cursor: 'pointer', fontFamily: 'sans-serif' }}>
                    {s}
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ══ 错误 ══ */}
        {error && (
          <div style={{ background: '#FFF0EE', border: `1px solid ${THEME.red}`, borderRadius: 12, padding: '12px 16px', color: THEME.red, fontSize: 13, marginBottom: 12, fontFamily: 'sans-serif' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ══ 加载动画 ══ */}
        {loading && (
          <div style={{ background: THEME.white, borderRadius: 20, padding: '36px 24px', textAlign: 'center', boxShadow: '0 4px 24px rgba(26,18,8,0.07)', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  style={{ width: 10, height: 10, borderRadius: '50%', background: THEME.gold }} />
              ))}
            </div>
            <motion.div key={loadMsg} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: 13, color: THEME.textDim, letterSpacing: 1, fontFamily: 'sans-serif' }}>
              {loadMsg}
            </motion.div>
          </div>
        )}

        {/* ══ 结果区 ══ */}
        <AnimatePresence>
          {data && !loading && (
            <>
              {activeTab === 'hanzi' && <HanziResult data={data} char={input} onMomCopy={handleMomCopy} />}
              {activeTab === 'chengyu' && <ChengYuResult data={data} onMomCopy={handleMomCopy} />}
              {activeTab === 'writing' && <WritingResult data={data} onMomCopy={handleMomCopy} />}

              {/* 复制成功提示 */}
              <AnimatePresence>
                {copied && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: THEME.text, color: '#fff', padding: '10px 20px', borderRadius: 20, fontSize: 13, fontFamily: 'sans-serif', zIndex: 200, whiteSpace: 'nowrap' }}>
                    ✅ 台词已复制，去跟孩子说吧！
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 底部操作 */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4, marginBottom: 20 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/')}
                  style={{ flex: 1, padding: 14, background: THEME.red, color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Noto Serif SC', serif", boxShadow: '0 4px 16px rgba(192,57,43,0.25)' }}>
                  回到根·陪伴 →
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setData(null); setInput('') }}
                  style={{ flex: 1, padding: 14, background: 'transparent', color: THEME.textDim, border: `1px solid rgba(200,160,96,0.3)`, borderRadius: 14, fontSize: 13, cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  再学一个
                </motion.button>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* ══ 空状态 ══ */}
        {!data && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: THEME.textDim }}>
            <div style={{ fontSize: 72, fontFamily: "'Noto Serif SC', serif", color: 'rgba(192,57,43,0.08)', lineHeight: 1, marginBottom: 16 }}>
              {activeTab === 'hanzi' ? '字' : activeTab === 'chengyu' ? '成' : '文'}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.9, fontFamily: 'sans-serif' }}>
              {activeTab === 'hanzi' && <>输入任意汉字，秒懂字的灵魂<br /><span style={{ color: THEME.gold }}>字理拆解 · Phonics桥梁 · 妈妈台词</span></>}
              {activeTab === 'chengyu' && <>孩子怎么说，我们找成语<br /><span style={{ color: THEME.gold }}>中英对照 · 三步解码 · 今天就用</span></>}
              {activeTab === 'writing' && <>孩子的故事，连接古人的智慧<br /><span style={{ color: THEME.gold }}>口述升华 · 文化根脉 · 情感连接</span></>}
            </div>
          </div>
        )}

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Noto+Sans+SC:wght@300;400;500;700&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        textarea { font-family: 'Noto Sans SC', sans-serif; }
      `}</style>
    </main>
  )
}
