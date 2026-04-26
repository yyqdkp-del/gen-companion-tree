'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Navigation, Phone, Mail, Calendar, Download, ExternalLink, CreditCard, ShoppingBag, Loader, CheckCircle2 } from 'lucide-react'

const G = { bg: '#E1F5EE', deep: '#1D9E75', dark: '#0F6E56' }
const THEME = { text: '#2C3E50', muted: '#6B8BAA', navy: '#1A3C5E' }

export type ActionData = {
  type: string
  label: string
  data?: {
    url?: string
    destination?: string
    phone?: string
    email_to?: string
    email_subject?: string
    email_body?: string
    calendar_title?: string
    calendar_date?: string
    calendar_time?: string
    calendar_location?: string
    message?: string
    note?: string
    item?: string
    channel?: string
    pdf_type?: string
    pdf_data?: { official_url?: string; download_url?: string }
  }
}

const ACTION_ICON: Record<string, React.ReactNode> = {
  navigate: <Navigation size={15} />, call: <Phone size={15} />,
  email: <Mail size={15} />, whatsapp: <Phone size={15} />,
  calendar: <Calendar size={15} />, download_pdf: <Download size={15} />,
  open_url: <ExternalLink size={15} />, pay: <CreditCard size={15} />,
  buy: <ShoppingBag size={15} />,
}

const ACTION_COLOR: Record<string, { bg: string; icon: string }> = {
  email:        { bg: '#E1F5EE', icon: '#0F6E56' },
  navigate:     { bg: '#E6F1FB', icon: '#185FA5' },
  call:         { bg: '#EAF3DE', icon: '#3B6D11' },
  download_pdf: { bg: '#EEEDFE', icon: '#534AB7' },
  open_url:     { bg: '#EEEDFE', icon: '#534AB7' },
  calendar:     { bg: '#FAEEDA', icon: '#854F0B' },
  buy:          { bg: '#FBEAF0', icon: '#993556' },
  pay:          { bg: '#FBEAF0', icon: '#993556' },
  whatsapp:     { bg: '#EAF3DE', icon: '#3B6D11' },
}

const SHORT_LABEL: Record<string, string> = {
  email: '邮件', navigate: '导航', call: '致电',
  download_pdf: '下载', open_url: '打开', calendar: '提醒',
  buy: '购买', pay: '支付', whatsapp: '消息',
}

export async function executeAction(action: ActionData, userId: string): Promise<string> {
  const data = action.data || {}
  switch (action.type) {
    case 'navigate': {
      const url = data.url || (data.destination
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.destination)}`
        : null)
      if (url) window.open(url, '_blank')
      return '已打开导航'
    }
    case 'call':
      if (data.phone) window.location.href = `tel:${data.phone.replace(/\s/g, '')}`
      return `拨打 ${data.phone}`
    case 'email':
      window.open(`mailto:${data.email_to}?subject=${encodeURIComponent(data.email_subject || '')}&body=${encodeURIComponent(data.email_body || '')}`)
      return '已打开邮件'
    case 'whatsapp':
      window.open(`https://wa.me/${(data.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(data.message || '')}`, '_blank')
      return '已打开 WhatsApp'
    case 'calendar': {
      const title = encodeURIComponent(data.calendar_title || '')
      const date = (data.calendar_date || '').replace(/-/g, '')
      const time = (data.calendar_time || '09:00').replace(':', '')
      const loc = encodeURIComponent(data.calendar_location || '')
      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}T${time}00/${date}T${time}00&location=${loc}`, '_blank')
      return '已加入日历'
    }
    case 'download_pdf': {
      const pdfUrl = data.pdf_data?.official_url || data.pdf_data?.download_url || data.url
      if (pdfUrl) window.open(pdfUrl, '_blank')
      else window.open(`https://www.google.com/search?q=${encodeURIComponent(data.pdf_type || 'form')}+fillable+PDF`, '_blank')
      return '已打开表格'
    }
    case 'open_url':
      if (data.url) window.open(data.url, '_blank')
      return '已打开'
    case 'pay':
      if (data.url) window.open(data.url, '_blank')
      else alert(data.note || data.channel || '请按提示方式缴费')
      return '已查看缴费方式'
    case 'buy': {
      const ch = data.channel === 'shopee'
        ? 'https://shopee.co.th/search?keyword='
        : 'https://www.lazada.co.th/catalog/?q='
      window.open(ch + encodeURIComponent(data.item || ''), '_blank')
      return '已打开购物'
    }
    default: return '已完成'
  }
}

