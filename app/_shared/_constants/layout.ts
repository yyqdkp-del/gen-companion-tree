// ─────────────────────────────────────────
// 布局常量
// 全项目统一引用，不在各处硬编码
// ─────────────────────────────────────────

// 有底部导航的页面底部留白（80px 导航 + safe-area，至少 20px）
export const PAGE_BOTTOM_PADDING = 'calc(80px + max(env(safe-area-inset-bottom), 20px))'

// 底部导航栏总占用高度（胶囊 62px + safe-area + 外边距，略大于 PAGE_BOTTOM_PADDING）
export const NAV_HEIGHT_CSS = `max(${PAGE_BOTTOM_PADDING}, 110px)`

// 无底部导航页面（如 /learn）仅保留 Home 指示条区域
export const SAFE_BOTTOM_INSET = 'max(env(safe-area-inset-bottom), 20px)'

// 顶部状态栏 / 刘海
export const SAFE_AREA_TOP = 'max(env(safe-area-inset-top), 0px)'
export const STICKY_HEADER_PADDING_TOP = 'calc(12px + env(safe-area-inset-top))'

// 滚动页顶部留白（状态栏 + 内容间距）
export const PAGE_TOP_PADDING = 'max(calc(env(safe-area-inset-top) + 44px), 56px)'

// 弹窗底部 padding（确保内容不被导航栏遮挡）
export const SHEET_BOTTOM_PADDING = 'max(calc(env(safe-area-inset-bottom) + 108px), 120px)'

// 浮动弹窗距底部距离（HotspotSheet/ChildSheet 类型）
export const FLOAT_SHEET_BOTTOM = NAV_HEIGHT_CSS
