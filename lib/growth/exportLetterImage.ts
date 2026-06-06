import html2canvas from 'html2canvas'

export type LetterSharePayload = {
  childName: string
  weekLabel: string
  letter: string
  stamp?: string
}

const W = 750
const H = 1200

export async function exportLetterShareImage(payload: LetterSharePayload): Promise<Blob> {
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
      height: ${H}px;
      background: #F6F3EB;
      font-family: 'Noto Serif SC', 'Songti SC', Georgia, serif;
      box-sizing: border-box;
      padding: 48px 40px 56px;
      display: flex;
      flex-direction: column;
    ">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="font-size: 13px; letter-spacing: 0.35em; color: #a46355; font-weight: 500;">
          根陪伴
        </div>
      </div>
      <div style="
        flex: 1;
        background: #ffffff;
        border-radius: 20px;
        padding: 36px 32px;
        box-shadow: 0 8px 32px rgba(45,50,47,0.08);
        display: flex;
        flex-direction: column;
      ">
        <div style="text-align: center; font-size: 11px; letter-spacing: 0.2em; color: #a46355; margin-bottom: 8px;">
          ${payload.stamp || '根陪伴 · 成长家书'}
        </div>
        <div style="text-align: center; font-size: 12px; color: rgba(45,50,47,0.45); margin-bottom: 28px;">
          ${payload.weekLabel}
        </div>
        <div style="
          flex: 1;
          font-size: 17px;
          font-weight: 300;
          line-height: 2.0;
          color: #262A29;
          letter-spacing: 0.05em;
          white-space: pre-wrap;
          word-break: break-word;
        ">${escapeHtml(payload.letter.trim() || '本周暂无家书内容')}</div>
      </div>
      <div style="
        text-align: center;
        margin-top: 28px;
        font-size: 11px;
        color: rgba(45,50,47,0.35);
        letter-spacing: 0.12em;
      ">
        根陪伴 · 陪你在异乡
      </div>
    </div>
  `

  document.body.appendChild(host)
  try {
    const target = host.firstElementChild as HTMLElement
    const canvas = await html2canvas(target, {
      width: W,
      height: H,
      scale: 1,
      useCORS: true,
      backgroundColor: '#F6F3EB',
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
