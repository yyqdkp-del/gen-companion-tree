'use client'
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { CHINESE_THEME as T } from '@/app/_shared/_constants/chineseTheme'
import { fetchHanziCache } from '@/app/_shared/_services/chineseService'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'

type PopupItem = { word: string; type: 'word' | 'chengyu' | 'cultural'; extra?: any }

export function WordPopup({ word, onClose, childLevel }: {
  word: string; onClose: () => void; childLevel?: string
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const ac = new AbortController()
    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const char = [...word].find(c => /\p{Script=Han}/u.test(c)) || word[0]
        const cached = await fetchHanziCache(char)
        if (cached) { setData(cached); setLoading(false); return }
        const res = await fetchWithAuth('/api/chinese/decode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'hanzi', char, child_level: childLevel || 'R2' }),
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        const json = await res.json()
        if (ac.signal.aborted) return
        if (!res.ok) { setData(null); setLoadError('暂时无法加载，请稍后再试'); return }
        setData(json.error ? null : json)
      } catch (e) {
        if (!ac.signal.aborted) {
          if (!logOrAlertNetworkError(e)) {
            setLoadError('暂时无法加载，请稍后再试')
          }
          setData(null)
        }
      }
      if (!ac.signal.aborted) setLoading(false)
    }
    void load()
    return () => ac.abort()
  }, [word, childLevel])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(45,50,47,0.4)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
      }}
      onClick={onClose}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: 520,
          margin: '0 auto',
          background: '#fbf9f6',
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px 40px',
          maxHeight: '75vh',
          overflowY: 'auto',
          boxShadow: '0 -8px 40px rgba(45,50,47,0.12)',
        }}
        onClick={e => e.stopPropagation()}>
        <div style={{
          width: 36,
          height: 4,
          background: 'rgba(45,50,47,0.15)',
          borderRadius: 2,
          margin: '0 auto 20px',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 32, fontFamily: "'Noto Serif SC', serif",
            color: '#2d322f' }}>{word}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 18, color: 'rgba(45,50,47,0.45)', cursor: 'pointer' }}>✕</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(45,50,47,0.45)',
            fontFamily: 'sans-serif', fontSize: 13 }}>正在查询…</div>
        ) : data ? (
          <div style={{ fontFamily: 'sans-serif' }}>
            {data.pinyin && <div style={{ fontSize: 13, color: 'rgba(45,50,47,0.45)', marginBottom: 8 }}>{data.pinyin}</div>}
            {data.meaning && <div style={{ fontSize: 15, fontWeight: 600, color: '#2d322f',
              marginBottom: 10, fontFamily: "'Noto Serif SC', serif" }}>{data.meaning}</div>}
            {data.story && <div style={{ fontSize: 13, color: '#5a5a4a', lineHeight: 1.85,
              marginBottom: 10 }}>{data.story}</div>}
            {data.scene && <div style={{ fontSize: 12, color: '#5a5a4a', lineHeight: 1.75,
              fontStyle: 'italic', padding: '9px 12px', borderRadius: 10,
              background: 'rgba(138,115,85,0.07)', marginBottom: 10 }}>{data.scene}</div>}
            {data.mom_script && (
              <div style={{ padding: '12px', borderRadius: 12,
                background: 'rgba(138,115,85,0.08)',
                border: '1px solid rgba(138,115,85,0.2)',
                fontSize: 13, color: '#2d322f', lineHeight: 1.8, fontStyle: 'italic' }}>
                👩 {data.mom_script}
              </div>
            )}
          </div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#a46355',
            fontFamily: 'sans-serif', fontSize: 13 }}>{loadError}</div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(45,50,47,0.45)',
            fontFamily: 'sans-serif', fontSize: 13 }}>暂无数据</div>
        )}
      </motion.div>
    </motion.div>
  )
}

const POPUP_BODY = { color: '#2d322f', fontFamily: 'sans-serif', lineHeight: 1.8 } as const
const POPUP_TITLE = { color: '#a46355', fontFamily: "'Noto Serif SC', serif" } as const

