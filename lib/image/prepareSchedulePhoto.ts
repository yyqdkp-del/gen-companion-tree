/** 从 JPEG 文件头读取 EXIF Orientation（1/3/6/8 等）；失败返回 null */
export async function getJpegExifOrientation(file: File): Promise<number | null> {
  const isJpeg =
    /^image\/jpe?g$/i.test(file.type) || /\.jpe?g$/i.test(file.name)
  if (!isJpeg) return null

  try {
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer()
    const view = new DataView(buffer)
    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return null

    let offset = 2
    while (offset + 4 < view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break
      const marker = view.getUint16(offset, false)
      offset += 2

      if (marker === 0xffe1) {
        const segLen = view.getUint16(offset, false)
        const segStart = offset + 2
        if (segStart + 6 > view.byteLength) return null
        const exif =
          view.getUint8(segStart) === 0x45 &&
          view.getUint8(segStart + 1) === 0x78 &&
          view.getUint8(segStart + 2) === 0x69 &&
          view.getUint8(segStart + 3) === 0x66
        if (!exif) {
          offset += segLen
          continue
        }

        const tiff = segStart + 6
        const le = view.getUint16(tiff, false) === 0x4949
        const get16 = (o: number) => view.getUint16(o, le)
        const get32 = (o: number) => view.getUint32(o, le)
        const ifd0 = tiff + get32(tiff + 4)
        const count = get16(ifd0)
        for (let i = 0; i < count; i++) {
          const entry = ifd0 + 2 + i * 12
          if (get16(entry) === 0x0112) {
            const o = get16(entry + 8)
            return o >= 1 && o <= 8 ? o : null
          }
        }
        return null
      }

      if (marker === 0xffda) break
      if (marker < 0xffe0 || marker > 0xffef) {
        if ((marker & 0xff00) === 0xff00) break
      }
      const segLen = view.getUint16(offset, false)
      offset += segLen
    }
  } catch {
    return null
  }
  return null
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image load failed'))
    }
    img.src = url
  })
}

/** 按 EXIF orientation 绘制到 canvas（浏览器 img 不会自动应用 EXIF） */
function drawImageWithOrientation(
  img: HTMLImageElement,
  orientation: number,
): HTMLCanvasElement {
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unsupported')

  if (orientation > 4 && orientation < 9) {
    canvas.width = h
    canvas.height = w
  } else {
    canvas.width = w
    canvas.height = h
  }

  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, w, 0)
      break
    case 3:
      ctx.transform(-1, 0, 0, -1, w, h)
      break
    case 4:
      ctx.transform(1, 0, 0, -1, 0, h)
      break
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0)
      break
    case 6:
      ctx.transform(0, 1, -1, 0, h, 0)
      break
    case 7:
      ctx.transform(0, -1, -1, 0, h, w)
      break
    case 8:
      ctx.transform(0, -1, 1, 0, 0, w)
      break
    default:
      break
  }

  ctx.drawImage(img, 0, 0, w, h)
  return canvas
}

export type PrepareSchedulePhotoResult = {
  base64: string
  mediaType: 'image/jpeg'
  width: number
  height: number
  /** 纠正方向后仍为竖长图 */
  isPortraitTall: boolean
  exifOrientation: number | null
}

/**
 * 读取 EXIF、纠正方向并导出 JPEG base64；无法读取 EXIF 时按原图绘制。
 */
export async function prepareSchedulePhotoForUpload(
  file: File,
): Promise<PrepareSchedulePhotoResult> {
  const exifOrientation = await getJpegExifOrientation(file)
  const img = await loadImageFromFile(file)

  let canvas: HTMLCanvasElement
  if (exifOrientation != null && exifOrientation !== 1) {
    canvas = drawImageWithOrientation(img, exifOrientation)
  } else {
    canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas unsupported')
    ctx.drawImage(img, 0, 0)
  }

  const width = canvas.width
  const height = canvas.height
  const isPortraitTall = height > width * 1.5
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
  const base64 = dataUrl.split(',')[1] || ''

  return {
    base64,
    mediaType: 'image/jpeg',
    width,
    height,
    isPortraitTall,
    exifOrientation,
  }
}
