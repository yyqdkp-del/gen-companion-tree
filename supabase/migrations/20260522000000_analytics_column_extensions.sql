-- chinese_sessions 加学习时长
ALTER TABLE chinese_sessions
ADD COLUMN IF NOT EXISTS session_duration_sec INTEGER;

-- hotspot_items 加点击计数
ALTER TABLE hotspot_items
ADD COLUMN IF NOT EXISTS impression_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

-- growth_reports 加阅读时长
ALTER TABLE growth_reports
ADD COLUMN IF NOT EXISTS read_duration_sec INTEGER DEFAULT 0;
