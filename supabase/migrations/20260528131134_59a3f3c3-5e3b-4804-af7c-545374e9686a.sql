ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS target_college text,
ADD COLUMN IF NOT EXISTS target_department text;