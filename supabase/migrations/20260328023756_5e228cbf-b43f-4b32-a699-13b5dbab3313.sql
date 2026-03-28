
-- Message reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  message_type text NOT NULL DEFAULT 'dm',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can add reactions" ON public.message_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view reactions" ON public.message_reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can remove own reactions" ON public.message_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add reply_to columns
ALTER TABLE public.messages ADD COLUMN reply_to_id uuid REFERENCES public.messages(id);
ALTER TABLE public.group_messages ADD COLUMN reply_to_id uuid REFERENCES public.group_messages(id);

-- Group admin can update member roles
CREATE POLICY "Group admin can update members" ON public.group_members
  FOR UPDATE TO authenticated
  USING (group_id IN (
    SELECT gm.group_id FROM group_members gm
    WHERE gm.user_id = auth.uid() AND gm.role = 'admin'
  ));

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
