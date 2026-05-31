# 技术债记录

## 高优先级（有真实用户后优先处理）

### 1. 数据同步层架构重构
- 问题：useChildData + AppContext + syncService 用手写依赖链管理服务端数据
- 症状：kids 数组引用变化导致同一 child_id 重复 enrich，ERR_INSUFFICIENT_RESOURCES
- 临时修复：page.tsx setActiveKid effect 加字段比较跳过无效更新
- 根本方案：用 SWR 或 React Query 替换整个同步层
- 涉及文件：AppContext.tsx、useChildData.ts、syncService.ts、page.tsx

### 2. 热点设置与巡逻不对应
- 问题：用户勾选的关注项只有弱关联，Gemini 搜索列表写死，关不掉
- 临时状态：仅 Grok/Claude 轻微受偏好影响
- 根本方案：topic → 搜索关键词映射表，Gemini 按开启项动态生成 query
- 涉及文件：app/api/base/patrol/route.ts、HotspotPreferences.tsx

### 3. Gmail cron 缺 user_id
- 问题：gmail-scan cron 多用户场景易整批跳过
- 临时状态：未修复
- 根本方案：修复 user_id 传递链路
- 涉及文件：app/api/cron/gmail-scan/route.ts

## 中优先级

### 4. child_profiles 依赖用户手动保存
- 问题：已修复（addChild 后自动创建空 profile）
- 状态：✅ 已解决

### 5. 热点旧新闻
- 问题：搜索无日期边界，出现 2025 年旧闻
- 状态：✅ P0 已修复（recencyBlock + 年份过滤）
- 待做：P1 搜索 API 加 dateRestrict

### 6. 单页 Tab 壳
- 问题：4 个 Tab 是独立路由，切换时完整 unmount/mount
- 临时修复：Link prefetch + 去掉 force-dynamic
- 根本方案：单页 Tab 壳，4 个模块同页切换
- 评估：改动大，等用户量上来再做

## 低优先级

### 7. AppContext 两处 setTimeout 未清理
- 位置：initSession 3s 跳转、process_status 回调
- 风险：unmount 后可能 setState，AppProvider 通常不 unmount 风险较低

### 8. pathway_watch channel 名固定
- 问题：多 Tab 可能共用同名 channel
- 方案：改为 pathway_watch_${childId}

---
最后更新：2026-05-31
