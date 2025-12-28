-- Fix existing operator_settings rows with empty Chinese templates
UPDATE operator_settings 
SET announcement_scripts = jsonb_set(
  COALESCE(announcement_scripts::jsonb, '{}'::jsonb), 
  '{chinese}', 
  '"各位旅客请注意：前往 {destination} 的乘客请前往登车口，我们即将出发。本次行程将前往 {destination}，全程大约 {trip_duration} 小时。途中我们会停靠一次，休息 {break_duration} 分钟，方便大家使用洗手间或购买一些小吃。预计 {trip_duration} 小时后抵达 {destination}。祝您旅途平安愉快！感谢您选择 {operator_name}！"'
)
WHERE announcement_scripts::jsonb->>'chinese' = '' 
   OR announcement_scripts::jsonb->>'chinese' IS NULL
   OR TRIM(announcement_scripts::jsonb->>'chinese') = '';