export function FamilyPopup({ item, onClose, childLevel }: {
  item: PopupItem; onClose: () => void; childLevel?: string
}) {
  const [loading, setLoading] = useState(item.type === 'word')
  const [wordData, setWordData] = useState<any>(null)

  useEffect(() => {
    if (item.type !== 'word') return
    const ac = new AbortController()
    async function load() {
      setLoading(true)
      try {
        const char = [...item.word].find(c => /\p{Script=Han}/u.test(c)) || item.word[0]
        const cached = await fetchHanziCache(char)
        if (cached) { setWordData(cached); setLoading(false); return }
        const res = await fetchWithAuth('/api/chinese/decode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'hanzi', char, child_level: childLevel || 'R2' }),
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        const json = await res.json()
        if (ac.signal.aborted) return
        if (!res.ok) { setWordData(null); return }
        setWordData(json.error ? null : json)
      } catch {
        if (!ac.signal.aborted) setWordData(null)
      }
      if (!ac.signal.aborted) setLoading(false)
    }
    void load()
    return () => ac.abort()
  }, [item.word, item.type, childLevel])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(45,50,47,0.4)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
      }}
      onClick={onClose}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: 520,
          margin: '0 auto',
          background: '#fbf9f6',
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px 40px',
          maxHeight: '75vh',
          overflowY: 'auto',
          boxShadow: '0 -8px 40px rgba(45,50,47,0.12)',
        }}
        onClick={e => e.stopPropagation()}>
        <div style={{
          width: 36,
          height: 4,
          background: 'rgba(45,50,47,0.15)',
          borderRadius: 2,
          margin: '0 auto 20px',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 26, ...POPUP_TITLE }}>{item.word}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 18, color: 'rgba(45,50,47,0.45)', cursor: 'pointer' }}>✕</button>
        </div>

        {item.type === 'word' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(45,50,47,0.45)',
              fontFamily: 'sans-serif', fontSize: 13 }}>正在查询…</div>
          ) : wordData ? (
            <div style={{ ...POPUP_BODY }}>
              {wordData.pinyin && <div style={{ fontSize: 13, color: 'rgba(45,50,47,0.45)', marginBottom: 8 }}>{wordData.pinyin}</div>}
              {wordData.meaning && <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, ...POPUP_TITLE }}>{wordData.meaning}</div>}
              {wordData.story && <div style={{ fontSize: 13, ...POPUP_BODY, marginBottom: 10 }}>{wordData.story}</div>}
              {wordData.scene && <div style={{ fontSize: 12, ...POPUP_BODY, fontStyle: 'italic', padding: '9px 12px', borderRadius: 10,
                background: 'rgba(164,99,85,0.06)', marginBottom: 10 }}>🌍 {wordData.scene}</div>}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(45,50,47,0.45)',
              fontFamily: 'sans-serif', fontSize: 13 }}>暂无数据</div>
          )
        )}

        {item.type === 'chengyu' && (
          <div style={{ fontFamily: 'sans-serif' }}>
            {item.extra?.cy_story && <div style={{ fontSize: 14, color: '#5a5a4a',
              lineHeight: 1.85, marginBottom: 12 }}>{item.extra.cy_story}</div>}
            <div style={{ padding: '10px 13px', borderRadius: 10,
              background: 'rgba(138,115,85,0.07)', fontSize: 12, color: '#5a5a4a', lineHeight: 1.7 }}>
              💡 试着今天跟孩子用一次这个成语
            </div>
          </div>
        )}

        {item.type === 'cultural' && item.extra && (
          <div style={{ fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: 18, fontFamily: "'Noto Serif SC', serif", fontWeight: 700,
              color: '#2d322f', lineHeight: 1.8, marginBottom: 8 }}>{item.extra.cultural_sentence}</div>
            {item.extra.cultural_author && <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.45)',
              marginBottom: 10 }}>—— {item.extra.cultural_author}</div>}
            {item.extra.cultural_meaning && <div style={{ fontSize: 13, color: '#5a5a4a',
              lineHeight: 1.75, marginBottom: 10, borderTop: '1px dashed rgba(138,115,85,0.3)',
              paddingTop: 10 }}>{item.extra.cultural_meaning}</div>}
            {item.extra.overseas_connection && (
              <div style={{ padding: '9px 12px', borderRadius: 10,
                background: 'rgba(45,63,74,0.05)', fontSize: 12, color: '#2d3f4a', lineHeight: 1.75 }}>
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
