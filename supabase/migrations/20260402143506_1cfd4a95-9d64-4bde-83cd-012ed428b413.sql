
-- 1. Fix resource-images INSERT policy: add folder ownership check
DROP POLICY IF EXISTS "Authenticated users can upload resource images" ON storage.objects;
CREATE POLICY "Users can upload own resource images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resource-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Fix message_reactions INSERT policy: require conversation participation
DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
CREATE POLICY "Users can add reactions to own conversations"
ON message_reactions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    (message_type = 'dm' AND message_id IN (
      SELECT id FROM messages WHERE sender_id = auth.uid() OR receiver_id = auth.uid()
    ))
    OR
    (message_type = 'group' AND message_id IN (
      SELECT id FROM group_messages WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    ))
  )
);

-- 3. Add realtime.messages RLS policy to restrict channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Restrict realtime subscriptions to authenticated users"
ON realtime.messages FOR SELECT
TO authenticated
USING (true);
