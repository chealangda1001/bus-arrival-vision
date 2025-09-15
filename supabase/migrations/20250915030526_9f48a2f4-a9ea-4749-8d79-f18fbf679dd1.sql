-- Add missing bus_departures translation to static_translations table
INSERT INTO static_translations (translation_key, english, khmer, chinese, category)
VALUES ('bus_departures', 'Bus Departures', 'វិនិច្ឆ័យចេញដំណើរ', '公交车发车时刻', 'general');