-- Insert sample departure data
INSERT INTO public.departures (route_number, destination, plate_number, departure_time, status, gate, passenger_count, fleet_image_url) VALUES 
('101', 'Phnom Penh International Airport', 'PP-1234', '14:30', 'on-time', 'A1', 45, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop&crop=center'),
('205', 'Central Market', 'PP-5678', '14:45', 'delayed', 'B2', 32, 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400&h=300&fit=crop&crop=center'),
('89', 'Riverside Boulevard', 'PP-9012', '15:00', 'boarding', 'A3', 28, 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center'),
('340', 'Royal Palace', 'PP-3456', '15:15', 'on-time', 'C1', 51, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop&crop=center');