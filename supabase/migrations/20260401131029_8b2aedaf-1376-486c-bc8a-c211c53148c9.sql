
-- Fix 1: Tighten message_reactions SELECT policy
DROP POLICY IF EXISTS "Users can view reactions" ON public.message_reactions;

CREATE POLICY "Users can view reactions on their messages"
ON public.message_reactions FOR SELECT TO authenticated
USING (
  (message_type = 'dm' AND message_id IN (
    SELECT id FROM public.messages
    WHERE sender_id = auth.uid() OR receiver_id = auth.uid()
  ))
  OR
  (message_type = 'group' AND message_id IN (
    SELECT id FROM public.group_messages
    WHERE group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  ))
);

-- Fix 2: Make resource-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'resource-files';

-- Add RLS policy for authenticated access to resource-files
CREATE POLICY "Authenticated users can read resource files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resource-files');

CREATE POLICY "Users can upload resource files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resource-files' AND (storage.foldername(name))[1] = auth.uid()::text);
