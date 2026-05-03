import { useState, useCallback } from 'react'
import { uploadAndProcess } from '../_services/uploadService'

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

export const UPLOAD_STATUS_TEXT: Record<UploadStatus, string> = {
  idle:      '',
  uploading: '处理中…',
  done:      '✓ 已添加',
  error:     '处理失败',
}

export function useUpload(userId: string, onSuccess: () => void) {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')

  const upload = useCallback(async (
    file: Blob | File,
    category: string,
    filename?: string,
  ) => {
    if (!userId) return
    setUploading(true)
    setUploadStatus('uploading')
    try {
      await uploadAndProcess(file, category, userId, filename)
      setUploadStatus('done')
      onSuccess()
      setTimeout(() => setUploadStatus('idle'), 1500)
    } catch (e) {
      console.error(e)
      setUploadStatus('error')
      setTimeout(() => setUploadStatus('idle'), 2000)
    } finally {
      setUploading(false)
    }
  }, [userId, onSuccess])

  return { uploading, uploadStatus, upload }
}
