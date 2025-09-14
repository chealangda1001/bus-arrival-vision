-- Make the announcement-audio bucket public so uploaded MP3 files can be accessed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'announcement-audio';