export type FamilyProfileCityFields = {
  resident_city?: string | null
  resident_city_custom?: string | null
}

/** 从 family_profile 解析居住城市；无档案或「其他」未填时返回空字符串 */
export function resolveResidentCity(profile?: FamilyProfileCityFields | null): string {
  if (!profile) return ''
  return profile.resident_city === 'other'
    ? (profile.resident_city_custom?.trim() || '')
    : (profile.resident_city?.trim() || '')
}

/** 从 getFamilyData 等聚合结构里取 profile 并解析城市 */
export function resolveResidentCityFromFamilyData(familyData: any): string {
  const profile = Array.isArray(familyData?.profile)
    ? familyData.profile[0]
    : familyData?.profile
  return resolveResidentCity(profile)
}

/** AI 系统提示：「为 X 陪读家庭」或通用表述 */
export function familyServicePromptLabel(city: string): string {
  return city ? `为${city}陪读家庭` : '为海外华人陪读家庭'
}

/** 中文学习/场景描述 */
export function localSceneLabel(city: string): string {
  return city ? `${city}华人陪读家庭` : '海外华人陪读家庭'
}

/** 树洞/聊天氛围提示 */
export function naturalImageryHint(city: string): string {
  return city
    ? `可以用${city}当地自然与生活意象营造氛围`
    : '可以用当地生活意象营造氛围'
}

export async function fetchResidentCity(
  supabase: { from: (table: string) => any },
  userId: string,
): Promise<string> {
  if (!userId) return ''
  const { data } = await supabase
    .from('family_profile')
    .select('resident_city, resident_city_custom')
    .eq('user_id', userId)
    .maybeSingle()
  return resolveResidentCity(data)
}
