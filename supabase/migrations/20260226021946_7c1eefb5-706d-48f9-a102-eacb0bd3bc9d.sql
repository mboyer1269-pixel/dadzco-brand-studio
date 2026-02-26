-- Create storage bucket for brand book files
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-book-files', 'brand-book-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create brand_files metadata table
CREATE TABLE IF NOT EXISTS public.brand_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  file_size BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_files ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admin full access brand_files"
  ON public.brand_files
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage policies: admin can upload/read/delete
CREATE POLICY "Admin upload brand-book-files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'brand-book-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin read brand-book-files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'brand-book-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete brand-book-files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'brand-book-files' AND public.has_role(auth.uid(), 'admin'));

-- Public read for displaying logos/files
CREATE POLICY "Public read brand-book-files"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'brand-book-files');