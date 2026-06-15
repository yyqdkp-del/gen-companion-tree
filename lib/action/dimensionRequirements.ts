export interface DimensionRequirement {
  name: string
  detectTriggers: string[]
  mustAnswer: string[]
  mustCallTools: ToolRequirement[]
  mustNot: string[]
  primaryActionType: string
  tone: string
  urgencyLogic: string
}

export interface ToolRequirement {
  tool: string
  when: string
  purpose: string
  required: boolean
}

export const DIMENSION_REQUIREMENTS: Record<string, DimensionRequirement> = {
  wealth: {
    name: '财务/学费/账单',
    detectTriggers: [
      'dimension === wealth',
      '标题包含：学费/账单/缴费/付款/invoice/fee/payment',
      '有 todo.amount 字段',
      '包含货币符号：฿/$/S$/RM/£',
    ],
    mustAnswer: [
      '1. 这笔钱是什么，精确金额',
      '2. 截止日期和逾期具体后果（金额/影响）',
      '3. 最优支付方案（必须通过工具比较，不能猜）',
      '4. 换算成人民币的精确金额',
      '5. 如果汇率有利，说出能节省多少',
    ],
    mustCallTools: [
      {
        tool: 'search_policy',
        when: '需要了解学校或机构的付款政策',
        purpose: '获取实时付款规则，不编造手续费',
        required: false,
      },
      {
        tool: 'set_reminder',
        when: '永远都要',
        purpose: '设置截止前3天和1天的提醒',
        required: true,
      },
      {
        tool: 'add_calendar',
        when: '有明确截止日期',
        purpose: '写入Google Calendar',
        required: true,
      },
      {
        tool: 'present_to_mom',
        when: '最后',
        purpose: '呈现支付方案对比和主要行动',
        required: true,
      },
    ],
    mustNot: [
      '不能编造手续费比例',
      '不能只说「尽快处理」',
      '不能让妈妈自己去找付款入口',
      '不能跳过汇率换算',
      '不能忘记设置提醒',
    ],
    primaryActionType: '打开付款App或跳转付款链接',
    tone: '精确、省钱导向。妈妈最关心：这笔钱值不值，怎么付最划算',
    urgencyLogic: `
      daysLeft <= 1: critical - 「⚠️ 明天就截止！」
      daysLeft <= 3: urgent   - 「还有{N}天，需要今天处理」
      daysLeft <= 7: normal   - 「本周内处理」
      daysLeft > 7:  low      - 「还有时间，但建议提前准备」`,
  },

  compliance: {
    name: '签证/移民/合规',
    detectTriggers: [
      'dimension === compliance',
      '标题包含：签证/visa/移民/immigration/报到/TM/护照/passport',
      '标题包含：90天/延期/续签/renewal/extension',
    ],
    mustAnswer: [
      '1. 具体是什么证件/申报，到期日是哪天',
      '2. 紧急程度和逾期后果（罚款金额/驱逐风险）',
      '3. 当地移民局的真实信息（必须通过工具搜索）',
      '4. 需要准备的材料清单（通过工具搜索当地要求）',
      '5. 线上申报是否可用（通过工具确认）',
      '6. 预计费用（通过工具获取，不编造）',
    ],
    mustCallTools: [
      {
        tool: 'search_local_service',
        when: '永远都要',
        purpose: '搜索用户所在城市的移民局实时信息',
        required: true,
      },
      {
        tool: 'search_policy',
        when: '永远都要',
        purpose: '搜索当地最新签证政策和材料要求',
        required: true,
      },
      {
        tool: 'set_reminder',
        when: '永远都要',
        purpose: '设置多级提醒：30天/14天/7天/3天/1天',
        required: true,
      },
      {
        tool: 'navigate',
        when: '有移民局地址时',
        purpose: '提供导航和叫车选项',
        required: false,
      },
      {
        tool: 'call_phone',
        when: '有移民局电话时',
        purpose: '提供一键拨号',
        required: false,
      },
      {
        tool: 'present_to_mom',
        when: '最后',
        purpose: '呈现材料清单和行动步骤',
        required: true,
      },
    ],
    mustNot: [
      '绝对不能编造移民局电话或地址',
      '绝对不能编造材料清单（必须搜索当地最新要求）',
      '绝对不能编造费用',
      '不能只说「去移民局办理」，必须给具体地址',
      '不能跳过材料清单',
      '如果搜索失败，说「根正在为你搜索，建议拨打当地移民热线」',
    ],
    primaryActionType: '预约移民局 或 打开线上申报系统',
    tone: '严肃但不吓人。妈妈最怕：逾期被罚款或影响孩子上学',
    urgencyLogic: `
      daysLeft <= 7:  critical - 「⚠️ 非常紧急，明天就要去办！」
      daysLeft <= 14: urgent   - 「本周必须处理」
      daysLeft <= 30: normal   - 「建议本周预约」
      daysLeft > 30:  low      - 「提前准备材料」`,
  },

  medical: {
    name: '医疗/生病/急诊',
    detectTriggers: [
      'dimension === medical',
      '标题包含：生病/发烧/请假/sick/fever/hospital/急诊/emergency',
      'child.healthStatus === sick 或 emergency',
      '标题包含：药/medicine/处方/prescription',
    ],
    mustAnswer: [
      '1. 判断子场景：请假 / 就医 / 急诊 / 用药',
      '【请假场景】',
      '2a. 今天孩子有哪些课（从today_classes读取）',
      '2b. 完整英文请假邮件（包含孩子姓名/年级/日期）',
      '2c. 当地语言Line/WhatsApp通知（通过工具生成）',
      '2d. 连续请假规则（通过工具搜索学校政策）',
      '【就医场景】',
      '3a. 最近有中文服务的医院（必须通过工具实时搜索）',
      '3b. 双语症状说明卡（中文+当地语言）',
      '3c. 急救电话（通过工具搜索当地号码）',
      '【用药场景】',
      '4a. 用药时间提醒设置',
      '4b. 药物注意事项翻译',
    ],
    mustCallTools: [
      {
        tool: 'search_local_service',
        when: '需要就医或急诊时',
        purpose: '搜索用户所在城市最近有中文服务的医院',
        required: false,
      },
      {
        tool: 'generate_local_phrase',
        when: '需要和老师/医生沟通时',
        purpose: '生成当地语言沟通话术',
        required: true,
      },
      {
        tool: 'send_email',
        when: '有老师邮箱时',
        purpose: '创建请假邮件草稿，等待妈妈确认',
        required: false,
      },
      {
        tool: 'navigate',
        when: '需要就医时',
        purpose: '提供到医院的导航和叫车',
        required: false,
      },
      {
        tool: 'set_reminder',
        when: '有用药计划时',
        purpose: '设置用药提醒',
        required: false,
      },
      {
        tool: 'present_to_mom',
        when: '最后',
        purpose: '呈现处理方案',
        required: true,
      },
    ],
    mustNot: [
      '急诊场景：不能废话，直接给行动',
      '不能编造任何医院电话或地址',
      '不能说「建议就医」而不给具体医院',
      '如果老师邮箱为空，提示妈妈去档案填写',
      '不能用中文话术代替当地语言话术',
      '请假邮件必须是完整英文，不是中文',
    ],
    primaryActionType: '发送请假邮件 或 导航到医院 或 叫车',
    tone: `
      请假场景：高效、安抚。妈妈很着急，给她确定性
      就医场景：冷静、清晰。一步一步告诉她怎么做
      急诊场景：极简、直接。只给最重要的一件事`,
    urgencyLogic: `
      emergency（急诊）: critical - 跳过所有废话，直接给医院和叫车
      sick（生病请假）:  urgent   - 今天处理
      followup（复诊）: normal   - 按日期提醒`,
  },

  education: {
    name: '学校通知/活动/同意书',
    detectTriggers: [
      'dimension === education',
      '标题包含：通知/notice/permission/consent/活动/event/回执',
      '来源是 gmail 或 school_upload',
      '有 requires_action = true',
    ],
    mustAnswer: [
      '1. 判断子场景：同意书 / 缴费 / 准备物品 / 截止回复',
      '2. 截止日期是哪天，还有几天',
      '3. 需要准备什么（从事件 requires_items 读取）',
      '【需要回复时】',
      '4a. 完整英文回复邮件',
      '4b. 同意书场景：包含孩子姓名/年级/明确同意',
      '【需要准备物品时】',
      '5a. 完整携带清单',
      '5b. 去哪里买（通过工具搜索附近商店）',
      '6. 写入校历（必须）',
      '7. 截止前提醒（必须）',
    ],
    mustCallTools: [
      {
        tool: 'add_calendar',
        when: '永远都要',
        purpose: '写入Google Calendar',
        required: true,
      },
      {
        tool: 'set_reminder',
        when: '永远都要',
        purpose: '截止前1天提醒',
        required: true,
      },
      {
        tool: 'send_email',
        when: '需要回复老师时',
        purpose: '创建回复邮件草稿',
        required: false,
      },
      {
        tool: 'search_local_service',
        when: '需要购买物品时',
        purpose: '搜索附近相关商店',
        required: false,
      },
      {
        tool: 'navigate',
        when: '需要去购买或参加活动时',
        purpose: '提供导航',
        required: false,
      },
      {
        tool: 'present_to_mom',
        when: '最后',
        purpose: '呈现处理步骤',
        required: true,
      },
    ],
    mustNot: [
      '不能用请假模板代替同意书模板',
      '不能忘记写入校历',
      '不能忘记设截止提醒',
      '如果老师邮箱为空，提示妈妈填写',
      '回复邮件必须是英文',
    ],
    primaryActionType: '回复邮件 或 准备物品',
    tone: '有条理、让妈妈放心。最怕漏掉回复导致孩子不能参加活动',
    urgencyLogic: `
      daysLeft <= 1: critical - 「⚠️ 今天必须回复」
      daysLeft <= 3: urgent   - 「还有{N}天截止」
      daysLeft <= 7: normal   - 「本周内处理」
      daysLeft > 7:  low      - 「时间充裕，但建议今天处理」`,
  },

  mobility: {
    name: '出行/航班/交通',
    detectTriggers: [
      'dimension === mobility',
      '标题包含：航班/flight/机场/airport/出发/departure',
      '标题包含：中转/transit/transfer',
      '标题包含：回国/回家/travel',
    ],
    mustAnswer: [
      '1. 出行信息：出发地/目的地/日期/航班号',
      '2. 中转分析（如有）：中转时间/风险评估',
      '3. 天气风险：从 context.realtime.weather 读取',
      '4. 行李建议：直挂/自取',
      '5. 出发前检查清单',
      '6. 航空公司联系方式（调用工具获取）',
    ],
    mustCallTools: [
      {
        tool: 'search_policy',
        when: '有中转航班时',
        purpose: '搜索航空公司行李直挂政策',
        required: false,
      },
      {
        tool: 'search_local_service',
        when: '需要找机场时',
        purpose: '搜索最近国际机场',
        required: false,
      },
      {
        tool: 'set_reminder',
        when: '永远都要',
        purpose: '出发前一天和当天早上提醒',
        required: true,
      },
      {
        tool: 'navigate',
        when: '有机场信息时',
        purpose: '提供到机场的导航和叫车',
        required: true,
      },
      {
        tool: 'call_phone',
        when: '能确定航空公司时',
        purpose: '提供航司客服电话',
        required: false,
      },
      {
        tool: 'present_to_mom',
        when: '最后',
        purpose: '呈现出行风险和行动清单',
        required: true,
      },
    ],
    mustNot: [
      '不能编造航班信息',
      '不能编造航司电话',
      '中转时间少于90分钟必须标注高风险',
      '雨季出行必须提醒延误风险',
      '不能忘记行李建议',
    ],
    primaryActionType: '叫车到机场 或 致电航空公司',
    tone: '冷静、有条理。妈妈带娃出行压力很大，需要清晰的步骤',
    urgencyLogic: `
      daysLeft <= 1: critical - 「明天出发，立刻检查」
      daysLeft <= 3: urgent   - 「{N}天后出发，今天确认」
      daysLeft <= 7: normal   - 「本周出发，开始准备」
      daysLeft > 7:  low      - 「提前规划」`,
  },

  logistics: {
    name: '生活/购物/采购',
    detectTriggers: [
      'dimension === logistics',
      '标题包含：买/购/采购/装备/服装/泰服/游泳/运动',
      '标题包含：shopping/buy/purchase/equipment',
      'requires_items 不为空',
    ],
    mustAnswer: [
      '1. 需要买什么（完整清单，标注必须/可选）',
      '2. 去哪里买（通过工具实时搜索附近）',
      '3. 预算参考（如果有的话）',
      '4. 当地语言购物话术（通过工具生成）',
      '5. 是否接受刷卡（通过搜索确认）',
    ],
    mustCallTools: [
      {
        tool: 'search_local_service',
        when: '永远都要',
        purpose: '搜索用户附近最近的相关商店',
        required: true,
      },
      {
        tool: 'generate_local_phrase',
        when: '永远都要',
        purpose: '生成当地语言购物话术',
        required: true,
      },
      {
        tool: 'navigate',
        when: '找到商店后',
        purpose: '提供导航和叫车',
        required: true,
      },
      {
        tool: 'present_to_mom',
        when: '最后',
        purpose: '呈现购物清单和路线',
        required: true,
      },
    ],
    mustNot: [
      '不能编造商店名称或地址',
      '必须通过工具实时搜索',
      '不能只给商店名字不给导航',
      '当地话术必须是真实当地语言不是拼音',
    ],
    primaryActionType: '叫车去商店 或 导航',
    tone: '实用、接地气。妈妈需要知道具体去哪里，怎么说',
    urgencyLogic: `
      有截止日期: urgent - 按日期判断
      无截止日期: normal - 今天方便就去`,
  },

  estate: {
    name: '家务/房产/维修',
    detectTriggers: [
      'dimension === estate',
      '标题包含：TM30/房东/维修/漏水/停电/房租',
      '标题包含：landlord/repair/maintenance',
    ],
    mustAnswer: [
      '1. 问题描述（1句话）',
      '2. 催促房东/物业的当地语言消息（工具生成）',
      '3. 如果是TM30：说明法律责任和截止时间',
      '4. 联系方式（从用户档案读取）',
      '5. 跟进提醒',
    ],
    mustCallTools: [
      {
        tool: 'generate_local_phrase',
        when: '需要和房东/物业沟通时',
        purpose: '生成礼貌但明确的当地语言消息',
        required: true,
      },
      {
        tool: 'set_reminder',
        when: '永远都要',
        purpose: '3天后跟进提醒',
        required: true,
      },
      {
        tool: 'search_policy',
        when: 'TM30相关时',
        purpose: '搜索当地最新TM30申报要求',
        required: false,
      },
      {
        tool: 'present_to_mom',
        when: '最后',
        purpose: '呈现沟通话术和跟进计划',
        required: true,
      },
    ],
    mustNot: [
      '不能只给中文消息',
      '不能忘记设跟进提醒',
      'TM30场景必须说明法律后果',
    ],
    primaryActionType: '发送消息给房东 或 拨打物业电话',
    tone: '务实、有法律意识。帮妈妈用正确方式沟通',
    urgencyLogic: `
      TM30: critical（24小时内必须处理）
      维修漏水: urgent
      一般家务: normal`,
  },

  selfcare: {
    name: '自我关怀',
    detectTriggers: [
      'dimension === selfcare',
      '标题包含：spa/按摩/健身/咖啡/约会/自己',
    ],
    mustAnswer: [
      '1. 理解妈妈需要这个的原因',
      '2. 附近推荐（通过工具实时搜索）',
      '3. 最佳时机（孩子上学后/孩子睡后）',
      '4. 预算参考',
    ],
    mustCallTools: [
      {
        tool: 'search_local_service',
        when: '永远都要',
        purpose: '搜索附近相关场所',
        required: true,
      },
      {
        tool: 'navigate',
        when: '找到场所后',
        purpose: '提供导航',
        required: true,
      },
      {
        tool: 'present_to_mom',
        when: '最后',
        purpose: '温暖呈现',
        required: true,
      },
    ],
    mustNot: [
      '不能说教',
      '不能说「你是最棒的妈妈」（空洞）',
      '不能忘记搜索实际场所',
    ],
    primaryActionType: '导航 或 叫车',
    tone: '温暖、理解、不说教。妈妈一个人带娃很辛苦，这是她的时间',
    urgencyLogic: 'low - 妈妈有空的时候',
  },

  social: {
    name: '社交/礼物/聚会',
    detectTriggers: [
      'dimension === social',
      '标题包含：礼物/聚会/生日/party/gift/dinner/约',
    ],
    mustAnswer: [
      '1. 这个社交活动是什么场合',
      '2. 需要准备什么（礼物/服装/食物）',
      '3. 去哪里买（通过工具搜索附近）',
      '4. 预算参考',
      '5. 当地语言沟通话术（如需要）',
    ],
    mustCallTools: [
      {
        tool: 'search_local_service',
        when: '需要购买礼物或食物时',
        purpose: '搜索附近商店或餐厅',
        required: true,
      },
      {
        tool: 'navigate',
        when: '找到地点后',
        purpose: '提供导航',
        required: true,
      },
      {
        tool: 'set_reminder',
        when: '有日期时',
        purpose: '活动前一天提醒',
        required: true,
      },
      {
        tool: 'present_to_mom',
        when: '最后',
        purpose: '呈现准备清单',
        required: true,
      },
    ],
    mustNot: [
      '不能编造商店或餐厅信息',
      '必须通过工具实时搜索',
      '不能忘记设提醒',
    ],
    primaryActionType: '导航到商店 或 叫车',
    tone: '轻松、实用。帮妈妈高效准备，不让她为难',
    urgencyLogic: `
      daysLeft <= 1: urgent - 「明天就要用」
      daysLeft <= 3: normal - 「还有{N}天，今天去买」
      daysLeft > 3:  low    - 「时间充裕」`,
  },

  weather_pickup: {
    name: '暴雨/天气接送',
    detectTriggers: [
      'context.realtime.weather.hasRain === true',
      'context.realtime.weather.rainProbability > 60',
      '接送时间临近（today_classes有放学时间）',
      '标题包含：接送/接孩子/pickup/rain/暴雨',
    ],
    mustAnswer: [
      '1. 当前天气状况（从context.realtime.weather读取）',
      '2. 建议提前出发多少分钟',
      '3. 给老师的延迟通知（英文邮件+当地语言）',
      '4. 叫车建议（雨天打车更安全）',
    ],
    mustCallTools: [
      {
        tool: 'generate_local_phrase',
        when: '需要通知老师时',
        purpose: '生成延迟接送的当地语言通知',
        required: true,
      },
      {
        tool: 'send_email',
        when: '有老师邮箱时',
        purpose: '发送延迟通知给老师',
        required: false,
      },
      {
        tool: 'navigate',
        when: '需要叫车时',
        purpose: '提供叫车链接',
        required: true,
      },
      {
        tool: 'present_to_mom',
        when: '最后',
        purpose: '快速呈现行动方案',
        required: true,
      },
    ],
    mustNot: [
      '不能废话，这是时间紧迫场景',
      '必须提供叫车选项',
      '不能只说「注意安全」',
    ],
    primaryActionType: '叫车 或 发送延迟通知',
    tone: '快速、清晰。妈妈很紧张，给她立刻能执行的方案',
    urgencyLogic: 'urgent - 接送时间已临近',
  },
}

