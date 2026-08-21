-- ============================================================
--  Writers Portal — Migration 025: Estimated Publish Date (Hotfix)
--  File: supabase/migrations/025_hotfix_estimated_publish_date.sql
--
--  HOTFIX NOTICE: This migration correctly applies the estimated_publish_at
--  column to the tracking RPCs, fixing a regression introduced in 024 where
--  the get_submission_by_code function lost its computed fields (has_response
--  and episodes).
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- 1. Drop existing tracking RPCs before replacing to allow return type changes
DROP FUNCTION IF EXISTS get_submission_by_code(text, text);
DROP FUNCTION IF EXISTS get_submissions_by_email(text);

-- 2. Recreate get_submission_by_code with estimated_publish_at safely added
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
    EXISTS (
      SELECT 1 FROM submission_responses r
      WHERE  r.submission_id = s.id
    ) AS has_response,
    s.episode_count,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'episode_number', e.episode_number,
            'drive_url', e.drive_url,
            'upload_failed', e.upload_failed,
            'published', e.published
          ) ORDER BY e.episode_number ASC
        )
        FROM episodes e
        WHERE e.submission_id = s.id
      ),
      '[]'::json
    ) AS episodes,
    s.estimated_publish_at
  FROM submissions s
  JOIN writers w ON w.id = s.writer_id
  WHERE s.submission_code = upper(trim(p_code))
    AND lower(w.email)    = lower(trim(p_email));
END;
$$;

-- 3. Recreate get_submissions_by_email with estimated_publish_at safely added
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

-- 4. Re-grant permissions
GRANT EXECUTE ON FUNCTION get_submission_by_code TO anon;
GRANT EXECUTE ON FUNCTION get_submissions_by_email TO anon;
