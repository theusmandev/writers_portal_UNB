-- ============================================================
--  Writers Portal — Migration 022: Add is_featured + featured_slug
--  to get_public_writers()
--  File: supabase/migrations/022_get_public_writers_add_featured.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
--    (Run AFTER 021_featured_writer_system.sql has been applied)
--
--  SCOPE:
--    - Replaces get_public_writers() with a version that also returns
--      is_featured (boolean) and featured_slug (text) so the public
--      /writers directory can show a Featured badge and link.
--    - Does NOT expose dashboard_token or looker_studio_embed_url.
--    - Uses CREATE OR REPLACE — no DROP needed, no signature change
--      to any other function.
-- ============================================================

-- Because we are adding columns to the RETURNS TABLE, Postgres requires
-- DROP + re-CREATE (CREATE OR REPLACE cannot change the return type of
-- an existing function). We drop by exact signature to be safe.

DROP FUNCTION IF EXISTS get_public_writers();

CREATE OR REPLACE FUNCTION get_public_writers()
RETURNS TABLE (
  id                uuid,
  full_name         text,
  pen_name          text,
  bio               text,
  social_media_link text,
  published_novels  json,
  is_featured       boolean,
  featured_slug     text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.full_name,
    w.pen_name,
    w.bio,
    w.social_media_link,
    COALESCE(
      json_agg(
        json_build_object(
          'id',            s.id,
          'novel_title',   s.novel_title,
          'genre',         s.genre,
          'published_url', s.published_url
        )
        ORDER BY s.submission_date DESC
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::json
    ) AS published_novels,
    w.is_featured,
    w.featured_slug
    -- NOTE: dashboard_token and looker_studio_embed_url are deliberately
    -- NOT selected here. Only the two fields needed for the badge/link
    -- on the public directory page are added.
  FROM writers w
  LEFT JOIN submissions s
    ON s.writer_id = w.id
    AND s.current_status = 'Published'
  WHERE w.is_public = true
  GROUP BY
    w.id,
    w.full_name,
    w.pen_name,
    w.bio,
    w.social_media_link,
    w.is_featured,
    w.featured_slug
  ORDER BY w.full_name;
END;
$$;

-- Re-grant anon execute (required after DROP + re-CREATE)
GRANT EXECUTE ON FUNCTION get_public_writers() TO anon;
GRANT EXECUTE ON FUNCTION get_public_writers() TO authenticated;
