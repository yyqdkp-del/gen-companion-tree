-- Paddle 接入：在 Stripe 字段之外追加 Paddle 订阅/客户 ID 列
-- 之所以与 Stripe 列共存，是为了允许过渡期内两侧 webhook 同时落库；
-- 之后确认 Stripe 不再使用时，可单独写迁移移除其字段。

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_paddle_subscription_id_key
  ON public.subscriptions (paddle_subscription_id)
  WHERE paddle_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscriptions_paddle_customer_id_idx
  ON public.subscriptions (paddle_customer_id)
  WHERE paddle_customer_id IS NOT NULL;
