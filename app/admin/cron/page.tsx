'use client'

import { useState } from 'react'

const TASKS = [
  { name: '热点调度', endpoint: '/api/cron/scheduler', description: '按用户时区每天 3 次巡逻调度' },
  { name: '签证提醒', endpoint: '/api/cron/visa-reminder', description: '每天早上 8 点 UTC' },
  { name: '账号清理', endpoint: '/api/cron/account-purge', description: '每天凌晨 2 点' },
  { name: '批量巡逻', endpoint: '/api/cron/patrol', description: '手动触发全量巡逻任务' },
]

export default function AdminCron() {
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})

  const trigger = async (task: (typeof TASKS)[0]) => {
    setLoading(task.name)
    try {
      const res = await fetch('/api/admin/cron/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: task.endpoint }),
      })
      const data = await res.json()
      setResults((prev) => ({
        ...prev,
        [task.name]: JSON.stringify(data, null, 2),
      }))
    } catch {
      setResults((prev) => ({ ...prev, [task.name]: '触发失败' }))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, color: '#2d322f' }}>
        定时任务
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {TASKS.map((task) => (
          <div
            key={task.name}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#2d322f', marginBottom: 4 }}>
                  {task.name}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(45,50,47,0.5)' }}>{task.description}</div>
                <div style={{ fontSize: 11, color: 'rgba(45,50,47,0.35)', marginTop: 4 }}>{task.endpoint}</div>
              </div>
              <button
                type="button"
                onClick={() => void trigger(task)}
                disabled={loading === task.name}
                style={{
                  background: '#a46355',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 14,
                  cursor: loading === task.name ? 'default' : 'pointer',
                  flexShrink: 0,
                }}
              >
                {loading === task.name ? '执行中...' : '手动触发'}
              </button>
            </div>
            {results[task.name] && (
              <pre
                style={{
                  marginTop: 16,
                  background: '#f5f4f1',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 12,
                  color: '#2d322f',
                  overflow: 'auto',
                  maxHeight: 200,
                }}
              >
                {results[task.name]}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
