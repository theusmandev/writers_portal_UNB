-- ============================================================
--  Writers Portal — Migration 024: Estimated Publish Date
--  File: supabase/migrations/024_estimated_publish_date.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- 1. Add the estimated_publish_at column
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS estimated_publish_at timestamptz;

-- 2. Drop existing tracking RPCs before replacing to allow return type changes
DROP FUNCTION IF EXISTS get_submission_by_code(text, text);
DROP FUNCTION IF EXISTS get_submissions_by_email(text);

-- 3. Recreate get_submission_by_code
CREATE OR REPLACE FUNCTION get_submission_by_code(p_code text, p_email text)
RETURNS TABLE (
  id              uuid,
  submission_code text,
  novel_title     text,
  genre           text,
  novel_status    text,
  description     text,
  manuscript_drive_url text,
  cover_drive_url text,
  manuscript_upload_failed boolean,
  cover_upload_failed boolean,
  submission_date timestamptz,
  current_status  text,
  current_stage   text,
  last_updated    timestamptz,
  admin_notes     text,
  status_note     text,
  published_url   text,
  pen_name        text,
  full_name       text,
  has_response    boolean,
  episode_count   integer,
  episodes        json,
  estimated_publish_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.submission_code,
    s.novel_title,
    s.genre,
    s.novel_status,
    s.description,
    s.manuscript_drive_url,
    s.cover_drive_url,
    s.manuscript_upload_failed,
    s.cover_upload_failed,
    s.submission_date,
    s.current_status,
    s.current_stage,
    s.last_updated,
    s.admin_notes,
    s.status_note,
    s.published_url,
    w.pen_name,
    w.full_name,
    s.has_response,
    s.episode_count,
    s.episodes,
    s.estimated_publish_at
  FROM submissions s
  JOIN writers w ON w.id = s.writer_id
  WHERE s.submission_code = p_code
    AND lower(w.email) = lower(trim(p_email))
  LIMIT 1;
END;
$$;

-- 4. Recreate get_submissions_by_email
CREATE OR REPLACE FUNCTION get_submissions_by_email(p_email text)
RETURNS TABLE (
  submission_code text,
  novel_title     text,
  genre           text,
  novel_status    text,
  current_status  text,
  submission_date timestamptz,
  last_updated    timestamptz,
  published_url   text,
  full_name       text,
  estimated_publish_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.submission_code,
    s.novel_title,
    s.genre,
    s.novel_status,
    s.current_status,
    s.submission_date,
    s.last_updated,
    s.published_url,
    w.full_name,
    s.estimated_publish_at
  FROM submissions s
  JOIN writers w ON w.id = s.writer_id
  WHERE lower(w.email) = lower(trim(p_email))
  ORDER BY s.submission_date DESC;
END;
$$;

-- 5. Re-grant permissions
GRANT EXECUTE ON FUNCTION get_submission_by_code TO anon;
GRANT EXECUTE ON FUNCTION get_submissions_by_email TO anon;
