# 技术债记录

## 设计重构进行中

当前阶段：第一阶段 - 地基重建  
开始日期：2026-06-04  
参考文件：`REDESIGN.md`、`REDESIGN_ROADMAP.md`

**第一阶段完成后：**

- ✓ 全站颜色统一，没有颜色冲突
- ✓ 字体层级清晰

**第二阶段完成后：**

- ✓ 用户打开首页立刻看到「今天最重要的事」
- ✓ 签证倒计时显眼可见
- ✓ 深夜自动切换到温柔模式

**第三阶段完成后：**

- ✓ 拍照后清晰看到处理结果
- ✓ Gmail 解析结果出现在首页
- ✓ 成长家书妈妈愿意发朋友圈

**第四阶段完成后：**

- ✓ 用户知道根记住了她的习惯
- ✓ 每天打开有情感连接
- ✓ 节气日有文化惊喜

---

## 已解决 ✅

### 1. 数据同步层架构重构
- 状态：✅ 已解决（2026-06-02）
- 方案：AppContext 换 SWR useSWR app-core，useChildData enrich 换 SWR

### 2. Gmail cron 缺 user_id
- 状态：✅ 已解决（2026-06-02）
- 方案：逐用户扫描，每封邮件传 user_id，单用户失败不影响其他用户

### 3. child_profiles 依赖用户手动保存
- 状态：✅ 已解决
- 方案：addChild 后自动创建空 profile

### 4. 热点旧新闻
- 状态：✅ P0 已修复
- 方案：recencyBlock + 年份过滤
- 待做：P1 搜索 API 加 dateRestrict

---

## 高优先级（现在处理）

### 5. 热点设置与巡逻不对应
- 问题：用户勾选的关注项只有弱关联，Gemini 搜索列表写死
- 分析完成：topicRegistry 方案已设计
- 根本方案：
  - 抽 lib/hotspot/topicRegistry.ts 共享映射
  - Gemini 按 enabled topics 动态生成 query
  - Claude 输出后按 topic 过滤兜底
  - 修 HotspotPreferences 加载逻辑（去掉强制开启 IMPORTANT_TOPICS）
- 涉及文件：patrol/route.ts、HotspotPreferences.tsx、新建 topicRegistry.ts

### 6. 场景化巡逻（新增）
- 问题：巡逻是通用信息流，缺少生活场景触发的精准推送
- 已识别场景：
  - 周末 → 推荐适合孩子的本地活动
  - 学期末 → 廉价航空/旅行建议
  - 孩子生病 → 饮食恢复提示
  - 孩子生日月 → 亲子餐厅/儿童乐园
  - 签证到期前 → 提前提醒
- 所需数据：children.birthday、child_daily_log.health_status、
  child_school_calendar 学期结束日、当前星期几
- 根本方案：getFamilySnapshot 增加场景信号，patrol prompt 按场景动态注入

### 7. trialing 用户 Pro 判断不一致
- 问题：limits/check 里 trialing=Pro，pro/status 里 trialing 可能=false
- 症状：试用用户周报分享可能被误拦
- 方案：统一 pro/status 也接受 trialing 状态

---

## 中优先级

### 8. school_email_domain 没有表单
- 问题：邮件过滤域名字段无填写入口，过滤基本失效
- 方案：在 StepSchool 加一个可选输入框「学校邮件域名（如 nis.ac.th）」

### 9. 单页 Tab 壳
- 问题：4 个 Tab 切换时完整 unmount/mount
- 临时修复：Link prefetch + 去掉 force-dynamic
- 评估：等用户量上来再做

### 10. 热点 P1：搜索 API 加 dateRestrict
- 问题：Grok/Gemini query 无日期边界
- 方案：query 显式加 after:日期 或接入 Tavily

---

## 低优先级

### 11. AppContext setTimeout 未清理
- 位置：process_status 回调里 3s/4s timer
- 风险低：AppProvider 通常不 unmount

### 12. pathway_watch channel 名固定
- 方案：改为 pathway_watch_${childId}

### 13. TypeScript any 警告
- 全项目 100+ 处，不影响运行，等有时间统一清理

---
最后更新：2026-06-04
