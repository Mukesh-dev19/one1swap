
-- Add saved_items table for wishlist/bookmarks
CREATE TABLE public.saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_id)
);

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved items" ON public.saved_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save items" ON public.saved_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave items" ON public.saved_items FOR DELETE USING (auth.uid() = user_id);

-- Add files column to resources for PDF/notes uploads
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS files text[] DEFAULT '{}'::text[];

-- Add status to resources for active/sold tracking
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Create storage bucket for resource files (PDFs, notes)
INSERT INTO storage.buckets (id, name, public) VALUES ('resource-files', 'resource-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resource-files bucket
CREATE POLICY "Anyone can view resource files" ON storage.objects FOR SELECT USING (bucket_id = 'resource-files');
CREATE POLICY "Authenticated users can upload resource files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resource-files' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own resource files" ON storage.objects FOR DELETE USING (bucket_id = 'resource-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for saved_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_items;
