# 根陪伴 · 设计重构路径图

> 品牌定位：**「新中式温暖生活界面」** — 宣纸暖白、赤陶强调、有机水珠、树洞夜模式。  
> 参考：`REDESIGN.md`（设计原则与 token 规范）、本文件（分阶段交付路径）。  
> 开始日期：**2026-06-04**  
> 当前阶段：**第一阶段 — 地基重建**

---

## 现状诊断（2026-06-04）

### 已有优势（保留并强化）

| 元素 | 说明 |
|------|------|
| 色彩情感 | `#fbf9f6` 暖纸 + `#a46355` 赤陶 + 水珠状态色，辨识度高 |
| 品牌隐喻 | 三颗水珠（孩子 / 待办 / 热点）、树洞深夜场景 |
| 动效气质 | 呼吸浮动、spring 弹层、`warm-tap` 缩放，符合「有温度」 |
| 组件模式 | BottomSheet、card-warm、优先级色板已多次复用 |

### 必须修复的断裂

| 问题 | 现状 | 目标 |
|------|------|------|
| 颜色多套并行 | `--text-main` / `THEME.text` / `CHINESE_THEME.text` / inline hex 混用 | 单一 token 源 |
| PWA themeColor | `#1D9E75` 绿 vs 品牌 `#a46355` | 统一或分场景文档化 |
| 字体栈冲突 | body 先 Montserrat 后 Noto Serif SC 覆盖 | 正文 Serif / UI Sans 一条规则 |
| Tailwind 未 token 化 | 无 `tailwind.config.ts`，大量 inline style | CSS 变量 + 少量工具类 |
| 首页信息架构 | 三颗水珠隐喻强，但「今天最重要的事」不直观 | 水珠 + 今日焦点并存 |
| 能力写了未展示 | Gmail、拍照解析、family_habits 等后台有、前台弱 | 见第三、四阶段 |

### 竞品定位（不抄，借结构）

| 产品 | 可借 | 不借 |
|------|------|------|
| Notion | 待办/档案的信息层级与对齐 | 冷灰中性 |
| 微信 | 列表可读性、少装饰 | 扁平绿壳 |
| Linear | grid、密度、专业可信 | 冷色几何 |
| 小红书 | 成就卡片、分享欲 | _feed 密度与大红 |

**方向**：巩固「根 / 水珠 / 宣纸 / 树洞」，向 Notion 借**结构**，向生活方式 App 借**情绪**。

---

## 四阶段路径总览

```text
第一阶段 地基重建 ──► 第二阶段 首页与昼夜 ──► 第三阶段 输入闭环 ──► 第四阶段 情感与文化
   token / 字体            今日焦点 / 签证            拍照 / Gmail / 家书           习惯 / 连接 / 节气
```

---

## 第一阶段 — 地基重建

**目标**：全站视觉 token 统一，消除颜色与字体冲突，为后续 UI 改造提供唯一真相源。

### 交付物

1. **`REDESIGN.md`** — 设计原则、色彩/字体/圆角/间距/动效规范
2. **`app/globals.css`** — 收敛为唯一 CSS 变量表（扩展 `@theme` 或保持 `:root`）
3. **`app/_shared/_constants/theme.ts`** — 删除与 CSS 重复的 hex，改为引用 token 名
4. **`CHINESE_THEME`** — 映射到全局 token，仅保留中文模块增量色
5. **manifest / layout** — `themeColor` 与品牌主色对齐
6. **字体规范** — 定义 Display / H1 / Body / Caption 四级 + 使用场景表

### 任务清单

- [ ] 定稿主三元组：`--canvas-light` `#fbf9f6` · `--accent-clay` `#a46355` · `--text-primary` `#2d322f`
- [ ] 废弃或 alias：`THEME.text` `#2C3E50`、`--text-main` `#1e293b` → 统一到 `--text-primary`
- [ ] 优先级色板（红橙蓝绿灰）迁入 CSS 变量，TS 只 export 引用
- [ ] 树洞夜色系独立 namespace：`--treehole-*`，与日间 token 文档分离
- [ ] 字体：正文 `Noto Serif SC`；UI 控件/底栏/数字时钟 `system-ui` 或 Montserrat（二选一并写进 REDESIGN.md）
- [ ] 圆角 scale：8 / 12 / 16 / 22 / 24 px 五级，替换散落 magic number
- [ ] 间距：对齐 `layout.ts`（56px 底栏、safe-area）写入 REDESIGN.md
- [ ] 审计 Top 10 页面 inline hex，替换为 var() 或 theme 常量

### 第一阶段完成标准

- ✓ 全站颜色统一，没有颜色冲突
- ✓ 字体层级清晰

---

## 第二阶段 — 首页与昼夜

**目标**：打开 App 立刻知道「今天最重要的事」；合规类信息（签证）显眼；深夜自动进入温柔模式。

### 交付物

1. **首页信息架构改版** — 保留水珠隐喻，增加「今日焦点」区
2. **签证 / 证件倒计时卡片** — 读 `family_profile` / `family_documents`
3. **昼夜模式** — 22:00–06:00 或跟随系统；首页 / 底栏 / 问候语切换为 treehole 温柔 palette
4. **问候与 copy** — 与 `getGreetingForHour`、精力状态联动

