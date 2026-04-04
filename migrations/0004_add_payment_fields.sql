ALTER TABLE users ADD COLUMN payment_provider TEXT DEFAULT 'stripe';
ALTER TABLE users ADD COLUMN razorpay_customer_id TEXT;
ALTER TABLE users ADD COLUMN payment_subscription_id TEXT;
