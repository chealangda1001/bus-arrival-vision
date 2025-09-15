-- Add new columns to operator_settings table for enhanced TTS configuration
ALTER TABLE public.operator_settings 
ADD COLUMN style_instructions TEXT DEFAULT 'Use a professional airport flight announcement using multiple speakers. Use a warm and friendly Khmer female voice (Zephyr) for the main announcement in Khmer, clear and polite, like a native announcer. Use a firm and neutral male voice (Kore) for the English translation, sounding official but welcoming. Maintain a steady pace with natural pauses, like real airport announcements, and avoid robotic intonation.',
ADD COLUMN temperature DECIMAL DEFAULT 0.7,
ADD COLUMN voice_settings JSONB DEFAULT '{
  "khmer": {"voice": "female", "speed": 0.9, "pitch": 0.0},
  "english": {"voice": "male", "speed": 1.0, "pitch": 0.0},
  "chinese": {"voice": "female", "speed": 0.9, "pitch": 0.0}
}'::jsonb;

-- Update default announcement scripts to use the new enhanced versions
UPDATE public.operator_settings 
SET announcement_scripts = '{
  "khmer": "សូមអញ្ជើញអ្នកដំណើរទាំងអស់, ដែលកំពុងធ្វើដំណើរ, ទៅកាន់{destination}, តាមរយៈឡាន{fleet_type}, អញ្ជើញឡើងរថយន្ត, ដែលមានស្លាកលេខ, {fleet_plate_number}, យើងនឹងចាក់ចេញដំណើរទៅកាន់ {destination} ក្នុងពេលបន្តិចទៀតនេះ, ហើយការធ្វើដំណើរនេះមានរយៈពេលប្រហែល {trip_duration} ម៉ោង, យើងនឹងមានការឈប់សំរាកប្រមាណ {break_duration} នាទី, សម្រាប់អ្នកទាំងអស់គ្នាទៅបន្ទប់ទឹក ឬទិញអាហារតិចតួច, យើងនឹងទៅដល់ {destination} ប្រមាណ {trip_duration} ម៉ោងបន្ទាប់, សូមអរគុណសម្រាប់ការធ្វើដំណើររបស់អ្នក, ជាមួយក្រុមហ៊ុន, {operator_name}, យើងខ្ញុំសូមជូនពរអស់លោក, លោកស្រី, ឲ្យធ្វើដំណើរប្រកបដោយសុវត្ថិភាព សូមអរគុណ",
  "english": "Attention please. Passengers traveling to {destination}, please proceed to the boarding gate, we will be departing soon. We will be traveling to {destination}, and the journey will take about {trip_duration} hours, We will have a {break_duration} minute break so everyone can use the restroom or grab a quick snack, We will arrive in {destination} in around {trip_duration} hours. We wish you a safe and enjoyable bus ride. Thank you for traveling with {operator_name}!",
  "chinese": "各位旅客请注意：前往 {destination} 的乘客请前往登车口，我们即将出发。本次行程将前往 {destination} ，全程大约 {trip_duration} 小时。途中我们会停靠一次，休息 {break_duration} 分钟，方便大家使用洗手间或购买一些小吃。预计 {trip_duration} 小时后抵达 {destination}。祝您旅途平安愉快！感谢您选择 {operator_name}！"
}'::jsonb
WHERE announcement_scripts->>'khmer' LIKE 'សូមអ្នកដំណើរ សេវាកម្ម%';