-- 热点原文链接（巡逻 AI 输出，需为可访问的 https URL）
ALTER TABLE public.hotspot_items
  ADD COLUMN IF NOT EXISTS source_url TEXT;
