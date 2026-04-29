'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AnimatePresence, motion } from 'framer-motion'

const supabase = createClient(
)

export type AppConfig = {
  id: string
  page: string
  component: string
  config_key: string
  config_value: Record<string, any>
  is_visible: boolean
  sort_order: number
  child_id: string | null
}

type Props = {
  page: string
  extraData?: Record<string, any>
  // 自定义渲染：传入则完全由调用方决定每个卡片长什么样
  renderItem?: (config: AppConfig, data: Record<string, any>) => React.ReactNode
}

export default function DynamicRenderer({ page, extraData = {}, renderItem }: Props) {
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [page])

  if (renderItem) {
    // 自定义渲染模式 — 水珠版使用这个
    return (
      <>
        {configs.map(config => renderItem(config, extraData))}
      </>
    )
  }

  // 默认网格渲染模式（备用）
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '0 20px' }}>
      <AnimatePresence>
        {configs.map((config, i) => (
          <motion.div
            key={config.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: i * 0.08, duration: 0.6 }}
          >
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}>
              <p style={{ color: '#fff', fontSize: '12px' }}>{config.config_value?.title ?? config.component}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
