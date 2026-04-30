'use client'
import { motion } from 'framer-motion'
import { useApp } from '@/app/context/AppContext'
import { useRouter } from 'next/navigation'

function getEnergyColor(energy: number) {
  if (energy >= 80) return '#4CAF50'
  if (energy >= 50) return '#FFC107'
  return '#FF5722'
}

type Props = {
  size?: number
  showName?: boolean
  showEnergy?: boolean
  onSelect?: (kid: any) => void
  style?: React.CSSProperties
}

export default function ChildAvatar({
  size = 68,
  showName = true,
  showEnergy = true,
  onSelect,
  style = {},
}: Props) {
  const { kids } = useApp()
  const router = useRouter()

  const activeId = typeof window !== 'undefined' ? localStorage.getItem('active_child_id') : null
  const selKid = kids.find((k: any) => k.id === activeId) || kids[0] || null

  const handleClick = () => {
    if (onSelect && selKid) {
      onSelect(selKid)
    } else {
      router.push('/children')
    }
  }

  if (kids.length === 0) {
    return (
      <motion.div
        whileTap={{ scale: 0.9 }}
        onClick={() => router.push('/children')}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', ...style }}
      >
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: 'rgba(255,255,255,0.45)',
          border: '2px dashed rgba(255,255,255,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.47,
        }}>🌱</div>
        {showName && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.15em' }}>
            添加孩子
          </span>
        )}
      </motion.div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
      <motion.div
        onClick={handleClick}
        animate={{
          boxShadow: [
            `0 0 15px ${getEnergyColor(selKid?.energy ?? 75)}40`,
            `0 0 35px ${getEnergyColor(selKid?.energy ?? 75)}80`,
            `0 0 15px ${getEnergyColor(selKid?.energy ?? 75)}40`,
          ],
        }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{
          width: size, height: size, borderRadius: '50%',
          background: 'rgba(255,255,255,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid white',
          cursor: 'pointer',
          fontSize: size * 0.5,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {selKid?.avatar_url
          ? <img src={selKid.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          : selKid?.emoji || '👶🏻'
        }
      </motion.div>

      {showName && selKid?.name && (
        <p style={{ marginTop: 8, fontSize: 10, color: 'white', fontWeight: 700, letterSpacing: '0.2em', textAlign: 'center', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          {selKid.name}
        </p>
      )}

      {showEnergy && (
        <div style={{ width: size * 0.82, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2, margin: '3px auto', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${selKid?.energy ?? 75}%` }}
            style={{ height: '100%', background: getEnergyColor(selKid?.energy ?? 75) }}
          />
        </div>
      )}

      {/* 多孩子切换点 */}
      {kids.length > 1 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'center' }}>
          {kids.map((k: any) => (
            <div
              key={k.id}
              onClick={() => {
                localStorage.setItem('active_child_id', k.id)
                localStorage.setItem('active_child', JSON.stringify({
                  id: k.id, name: k.name, grade: k.grade,
                  level: k.level || 'R2', emoji: k.emoji || '👶🏻', school: k.school,
                }))
                window.dispatchEvent(new Event('child-changed'))
                if (onSelect) onSelect(k)
              }}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: (selKid?.id === k.id)
                  ? 'rgba(255,255,255,0.95)'
                  : 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
