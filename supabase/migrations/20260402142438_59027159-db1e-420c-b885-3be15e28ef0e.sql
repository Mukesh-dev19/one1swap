
-- 1. Remove the overly permissive public SELECT policy on resource-files
DROP POLICY IF EXISTS "Anyone can view resource files" ON storage.objects;

-- 2. Add UPDATE policies for storage buckets (ownership check via folder name)
CREATE POLICY "Users can update own resource files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id IN ('resource-files', 'resource-images') AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id IN ('resource-files', 'resource-images') AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Add RLS policies on realtime.messages to scope channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read own realtime messages"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM realtime.messages rm
    WHERE rm.id = realtime.messages.id
  )
);
