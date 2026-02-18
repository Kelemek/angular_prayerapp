-- Device Tokens Table for Push Notifications
-- This table stores device tokens from native apps (iOS/Android)
-- so that push notifications can be sent to specific devices

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  token VARCHAR(1000) NOT NULL UNIQUE,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_email) REFERENCES email_subscribers(email) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX idx_device_tokens_user_email ON device_tokens(user_email);
CREATE INDEX idx_device_tokens_platform ON device_tokens(platform);
CREATE INDEX idx_device_tokens_last_seen ON device_tokens(last_seen_at);

-- Comments for documentation
COMMENT ON TABLE device_tokens IS 'Stores device tokens for push notification delivery to native apps (iOS/Android)';
COMMENT ON COLUMN device_tokens.token IS 'Unique device token from Firebase (Android) or APNs (iOS)';
COMMENT ON COLUMN device_tokens.platform IS 'Platform of the device: ios, android, or web';
COMMENT ON COLUMN device_tokens.last_seen_at IS 'Last time this device checked in or received a notification';

-- Optional: Push Notification Log Table
-- Useful for tracking which notifications were sent and delivery status
CREATE TABLE IF NOT EXISTS push_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token_id UUID NOT NULL REFERENCES device_tokens(id) ON DELETE CASCADE,
  title VARCHAR(255),
  body TEXT,
  data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  delivery_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  user_email VARCHAR(255) NOT NULL
);

-- Indexes for notification log
CREATE INDEX idx_push_log_device_token ON push_notification_log(device_token_id);
CREATE INDEX idx_push_log_sent_at ON push_notification_log(sent_at);
CREATE INDEX idx_push_log_user_email ON push_notification_log(user_email);
CREATE INDEX idx_push_log_status ON push_notification_log(delivery_status);

COMMENT ON TABLE push_notification_log IS 'Log of push notifications sent via Firebase/APNs for monitoring and debugging';
COMMENT ON COLUMN push_notification_log.delivery_status IS 'Status of notification delivery: pending, sent, or failed';

-- Enable RLS (Row Level Security) if your app uses it
-- ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE push_notification_log ENABLE ROW LEVEL SECURITY;

-- Optional: Create policies for authenticated users to view their own tokens
-- CREATE POLICY "Users can view their own device tokens" ON device_tokens
--   FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- CREATE POLICY "Users can delete their own device tokens" ON device_tokens
--   FOR DELETE USING (auth.jwt() ->> 'email' = user_email);
