-- Migration 043: Add dynamic contact information and floating widget toggle to site_settings

ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS support_email text DEFAULT 'urdunovelbankofficial@gmail.com',
ADD COLUMN IF NOT EXISTS main_website_url text DEFAULT 'https://www.urdunovelbanks.com',
ADD COLUMN IF NOT EXISTS instagram_handle text DEFAULT '@urdunovelbank',
ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT 'https://www.instagram.com/urdunovelbank',
ADD COLUMN IF NOT EXISTS show_floating_widget boolean DEFAULT true;

-- Ensure default values are populated for the existing single row (id = 1)
UPDATE site_settings
SET
  support_email = COALESCE(support_email, 'urdunovelbankofficial@gmail.com'),
  main_website_url = COALESCE(main_website_url, 'https://www.urdunovelbanks.com'),
  instagram_handle = COALESCE(instagram_handle, '@urdunovelbank'),
  instagram_url = COALESCE(instagram_url, 'https://www.instagram.com/urdunovelbank'),
  show_floating_widget = COALESCE(show_floating_widget, true)
WHERE id = 1;
