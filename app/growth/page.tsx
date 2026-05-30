'use client'

import React, { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PAGE_BOTTOM_TAB_ONLY, PAGE_TOP_PADDING } from '@/app/_shared/_constants/layout'
import SchoolContent from './components/SchoolContent'
import AcademicContent from './components/AcademicContent'
import HanziContent from './components/HanziContent'

const TABS = ['学校', '学业', '汉字'] as const
type Tab = typeof TABS[number]

function parseTab(raw: string | null): Tab {
  if (raw === '学校' || raw === '学业' || raw === '汉字') return raw
  if (raw === 'school') return '学校'
  if (raw === 'academic') return '学业'
  if (raw === 'hanzi' || raw === 'learn') return '汉字'
  return '学校'
}

function GrowthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>(() => parseTab(searchParams.get('tab')))

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get('tab')))
  }, [searchParams])

  const selectTab = useCallback((tab: Tab) => {
    setActiveTab(tab)
    router.replace(`/growth?tab=${encodeURIComponent(tab)}`, { scroll: false })
  }, [router])

  return (
    <main style={{
      minHeight: '100dvh',
      padding: `${PAGE_TOP_PADDING} 0 ${PAGE_BOTTOM_TAB_ONLY}`,
      backgroundColor: '#fbf9f6',
      backgroundImage: `
        radial-gradient(at 80% 10%, rgba(228,237,228,0.35) 0px, transparent 50%),
        radial-gradient(at 15% 85%, rgba(245,214,209,0.25) 0px, transparent 50%)
      `,
      fontFamily: "'Noto Serif SC', Georgia, serif",
      color: '#2d322f',
    }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(251,249,246,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
      }}>
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{
            fontSize: 9,
            letterSpacing: 4,
            color: '#a46355',
            textTransform: 'uppercase',
            marginBottom: 4,
            fontFamily: "'Montserrat', sans-serif",
          }}>根·中文</div>
          <h1 style={{
            margin: '0 0 12px',
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '0.06em',
          }}>学校 · 学业 · 汉字</h1>
        </div>

        <div style={{
          display: 'flex',
          gap: 0,
          padding: '0 20px',
          marginBottom: 0,
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
                borderBottom: activeTab === tab ? '2px solid #a46355' : '2px solid transparent',
                color: activeTab === tab ? '#a46355' : 'rgba(45,50,47,0.4)',
                fontSize: 15,
                fontFamily: "'Noto Serif SC', serif",
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 20px 32px' }}>
        {activeTab === '学校' && <SchoolContent />}
        {activeTab === '学业' && <AcademicContent />}
        {activeTab === '汉字' && <HanziContent />}
      </div>
    </main>
  )
}

export default function GrowthPage() {
  return (
    <Suspense fallback={
      <main style={{
        minHeight: '100dvh',
        backgroundColor: '#fbf9f6',
        padding: `${PAGE_TOP_PADDING} 20px ${PAGE_BOTTOM_TAB_ONLY}`,
      }} />
    }>
      <GrowthContent />
    </Suspense>
  )
}
