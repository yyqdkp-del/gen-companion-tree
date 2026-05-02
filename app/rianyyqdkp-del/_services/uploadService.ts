import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function uploadAndProcess(
  file: Blob | File,
  category: string,
  userId: string,
  filename?: string,
): Promise<void> {
  const name = filename || (file instanceof File ? file.name : `file_${Date.now()}`)
  const path = `uploads/${category}/${Date.now()}_${name}`

  const { error } = await supabase.storage
    .from('companion-files')
    .upload(path, file, { upsert: true })
  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('companion-files')
    .getPublicUrl(path)

  const isImage = file.type.startsWith('image/')
  const res = await fetch('/api/rian/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: isImage
        ? '请分析这张图片，提取所有需要跟进的事件'
        : `文件已上传：${name}，请提取关键事件`,
      input_type: isImage ? 'image' : category,
      file_url: urlData.publicUrl,
      user_id: userId,
    }),
  })

  const result = await res.json()
  if (!result.ok) throw new Error(result.error ?? 'Process failed')
}
