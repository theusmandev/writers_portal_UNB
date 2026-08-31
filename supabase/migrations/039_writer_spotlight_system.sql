-- ============================================================
--  Writers Portal — Migration 039: Writer Spotlight System
--  File: supabase/migrations/039_writer_spotlight_system.sql
-- ============================================================

-- 1. Create the writer_spotlights table
CREATE TABLE IF NOT EXISTS writer_spotlights (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_id         uuid        REFERENCES writers(id) ON DELETE CASCADE,
  spotlight_content text,
  spotlight_label   text,
  slug              text        UNIQUE NOT NULL,
  is_published      boolean     DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Enable RLS on the table
ALTER TABLE writer_spotlights ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can read published spotlights
CREATE POLICY "Public can view published writer spotlights"
ON writer_spotlights
FOR SELECT
TO public
USING (is_published = true);

-- Policy 2: Authenticated users (admins) have full access
CREATE POLICY "Admins have full access to writer spotlights"
ON writer_spotlights
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Function to list published spotlights
CREATE OR REPLACE FUNCTION get_spotlights_list()
RETURNS TABLE (
  id uuid,
  slug text,
  spotlight_label text,
  created_at timestamptz,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ws.id,
    ws.slug,
    ws.spotlight_label,
    ws.created_at,
    COALESCE(NULLIF(w.pen_name, ''), w.full_name) AS display_name
  FROM writer_spotlights ws
  JOIN writers w ON w.id = ws.writer_id
  WHERE ws.is_published = true
  ORDER BY ws.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_spotlights_list() TO anon, authenticated;

-- 3. Function to get a single published spotlight by slug
CREATE OR REPLACE FUNCTION get_spotlight_by_slug(p_slug text)
RETURNS TABLE (
  spotlight_content text,
  spotlight_label text,
  created_at timestamptz,
  display_name text,
  social_media_link text,
  published_novels json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ws.spotlight_content,
    ws.spotlight_label,
    ws.created_at,
    COALESCE(NULLIF(w.pen_name, ''), w.full_name) AS display_name,
    w.social_media_link,
    COALESCE(
      json_agg(
        json_build_object(
          'novel_title',             s.novel_title,
          'genre',                   s.genre,
          'published_url',           s.published_url,
          'resolved_published_url',  resolve_published_url(s.published_url, s.published_url_ufb),
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
  FROM writer_spotlights ws
  JOIN writers w ON w.id = ws.writer_id
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
  WHERE ws.slug = p_slug
    AND ws.is_published = true
  GROUP BY
    ws.id,
    ws.spotlight_content,
    ws.spotlight_label,
    ws.created_at,
    w.pen_name,
    w.full_name,
    w.social_media_link;
END;
$$;

GRANT EXECUTE ON FUNCTION get_spotlight_by_slug(text) TO anon, authenticated;
