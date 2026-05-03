'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CHINESE_THEME as T } from '@/app/_shared/_constants/chineseTheme'
import { useApp } from '@/app/context/AppContext'
import ChineseAccordion from './ChineseAccordion'
import { WordPopup } from './WordPopup'

type Props = { data: any; onMomCopy: () => void }

export default function ChengYuResult({ data, onMomCopy }: Props) {
  const { speak } = useApp()
  const [popup, setPopup] = useState<string | null>(null)
  const relatedWords = [
    ...(data.related_words || []).map((w: string) => ({ word: w, type: 'family' as const })),
    ...(data.extensions || []).map((w: string) => ({ word: w.split('：')[0] || w, type: 'ext' as const })),
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}>

      <div style={{ background: T.white, borderRadius: 16, padding: '20px 16px',
        marginBottom: 8, border: '1px solid rgba(200,160,96,0.15)', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 150, damping: 15 }}
          style={{ fontSize: 44, fontFamily: "'Noto Serif SC', serif", fontWeight: 900,
            color: T.text, letterSpacing: 4, marginBottom: 8 }}>
          {data.chengyu}
        </motion.div>
        {data.pinyin && <div style={{ fontSize: 13, color: T.textDim, marginBottom: 10,
          fontFamily: 'sans-serif' }}>{data.pinyin}</div>}
        {data.level && (
          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20,
            background: 'rgba(200,160,96,0.12)', color: T.gold, fontSize: 11,
            fontWeight: 700, fontFamily: 'sans-serif', marginBottom: 10 }}>
            {data.level === '画面级' ? '🎨 画面级'
              : data.level === '感受级' ? '💭 感受级' : '🧠 智慧级'}
          </span>
        )}
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text,
          fontFamily: "'Noto Serif SC', serif" }}>{data.meaning}</div>
        {/* 朗读按钮 */}
        <button onClick={() => speak(`${data.chengyu}，${data.meaning}`)}
          style={{ marginTop: 8, background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 14, opacity: 0.5 }} title="朗读">🔊</button>
      </div>

      {data.english_idiom && (
        <ChineseAccordion title="中英互通" emoji="🔗" borderColor="rgba(26,60,94,0.15)">
          <div style={{ paddingTop: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10,
                background: 'rgba(26,60,94,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4,
                  fontFamily: 'sans-serif' }}>English</div>
                <div style={{ fontSize: 12, color: T.navy, fontStyle: 'italic',
                  fontFamily: 'sans-serif' }}>"{data.english_idiom}"</div>
              </div>
              <div style={{ fontSize: 16, color: T.gold }}>⟷</div>
              <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10,
                background: 'rgba(192,57,43,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4,
                  fontFamily: 'sans-serif' }}>中文</div>
                <div style={{ fontSize: 18, color: T.red,
                  fontFamily: "'Noto Serif SC', serif", fontWeight: 700 }}>{data.chengyu}</div>
              </div>
            </div>
            {data.idiom_comparison && <div style={{ marginTop: 8, fontSize: 12, color: T.textMid,
              lineHeight: 1.75, fontStyle: 'italic', fontFamily: 'sans-serif' }}>
              💡 {data.idiom_comparison}</div>}
          </div>
        </ChineseAccordion>
      )}

      {data.mom_script && (
        <ChineseAccordion title="妈妈台词" emoji="👩" defaultOpen
          borderColor="rgba(200,160,96,0.35)">
          <div style={{ paddingTop: 12 }}>
            <div style={{ padding: '13px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(200,160,96,0.1), rgba(192,57,43,0.05))',
              border: '1px solid rgba(200,160,96,0.2)', marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.9,
                fontStyle: 'italic', fontFamily: 'sans-serif' }}>「{data.mom_script}」</div>
            </div>
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

      {(data.origin || data.image || data.local_scene || data.child_use) && (
        <ChineseAccordion title="故事 · 场景" emoji="📖">
          <div style={{ paddingTop: 10 }}>
            {data.origin && <div style={{ fontSize: 13, color: T.text, lineHeight: 1.85,
              fontFamily: 'sans-serif', marginBottom: 8 }}>{data.origin}</div>}
            {data.image && <div style={{ padding: '9px 12px', borderRadius: 10,
              background: 'rgba(45,106,79,0.06)', fontSize: 12, color: T.textMid,
              lineHeight: 1.75, fontFamily: 'sans-serif', marginBottom: 8 }}>
              🎨 {data.image}</div>}
            {data.local_scene && <div style={{ fontSize: 12, color: T.textMid,
              lineHeight: 1.75, fontStyle: 'italic', fontFamily: 'sans-serif',
              marginBottom: 8 }}>{data.local_scene}</div>}
            {data.child_use && (
              <div style={{ padding: '10px 13px', borderRadius: 10,
                background: 'rgba(200,160,96,0.07)',
                border: '1px solid rgba(200,160,96,0.2)' }}>
                <div style={{ fontSize: 10, color: T.gold, marginBottom: 4,
                  fontFamily: 'sans-serif' }}>✨ 孩子今天可以说：</div>
                <div style={{ fontSize: 14, color: T.text,
                  fontFamily: "'Noto Serif SC', serif", fontWeight: 600 }}>
                  「{data.child_use}」</div>
              </div>
            )}
          </div>
        </ChineseAccordion>
      )}

      {relatedWords.length > 0 && (
        <>
          <div style={{ background: T.white, borderRadius: 16, padding: '14px 16px',
            marginBottom: 8, border: '1px solid rgba(200,160,96,0.15)' }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: T.red,
              marginBottom: 10, fontFamily: 'sans-serif' }}>🌳 相关词汇</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {relatedWords.map((item, i) => (
                <button key={i} onClick={() => setPopup(item.word)}
                  style={{ padding: '6px 13px', borderRadius: 20,
                    background: 'rgba(45,106,79,0.08)',
                    border: '1px solid rgba(45,106,79,0.2)',
                    fontSize: 13, fontFamily: "'Noto Serif SC', serif",
                    color: T.green, cursor: 'pointer' }}>
                  {item.word}
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {popup && <WordPopup word={popup} onClose={() => setPopup(null)} />}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
}
