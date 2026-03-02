
-- Add new columns to announcement_types
ALTER TABLE announcement_types 
  ADD COLUMN default_break_duration integer,
  ADD COLUMN driver_playable boolean NOT NULL DEFAULT false;

-- Mark existing break_stop as driver-playable with 15min default
UPDATE announcement_types SET driver_playable = true, default_break_duration = 15 WHERE type_key = 'break_stop';

-- Seed meal_break for all operators
INSERT INTO announcement_types (operator_id, type_key, type_name, description, default_break_duration, driver_playable, is_default, announcement_scripts, voice_settings)
SELECT 
  id, 
  'meal_break', 
  'Meal Break Announcement', 
  'Longer break for meal time during transit', 
  30, 
  true, 
  true,
  '{"english": "Attention passengers. We are now stopping for a meal break of approximately {break_duration} minutes. Please enjoy your meal at the restaurant area. The bus will depart again after the break. Please return to the bus on time. Thank you.", "khmer": "សូមអ្នកដំណើរទាំងអស់ យើងកំពុងឈប់សម្រាកញ៉ាំអាហារ ប្រមាណ {break_duration} នាទី។ សូមអញ្ជើញរីករាយជាមួយអាហារ។ រថយន្តនឹងចេញដំណើរវិញបន្ទាប់ពីសម្រាក។ សូមត្រលប់មកវិញឱ្យទាន់ពេល។ សូមអរគុណ។", "chinese": "各位旅客请注意，我们现在停车用餐，休息时间约{break_duration}分钟。请大家到餐厅区域享用餐点。休息结束后巴士将继续出发，请按时返回车上。谢谢大家。"}'::jsonb,
  '{"khmer": {"pitch": 0.0, "speed": 0.9, "voice": "female", "voice_model": "Zephyr"}, "chinese": {"pitch": 0.0, "speed": 0.9, "voice": "female", "voice_model": "Luna"}, "english": {"pitch": 0.0, "speed": 1.0, "voice": "male", "voice_model": "Kore"}}'::jsonb
FROM operators
WHERE NOT EXISTS (SELECT 1 FROM announcement_types WHERE announcement_types.operator_id = operators.id AND type_key = 'meal_break');
