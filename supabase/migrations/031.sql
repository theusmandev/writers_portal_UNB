-- ============================================================
--  Writers Portal — Migration 031: Ongoing Novel Badges
--  File: supabase/migrations/031_ongoing_novel_badges.sql
--
--  SCOPE:
--    - Modifies get_featured_writer_public() and get_public_writers()
--    - Adds 'novel_status' and 'published_episode_count' keys to the
--      published_novels JSON array for frontend badge rendering.
--    - Preserves existing JOIN logic from migration 030.
--    - Does NOT change the RETURNS TABLE signature for either function.
-- ============================================================

-- 1. Update get_featured_writer_public()
CREATE OR REPLACE FUNCTION get_featured_writer_public(p_slug text)
RETURNS TABLE (
  full_name              text,
  pen_name               text,
  featured_bio           text,
  featured_slug          text,
  social_media_link      text,
  published_novels       json
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
          'novel_title',             s.novel_title,
          'genre',                   s.genre,
          'published_url',           s.published_url,
          'public_cover_image_url',  s.public_cover_image_url,
          'novel_status',            s.novel_status,
          'published_episode_count', (SELECT COUNT(*) FROM episodes e WHERE e.submission_id = s.id AND e.published = true)
        )
        ORDER BY s.submission_date DESC
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::json
    ) AS published_novels
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
  WHERE w.featured_slug = p_slug
    AND w.is_featured = true
  GROUP BY
    w.full_name,
    w.pen_name,
    w.featured_bio,
    w.featured_slug,
    w.social_media_link;
END;
$$;

-- 2. Update get_public_writers()
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
          'id',                      s.id,
          'novel_title',             s.novel_title,
          'genre',                   s.genre,
          'published_url',           s.published_url,
          'novel_status',            s.novel_status,
          'published_episode_count', (SELECT COUNT(*) FROM episodes e WHERE e.submission_id = s.id AND e.published = true)
        )
        ORDER BY s.submission_date DESC
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::json
    ) AS published_novels,
    w.is_featured,
    w.featured_slug
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
