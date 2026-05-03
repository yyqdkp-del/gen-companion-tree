'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CHINESE_THEME as T } from '@/app/_shared/_constants/chineseTheme'
import { useApp } from '@/app/context/AppContext'
import ChineseAccordion from './ChineseAccordion'
import { WordPopup } from './WordPopup'

type Props = { data: any; onMomCopy: () => void }

export default function WritingResult({ data, onMomCopy }: Props) {
  const { speak } = useApp()
  const [popup, setPopup] = useState<string | null>(null)
  const keyWords = data?.key_words || []

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}>

      {data.draft && (
        <div style={{ background: T.white, borderRadius: 16, padding: '16px',
          marginBottom: 8, border: '1px solid rgba(26,60,94,0.1)' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: T.navy,
            marginBottom: 10, fontFamily: 'sans-serif' }}>✍️ 书面升华版</div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 2.1,
            fontFamily: "'Noto Serif SC', serif" }}>{data.draft}</div>
        </div>
      )}

      {data.mom_script && (
        <ChineseAccordion title="妈妈三步台词" emoji="👩" defaultOpen
          borderColor="rgba(200,160,96,0.35)">
          <div style={{ paddingTop: 12 }}>
            <div style={{ padding: '13px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(200,160,96,0.1), rgba(192,57,43,0.05))',
              border: '1px solid rgba(200,160,96,0.2)', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: T.gold, fontWeight: 700,
                marginBottom: 6, fontFamily: 'sans-serif' }}>
                ① 先念 → ② 解释 → ③ 连接孩子经历
              </div>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.9,
                fontStyle: 'italic', fontFamily: 'sans-serif' }}>「{data.mom_script}」</div>
            </div>
            {data.tips && <div style={{ padding: '9px 12px', borderRadius: 10,
              background: 'rgba(192,57,43,0.06)', fontSize: 12, color: T.textMid,
              lineHeight: 1.7, fontFamily: 'sans-serif', marginBottom: 10 }}>
              💡 {data.tips}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
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

      {data.cultural_sentence && (
        <ChineseAccordion title="文化根脉" emoji="📜"
          borderColor="rgba(200,160,96,0.3)">
          <div style={{ paddingTop: 10 }}>
            <div style={{ fontSize: 19, fontFamily: "'Noto Serif SC', serif",
              fontWeight: 700, color: T.text, lineHeight: 1.8, marginBottom: 6 }}>
              {data.cultural_sentence}</div>
            {data.cultural_author && <div style={{ fontSize: 12, color: T.textDim,
              marginBottom: 8, fontFamily: 'sans-serif' }}>—— {data.cultural_author}</div>}
            {data.cultural_meaning && <div style={{ fontSize: 13, color: T.textMid,
              lineHeight: 1.75, fontFamily: 'sans-serif',
              borderTop: '1px dashed rgba(200,160,96,0.3)',
              paddingTop: 8, marginBottom: 8 }}>{data.cultural_meaning}</div>}
            {data.ancient_connection && <div style={{ padding: '9px 12px', borderRadius: 10,
              background: 'rgba(200,160,96,0.07)', fontSize: 12, color: T.textMid,
              lineHeight: 1.75, fontFamily: 'sans-serif', marginBottom: 6 }}>
              🌊 {data.ancient_connection}</div>}
            {data.overseas_connection && <div style={{ padding: '9px 12px', borderRadius: 10,
              background: 'rgba(26,60,94,0.05)', fontSize: 12, color: T.navy,
              lineHeight: 1.75, fontFamily: 'sans-serif' }}>
              🌍 {data.overseas_connection}</div>}
          </div>
        </ChineseAccordion>
      )}

      {keyWords.length > 0 && (
        <>
          <div style={{ background: T.white, borderRadius: 16, padding: '14px 16px',
            marginBottom: 8, border: '1px solid rgba(200,160,96,0.15)' }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: T.red,
              marginBottom: 10, fontFamily: 'sans-serif' }}>🌳 关键词</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {keyWords.map((w: string, i: number) => (
                <button key={i} onClick={() => setPopup(w)}
                  style={{ padding: '6px 13px', borderRadius: 20,
                    background: 'rgba(45,106,79,0.08)',
                    border: '1px solid rgba(45,106,79,0.2)',
                    fontSize: 13, fontFamily: "'Noto Serif SC', serif",
                    color: T.green, cursor: 'pointer' }}>
                  {w}
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {popup && <WordPopup word={popup} onClose={() => setPopup(null)} />}
          </AnimatePresence>
        </>
      )}

      {data.fill_blanks && (
        <ChineseAccordion title="填空练习" emoji="✏️"
          borderColor="rgba(45,106,79,0.2)">
          <div style={{ paddingTop: 10, fontSize: 13, color: T.text,
            lineHeight: 1.85, fontFamily: 'sans-serif' }}>{data.fill_blanks}</div>
        </ChineseAccordion>
      )}
    </motion.div>
  )
}
