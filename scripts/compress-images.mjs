import sharp from 'sharp'
import { statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '../public')

// 压缩 forest-bg.png → forest-bg.webp
await sharp(join(publicDir, 'forest-bg.png'))
  .resize(1200, null, { withoutEnlargement: true })
  .webp({ quality: 80 })
  .toFile(join(publicDir, 'forest-bg.webp'))

console.log('Done!')

// 显示文件大小对比
const original = statSync(join(publicDir, 'forest-bg.png')).size
const compressed = statSync(join(publicDir, 'forest-bg.webp')).size
console.log(`原图: ${(original / 1024).toFixed(0)}KB`)
console.log(`WebP: ${(compressed / 1024).toFixed(0)}KB`)
console.log(`压缩率: ${((1 - compressed / original) * 100).toFixed(0)}%`)
