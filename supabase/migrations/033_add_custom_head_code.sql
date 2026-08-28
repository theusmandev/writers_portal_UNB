-- Migration: Add custom_head_code to site_settings

ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS custom_head_code text;