type Props = {
  action: ActionData
  userId: string
  fullWidth?: boolean
  isPrimary?: boolean
  primaryReason?: string
  onDone?: (msg: string) => void
}

export default function ActionBtn({ action, userId, fullWidth = false, isPrimary = false, primaryReason, onDone }: Props) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [doneMsg, setDoneMsg] = useState('')
  const col = ACTION_COLOR[action.type] || { bg: 'rgba(0,0,0,0.05)', icon: THEME.text }
  const label = SHORT_LABEL[action.type] || action.label?.slice(0, 4) || action.type

  const exec = async () => {
    if (status === 'running' || status === 'done') return
    setStatus('running')
    try {
      const msg = await executeAction(action, userId)
      setDoneMsg(msg)
      setStatus('done')
      onDone?.(msg)
    } catch {
      setStatus('error')
    }
  }

  const isDone = status === 'done'
  const isRunning = status === 'running'
  const isError = status === 'error'

  return (
    <motion.button whileTap={{ scale: isRunning ? 1 : fullWidth ? 0.97 : 0.88 }}
      onClick={exec}
      style={{
        display: 'flex', flexDirection: fullWidth ? 'row' : 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: fullWidth ? 8 : 4,
        padding: fullWidth ? '12px 16px' : '10px 6px',
        borderRadius: 10, width: fullWidth ? '100%' : undefined,
        border: isDone ? `0.5px solid #9FE1CB` : isError ? '0.5px solid rgba(220,38,38,0.4)' : fullWidth ? 'none' : '0.5px solid rgba(0,0,0,0.07)',
        background: isDone ? G.bg : isError ? 'rgba(220,38,38,0.06)' : fullWidth ? (isPrimary ? THEME.navy : G.dark) : 'rgba(255,255,255,0.7)',
        cursor: isRunning || isDone ? 'default' : 'pointer',
        transition: 'all 0.2s',
      }}>
      <div style={{
        width: fullWidth ? 28 : 28, height: fullWidth ? 28 : 28,
        borderRadius: 8, flexShrink: 0,
        background: isDone ? G.bg : isError ? 'rgba(220,38,38,0.1)' : fullWidth ? 'rgba(255,255,255,0.15)' : col.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isRunning
          ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader size={14} color={fullWidth ? '#fff' : THEME.muted} />
            </motion.div>
          : isDone ? <CheckCircle2 size={14} color={G.deep} />
          : isError ? <span style={{ fontSize: 13, color: '#DC2626' }}>!</span>
          : <span style={{ color: fullWidth ? '#fff' : col.icon, display: 'flex' }}>
              {ACTION_ICON[action.type] || <ExternalLink size={15} />}
            </span>
        }
      </div>
      <div style={{ textAlign: fullWidth ? 'left' : 'center', flex: fullWidth ? 1 : undefined }}>
        <div style={{ fontSize: fullWidth ? 13 : 11, fontWeight: 500,
          color: isDone ? G.dark : isError ? '#DC2626' : fullWidth ? '#fff' : THEME.text }}>
          {isDone ? (doneMsg || '已完成') : isError ? '失败' : fullWidth ? action.label : label}
        </div>
        {fullWidth && primaryReason && !isDone && !isError && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2, lineHeight: 1.4 }}>
            {primaryReason}
          </div>
        )}
      </div>
    </motion.button>
  )
}
