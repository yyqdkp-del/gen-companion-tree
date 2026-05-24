'use client'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/context/AppContext'

function getEnergyColor(energy: number) {
  if (energy >= 80) return '#4CAF50'
  if (energy >= 50) return '#FFC107'
  return '#FF5722'
}

function getGlowColor(energy: number | null | undefined) {
  if (energy == null) return 'rgba(255,255,255,0.45)'
  return getEnergyColor(energy)
}

export type ChildAvatarProps = {
  kids?: any[]
  enrichedKids?: any[]
  activeKid?: any | null
  onSwitch?: (kid: any) => void
}

export default function ChildAvatar({
  kids: kidsProp,
  enrichedKids,
  activeKid: activeKidProp,
  onSwitch,
}: ChildAvatarProps) {
  const router = useRouter()
  const { kids: ctxKids, activeKid: ctxActiveKid, setActiveKid } = useApp()
  const kids = kidsProp ?? ctxKids
  const activeKid = activeKidProp ?? ctxActiveKid
  const switchKid = onSwitch ?? setActiveKid

  const handleClick = () => {
    if (!kids.length) { router.push('/children'); return }
    if (kids.length === 1) return
    const currentIndex = kids.findIndex((k: any) => k.id === activeKid?.id)
    const nextIndex = (currentIndex + 1) % kids.length
    const raw = kids[nextIndex]
    const nextKid = enrichedKids?.find((k: any) => k.id === raw.id) || raw
    switchKid(nextKid)
  }

  const energyPct = activeKid?.energy ?? null
  const hasEnergy = energyPct !== null
  const glowColor = getGlowColor(energyPct)

  return (
    <div style={{
      position: 'fixed',
      top: 'max(48px, env(safe-area-inset-top, 48px))',
      left: '5%',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {!kids.length ? (
        <motion.div whileTap={{ scale: 0.9 }} onClick={() => router.push('/children')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', border: '2px dashed rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
            🌱
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.15em' }}>添加孩子</span>
        </motion.div>
      ) : (
        <>
          <motion.div
            onClick={handleClick}
            whileTap={{ scale: 0.92 }}
            animate={{
              boxShadow: [
                `0 0 15px ${glowColor}40`,
                `0 0 35px ${glowColor}80`,
                `0 0 15px ${glowColor}40`,
              ],
            }}
            transition={{ duration: 4, repeat: Infinity }}
            style={{
              width: 68, height: 68, borderRadius: '50%',
              background: 'rgba(255,255,255,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid white',
              cursor: kids.length > 1 ? 'pointer' : 'default',
              fontSize: 34, overflow: 'hidden',
            }}
          >
            {activeKid?.avatar_url
              ? <img src={activeKid.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : activeKid?.emoji || '👶🏻'}
          </motion.div>

          <p style={{ marginTop: 6, fontSize: 10, color: 'white', fontWeight: 700, letterSpacing: '0.2em', textAlign: 'center', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {activeKid?.name}
          </p>

          <div style={{ width: 56, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2, margin: '3px auto', overflow: 'hidden' }}>
            {hasEnergy ? (
              <motion.div
                animate={{ width: `${energyPct}%` }}
                style={{ height: '100%', background: getEnergyColor(energyPct!) }}
              />
            ) : (
              <motion.div style={{ width: '100%', height: '100%', background: 'rgba(45,50,47,0.1)', borderRadius: 2 }} />
            )}
          </div>

          {kids.length > 1 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              {kids.map((k: any) => (
                <div key={k.id} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: activeKid?.id === k.id ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
