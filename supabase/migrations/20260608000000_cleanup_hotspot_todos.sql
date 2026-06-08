-- 1. 课程类待办直接删除
DELETE FROM todo_items
WHERE user_id = '63ce2f4d-f140-473e-a681-1b4f84076805'
AND (
  title LIKE '📅%'
  OR title LIKE '%Library%'
  OR title LIKE '%Art/Music%'
)
AND category IS NULL;

-- 2. hotspot 类过期待办关闭
UPDATE todo_items
SET status = 'expired'
WHERE source = 'hotspot'
AND status = 'pending'
AND (
  due_date < CURRENT_DATE
  OR due_date IS NULL
)
AND created_at < NOW() - INTERVAL '7 days';

-- 3. null category 航班类修复
UPDATE todo_items
SET category = 'mobility'
WHERE category IS NULL
AND (
  title LIKE '%航班%'
  OR title LIKE '%MU%'
  OR title LIKE '%行程%'
  OR title LIKE '%机场%'
)
AND user_id = '63ce2f4d-f140-473e-a681-1b4f84076805';
