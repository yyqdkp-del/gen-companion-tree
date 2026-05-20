/** Supabase Storage keys must be ASCII; strip non-safe characters from user filenames. */
export function sanitizeFileName(fileName: string): string {
  const ext = fileName.split('.').pop() || ''
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}_${random}.${ext}`
}
