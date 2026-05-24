-- 移除 children.energy 列默认值，清理历史占位数据
ALTER TABLE children ALTER COLUMN energy DROP DEFAULT;
UPDATE children SET energy = NULL WHERE energy IN (50, 75);
