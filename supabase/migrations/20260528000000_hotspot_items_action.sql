-- 热点行动建议（巡逻 prompt 输出 action 字段）
ALTER TABLE public.hotspot_items
  ADD COLUMN IF NOT EXISTS action TEXT;
