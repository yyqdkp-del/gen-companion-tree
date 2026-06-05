'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  formatDiscoveryTime,
  type DiscoveryItem,
  type DiscoverySourceKind,
} from '@/app/_shared/_services/discoveryService'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { toast } from '@/app/components/Toast'

const BORDER: Record<DiscoverySourceKind, string> = {
  email: '#1d9e75',
  photo: '#a46355',
  chat: '#e6a89e',
}

type Props = {
  items: DiscoveryItem[]
  loading: boolean
  onAddTodo: (item: DiscoveryItem) => Promise<void>
  onDismiss: (item: DiscoveryItem) => Promise<void>
}

function DiscoveryCard({
  item,
  onAddTodo,
  onDismiss,
}: {
  item: DiscoveryItem
  onAddTodo: (item: DiscoveryItem) => Promise<void>
  onDismiss: (item: DiscoveryItem) => Promise<void>
}) {
  const [busy, setBusy] = useState<'todo' | 'dismiss' | null>(null)

  const run = async (action: 'todo' | 'dismiss') => {
    setBusy(action)
    try {
      if (action === 'todo') {
        await onAddTodo(item)
        toast('已加入待办', 'success')
      } else {
        await onDismiss(item)
      }
    } catch (e) {
      logOrAlertNetworkError(e)
      toast(action === 'todo' ? '加入失败，请重试' : '操作失败', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: '0 4px 18px rgba(45,50,47,0.03)',
        borderLeft: `3px solid ${BORDER[item.sourceKind]}`,
        marginBottom: 10,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          padding: '3px 8px',
          borderRadius: 8,
          background: 'rgba(164,99,85,0.08)',
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--clay, #a46355)',
          marginBottom: 8,
        }}
      >
        {item.sourceLabel}
      </span>
      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 14,
          fontWeight: 500,
          color: '#2d322f',
          margin: '0 0 6px',
          lineHeight: 1.45,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }}
      >
        {item.summary}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          color: 'rgba(45,50,47,0.45)',
          margin: '0 0 12px',
        }}
      >
        {formatDiscoveryTime(item.createdAt)}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          disabled={!!busy}
          onClick={() => void run('todo')}
          className="gc-btn gc-btn--ghost"
          style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
        >
          {busy === 'todo' ? '添加中…' : '加入待办'}
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          disabled={!!busy}
          onClick={() => void run('dismiss')}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid rgba(45,50,47,0.1)',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'rgba(45,50,47,0.5)',
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy === 'dismiss' ? '…' : '已知道'}
        </motion.button>
      </div>
    </div>
  )
}

export default function RootDiscoveries({ items, loading, onAddTodo, onDismiss }: Props) {
  return (
    <section style={{ padding: '0 16px', marginBottom: 20 }}>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 600,
          fontSize: 16,
          color: '#2d322f',
          margin: '0 0 12px',
        }}
      >
        根的发现
      </h2>
      {loading && items.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(45,50,47,0.45)', textAlign: 'center', padding: '12px 0' }}>
          加载中…
        </p>
      ) : items.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(45,50,47,0.45)', textAlign: 'center', padding: '16px 8px', lineHeight: 1.6 }}>
          根在帮你盯着，有新发现会告诉你
        </p>
      ) : (
        items.map((item) => (
          <DiscoveryCard
            key={`${item.table}-${item.id}`}
            item={item}
            onAddTodo={onAddTodo}
            onDismiss={onDismiss}
          />
        ))
      )}
    </section>
  )
}
