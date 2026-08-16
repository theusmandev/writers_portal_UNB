-- Add site-wide notification bar columns to site_settings table
ALTER TABLE site_settings
ADD COLUMN notification_enabled BOOLEAN DEFAULT false,
ADD COLUMN notification_message TEXT,
ADD COLUMN notification_link_url TEXT,
ADD COLUMN notification_link_text TEXT,
ADD COLUMN notification_version INTEGER DEFAULT 1;
