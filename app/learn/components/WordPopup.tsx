'use client'
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CHINESE_THEME as T } from '@/app/_shared/_constants/chineseTheme'
import { fetchHanziCache } from '@/app/_shared/_services/chineseService'

type PopupItem = { word: string; type: 'word' | 'chengyu' | 'cultural'; extra?: any }

export function WordPopup({ word, onClose, childLevel }: {
  word: string; onClose: () => void; childLevel?: string
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const char = [...word].find(c => /\p{Script=Han}/u.test(c)) || word[0]
        const cached = await fetchHanziCache(char)
        if (cached) { setData(cached); setLoading(false); return }
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
  }, [word, childLevel])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,8,0.5)', zIndex: 300,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 80px' }}
      onClick={onClose}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ background: T.white, borderRadius: 20, padding: '20px', width: '100%',
          maxWidth: 440, margin: '0 16px', maxHeight: '70vh', overflowY: 'auto',
          boxShadow: '0 -8px 40px rgba(26,18,8,0.12)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 32, fontFamily: "'Noto Serif SC', serif",
            color: T.text }}>{word}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 18, color: T.textDim, cursor: 'pointer' }}>✕</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: T.textDim,
            fontFamily: 'sans-serif', fontSize: 13 }}>正在查询…</div>
        ) : data ? (
          <div style={{ fontFamily: 'sans-serif' }}>
            {data.pinyin && <div style={{ fontSize: 13, color: T.textDim, marginBottom: 8 }}>{data.pinyin}</div>}
            {data.meaning && <div style={{ fontSize: 15, fontWeight: 600, color: T.text,
              marginBottom: 10, fontFamily: "'Noto Serif SC', serif" }}>{data.meaning}</div>}
            {data.story && <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.85,
              marginBottom: 10 }}>{data.story}</div>}
            {data.scene && <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.75,
              fontStyle: 'italic', padding: '9px 12px', borderRadius: 10,
              background: 'rgba(200,160,96,0.07)', marginBottom: 10 }}>{data.scene}</div>}
            {data.mom_script && (
              <div style={{ padding: '12px', borderRadius: 12,
                background: 'rgba(200,160,96,0.08)',
                border: '1px solid rgba(200,160,96,0.2)',
                fontSize: 13, color: T.text, lineHeight: 1.8, fontStyle: 'italic' }}>
                👩 {data.mom_script}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: T.textDim,
            fontFamily: 'sans-serif', fontSize: 13 }}>暂无数据</div>
        )}
      </motion.div>
    </motion.div>
  )
}

export function FamilyPopup({ item, onClose, childLevel }: {
  item: PopupItem; onClose: () => void; childLevel?: string
}) {
  const [loading, setLoading] = useState(item.type === 'word')
  const [wordData, setWordData] = useState<any>(null)

  useEffect(() => {
    if (item.type !== 'word') return
    async function load() {
      setLoading(true)
      try {
        const char = [...item.word].find(c => /\p{Script=Han}/u.test(c)) || item.word[0]
        const cached = await fetchHanziCache(char)
        if (cached) { setWordData(cached); setLoading(false); return }
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
  }, [item.word, childLevel])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,8,0.5)', zIndex: 300,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 80px' }}
      onClick={onClose}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ background: T.white, borderRadius: 20, padding: '20px', width: '100%',
          maxWidth: 440, margin: '0 16px', maxHeight: '72vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 26, fontFamily: "'Noto Serif SC', serif",
            color: T.text }}>{item.word}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 18, color: T.textDim, cursor: 'pointer' }}>✕</button>
        </div>

        {item.type === 'word' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: T.textDim,
              fontFamily: 'sans-serif', fontSize: 13 }}>正在查询…</div>
          ) : wordData ? (
            <div style={{ fontFamily: 'sans-serif' }}>
              {wordData.pinyin && <div style={{ fontSize: 13, color: T.textDim, marginBottom: 8 }}>{wordData.pinyin}</div>}
              {wordData.meaning && <div style={{ fontSize: 15, fontWeight: 600, color: T.text,
                marginBottom: 10, fontFamily: "'Noto Serif SC', serif" }}>{wordData.meaning}</div>}
              {wordData.story && <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.85,
                marginBottom: 10 }}>{wordData.story}</div>}
              {wordData.scene && <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.75,
                fontStyle: 'italic', padding: '9px 12px', borderRadius: 10,
                background: 'rgba(200,160,96,0.07)', marginBottom: 10 }}>🌍 {wordData.scene}</div>}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: T.textDim,
              fontFamily: 'sans-serif', fontSize: 13 }}>暂无数据</div>
          )
        )}

        {item.type === 'chengyu' && (
          <div style={{ fontFamily: 'sans-serif' }}>
            {item.extra?.cy_story && <div style={{ fontSize: 14, color: T.textMid,
              lineHeight: 1.85, marginBottom: 12 }}>{item.extra.cy_story}</div>}
            <div style={{ padding: '10px 13px', borderRadius: 10,
              background: 'rgba(200,160,96,0.07)', fontSize: 12, color: T.textMid, lineHeight: 1.7 }}>
              💡 试着今天跟孩子用一次这个成语
            </div>
          </div>
        )}

        {item.type === 'cultural' && item.extra && (
          <div style={{ fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: 18, fontFamily: "'Noto Serif SC', serif", fontWeight: 700,
              color: T.text, lineHeight: 1.8, marginBottom: 8 }}>{item.extra.cultural_sentence}</div>
            {item.extra.cultural_author && <div style={{ fontSize: 12, color: T.textDim,
              marginBottom: 10 }}>—— {item.extra.cultural_author}</div>}
            {item.extra.cultural_meaning && <div style={{ fontSize: 13, color: T.textMid,
              lineHeight: 1.75, marginBottom: 10, borderTop: '1px dashed rgba(200,160,96,0.3)',
              paddingTop: 10 }}>{item.extra.cultural_meaning}</div>}
            {item.extra.overseas_connection && (
              <div style={{ padding: '9px 12px', borderRadius: 10,
                background: 'rgba(26,60,94,0.05)', fontSize: 12, color: T.navy, lineHeight: 1.75 }}>
                🌍 {item.extra.overseas_connection}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export type { PopupItem }