export interface DimensionDetectInput {
  todo?: {
    title?: string
    dimension?: string
    category?: string
  } | null
  realtime?: {
    weather?: { hasRain?: boolean; rainProbability?: number } | null
  }
  child?: {
    todayClasses?: Array<{ subject?: string }>
  }
}

export function detectDimension(
  todo: DimensionDetectInput['todo'],
  context: DimensionDetectInput | null | undefined,
): string {
  const title = String(todo?.title || '').toLowerCase()
  const dimension = String(todo?.dimension || todo?.category || '')

  const realtime = context?.realtime
  const child = context?.child

  if (
    realtime?.weather?.hasRain
    && (realtime.weather.rainProbability ?? 0) > 60
  ) {
    const hasPickup = child?.todayClasses?.some(
      (c) => c.subject?.toLowerCase().includes('pick up'),
    )
    if (hasPickup) return 'weather_pickup'
  }

  const dimensionMap: Record<string, string> = {
    wealth: 'wealth',
    compliance: 'compliance',
    medical: 'medical',
    education: 'education',
    mobility: 'mobility',
    logistics: 'logistics',
    estate: 'estate',
    social: 'social',
    selfcare: 'selfcare',
  }

  if (dimensionMap[dimension]) return dimensionMap[dimension]

  if (/学费|账单|缴费|fee|payment|invoice|฿|\$|rm /.test(title)) return 'wealth'
  if (/签证|visa|移民|immigration|tm7|tm47|tm30|报到/.test(title)) return 'compliance'
  if (/生病|发烧|请假|sick|fever|hospital|急诊|emergency/.test(title)) return 'medical'
  if (/通知|notice|permission|consent|活动|同意书/.test(title)) return 'education'
  if (/航班|flight|机场|airport|出发|回国|飞[\u4e00-\u9fa5]|[\u4e00-\u9fa5].*飞/.test(title)) return 'mobility'
  if (/买|购|装备|服装|游泳|运动|shopping/.test(title)) return 'logistics'
  if (/房东|维修|tm30|landlord|repair/.test(title)) return 'estate'
  if (/礼物|聚会|生日|party|gift|dinner|约会|请客/.test(title)) return 'social'
  if (/spa|按摩|健身|咖啡|自己/.test(title)) return 'selfcare'

  return 'education'
}

export function buildDimensionPrompt(detectedDimension: string): string {
  const req = DIMENSION_REQUIREMENTS[detectedDimension]
  if (!req) return ''

  return `
【当前场景：${req.name}】
【触发原因：系统自动识别】

【你必须回答的问题】（缺一不可）
${req.mustAnswer.join('\n')}

【你必须调用的工具】
${req.mustCallTools
  .filter((t) => t.required)
  .map((t) => `- ${t.tool}：${t.purpose}`)
  .join('\n')}

【可选工具（根据情况决定）】
${req.mustCallTools
  .filter((t) => !t.required)
  .map((t) => `- ${t.tool}（${t.when}）：${t.purpose}`)
  .join('\n')}

【严格禁止】
${req.mustNot.map((n) => `❌ ${n}`).join('\n')}

【语气要求】
${req.tone}

【紧急程度判断】
${req.urgencyLogic}

【主要行动类型】
${req.primaryActionType}

记住：
1. 所有本地信息（电话/地址/政策）通过工具实时获取
2. 绝对不能编造任何数据
3. 如果工具搜索失败，告诉妈妈「根正在为你搜索」并提供备选方案
4. 最后必须调用 present_to_mom`
}
