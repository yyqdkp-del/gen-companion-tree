'use client'

import React, { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PAGE_BOTTOM_TAB_ONLY, PAGE_TOP_PADDING } from '@/app/_shared/_constants/layout'
import { useApp } from '@/app/context/AppContext'
import { useChildData } from '@/app/_shared/_hooks/useChildData'
import ChildSwitcher from '@/app/_shared/_components/child/ChildSwitcher'
import ChildTab from './components/ChildTab'
import SchoolTab from './components/SchoolTab'
import GrowthTab from './components/GrowthTab'
import HanziTab from './components/HanziTab'
import type { EnrichedChild } from './components/growthShared'

const TABS = ['孩子', '学校', '成长', '汉字'] as const
type Tab = typeof TABS[number]

function parseTab(raw: string | null): Tab {
  if (raw === '孩子' || raw === 'today' || raw === '今日') return '孩子'
  if (raw === '学校' || raw === 'school') return '学校'
  if (raw === '成长' || raw === 'academic' || raw === '学业') return '成长'
  if (raw === '汉字' || raw === 'hanzi' || raw === 'learn') return '汉字'
  return '孩子'
}

function GrowthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userId, kids, activeKid, selectChild } = useApp()
  const [activeTab, setActiveTab] = useState<Tab>(() => parseTab(searchParams.get('tab')))

  const { refresh } = useChildData(userId, {
    deferMs: 0,
    activeChildId: activeKid?.id ?? null,
  })

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get('tab')))
  }, [searchParams])

  const selectTab = useCallback((tab: Tab) => {
    if (tab === '汉字') {
      router.push('/learn')
      return
    }
    setActiveTab(tab)
    router.replace(`/growth?tab=${encodeURIComponent(tab)}`, { scroll: false })
  }, [router])

  const handleStatusSaved = useCallback(async () => {
    if (!activeKid?.id) return
    await selectChild(activeKid.id, { force: true })
    void refresh()
  }, [activeKid?.id, selectChild, refresh])

  const sel = activeKid as EnrichedChild | null

  return (
    <main
      className="canvas-texture"
      style={{
        minHeight: '100dvh',
        padding: `${PAGE_TOP_PADDING} 0 ${PAGE_BOTTOM_TAB_ONLY}`,
        backgroundColor: 'var(--canvas-light)',
        color: 'var(--fg1)',
        fontFamily: 'var(--font-serif)',
      }}
    >
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(247,244,239,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
      }}>
        <div style={{ padding: '12px 20px 0' }}>
          <p className="gc-eyebrow" style={{ margin: '0 0 6px' }}>根·字</p>
          <h1 style={{
            margin: '0 0 12px',
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: 'var(--fg1)',
          }}>
            {sel?.name ? `${sel.name}的档案` : '孩子档案'}
          </h1>
        </div>

        <div style={{ padding: '0 20px 12px' }}>
          {kids.length > 0 ? (
            <ChildSwitcher mode="bar" />
          ) : null}
        </div>

        <div style={{
          display: 'flex',
          padding: '0 20px',
          borderBottom: '1px solid rgba(45,50,47,0.08)',
        }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => selectTab(tab)}
              style={{
                flex: 1,
                padding: '12px 0',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--clay)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--clay)' : 'var(--fg3)',
                fontSize: 15,
                fontFamily: 'var(--font-serif)',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                transition: 'color 200ms ease, border-color 200ms ease',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px 32px', maxWidth: 560, margin: '0 auto', width: '100%' }}>
        {!sel ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--fg3)' }}>
            请先添加孩子档案
          </div>
        ) : (
          <>
            {activeTab === '孩子' && userId ? (
              <ChildTab onStatusSaved={handleStatusSaved} />
            ) : null}
            {activeTab === '学校' ? (
              <SchoolTab child={sel} />
            ) : null}
            {activeTab === '成长' && userId ? (
              <GrowthTab child={sel} userId={userId} />
            ) : null}
            {activeTab === '汉字' ? (
              <HanziTab />
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

export default function GrowthPage() {
  return (
    <Suspense fallback={
      <main style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--canvas-light)',
        padding: `${PAGE_TOP_PADDING} 20px ${PAGE_BOTTOM_TAB_ONLY}`,
      }} />
    }>
      <GrowthContent />
    </Suspense>
  )
}
