ALTER TABLE users ADD COLUMN dodo_customer_id TEXT;
ALTER TABLE users ADD COLUMN credits_balance INTEGER NOT NULL DEFAULT 0;

UPDATE users
SET payment_provider = 'dodo'
WHERE payment_provider = 'razorpay';

CREATE INDEX IF NOT EXISTS idx_users_dodo_customer_id
ON users(dodo_customer_id);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  kind TEXT NOT NULL,
  reference_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  value INTEGER NOT NULL,
  unit TEXT NOT NULL,
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id
ON credit_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at
ON credit_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_id
ON usage_events(user_id);

CREATE INDEX IF NOT EXISTS idx_usage_events_category_period_start
ON usage_events(category, period_start);
