'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CHINESE_THEME as T, CHINESE_LEVELS } from '@/app/_shared/_constants/chineseTheme'
import { useApp } from '@/app/context/AppContext'
import ChineseAccordion from './ChineseAccordion'
import { WordPopup, FamilyPopup, type PopupItem } from './WordPopup'

type Props = {
  data: any
  char: string
  onMomCopy: () => void
  childLevel?: string
}

function PartsDisplay({ parts, char, evolution }: {
  parts: any[]; char: string; evolution?: string
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [showEvolution, setShowEvolution] = useState(false)
  if (!parts?.length) return null

  return (
    <div style={{ background: T.white, borderRadius: 16, padding: '18px 16px',
      marginBottom: 8, border: '1px solid rgba(200,160,96,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 10,
        marginBottom: evolution ? 12 : 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {parts.slice(0, Math.ceil(parts.length / 2)).map((p: any, i: number) => (
            <button key={i} onClick={() => setOpenIdx(openIdx === i ? null : i)}
              style={{ background: openIdx === i ? 'rgba(192,57,43,0.08)' : T.paper,
                border: `1.5px solid ${openIdx === i ? 'rgba(192,57,43,0.3)' : 'rgba(200,160,96,0.2)'}`,
                borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
                textAlign: 'center', transition: 'all 0.2s' }}>
              <div style={{ fontSize: 26, fontFamily: "'Noto Serif SC', serif",
                color: T.red, lineHeight: 1 }}>{p.char}</div>
              <div style={{ fontSize: 10, color: T.textDim, marginTop: 3,
                fontFamily: 'sans-serif' }}>{p.name}</div>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 72, fontFamily: "'Noto Serif SC', serif",
            color: T.text, lineHeight: 1,
            textShadow: '0 4px 20px rgba(26,18,8,0.1)' }}>{char}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {parts.slice(Math.ceil(parts.length / 2)).map((p: any, i: number) => {
            const idx = i + Math.ceil(parts.length / 2)
            return (
              <button key={idx} onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                style={{ background: openIdx === idx ? 'rgba(192,57,43,0.08)' : T.paper,
                  border: `1.5px solid ${openIdx === idx ? 'rgba(192,57,43,0.3)' : 'rgba(200,160,96,0.2)'}`,
                  borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
                  textAlign: 'center', transition: 'all 0.2s' }}>
                <div style={{ fontSize: 26, fontFamily: "'Noto Serif SC', serif",
                  color: T.red, lineHeight: 1 }}>{p.char}</div>
                <div style={{ fontSize: 10, color: T.textDim, marginTop: 3,
                  fontFamily: 'sans-serif' }}>{p.name}</div>
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {openIdx !== null && parts[openIdx] && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ background: 'rgba(192,57,43,0.05)', borderRadius: 10,
              padding: '10px 13px', marginTop: 8, borderLeft: '3px solid rgba(192,57,43,0.3)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.red,
                marginBottom: 4, fontFamily: 'sans-serif' }}>
                {parts[openIdx].char} · {parts[openIdx].name}
              </div>
              <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.75, fontFamily: 'sans-serif' }}>
                {parts[openIdx].image || parts[openIdx].meaning || '像古人观察自然所得的象形符号'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {evolution && (
        <div style={{ marginTop: 10, borderRadius: 10,
          border: '1px solid rgba(200,160,96,0.2)', overflow: 'hidden' }}>
          <button onClick={() => setShowEvolution(o => !o)}
            style={{ width: '100%', padding: '10px 14px',
              background: showEvolution ? 'rgba(200,160,96,0.06)' : 'transparent',
              border: 'none', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontSize: 12, color: T.gold, fontFamily: 'sans-serif',
              fontWeight: 700 }}>📜 造字演变</span>
            <motion.span animate={{ rotate: showEvolution ? 180 : 0 }}
              style={{ fontSize: 14, color: T.gold, display: 'inline-block' }}>⌄</motion.span>
          </button>
          <AnimatePresence initial={false}>
            {showEvolution && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}>
                <div style={{ padding: '0 14px 12px',
                  borderTop: '1px solid rgba(200,160,96,0.15)', background: T.white }}>
                  <div style={{ fontSize: 12, color: T.text, lineHeight: 1.85,
                    marginTop: 10, fontFamily: 'sans-serif' }}>{evolution}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function FamilyWords({ family, extension, chengyu, cy_story, cultural_sentence,
  cultural_author, cultural_meaning, overseas_connection, childLevel }: {
  family?: string[]; extension?: string[]; chengyu?: string; cy_story?: string
  cultural_sentence?: string; cultural_author?: string; cultural_meaning?: string
  overseas_connection?: string; childLevel?: string
}) {
  const [popup, setPopup] = useState<PopupItem | null>(null)
  const familyWords = (family || []).slice(0, 3)
  if (!familyWords.length && !chengyu && !cultural_sentence) return null

  return (
    <>
      <div style={{ background: T.white, borderRadius: 16, padding: '16px',
        marginBottom: 8, border: '1px solid rgba(200,160,96,0.15)' }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: T.red,
          marginBottom: 10, fontFamily: 'sans-serif' }}>🌳 字族 · 延伸</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {familyWords.map((w, i) => (
            <button key={i} onClick={() => setPopup({ word: w, type: 'word' })}
              style={{ padding: '6px 13px', borderRadius: 20,
                background: 'rgba(45,106,79,0.08)',
                border: '1px solid rgba(45,106,79,0.2)',
                fontSize: 14, fontFamily: "'Noto Serif SC', serif",
                color: T.green, cursor: 'pointer' }}>
              {w}
            </button>
          ))}
          {chengyu && (
            <button onClick={() => setPopup({ word: chengyu, type: 'chengyu', extra: { cy_story } })}
              style={{ padding: '6px 13px', borderRadius: 20,
                background: 'rgba(200,160,96,0.1)',
                border: '1px solid rgba(200,160,96,0.3)',
                fontSize: 14, fontFamily: "'Noto Serif SC', serif",
                color: T.gold, cursor: 'pointer' }}>
              🌟 {chengyu}
            </button>
          )}
          {cultural_sentence && (
            <button onClick={() => setPopup({ word: '文化句', type: 'cultural',
              extra: { cultural_sentence, cultural_author, cultural_meaning, overseas_connection } })}
              style={{ padding: '6px 13px', borderRadius: 20,
                background: 'rgba(26,60,94,0.07)',
                border: '1px solid rgba(26,60,94,0.2)',
                fontSize: 12, fontFamily: 'sans-serif', color: T.navy, cursor: 'pointer' }}>
              📜 文化句
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {popup && <FamilyPopup item={popup} onClose={() => setPopup(null)} childLevel={childLevel} />}
      </AnimatePresence>
    </>
  )
}

export default function HanziResult({ data, char, onMomCopy, childLevel }: Props) {
  const { speak } = useApp()
  const lv = data?.level || 'R2'
  const lvCfg = CHINESE_LEVELS[lv] || CHINESE_LEVELS.R2
  const exts = Array.isArray(data?.extension) ? data.extension : []

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}>

      <div style={{ background: T.white, borderRadius: 16, padding: '14px 16px',
        marginBottom: 8, border: '1px solid rgba(200,160,96,0.15)',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 14,
          background: T.paper, border: '1px solid rgba(200,160,96,0.3)',
          color: T.textMid, fontFamily: 'sans-serif' }}>{data.pinyin}</span>
        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12,
          background: lvCfg.bg, border: `1px solid ${lvCfg.color}44`,
          color: lvCfg.color, fontFamily: 'sans-serif' }}>{lv} · {lvCfg.label}</span>
        {data.traditional && data.traditional !== char && (
          <span style={{ fontSize: 12, color: T.textDim, fontFamily: 'sans-serif' }}>
            繁 <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 16,
              color: T.textMid }}>{data.traditional}</span>
          </span>
        )}
        {/* 拼音朗读按钮 */}
        <button onClick={() => speak(`${data.pinyin}，${data.meaning}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, opacity: 0.5, padding: '2px' }} title="朗读">🔊</button>
        <div style={{ width: '100%', fontSize: 16, fontWeight: 700, color: T.text,
          fontFamily: "'Noto Serif SC', serif", marginTop: 4 }}>{data.meaning}</div>
      </div>

      {/* 视觉钩子 */}
      {data.visual_hook && (
        <div style={{ background: 'rgba(192,57,43,0.04)', borderRadius: 14,
          padding: '14px 16px', marginBottom: 8,
          border: '1px solid rgba(192,57,43,0.12)' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: T.red,
            marginBottom: 6, fontFamily: 'sans-serif' }}>👁 看见这个字</div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.8,
            fontFamily: "'Noto Serif SC', serif" }}>{data.visual_hook}</div>
          {data.memory_trick && (
            <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10,
              background: 'rgba(200,160,96,0.08)', fontSize: 13,
              color: T.gold, fontStyle: 'italic', fontFamily: 'sans-serif' }}>
              🎵 {data.memory_trick}
            </div>
          )}
        </div>
      )}

      {/* 孩子互动问题 */}
      {data.child_prompt && (
        <div style={{ background: 'rgba(45,106,79,0.05)', borderRadius: 14,
          padding: '12px 16px', marginBottom: 8,
          border: '1px solid rgba(45,106,79,0.15)',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🙋</span>
          <div style={{ fontSize: 13, color: T.green, lineHeight: 1.7,
            fontFamily: 'sans-serif', fontWeight: 500 }}>{data.child_prompt}</div>
        </div>
      )}

      <PartsDisplay parts={data.parts || []} char={char} evolution={data.evolution} />

      {/* 书写引导 */}
      {data.writing_guide && (
        <div style={{ background: T.white, borderRadius: 14, padding: '14px 16px',
          marginBottom: 8, border: '1px solid rgba(200,160,96,0.15)' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: T.gold,
            marginBottom: 8, fontFamily: 'sans-serif' }}>
            ✍️ 学着写 · {data.stroke_count ? `${data.stroke_count}画` : ''}
          </div>
          <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.8,
            fontFamily: 'sans-serif', marginBottom: data.stroke_order?.length ? 10 : 0 }}>
            {data.writing_guide}
          </div>
          {data.stroke_order?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {data.stroke_order.map((s: string, i: number) => (
                <span key={i} style={{ padding: '3px 10px', borderRadius: 20,
                  background: 'rgba(200,160,96,0.08)',
                  border: '1px solid rgba(200,160,96,0.2)',
                  fontSize: 12, color: T.textMid, fontFamily: 'sans-serif' }}>
                  {i + 1}. {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {(data.english_link || data.phonics_bridge) && (
        <ChineseAccordion title="中英互通" emoji="🔗">
          <div style={{ paddingTop: 12 }}>
            {data.english_link && <div style={{ fontSize: 13, color: T.blue,
              lineHeight: 1.85, fontStyle: 'italic', fontFamily: 'sans-serif' }}>{data.english_link}</div>}
            {data.phonics_bridge && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10,
                background: 'rgba(26,60,94,0.05)', fontSize: 12, color: T.textMid,
                lineHeight: 1.7, fontFamily: 'sans-serif' }}>💡 {data.phonics_bridge}</div>
            )}
          </div>
        </ChineseAccordion>
      )}

      {data.mom_script && (
        <ChineseAccordion title="妈妈台词" emoji="👩" defaultOpen>
          <div style={{ paddingTop: 12 }}>
            <div style={{ padding: '13px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(200,160,96,0.1), rgba(192,57,43,0.05))',
              border: '1px solid rgba(200,160,96,0.2)', marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.9,
                fontStyle: 'italic', fontFamily: 'sans-serif' }}>「{data.mom_script}」</div>
            </div>
            {(data.mom_questions || []).length > 0 && (
              <>
                <div style={{ fontSize: 10, color: T.gold, letterSpacing: 2,
                  marginBottom: 8, fontFamily: 'sans-serif' }}>自然聊天，不是考试</div>
                {data.mom_questions.map((q: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8,
                    alignItems: 'flex-start' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%',
                      background: T.gold, color: '#fff', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, flexShrink: 0, marginTop: 2,
                      fontFamily: 'sans-serif' }}>{i + 1}</div>
                    <div style={{ fontSize: 12, color: T.text, lineHeight: 1.75,
                      fontFamily: 'sans-serif' }}>{q}</div>
                  </div>
                ))}
              </>
            )}
            <div style={{ background: 'rgba(192,57,43,0.06)', borderRadius: 10,
              padding: '9px 12px', marginTop: 4 }}>
              <div style={{ fontSize: 11, color: T.textMid, lineHeight: 1.7,
                fontFamily: 'sans-serif' }}>
                💡 让孩子用「{char}」造一个句子，不需要正确，有趣就好。
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={onMomCopy}
                style={{ flex: 1, padding: '9px', borderRadius: 10,
                  border: `1px solid ${T.gold}`, background: 'transparent',
                  fontSize: 12, color: T.gold, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'sans-serif' }}>
                📋 复制台词
              </button>
              <button onClick={() => speak(data.mom_script)}
                style={{ padding: '9px 14px', borderRadius: 10,
                  border: `1px solid ${T.gold}`, background: 'transparent',
                  fontSize: 12, color: T.gold, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'sans-serif' }}>
                🔊 朗读
              </button>
            </div>
          </div>
        </ChineseAccordion>
      )}

      {(data.story || data.scene) && (
        <ChineseAccordion title="文化故事 · 生活场景" emoji="📖">
          <div style={{ paddingTop: 10 }}>
            {data.story && <div style={{ fontSize: 13, color: T.text, lineHeight: 1.85,
              fontFamily: 'sans-serif', marginBottom: data.scene ? 10 : 0 }}>{data.story}</div>}
            {data.scene && (
              <div style={{ background: 'rgba(200,160,96,0.08)', borderRadius: 10,
                padding: '10px 13px', borderLeft: '3px solid #C8A060' }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: T.gold,
                  marginBottom: 4, fontFamily: 'sans-serif' }}>🌍 生活场景</div>
                <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.75,
                  fontStyle: 'italic', fontFamily: 'sans-serif' }}>{data.scene}</div>
              </div>
            )}
          </div>
        </ChineseAccordion>
      )}

      <FamilyWords family={data.family} extension={exts} chengyu={data.chengyu}
        cy_story={data.cy_story} cultural_sentence={data.cultural_sentence}
        cultural_author={data.cultural_author} cultural_meaning={data.cultural_meaning}
        overseas_connection={data.overseas_connection} childLevel={childLevel} />
    </motion.div>
  )
}
