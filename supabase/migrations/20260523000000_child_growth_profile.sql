-- 孩子成长档案：成就扩展、成长时刻、children 补充字段

-- child_achievements 扩展（表已存在于 baseline）
ALTER TABLE public.child_achievements
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '⭐';

-- 成长时刻（照片/故事）
CREATE TABLE IF NOT EXISTS public.growth_moments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  photo_url TEXT,
  moment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS growth_moments_child_idx ON public.growth_moments (child_id, moment_date DESC);

-- children 表补充字段
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS hobbies TEXT[],
  ADD COLUMN IF NOT EXISTS favorite_color TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS total_hanzi INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;

-- growth_moments RLS（与 child 作用域表一致）
ALTER TABLE public.growth_moments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS growth_moments_child_scope ON public.growth_moments;
CREATE POLICY growth_moments_child_scope ON public.growth_moments
  FOR ALL TO authenticated
  USING (
    COALESCE(user_id, (SELECT c.user_id FROM public.children c WHERE c.id = growth_moments.child_id)) = auth.uid()
  )
  WITH CHECK (
    COALESCE(user_id, (SELECT c.user_id FROM public.children c WHERE c.id = growth_moments.child_id)) = auth.uid()
  );
