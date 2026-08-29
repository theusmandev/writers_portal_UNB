-- 1. Add published_url_ufb to submissions (matches existing published_url as text)
ALTER TABLE submissions
ADD COLUMN published_url_ufb text;

-- 2. Add preferred_publish_site to site_settings with default and check constraint
ALTER TABLE site_settings
ADD COLUMN preferred_publish_site text DEFAULT 'unb',
ADD CONSTRAINT site_settings_preferred_publish_site_check CHECK (preferred_publish_site IN ('unb', 'ufb'));

-- 3. Create the standalone helper function to resolve the URL based on preference
CREATE OR REPLACE FUNCTION resolve_published_url(p_unb_url text, p_ufb_url text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_preferred text;
BEGIN
  SELECT preferred_publish_site INTO v_preferred FROM site_settings WHERE id = 1;
  IF v_preferred = 'ufb' THEN
    RETURN COALESCE(NULLIF(p_ufb_url, ''), NULLIF(p_unb_url, ''));
  ELSE
    RETURN COALESCE(NULLIF(p_unb_url, ''), NULLIF(p_ufb_url, ''));
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_published_url(text, text) TO anon;
GRANT EXECUTE ON FUNCTION resolve_published_url(text, text) TO authenticated;
