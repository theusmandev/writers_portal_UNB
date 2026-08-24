-- ============================================================
--  Writers Portal — Migration 029: Add Public Cover Image URL
--  File: supabase/migrations/029_add_public_cover_image_url.sql
--
--  SCOPE:
--    - Adds `public_cover_image_url` to `submissions` table
--    - Updates `get_featured_writer_public` to include the cover in the JSON output
-- ============================================================

-- ── 1. ADD COLUMN TO submissions ──────────────────────────────────────────────
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS public_cover_image_url text;

COMMENT ON COLUMN submissions.public_cover_image_url IS
  'Admin-managed public URL for the novel cover image, used for hotlinking on featured pages (distinct from writer-uploaded cover_drive_url).';

-- ── 2. UPDATE FUNCTION: get_featured_writer_public ────────────────────────────
--
--  Adds public_cover_image_url to the published_novels JSON object.
--  No signature change, so CREATE OR REPLACE works directly without DROP.
CREATE OR REPLACE FUNCTION get_featured_writer_public(p_slug text)
RETURNS TABLE (
  full_name         text,
  pen_name          text,
  featured_bio      text,
  featured_slug     text,
  social_media_link text,
  published_novels  json
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
    w.featured_bio,
    w.featured_slug,
    w.social_media_link,
    COALESCE(
      json_agg(
        json_build_object(
          'novel_title',            s.novel_title,
          'genre',                  s.genre,
          'published_url',          s.published_url,
          'public_cover_image_url', s.public_cover_image_url
        )
        ORDER BY s.submission_date DESC
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::json
    ) AS published_novels
  FROM writers w
  LEFT JOIN submissions s
    ON s.writer_id = w.id
    AND s.current_status = 'Published'
  WHERE w.featured_slug = p_slug
    AND w.is_featured = true
  GROUP BY
    w.full_name,
    w.pen_name,
    w.featured_bio,
    w.featured_slug,
    w.social_media_link;
  -- NOTE: dashboard_token and looker_studio_embed_url are intentionally
  -- not selected anywhere in the query above and are not part of the return type.
END;
$$;

GRANT EXECUTE ON FUNCTION get_featured_writer_public(text) TO anon;
GRANT EXECUTE ON FUNCTION get_featured_writer_public(text) TO authenticated;
