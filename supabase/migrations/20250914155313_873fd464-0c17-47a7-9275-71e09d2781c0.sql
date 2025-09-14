-- Enable RLS on storage.objects and storage.buckets tables
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create policies for storage.objects to allow public access to announcement-audio bucket
CREATE POLICY "Public Access to announcement-audio" ON storage.objects
FOR SELECT USING (bucket_id = 'announcement-audio');

-- Create policies for storage.buckets to allow public read access
CREATE POLICY "Public can view public buckets" ON storage.buckets
FOR SELECT USING (public = true);