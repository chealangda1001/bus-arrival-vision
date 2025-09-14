-- Enable RLS on storage.objects table to fix security warnings
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on storage.buckets table to ensure comprehensive security
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to public buckets
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id IN (
  SELECT id FROM storage.buckets WHERE public = true
));

-- Policy for users to manage their own files in private buckets
CREATE POLICY "Users can manage own files in private buckets" ON storage.objects
FOR ALL USING (
  bucket_id IN (
    SELECT id FROM storage.buckets WHERE public = false
  ) AND 
  (storage.foldername(name))[1] = auth.uid()::text
);