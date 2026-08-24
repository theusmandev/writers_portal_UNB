-- ============================================================
--  Writers Portal — Migration 032: New Badge Database
--  File: supabase/migrations/032_new_badge_database.sql
--
--  SCOPE:
--    - Adds 'published_at' column to 'episodes' table.
--    - Updates auto_publish_due_episodes() to set published_at = now()
--    - Updates get_featured_writer_public() and get_public_writers() to 
--      include 'novel_published_at' in the published_novels JSON array.
-- ============================================================

-- 1. Add published_at to episodes
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- 2. Update auto_publish_due_episodes() (from migration 028)
CREATE OR REPLACE FUNCTION auto_publish_due_episodes()
RETURNS TABLE (
  submission_code text,
  novel_title     text,
  published_url   text,
  writer_email    text,
  writer_name     text,
  episode_numbers text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH eligible AS (
    SELECT s.id FROM submissions s
    WHERE s.novel_status = 'Ongoing' 
      AND s.estimated_publish_at IS NOT NULL 
      AND s.estimated_publish_at <= now()
      AND EXISTS (
        SELECT 1 FROM episodes e 
        WHERE e.submission_id = s.id 
          AND e.published = false 
          AND e.upload_failed = false 
          AND e.drive_url IS NOT NULL
      )
  ),
  updated_episodes AS (
    UPDATE episodes e
    SET published = true, published_at = now()
    FROM eligible el
    WHERE e.submission_id = el.id 
      AND e.published = false 
      AND e.upload_failed = false 
      AND e.drive_url IS NOT NULL
    RETURNING e.submission_id, e.episode_number
  ),
  cleared_timers AS (
    UPDATE submissions s
    SET estimated_publish_at = NULL
    FROM eligible el
    WHERE s.id = el.id
    RETURNING s.id
  )
  SELECT 
    s.submission_code, 
    s.novel_title, 
    s.published_url, 
    w.email AS writer_email,
    COALESCE(NULLIF(w.pen_name, ''), w.full_name) AS writer_name,
    string_agg(ue.episode_number::text, ', ' ORDER BY ue.episode_number) AS episode_numbers
  FROM updated_episodes ue
  JOIN submissions s ON s.id = ue.submission_id
  JOIN writers w ON w.id = s.writer_id
  GROUP BY s.submission_code, s.novel_title, s.published_url, w.email, w.pen_name, w.full_name;
END;
$$;


-- 3. Update get_featured_writer_public()
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
          'published_episode_count', (SELECT COUNT(*) FROM episodes e WHERE e.submission_id = s.id AND e.published = true),
          'novel_published_at',      CASE 
                                       WHEN s.novel_status = 'Complete' THEN (SELECT MAX(changed_at) FROM status_history sh WHERE sh.submission_id = s.id AND sh.new_status = 'Published')
                                       ELSE (SELECT MAX(e.published_at) FROM episodes e WHERE e.submission_id = s.id AND e.published = true)
                                     END
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


-- 4. Update get_public_writers()
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
