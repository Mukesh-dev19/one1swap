CREATE TABLE public.advertisements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'text',
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.advertisements TO anon;
GRANT SELECT ON public.advertisements TO authenticated;
GRANT ALL ON public.advertisements TO service_role;

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ads"
ON public.advertisements
FOR SELECT
USING (is_active = true);

CREATE TRIGGER update_advertisements_updated_at
BEFORE UPDATE ON public.advertisements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Public bucket for ad media (images/videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-media', 'ad-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Ad media is publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-media');

CREATE POLICY "Service role manages ad media"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'ad-media')
WITH CHECK (bucket_id = 'ad-media');