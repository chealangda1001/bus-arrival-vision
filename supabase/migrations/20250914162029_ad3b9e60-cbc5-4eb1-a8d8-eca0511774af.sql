-- Create static translations table for UI text
CREATE TABLE public.static_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  translation_key TEXT NOT NULL,
  english TEXT NOT NULL,
  khmer TEXT NOT NULL,
  chinese TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(translation_key)
);

-- Create destination translations table
CREATE TABLE public.destination_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destination_key TEXT NOT NULL,
  english TEXT NOT NULL,
  khmer TEXT NOT NULL,
  chinese TEXT NOT NULL,
  operator_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(destination_key, operator_id)
);

-- Create status translations table
CREATE TABLE public.status_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_key TEXT NOT NULL,
  english TEXT NOT NULL,
  khmer TEXT NOT NULL,
  chinese TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(status_key)
);

-- Create fleet type translations table
CREATE TABLE public.fleet_type_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_type_key TEXT NOT NULL,
  english TEXT NOT NULL,
  khmer TEXT NOT NULL,
  chinese TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fleet_type_key)
);

-- Enable RLS on all translation tables
ALTER TABLE public.static_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_type_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for static_translations
CREATE POLICY "Public can view static translations" 
ON public.static_translations 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage static translations" 
ON public.static_translations 
FOR ALL 
USING (get_current_user_role() = 'super_admin');

-- RLS Policies for destination_translations
CREATE POLICY "Public can view destination translations" 
ON public.destination_translations 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage all destination translations" 
ON public.destination_translations 
FOR ALL 
USING (get_current_user_role() = 'super_admin');

CREATE POLICY "Operator admins can manage own destination translations" 
ON public.destination_translations 
FOR ALL 
USING (get_current_user_operator_id() = operator_id OR operator_id IS NULL);

-- RLS Policies for status_translations
CREATE POLICY "Public can view status translations" 
ON public.status_translations 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage status translations" 
ON public.status_translations 
FOR ALL 
USING (get_current_user_role() = 'super_admin');

-- RLS Policies for fleet_type_translations
CREATE POLICY "Public can view fleet type translations" 
ON public.fleet_type_translations 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage fleet type translations" 
ON public.fleet_type_translations 
FOR ALL 
USING (get_current_user_role() = 'super_admin');

-- Add update triggers
CREATE TRIGGER update_static_translations_updated_at
  BEFORE UPDATE ON public.static_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_destination_translations_updated_at
  BEFORE UPDATE ON public.destination_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_status_translations_updated_at
  BEFORE UPDATE ON public.status_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fleet_type_translations_updated_at
  BEFORE UPDATE ON public.fleet_type_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed static translations with current hardcoded values
INSERT INTO public.static_translations (translation_key, english, khmer, chinese, category) VALUES
('departure_board', 'DEPARTURE BOARD', 'ក្តារចេញដំណើរ', '发车信息板', 'general'),
('destination', 'DESTINATION', 'ទិសដៅ', '目的地', 'general'),
('departure_time', 'DEPARTURE', 'ពេលចេញ', '发车时间', 'general'),
('plate_number', 'PLATE', 'ផ្ទាំង', '车牌', 'general'),
('fleet_type', 'TYPE', 'ប្រភេទ', '车型', 'general'),
('status', 'STATUS', 'ស្ថានភាព', '状态', 'general'),
('time', 'Time', 'ពេលវេលា', '时间', 'datetime'),
('monday', 'Monday', 'ចន្ទ', '周一', 'datetime'),
('tuesday', 'Tuesday', 'អង្គារ', '周二', 'datetime'),
('wednesday', 'Wednesday', 'ពុធ', '周三', 'datetime'),
('thursday', 'Thursday', 'ព្រហស្បតិ៍', '周四', 'datetime'),
('friday', 'Friday', 'សុក្រ', '周五', 'datetime'),
('saturday', 'Saturday', 'សៅរ៍', '周六', 'datetime'),
('sunday', 'Sunday', 'អាទិត្យ', '周日', 'datetime'),
('january', 'January', 'មករា', '一月', 'datetime'),
('february', 'February', 'កុម្ភៈ', '二月', 'datetime'),
('march', 'March', 'មីនា', '三月', 'datetime'),
('april', 'April', 'មេសា', '四月', 'datetime'),
('may', 'May', 'ឧសភា', '五月', 'datetime'),
('june', 'June', 'មិថុនា', '六月', 'datetime'),
('july', 'July', 'កក្កដា', '七月', 'datetime'),
('august', 'August', 'សីហា', '八月', 'datetime'),
('september', 'September', 'កញ្ញា', '九月', 'datetime'),
('october', 'October', 'តុលា', '十月', 'datetime'),
('november', 'November', 'វិច្ឆិកា', '十一月', 'datetime'),
('december', 'December', 'ធ្នូ', '十二月', 'datetime'),
('current_time', 'Current Time', 'ពេលវេលាបច្ចុប្បន្ន', '当前时间', 'general'),
('powered_by', 'Powered by TTS Lab', 'បើកដំណើរការដោយ TTS Lab', '由TTS实验室提供支持', 'general');

-- Seed destination translations with current hardcoded values
INSERT INTO public.destination_translations (destination_key, english, khmer, chinese) VALUES
('Phnom Penh', 'Phnom Penh', 'ភ្នំពេញ', '金边'),
('Siem Reap', 'Siem Reap', 'សៀមរាប', '暹粒'),
('Battambang', 'Battambang', 'បាត់ដំបង', '马德望'),
('Kampong Thom', 'Kampong Thom', 'កំពង់ធំ', '磅通'),
('Poipet', 'Poipet', 'ប៉ោយប៉ែត', '波贝');

-- Seed status translations with current hardcoded values
INSERT INTO public.status_translations (status_key, english, khmer, chinese) VALUES
('on-time', 'ON-TIME', 'ទាន់ពេល', '准时'),
('delayed', 'DELAYED', 'យឺតយ៉ាវ', '延误'),
('boarding', 'BOARDING', 'កំពុងឡើង', '登车中'),
('departed', 'DEPARTED', 'ចេញហើយ', '已出发');

-- Seed fleet type translations with current hardcoded values
INSERT INTO public.fleet_type_translations (fleet_type_key, english, khmer, chinese) VALUES
('VIP Van', 'VIP Van', 'វីអាយភីវ៉ាន់', 'VIP面包车'),
('Bus', 'Bus', 'ឡានក្រុង', '巴士'),
('Sleeping Bus', 'Sleeping Bus', 'ឡានក្រុងគេង', '卧铺巴士');