'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  formatDiscoveryTime,
  formatEventDate,
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
  onAddCalendar: (item: DiscoveryItem) => Promise<void>
  onAddReminder: (item: DiscoveryItem) => Promise<void>
  onDismiss: (item: DiscoveryItem) => Promise<void>
}

function DiscoveryCard({
  item,
  onAddCalendar,
  onAddReminder,
  onDismiss,
}: {
  item: DiscoveryItem
  onAddCalendar: (item: DiscoveryItem) => Promise<void>
  onAddReminder: (item: DiscoveryItem) => Promise<void>
  onDismiss: (item: DiscoveryItem) => Promise<void>
}) {
  const [busy, setBusy] = useState<'calendar' | 'reminder' | 'dismiss' | null>(null)
  const isEmail = item.table === 'processed_emails'
  const events = (item.extractedEvents || []).slice(0, 2)

  const run = async (action: 'calendar' | 'reminder' | 'dismiss') => {
    setBusy(action)
    try {
      if (action === 'calendar') {
        await onAddCalendar(item)
        toast('已加入校历', 'success')
      } else if (action === 'reminder') {
        await onAddReminder(item)
        toast('已设提醒', 'success')
      } else {
        await onDismiss(item)
      }
    } catch (e) {
      logOrAlertNetworkError(e)
      toast(
        action === 'calendar' ? '加入校历失败' : action === 'reminder' ? '设提醒失败' : '操作失败',
        'error',
      )
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
          margin: '0 0 8px',
          lineHeight: 1.45,
        }}
      >
        {item.summary}
      </p>

      {events.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {events.map((ev, i) => (
            <div
              key={`${ev.title}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: 'rgba(45,50,47,0.65)',
                marginBottom: 4,
              }}
            >
              <span style={{ color: '#1d9e75' }}>●</span>
              <span>{ev.title}</span>
              {ev.date && (
                <span style={{ color: 'rgba(45,50,47,0.4)' }}>{formatEventDate(ev.date)}</span>
              )}
            </div>
          ))}
        </div>
      )}

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

      {isEmail ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={!!busy}
            onClick={() => void run('calendar')}
            className="gc-btn gc-btn--ghost"
            style={{ flex: 1, minWidth: 90, padding: '8px 12px', fontSize: 12 }}
          >
            {busy === 'calendar' ? '添加中…' : '加入校历'}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={!!busy}
            onClick={() => void run('reminder')}
            className="gc-btn gc-btn--ghost"
            style={{ flex: 1, minWidth: 90, padding: '8px 12px', fontSize: 12 }}
          >
            {busy === 'reminder' ? '设置中…' : '设提醒'}
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
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={!!busy}
            onClick={() => void run('reminder')}
            className="gc-btn gc-btn--ghost"
            style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
          >
            {busy === 'reminder' ? '添加中…' : '加入待办'}
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
      )}

      {isEmail && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            color: 'rgba(45,50,47,0.35)',
            margin: '10px 0 0',
            lineHeight: 1.4,
          }}
        >
          根只保存了关键信息，不保存邮件内容
        </p>
      )}
    </div>
  )
}

export default function RootDiscoveries({
  items,
  loading,
  onAddCalendar,
  onAddReminder,
  onDismiss,
}: Props) {
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
            onAddCalendar={onAddCalendar}
            onAddReminder={onAddReminder}
            onDismiss={onDismiss}
          />
        ))
      )}
    </section>
  )
}
