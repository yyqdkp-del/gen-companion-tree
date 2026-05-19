import type { Vehicle } from '@/app/_shared/_types'

/** 事故处理步骤分组（一键办 checklist 可展平使用） */
export function buildAccidentChecklist(vehicle: Vehicle, location?: string) {
  const loc = location?.trim()
  return {
    immediate: [
      '确认所有人员安全，如有伤亡立即拨打 191（警察）/ 1669（救护车）',
      '开启双闪，在安全距离放置三角警示牌',
      '不要移动车辆（除非影响交通安全）',
      ...(loc ? [`记录当前位置：${loc}`] : []),
    ],
    document: [
      '拍摄事故现场全景照片（4个方向）',
      '拍摄双方车辆损伤照片',
      '拍摄对方车牌、驾照、保险单',
      '记录对方姓名、电话、保险信息',
      '如有目击者，记录联系方式',
    ],
    contact: [
      `联系保险公司：${vehicle.insurance_company ?? '你的保险公司'} ${vehicle.insurance_phone ?? ''}`.trim(),
      `道路救援：${vehicle.roadside_assistance ?? '拨打保险公司道路救援'}`,
      '向警察索取事故报告单（Por Tor 4）',
    ],
    claim: [
      '在 7 天内向保险公司提交理赔申请',
      '准备材料：事故报告单、照片、双方信息、维修估价单',
      '跟踪理赔进度',
    ],
  }
}
