// ─────────────────────────────────────────
// 布局常量
// 全项目统一引用，不在各处硬编码
// ─────────────────────────────────────────

// 底部导航栏总占用高度
// 胶囊 62px + safe-area-inset-bottom + margin 36px
export const NAV_HEIGHT_CSS = 'max(calc(env(safe-area-inset-bottom) + 98px), 110px)'

// 弹窗底部 padding（确保内容不被导航栏遮挡）
export const SHEET_BOTTOM_PADDING = 'max(calc(env(safe-area-inset-bottom) + 108px), 120px)'

// 浮动弹窗距底部距离（HotspotSheet/ChildSheet 类型）
export const FLOAT_SHEET_BOTTOM = 'max(calc(env(safe-area-inset-bottom) + 98px), 110px)'
