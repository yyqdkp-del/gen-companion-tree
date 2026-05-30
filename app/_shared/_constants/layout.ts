// ─────────────────────────────────────────
// 布局常量 — 4 Tab 底栏 + 右下角浮动输入
// ─────────────────────────────────────────

export const TAB_BAR_HEIGHT_PX = 56

/** 仅底栏 */
export const TAB_BAR_CSS = `calc(${TAB_BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`

/** 底栏 + 内容间距（无浮动话筒/相机） */
export const PAGE_BOTTOM_TAB_ONLY = `calc(${TAB_BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 20px)`

/** 底栏 + 浮动按钮区（/ 与 /rian） */
export const PAGE_BOTTOM_WITH_FLOAT = `calc(${TAB_BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 88px)`

/** 浮动话筒/相机距屏幕底 */
export const FLOAT_INPUT_BOTTOM = `calc(${TAB_BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 16px)`

/** @deprecated 使用 PAGE_BOTTOM_TAB_ONLY */
export const PAGE_BOTTOM_PADDING = PAGE_BOTTOM_TAB_ONLY

/** @deprecated 使用 PAGE_BOTTOM_TAB_ONLY */
export const NAV_HEIGHT_CSS = PAGE_BOTTOM_TAB_ONLY

export const SAFE_BOTTOM_INSET = 'max(env(safe-area-inset-bottom), 20px)'

export const SAFE_AREA_TOP = 'max(env(safe-area-inset-top), 0px)'
export const STICKY_HEADER_PADDING_TOP = 'calc(12px + env(safe-area-inset-top))'

export const PAGE_TOP_PADDING = 'max(calc(env(safe-area-inset-top) + 44px), 56px)'

export const SHEET_BOTTOM_PADDING = `max(calc(env(safe-area-inset-bottom) + ${TAB_BAR_HEIGHT_PX}px + 52px), 120px)`

export const FLOAT_SHEET_BOTTOM = PAGE_BOTTOM_WITH_FLOAT
