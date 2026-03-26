'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Zap, Heart, Trees, Cloud, AlertTriangle, Star } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const THEME = {
  card: '#1A1E1B',
  border: '#2A302C',
  primary: '#7AB89A',
  accent: '#C8A96E',
  muted: '#4A5A50',
  text: '#E8EDE9',
}

// ─────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────
type AppConfig = {
  id: string
  page: string
  component: string
  config_key: string
  config_value: Record<string, any>
  is_visible: boolean
  sort_order: number
  child_id: string | null
}

// ─────────────────────────────────────────
// 组件注册表 — 新增组件只需在这里注册一次
// ─────────────────────────────────────────
const COMPONENT_REGISTRY: Record<string, React.FC<{ config: AppConfig; data?: any }>> = {
  TaskCard,
  EnergyCard,
  ChildCard,
  WeatherCard,
  AlertCard,
  CustomCard,
}

// ─────────────────────────────────────────
// 主引擎
// ─────────────────────────────────────────
export default function DynamicRenderer({
  page,
  extraData = {},
}: {
  page: string
  extraData?: Record<string, any>
}) {
  const [configs, setConfigs] = useState<AppConfig[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('app_config')
        .select('*')
        .eq('page', page)
        .eq('is_visible', true)
        .order('sort_order', { ascending: true })
      setConfigs(data || [])
    }

    load()

    // 实时监听 — Make.com 改了 config，页面立即响应
    const channel = supabase
      .channel(`app_config_${page}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_config' },
        load
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [page])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        padding: '0 20px',
      }}
    >
      <AnimatePresence>
        {configs.map((config, i) => {
          const Component = COMPONENT_REGISTRY[config.component]
          if (!Component) return null
          return (
            <motion.div
              key={config.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
            >
              <Component config={config} data={extraData[config.component]} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────
// 卡片组件
// ─────────────────────────────────────────

function CardShell({
  children,
  color = THEME.primary,
  onClick,
}: {
  children: React.ReactNode
  color?: string
  onClick?: () => void
}) {
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      onClick={onClick}
      style={{
        background: THEME.card,
        border: `1px solid ${THEME.border}`,
        borderRadius: '24px',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      {children}
    </motion.div>
  )
}

function CardIcon({ icon, color, alert }: { icon: React.ReactNode; color: string; alert?: boolean }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}
      >
        {icon}
      </div>
      {alert && (
        <motion.span
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#E87A6A',
            border: `2px solid ${THEME.card}`,
          }}
        />
      )}
    </div>
  )
}

function CardText({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p style={{ fontSize: '9px', letterSpacing: '0.3em', color: THEME.muted, textTransform: 'uppercase', margin: '0 0 6px', fontFamily: "'Space Mono', monospace" }}>
        {label}
      </p>
      <p style={{ fontSize: '22px', fontWeight: 300, color: THEME.text, margin: 0, lineHeight: 1, fontFamily: "'Noto Serif SC', serif" }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: '11px', color: THEME.muted, margin: '4px 0 0' }}>{sub}</p>
      )}
    </div>
  )
}

// ── TaskCard ──
function TaskCard({ data }: { config: AppConfig; data?: any }) {
  const tasks: any[] = data?.tasks || []
  const count = tasks.length
  return (
    <CardShell color={THEME.primary}>
      <CardIcon icon={<Bell size={16} />} color={THEME.primary} alert={count > 0} />
      <CardText label="任务感应" value={count > 0 ? `${count} 条` : '静默'} sub={count > 0 ? '待处理' : '系统监听中'} />
    </CardShell>
  )
}

// ── EnergyCard ──
function EnergyCard({ config }: { config: AppConfig; data?: any }) {
  const value = config.config_value?.value ?? '85'
  return (
    <CardShell color={THEME.accent}>
      <CardIcon icon={<Zap size={16} />} color={THEME.accent} />
      <CardText label="精力值" value={value} sub="% 良好" />
    </CardShell>
  )
}

// ── ChildCard ──
function ChildCard({ data }: { config: AppConfig; data?: any }) {
  const [index, setIndex] = useState(0)
  const children: Array<{ name: string; status: string }> = data?.children || [
    { name: 'William', status: 'active' },
    { name: 'Noah', status: 'active' },
  ]
  const statusMap: Record<string, string> = {
    sleeping: '睡眠中', active: '活跃', school: '上学中', eating: '用餐中',
  }
  const current = children[index]
  return (
    <CardShell color="#C88A8A" onClick={() => setIndex(i => (i + 1) % children.length)}>
      <CardIcon icon={<Heart size={16} />} color="#C88A8A" />
      <div>
        <motion.p key={current?.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ fontSize: '9px', letterSpacing: '0.3em', color: THEME.muted, textTransform: 'uppercase', margin: '0 0 6px', fontFamily: "'Space Mono', monospace" }}>
          {current?.name}
        </motion.p>
        <motion.p key={current?.status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: '22px', fontWeight: 300, color: THEME.text, margin: 0, lineHeight: 1, fontFamily: "'Noto Serif SC', serif" }}>
          {statusMap[current?.status] ?? current?.status}
        </motion.p>
        <p style={{ fontSize: '11px', color: THEME.muted, margin: '4px 0 0' }}>
          点击切换 · {children.length} 个宝贝
        </p>
      </div>
    </CardShell>
  )
}

// ── WeatherCard ──
function WeatherCard({ config }: { config: AppConfig; data?: any }) {
  const { value = '28°', sub = '晴朗无云' } = config.config_value || {}
  return (
    <CardShell color="#8AB8C8">
      <CardIcon icon={<Trees size={16} />} color="#8AB8C8" />
      <CardText label="清迈天气" value={value} sub={sub} />
    </CardShell>
  )
}

// ── AlertCard — Grok 热点事件 ──
function AlertCard({ config }: { config: AppConfig; data?: any }) {
  const { title = '暂无警报', sub = '' } = config.config_value || {}
  return (
    <CardShell color="#E87A6A">
      <CardIcon icon={<AlertTriangle size={16} />} color="#E87A6A" alert />
      <CardText label="热点警报" value={title} sub={sub} />
    </CardShell>
  )
}

// ── CustomCard — Make.com 可自由写入任意卡片 ──
function CustomCard({ config }: { config: AppConfig; data?: any }) {
  const { title = '—', value = '—', sub = '', color = THEME.primary } = config.config_value || {}
  return (
    <CardShell color={color}>
      <CardIcon icon={<Star size={16} />} color={color} />
      <CardText label={title} value={value} sub={sub} />
    </CardShell>
  )
}
