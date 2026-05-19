-- Google OAuth tokens（Gmail / Calendar），服务端用 service role 读写；用户 JWT 仅用于档案页查看是否已连接
CREATE TABLE IF NOT EXISTS public.user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('gmail', 'calendar')),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, service)
);

CREATE INDEX IF NOT EXISTS user_google_tokens_user_id_idx ON public.user_google_tokens (user_id);

ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own tokens" ON public.user_google_tokens;

CREATE POLICY "Users can only access their own tokens"
  ON public.user_google_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_google_tokens IS 'Google OAuth tokens for Gmail send / Calendar; written by service role on OAuth callback.';
