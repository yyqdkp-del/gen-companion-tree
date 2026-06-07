import html2canvas from 'html2canvas'

export type LetterSharePayload = {
  childName: string
  weekLabel: string
  letter: string
  achievements?: string[]
}

export const LETTER_STAMP = '根陪伴 · 成长家书'
export const LETTER_FOOTER = '根陪伴 · 陪你在异乡'

const W = 750
const H = 1200
const PAPER_FALLBACK = '#F4F2ED'

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

async function ensureSerifFontsReady() {
  if (typeof document === 'undefined') return
  await Promise.all([
    document.fonts.load('300 17px "Noto Serif SC"'),
    document.fonts.load('400 17px "Noto Serif SC"'),
    document.fonts.load('700 17px "Noto Serif SC"'),
  ])
  await document.fonts.ready
}

function buildAchievementsHtml(items: string[]): string {
  if (!items.length) return ''
  const rows = items.map((a) => `
    <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;font-size:14px;color:#5a5a4a;line-height:1.55;">
      <span style="width:6px;height:6px;border-radius:50%;background:#a46355;flex-shrink:0;margin-top:8px;"></span>
      <span>${escapeHtml(a)}</span>
    </div>
  `).join('')
  return `
    <div style="background:#fff;border-radius:22px;padding:20px 24px;box-shadow:0 12px 40px rgba(164,99,85,0.05),0 2px 6px rgba(45,50,47,0.02);margin-top:16px;">
      <div style="font-size:11px;letter-spacing:0.2em;color:#a46355;margin-bottom:12px;text-transform:uppercase;">这周的小瞬间</div>
      ${rows}
    </div>
  `
}

export async function exportLetterShareImage(payload: LetterSharePayload): Promise<Blob> {
  const paper = cssVar('--canvas-mist', PAPER_FALLBACK)
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-9999px'
  host.style.top = '0'
  host.style.width = `${W}px`
  host.style.height = `${H}px`
  host.style.pointerEvents = 'none'
  host.style.zIndex = '-1'

  host.innerHTML = `
    <div style="
      width: ${W}px;
      min-height: ${H}px;
      background: ${paper};
      font-family: 'Noto Serif SC', 'Songti SC', Georgia, serif;
      box-sizing: border-box;
      padding: 0 40px 56px;
      display: flex;
      flex-direction: column;
    ">
      <div style="height:4px;background:linear-gradient(90deg,#e6a89e,#8ca88d);margin:0 -40px 32px;"></div>
      <div style="
        flex: 1;
        background: #ffffff;
        border-radius: 22px;
        padding: 36px 32px;
        box-shadow: 0 12px 40px rgba(164,99,85,0.05), 0 2px 6px rgba(45,50,47,0.02);
        display: flex;
        flex-direction: column;
      ">
        <div style="text-align: center; font-size: 11px; letter-spacing: 0.2em; color: #a46355; margin-bottom: 8px;">
          ${LETTER_STAMP}
        </div>
        <div style="text-align: center; font-size: 12px; color: rgba(45,50,47,0.45); margin-bottom: 28px; font-family: 'PingFang SC','Noto Sans SC',sans-serif;">
          ${escapeHtml(payload.weekLabel)}
        </div>
        <div style="
          font-size: 17px;
          font-weight: 300;
          line-height: 2.0;
          color: #2d322f;
          letter-spacing: 0.05em;
          white-space: pre-wrap;
          word-break: break-word;
        ">${escapeHtml(payload.letter.trim() || '本周暂无家书内容')}</div>
      </div>
      ${buildAchievementsHtml(payload.achievements || [])}
      <div style="
        text-align: center;
        margin-top: 28px;
        font-size: 11px;
        color: rgba(45,50,47,0.35);
        letter-spacing: 0.12em;
        font-family: 'PingFang SC','Noto Sans SC',sans-serif;
      ">
        ${LETTER_FOOTER}
      </div>
    </div>
  `

  document.body.appendChild(host)
  try {
    await ensureSerifFontsReady()
    const target = host.firstElementChild as HTMLElement
    const canvas = await html2canvas(target, {
      width: W,
      height: target.offsetHeight,
      scale: 1,
      useCORS: true,
      backgroundColor: paper,
    })
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('图片生成失败'))
      }, 'image/png', 0.92)
    })
  } finally {
    document.body.removeChild(host)
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function shareOrDownloadLetterImage(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: '成长家书' })
    return 'shared'
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
