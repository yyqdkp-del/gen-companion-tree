import type { SupabaseClient } from '@supabase/supabase-js'

/** 与 execute 路由一致：从 form_templates 拉取模板 */
export async function fetchFormTemplates(
  supabase: SupabaseClient,
  formTypes: string[],
): Promise<any[]> {
  if (!formTypes.length) return []
  const { data } = await supabase
    .from('form_templates')
    .select('*')
    .in('form_type', formTypes)
  return data || []
}

/**
 * 与 app/api/action/execute 一致：download_pdf 用 form_type + form_templates 预填；
 * 兼容旧数据里的 pdf_type；支持 family_profile / family_places / children / child_health。
 */
export function enrichActionsWithFormTemplates(
  actions: any[] | undefined,
  familyData: any,
  formTemplates: any[],
  childName?: string,
): any[] {
  return (actions || []).map((action: any) => {
    if (action.type === 'download_pdf' && action.data?.pdf_type && !action.data?.form_type) {
      action.data.form_type = action.data.pdf_type
    }
    if (action.type === 'download_pdf' && action.data?.form_type) {
      const template = formTemplates.find((t: any) => t.form_type === action.data.form_type)
      if (template) {
        const childrenArr = familyData.children || []
        const targetChild =
          childName && childrenArr.length
            ? (childrenArr.find((c: any) => c.name === childName) ?? childrenArr[0])
            : childrenArr[0]
        const profile = familyData.profile?.[0] || {}
        const healthRow = familyData.childHealth?.[0]
        const prefilled: Record<string, string> = {}

        for (const [pdfField, source] of Object.entries(template.field_mapping || {})) {
          const src = String(source)
          const dot = src.indexOf('.')
          if (dot < 0) continue
          const table = src.slice(0, dot)
          const col = src.slice(dot + 1)
          let value: unknown
          if (table === 'family_profile') value = profile[col]
          else if (table === 'family_places') {
            const primary = familyData.places?.find((p: any) => p.is_primary)
            value = primary?.[col]
          } else if (table === 'children') {
            value = targetChild?.[col]
          } else if (table === 'child_health' || table === 'child_health_records') {
            value = healthRow?.[col]
          }
          if (value != null && value !== '') prefilled[pdfField] = String(value)
        }

        action.data.form_name = template.form_name
        action.data.official_url = template.official_url
        action.data.download_url = template.download_url
        action.data.prefilled_fields = { ...prefilled, ...(action.data?.prefilled_fields ?? {}) }
      }
    }
    if (action.type === 'navigate' && action.data?.destination && !action.data?.url) {
      action.data.url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(action.data.destination)}`
    }
    return action
  })
}
