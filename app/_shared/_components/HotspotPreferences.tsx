'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { THEME } from '../_constants/theme'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// 必选（系统自动，不可关闭）
const REQUIRED_TOPICS = [
  { topic: 'safety_school',   label: '学校周边安全',   emoji: '🏫' },
  { topic: 'safety_area',     label: '区域安全事件',   emoji: '🚨' },
  { topic: 'health_epidemic', label: '疫情健康预警',   emoji: '🏥' },
  { topic: 'visa_policy',     label: '签证政策变化',   emoji: '📋' },
  { topic: 'weather',         label: '极端天气',       emoji: '⛈' },
]

// 重要（默认开启）
const IMPORTANT_TOPICS = [
  { topic: 'education_school',  label: '学校通知公告', emoji: '📚' },
  { topic: 'education_policy',  label: '教育政策变化', emoji: '🎓' },
  { topic: 'legal',             label: '外籍家庭政策', emoji: '⚖️' },
  { topic: 'finance_rate',      label: '汇率大幅波动', emoji: '💱' },
  { topic: 'finance_cost',      label: '生活成本变化', emoji: '🛒' },
  { topic: 'health_resource',   label: '医疗资源信息', emoji: '💊' },
  { topic: 'transport',         label: '交通出行异常', emoji: '🚌' },
  { topic: 'utilities',         label: '停水停电通知', emoji: '💡' },
]

// 个人选择（默认关闭）
const PERSONAL_TOPICS = [
  { topic: 'mom_community',  label: '华人社群活动',   emoji: '👥' },
  { topic: 'mom_selfcare',   label: '妈妈自我关怀',   emoji: '🌸' },
  { topic: 'shopping_deal',  label: '超市优惠促销',   emoji: '🛍' },
  { topic: 'shopping_supply',label: '中国食材供应',   emoji: '🥢' },
  { topic: 'kids_activity',  label: '亲子活动',       emoji: '🎪' },
  { topic: 'dining',         label: '餐厅美食',       emoji: '🍜' },
  { topic: 'china_news',     label: '国内重要新闻',   emoji: '🇨🇳' },
  { topic: 'fitness',        label: '运动健身',       emoji: '💪' },
]

type Props = {
  userId: string
  onClose: () => void
  onSave: () => void
}

export default function HotspotPreferences({ userId, onClose, onSave }: Props) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // 加载现有设置
    supabase.from('interest_weights')
      .select('topic, weight')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) {
          const on = new Set(data.filter(d => d.weight > 0).map(d => d.topic))
          // 默认开启重要类别
          IMPORTANT_TOPICS.forEach(t => on.add(t.topic))
          setEnabled(on)
        } else {
          // 首次使用，默认开启重要类别
          const defaults = new Set(IMPORTANT_TOPICS.map(t => t.topic))
          setEnabled(defaults)
        }
      })
  }, [userId])

  const toggle = (topic: string) => {
    setEnabled(prev => {
      const next = new Set(prev)
      if (next.has(topic)) next.delete(topic)
      else next.add(topic)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const allTopics = [...IMPORTANT_TOPICS, ...PERSONAL_TOPICS]
      await Promise.all(allTopics.map(async t => {
        const weight = enabled.has(t.topic) ? 80 : 0
        const { data: existing } = await supabase
          .from('interest_weights')
          .select('*').eq('user_id', userId).eq('topic', t.topic).single()
        if (existing) {
          await supabase.from('interest_weights')
            .update({ weight, updated_at: new Date().toISOString() })
            .eq('user_id', userId).eq('topic', t.topic)
        } else {
          await supabase.from('interest_weights')
            .insert({ user_id: userId, topic: t.topic, weight })
        }
      }))
      onSave()
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const TopicButton = ({ topic, label, emoji, locked }: {
    topic: string; label: string; emoji: string; locked?: boolean
  }) => {
    const on = locked || enabled.has(topic)
    return (
      <motion.div whileTap={{ scale: locked ? 1 : 0.94 }}
        onClick={() => !locked && toggle(topic)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 20,
          background: on ? 'rgba(176,141,87,0.12)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${on ? 'rgba(176,141,87,0.4)' : 'rgba(0,0,0,0.08)'}`,
          cursor: locked ? 'default' : 'pointer',
          opacity: locked ? 0.7 : 1,
          transition: 'all 0.15s',
        }}>
        <span style={{ fontSize: 14 }}>{emoji}</span>
        <span style={{ fontSize: 12, fontWeight: on ? 600 : 400,
          color: on ? THEME.gold : THEME.muted }}>
          {label}
        </span>
        {locked && (
          <span style={{ fontSize: 9, color: THEME.muted }}>必选</span>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ width: '100%', maxWidth: 480,
          background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(40px)',
          borderRadius: '24px 24px 0 0', maxHeight: '88vh', overflowY: 'auto',
          boxShadow: '0 -10px 60px rgba(0,0,0,0.14)' }}>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '12px 20px 0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: THEME.text }}>
              热点关注设置
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: THEME.muted }}>
              选择你想关注的内容，根会替你盯着
            </p>
          </div>
          <motion.div whileTap={{ scale: 0.85 }} onClick={onClose}
            style={{ cursor: 'pointer', opacity: 0.3 }}>
            <X size={20} />
          </motion.div>
        </div>

        <div style={{ padding: '16px 20px 100px' }}>

          {/* 必选 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600,
              marginBottom: 10, letterSpacing: '0.1em' }}>
              必选关注（系统自动）
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {REQUIRED_TOPICS.map(t => (
                <TopicButton key={t.topic} {...t} locked />
              ))}
            </div>
          </div>

          {/* 重要 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600,
              marginBottom: 10, letterSpacing: '0.1em' }}>
              重要关注（建议开启）
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {IMPORTANT_TOPICS.map(t => (
                <TopicButton key={t.topic} {...t} />
              ))}
            </div>
          </div>

          {/* 个人选择 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600,
              marginBottom: 10, letterSpacing: '0.1em' }}>
              个人选择
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PERSONAL_TOPICS.map(t => (
                <TopicButton key={t.topic} {...t} />
              ))}
            </div>
          </div>

          <motion.button whileTap={{ scale: 0.97 }} onClick={save} disabled={saving}
            style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none',
              background: THEME.navy, color: '#fff', fontSize: 14,
              fontWeight: 600, cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中…' : '保存设置'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
