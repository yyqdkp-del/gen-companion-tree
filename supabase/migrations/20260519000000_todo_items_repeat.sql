-- 周期性待办：在 Supabase 控制台或 CLI 应用此迁移
ALTER TABLE todo_items
ADD COLUMN IF NOT EXISTS repeat TEXT
CHECK (repeat IS NULL OR repeat IN ('daily', 'weekly', 'monthly', 'weekdays'));
