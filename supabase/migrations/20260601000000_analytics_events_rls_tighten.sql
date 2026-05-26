-- P0 收紧：原来的 users_own_events 允许 anon 任意写入（WITH CHECK true），
-- 任何带 anon key 的请求都能伪造任意 user_id 写事件。
-- 收紧为：登录用户只能写自己的事件；service_role 仍可任意写（服务端遥测）。

DROP POLICY IF EXISTS "users_own_events" ON public.analytics_events;
DROP POLICY IF EXISTS "service_role_insert" ON public.analytics_events;

CREATE POLICY "users_own_events" ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "service_role_insert" ON public.analytics_events
  FOR INSERT TO service_role
  WITH CHECK (true);
