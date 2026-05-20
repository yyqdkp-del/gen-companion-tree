'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { uploadFile } from '@/app/_shared/_services/uploadService'

interface Props {
  childId: string
  onClose: () => void
  onSaved: () => void
}

export default function AddMomentSheet({ childId, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, 'moments')
      setPhotoUrl(url)
    } catch {
      alert('上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert('请填写标题')
      return
    }
    setSaving(true)
    try {
      const res = await fetchWithAuth('/api/growth/moments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          title: title.trim(),
          content: content.trim(),
          photo_url: photoUrl || null,
          moment_date: new Date().toISOString().split('T')[0],
        }),
      })
      if (res.ok) {
        onSaved()
        onClose()
      } else {
        const j = await res.json().catch(() => ({}))
        alert((j as { error?: string }).error || '保存失败，请重试')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
      }}
      role="presentation"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-moment-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          background: '#fbf9f6',
          borderRadius: '24px 24px 0 0',
          padding: '20px 16px',
          paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div
            id="add-moment-title"
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: '#2d322f',
              fontFamily: "'Noto Serif SC', serif",
            }}
          >
            记录成长时刻
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'rgba(45,50,47,0.4)' }}
          >
            ✕
          </button>
        </div>

        <label
          style={{
            width: '100%',
            height: 160,
            background: photoUrl ? 'none' : 'rgba(164,99,85,0.05)',
            border: '2px dashed rgba(164,99,85,0.2)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginBottom: 16,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {photoUrl ? (
            <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(45,50,47,0.4)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{uploading ? '⏳' : '📸'}</div>
              <div style={{ fontSize: 13, fontFamily: 'sans-serif' }}>{uploading ? '上传中...' : '点击添加照片'}</div>
            </div>
          )}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
        </label>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="这一刻叫什么名字？"
          maxLength={50}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: '#f7f4ee',
            border: '1.5px solid rgba(164,99,85,0.15)',
            borderRadius: 12,
            fontSize: 15,
            color: '#2d322f',
            fontFamily: "'Noto Serif SC', serif",
            marginBottom: 12,
            boxSizing: 'border-box',
          }}
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下这个时刻..."
          rows={4}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: '#f7f4ee',
            border: '1.5px solid rgba(164,99,85,0.15)',
            borderRadius: 12,
            fontSize: 14,
            color: '#2d322f',
            fontFamily: 'sans-serif',
            marginBottom: 16,
            resize: 'none',
            lineHeight: 1.7,
            boxSizing: 'border-box',
          }}
        />

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !title.trim()}
          style={{
            width: '100%',
            padding: '14px',
            background: saving || !title.trim() ? 'rgba(45,50,47,0.15)' : '#a46355',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            fontSize: 15,
            fontFamily: "'Noto Serif SC', serif",
            cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '保存中...' : '保存这一刻'}
        </button>
      </motion.div>
    </motion.div>
  )
}
