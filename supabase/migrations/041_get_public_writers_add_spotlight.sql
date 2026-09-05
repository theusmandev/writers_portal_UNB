-- ============================================================
--  Writers Portal — Migration 041: Add Spotlight to get_public_writers
--  File: supabase/migrations/041_get_public_writers_add_spotlight.sql
-- ============================================================

-- Drop function because the return signature is changing (adding top-level columns)
DROP FUNCTION IF EXISTS get_public_writers();

CREATE OR REPLACE FUNCTION get_public_writers()
RETURNS TABLE (
  id                    uuid,
  full_name             text,
  pen_name              text,
  bio                   text,
  social_media_link     text,
  published_novels      json,
  is_featured           boolean,
  featured_slug         text,
  has_spotlight         boolean,
  latest_spotlight_slug text
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
          'id',                      s.id,
          'novel_title',             s.novel_title,
          'genre',                   s.genre,
          'published_url',           s.published_url,
          'resolved_published_url',  resolve_published_url(s.published_url, s.published_url_ufb),
          'novel_status',            s.novel_status,
          'published_episode_count', (SELECT COUNT(*) FROM episodes e WHERE e.submission_id = s.id AND e.published = true),
          'novel_published_at',      CASE 
                                       WHEN s.novel_status = 'Complete' THEN (SELECT MAX(changed_at) FROM status_history sh WHERE sh.submission_id = s.id AND sh.new_status = 'Published')
                                       ELSE (SELECT MAX(e.published_at) FROM episodes e WHERE e.submission_id = s.id AND e.published = true)
                                     END
        )
        ORDER BY s.submission_date DESC
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::json
    ) AS published_novels,
    w.is_featured,
    w.featured_slug,
    EXISTS (
      SELECT 1 FROM writer_spotlights ws 
      WHERE ws.writer_id = w.id AND ws.is_published = true
    ) AS has_spotlight,
    (
      SELECT ws.slug FROM writer_spotlights ws 
      WHERE ws.writer_id = w.id AND ws.is_published = true 
      ORDER BY ws.created_at DESC 
      LIMIT 1
    ) AS latest_spotlight_slug
  FROM writers w
  LEFT JOIN submissions s
    ON s.writer_id = w.id
    AND (
      (s.current_status = 'Published')
      OR
      (s.novel_status = 'Ongoing' AND EXISTS (
        SELECT 1 FROM episodes e 
        WHERE e.submission_id = s.id AND e.published = true
      ))
    )
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

GRANT EXECUTE ON FUNCTION get_public_writers() TO anon;
GRANT EXECUTE ON FUNCTION get_public_writers() TO authenticated;
