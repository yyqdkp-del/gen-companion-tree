'use client'

import PriChip from './PriChip'
import type { PriKind } from './priorityTokens'

export type TimelineSegmentItem = {
  title: string
  subtitle: string
  priority?: PriKind
}

export type TimelineSegmentData = {
  tag: string
  en: string
  time: string
  state: string
  items: TimelineSegmentItem[]
}

export type TimelineSegmentProps = {
  segments: TimelineSegmentData[]
}

const SEGMENT_NODE: Record<string, { fill: string; text: string; glow: string }> = {
  晨: {
    fill: 'linear-gradient(135deg, #cddce5, #6c828f)',
    text: '#2b3942',
    glow: 'rgba(108, 130, 143, 0.18)',
  },
  校: {
    fill: 'linear-gradient(135deg, #d9e6da, #8ca88d)',
    text: '#2f4030',
    glow: 'rgba(140, 168, 141, 0.2)',
  },
  暮: {
    fill: 'linear-gradient(135deg, #f5d6d1, #e6a89e)',
    text: '#7d3f37',
    glow: 'rgba(230, 168, 158, 0.24)',
  },
}

function SegmentNode({ tag }: { tag: string }) {
  const s = SEGMENT_NODE[tag] ?? SEGMENT_NODE['校']
  return (
    <span
      style={{
        position: 'absolute',
        left: 0,
        top: 2,
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: s.fill,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-serif)',
        fontSize: 13,
        fontWeight: 600,
        color: s.text,
        boxShadow: `0 4px 10px -2px ${s.glow}`,
      }}
    >
      {tag}
    </span>
  )
}

export default function TimelineSegment({ segments }: TimelineSegmentProps) {
  if (!segments.length) {
    return (
      <div
        style={{
          fontSize: 12,
          color: 'rgba(45,50,47,0.45)',
          opacity: 0.6,
          textAlign: 'center',
          padding: '8px 0',
        }}
      >
        今天暂无课程安排
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 6, marginTop: 10 }}>
      {segments.map((seg, i) => (
        <div
          key={`${seg.tag}-${seg.en}`}
          style={{ position: 'relative', paddingLeft: 34, paddingBottom: i < segments.length - 1 ? 20 : 0 }}
        >
          {i < segments.length - 1 && (
            <span
              style={{
                position: 'absolute',
                left: 13,
                top: 30,
                bottom: 0,
                width: 1.5,
                background: 'rgba(45,50,47,0.08)',
              }}
            />
          )}
          <SegmentNode tag={seg.tag} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <span
              style={{
                fontFamily: 'var(--font-latin)',
                fontSize: 9,
                letterSpacing: '0.3em',
                color: 'rgba(45,50,47,0.45)',
              }}
            >
              {seg.en}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-latin)',
                fontSize: 11,
                color: 'rgba(45,50,47,0.45)',
              }}
            >
              {seg.time}
            </span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {seg.items.length > 0 ? (
              seg.items.map((it, j) => (
                <div
                  key={`${it.title}-${j}`}
                  style={{
                    background: '#fff',
                    borderRadius: 13,
                    padding: '10px 13px',
                    boxShadow: '0 3px 14px rgba(45,50,47,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontWeight: 500,
                        fontSize: 14,
                        color: '#2d322f',
                        flex: 1,
                      }}
                    >
                      {it.title}
                    </span>
                    {it.priority && <PriChip kind={it.priority} />}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 11.5,
                      color: 'rgba(45,50,47,0.45)',
                      marginTop: 3,
                    }}
                  >
                    {it.subtitle}
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11.5,
                  color: 'rgba(45,50,47,0.45)',
                  opacity: 0.7,
                  padding: '4px 0',
                }}
              >
                暂无安排
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
