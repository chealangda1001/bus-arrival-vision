-- Add more branches for Premium Bus Co.
INSERT INTO public.branches (operator_id, name, slug, location, is_default) VALUES 
((SELECT id FROM public.operators WHERE slug = 'premium-bus-co'), 'Riverside Terminal', 'riverside-terminal', 'Sisowath Quay, Phnom Penh', false),
((SELECT id FROM public.operators WHERE slug = 'premium-bus-co'), 'Russian Market Hub', 'russian-market-hub', 'Toul Tom Poung Market Area', false),
((SELECT id FROM public.operators WHERE slug = 'premium-bus-co'), 'BKK1 Station', 'bkk1-station', 'Boeung Keng Kang 1', false),
((SELECT id FROM public.operators WHERE slug = 'premium-bus-co'), 'Sen Sok Terminal', 'sen-sok-terminal', 'Sen Sok District', false);

-- Add more branches for City Transit
INSERT INTO public.branches (operator_id, name, slug, location, is_default) VALUES 
((SELECT id FROM public.operators WHERE slug = 'city-transit'), 'Olympic Market Station', 'olympic-market-station', 'Olympic Market Area', false),
((SELECT id FROM public.operators WHERE slug = 'city-transit'), 'Chbar Ampov Hub', 'chbar-ampov-hub', 'Chbar Ampov District', false),
((SELECT id FROM public.operators WHERE slug = 'city-transit'), 'Tuol Kork Branch', 'tuol-kork-branch', 'Tuol Kork District', false),
((SELECT id FROM public.operators WHERE slug = 'city-transit'), 'Dangkor Terminal', 'dangkor-terminal', 'Dangkor District', false),
((SELECT id FROM public.operators WHERE slug = 'city-transit'), 'Meanchey Station', 'meanchey-station', 'Meanchey District', false);

-- Add more branches for Express Lines
INSERT INTO public.branches (operator_id, name, slug, location, is_default) VALUES 
((SELECT id FROM public.operators WHERE slug = 'express-lines'), 'Pochentong Branch', 'pochentong-branch', 'Near Airport Road', false),
((SELECT id FROM public.operators WHERE slug = 'express-lines'), 'Kandal Terminal', 'kandal-terminal', 'Kandal Province Border', false),
((SELECT id FROM public.operators WHERE slug = 'express-lines'), 'Chroy Changvar Hub', 'chroy-changvar-hub', 'Chroy Changvar District', false),
((SELECT id FROM public.operators WHERE slug = 'express-lines'), 'Prek Pnov Station', 'prek-pnov-station', 'Prek Pnov District', false),
((SELECT id FROM public.operators WHERE slug = 'express-lines'), 'National Road 1 Terminal', 'national-road-1-terminal', 'Highway 1 Junction', false);

-- Add sample departures for the new branches
-- Premium Bus Co. additional departures
INSERT INTO public.departures (branch_id, destination, plate_number, departure_time, status, fleet_type, fleet_image_url) VALUES 
-- Riverside Terminal
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'premium-bus-co') AND slug = 'riverside-terminal'), 'Kampot', 'PP-R001', '08:30', 'on-time', 'VIP Van', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop&crop=center'),
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'premium-bus-co') AND slug = 'riverside-terminal'), 'Kep', 'PP-R002', '10:00', 'on-time', 'VIP Van', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop&crop=center'),
-- Russian Market Hub
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'premium-bus-co') AND slug = 'russian-market-hub'), 'Takeo', 'PP-R101', '09:15', 'delayed', 'Bus', 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400&h=300&fit=crop&crop=center'),
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'premium-bus-co') AND slug = 'russian-market-hub'), 'Prey Veng', 'PP-R102', '11:45', 'on-time', 'Bus', 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400&h=300&fit=crop&crop=center');

-- City Transit additional departures
INSERT INTO public.departures (branch_id, destination, plate_number, departure_time, status, fleet_type, fleet_image_url) VALUES 
-- Olympic Market Station
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'city-transit') AND slug = 'olympic-market-station'), 'Kompong Cham', 'CT-O001', '07:00', 'boarding', 'Sleeping Bus', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center'),
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'city-transit') AND slug = 'olympic-market-station'), 'Kratie', 'CT-O002', '08:30', 'on-time', 'Bus', 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400&h=300&fit=crop&crop=center'),
-- Chbar Ampov Hub
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'city-transit') AND slug = 'chbar-ampov-hub'), 'Svay Rieng', 'CT-C001', '09:00', 'on-time', 'VIP Van', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop&crop=center'),
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'city-transit') AND slug = 'chbar-ampov-hub'), 'Bavet Border', 'CT-C002', '13:20', 'delayed', 'VIP Van', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop&crop=center');

-- Express Lines additional departures
INSERT INTO public.departures (branch_id, destination, plate_number, departure_time, status, fleet_type, fleet_image_url) VALUES 
-- Pochentong Branch
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'express-lines') AND slug = 'pochentong-branch'), 'Bangkok', 'EL-P001', '05:00', 'on-time', 'Sleeping Bus', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center'),
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'express-lines') AND slug = 'pochentong-branch'), 'Pattaya', 'EL-P002', '06:30', 'boarding', 'Sleeping Bus', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center'),
-- Kandal Terminal
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'express-lines') AND slug = 'kandal-terminal'), 'Koh Kong', 'EL-K001', '07:45', 'on-time', 'Bus', 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400&h=300&fit=crop&crop=center'),
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'express-lines') AND slug = 'kandal-terminal'), 'Poipet Border', 'EL-K002', '12:00', 'delayed', 'VIP Van', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop&crop=center');