-- 清理 todo_items 非法 category 值，对齐 9 维模型

UPDATE todo_items SET category = 'compliance' WHERE category = 'visa';
UPDATE todo_items SET category = 'wealth' WHERE category = 'finance';
UPDATE todo_items SET category = 'education' WHERE category = 'other' OR category IS NULL;
UPDATE todo_items SET category = 'selfcare' WHERE category = 'lifestyle';
UPDATE todo_items SET category = 'mobility' WHERE category = 'weather';

CREATE INDEX IF NOT EXISTS idx_todo_category
  ON todo_items (user_id, category, status);
