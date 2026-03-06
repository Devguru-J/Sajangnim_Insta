-- Create storage bucket for generation input images
INSERT INTO storage.buckets (id, name, public)
VALUES ('generation-images', 'generation-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for generated image previews/results
CREATE POLICY "Generation images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'generation-images');

-- Users can upload their own generation images
CREATE POLICY "Users can upload their own generation images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generation-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own generation images
CREATE POLICY "Users can update their own generation images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'generation-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own generation images
CREATE POLICY "Users can delete their own generation images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generation-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