### 任务清单

- [ ] 首页顶部或水珠上方：`TodayFocus` — 1 条 red/orange 待办 + 1 句根的建议
- [ ] 签证倒计时：到期 <90 天显示在首页或待办水珠 subValue
- [ ] 深夜模式：CSS class `theme-night` on `<html>`；背景切 `treehole-bg` 或柔和降饱和日间色
- [ ] 底栏 / BottomInput 夜间样式；树洞 Tab 高亮引导
- [ ] 时钟区夜间降对比；禁止刺眼白底弹层
- [ ] `prefers-color-scheme` 可选跟随（与定时策略文档化）

### 第二阶段完成标准

- ✓ 用户打开首页立刻看到「今天最重要的事」
- ✓ 签证倒计时显眼可见
- ✓ 深夜自动切换到温柔模式

---

## 第三阶段 — 输入闭环

**目标**：用户每一次「交给根」的输入，都能在首页或明显位置看到结果；成长内容可分享。

### 交付物

1. **拍照 / 上传反馈** — `raw_inputs` + `processed_emails` 结果卡片
2. **Gmail 解析上首页** — 连接 Gmail 后，解析摘要进「今日焦点」或独立「根刚整理」feed
3. **成长家书分享卡** — 周报 / 家书视觉模板，9:16 或 1:1 导出图
4. **废弃链清理** — 明确 `todo/action`、`shopping_list` 去留

### 任务清单

- [ ] `processStatus` 完成后展示结构化摘要（待办 N 条、校历 N 条），可点进详情
- [ ] 首页「根刚整理」条：最近 3 条 `processed_emails` / `raw_inputs.done`
- [ ] Gmail：Profile 连接态 + 首页未读解析数；失败态可见
- [ ] 学校通知历史从 growth 子页提升到首页二级入口或焦点区
- [ ] 成长周报 / 家书：分享图模板（品牌色 + 孩子名 + 一句根的话）
- [ ] 统一 packing / 校历 / 待办结果文案，避免「根收到了」却无下文

### 第三阶段完成标准

- ✓ 拍照后清晰看到处理结果
- ✓ Gmail 解析结果出现在首页
- ✓ 成长家书妈妈愿意发朋友圈

---

## 第四阶段 — 情感与文化

**目标**：让用户感受到「根记得我」；日常有温度；节气日有文化惊喜。

### 交付物

1. **family_habits / learn_pattern 可读 UI** — 「根记得的习惯」列表
2. **interest_weights 与热点偏好打通** — 见 TECH_DEBT #5
3. **每日情感触点** — 开场问候、孩子精力、树洞入口因人因时而异
4. **节气 / 传统节日微交互** — 首页水印、问候、limited 动效

### 任务清单

- [ ] Profile 或树屋：「根记得」— 展示 `family_habits.notes`（只读，可 dismiss）
- [ ] 首页问候接入：孩子状态、待办压力、是否深夜
- [ ] 节气日历：`lib/culture/solarTerms.ts` + 当日文案/插画/色偏
- [ ] 木棉 / 根 chat：引用 habits 与 memories，UI 提示「根记得你上次说过…」
- [ ] 热点 topicRegistry（TECH_DEBT #5）与用户偏好一致
- [ ] 场景化 patrol（TECH_DEBT #6）：生日、生病、学期末触达

### 第四阶段完成标准

- ✓ 用户知道根记住了她的习惯
- ✓ 每天打开有情感连接
- ✓ 节气日有文化惊喜

---

## 与技术债 / 产品债的对应关系

| 路径阶段 | 关联 TECH_DEBT / 产品项 |
|----------|-------------------------|
| 一 | token 统一；trialing Pro 判断 #7 |
| 二 | 场景化 patrol #6；签证提醒 cron |
| 三 | Gmail 链；school_email_domain #8；废弃 todo/action、shopping_list |
| 四 | 热点 topicRegistry #5；family_habits 展示；interest_weights |

---

## 文件与职责

| 文件 | 职责 |
|------|------|
| `REDESIGN.md` | 设计原则、token 表、Do / Don't、组件规范 |
| `REDESIGN_ROADMAP.md` | 本文件 — 阶段、任务、完成标准 |
| `TECH_DEBT.md` | 工程债 + 设计重构进度摘要 |
| `app/globals.css` | CSS 变量与全局工具类 |
| `app/_shared/_constants/theme.ts` | TS 侧 token 引用（第一阶段后变薄） |

---

## 里程碑时间线（建议）

| 阶段 | 建议周期 | 状态 |
|------|----------|------|
| 第一阶段 地基重建 | 1–2 周 | **进行中** |
| 第二阶段 首页与昼夜 | 2–3 周 | 未开始 |
| 第三阶段 输入闭环 | 3–4 周 | 未开始 |
| 第四阶段 情感与文化 | 持续迭代 | 未开始 |

---

最后更新：2026-06-04
