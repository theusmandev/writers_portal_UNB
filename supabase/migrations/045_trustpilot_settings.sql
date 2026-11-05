-- Migration 045: Add Trustpilot review settings to site_settings

ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS trustpilot_url text DEFAULT 'https://www.trustpilot.com/review/urdunovelbanks.com',
ADD COLUMN IF NOT EXISTS show_trustpilot boolean DEFAULT true;

-- Ensure default values are populated for existing single row (id = 1)
UPDATE site_settings
SET
  trustpilot_url = COALESCE(trustpilot_url, 'https://www.trustpilot.com/review/urdunovelbanks.com'),
  show_trustpilot = COALESCE(show_trustpilot, true)
WHERE id = 1;

