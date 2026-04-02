
-- 1. Fix resource-files SELECT policy: restrict to user's own folder
DROP POLICY IF EXISTS "Authenticated users can read resource files" ON storage.objects;
CREATE POLICY "Users can read own resource files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resource-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Fix realtime messages policy: drop the self-referential one
DROP POLICY IF EXISTS "Authenticated users can read own realtime messages" ON realtime.messages;

-- 3. Remove the weak duplicate INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload resource files" ON storage.objects;
