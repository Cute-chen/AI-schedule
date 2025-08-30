-- 清理无用的系统信息设置数据
-- 执行日期：2024年

-- 备份当前系统信息设置（可选，如果需要恢复）
-- CREATE TABLE system_settings_backup AS SELECT * FROM system_settings WHERE category = 'general' AND key = 'system_info';

-- 删除系统信息相关的设置
-- 这些设置包括：systemName, companyName, companyAddress, phone, email, timezone, language
DELETE FROM system_settings 
WHERE category = 'general' 
  AND key = 'system_info';

-- 查看清理后的 general 类别设置（应该只剩下 system_config）
-- SELECT * FROM system_settings WHERE category = 'general';

-- 如果需要确保 system_config 存在默认值，可以执行以下插入语句
INSERT OR IGNORE INTO system_settings (category, key, value, created_at, updated_at)
VALUES (
  'general',
  'system_config', 
  JSON_OBJECT(
    'weekStartDate', DATE('now', 'weekday 1', '-7 days'),  -- 本周周一
    'workDays', JSON_ARRAY('1', '2', '3', '4', '5')        -- 周一到周五
  ),
  DATETIME('now'),
  DATETIME('now')
);

-- 验证清理结果
SELECT 
  category,
  key,
  JSON_EXTRACT(value, '$') as value,
  created_at
FROM system_settings 
WHERE category = 'general'
ORDER BY key;