import { createClient } from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { sanitizeFileName } from '@/lib/storage/sanitizeFileName'

const supabase = createClient()

/** 仅上传并得到公开 URL（不触发 Rian 异步处理）；用于时刻照片等场景 */
export async function uploadFile(file: Blob | File, category: string): Promise<string> {
  const name = file instanceof File ? file.name : `file_${Date.now()}`
  const path = `uploads/${category}/${sanitizeFileName(name)}`

  const { error } = await supabase.storage
    .from('companion-files')
    .upload(path, file, { upsert: true })
  if (error) throw error

  const { data: urlData } = supabase.storage.from('companion-files').getPublicUrl(path)
  return urlData.publicUrl
}

export async function uploadAndProcess(
  file: Blob | File,
  category: string,
  filename?: string,
): Promise<void> {
  const name = filename || (file instanceof File ? file.name : `file_${Date.now()}`)
  const path = `uploads/${category}/${sanitizeFileName(name)}`

  const { error } = await supabase.storage
    .from('companion-files')
    .upload(path, file, { upsert: true })
  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('companion-files')
    .getPublicUrl(path)

  const isImage = file.type.startsWith('image/')
  const res = await fetchWithAuth('/api/rian/process', {
    method: 'POST',
    body: JSON.stringify({
      content: isImage
        ? '请分析这张图片，提取所有需要跟进的事件'
        : `文件已上传：${name}，请提取关键事件`,
      input_type: isImage ? 'image' : category,
      file_url: urlData.publicUrl,
    }),
  })

  const result = await res.json()
  if (!result.ok) throw new Error(result.error ?? 'Process failed')
}
