-- 木棉树洞：跨会话简短记忆事实

CREATE TABLE IF NOT EXISTS public.mom_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mom_memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_own_memories ON public.mom_memories;

CREATE POLICY users_own_memories ON public.mom_memories
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS mom_memories_user_idx ON public.mom_memories (user_id, created_at DESC);
