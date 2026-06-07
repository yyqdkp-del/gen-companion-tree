-- 孩子日精力历史（供 familyMemory / 趋势分析）
ALTER TABLE public.child_daily_log
  ADD COLUMN IF NOT EXISTS energy INTEGER;

-- child_packing_habits：baseline 遗留表，已由 family_packing_memory 取代，勿在新代码中使用
COMMENT ON TABLE public.child_packing_habits IS
  '@deprecated 已由 family_packing_memory + packing_confirm_logs 取代；保留仅供历史数据';
