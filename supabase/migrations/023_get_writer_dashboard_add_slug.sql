-- ============================================================
--  Writers Portal — Migration 023: Add featured_slug to dashboard RPC
--  File: supabase/migrations/023_get_writer_dashboard_add_slug.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
--    (Run AFTER 022_get_public_writers_add_featured.sql has been applied)
--
--  SCOPE:
--    - Replaces get_writer_dashboard_by_token() to also return
--      featured_slug so the private stats dashboard can link back to
--      the writer's public featured profile.
--    - Uses DROP + CREATE OR REPLACE because we are modifying the
--      RETURNS TABLE signature.
-- ============================================================

DROP FUNCTION IF EXISTS get_writer_dashboard_by_token(text);

CREATE OR REPLACE FUNCTION get_writer_dashboard_by_token(p_token text)
RETURNS TABLE (
  full_name                text,
  pen_name                 text,
  looker_studio_embed_url  text,
  featured_slug            text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.full_name,
    w.pen_name,
    w.looker_studio_embed_url,
    w.featured_slug
  FROM writers w
  WHERE w.dashboard_token = p_token
    AND w.is_featured = true
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_writer_dashboard_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_writer_dashboard_by_token(text) TO authenticated;
