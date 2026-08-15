--  Writers Portal — Migration 012: Get Submission Episodes
--  File: supabase/migrations/012_get_submission_episodes.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- 1. Drop existing function so we can change the return type
DROP FUNCTION IF EXISTS get_submission_by_code(text, text);

-- 2. Recreate get_submission_by_code with episode_count and episodes array
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
  episodes        json
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
            'upload_failed', e.upload_failed
          ) ORDER BY e.episode_number ASC
        )
        FROM episodes e
        WHERE e.submission_id = s.id
      ),
      '[]'::json
    ) AS episodes
  FROM submissions s
  JOIN writers w ON w.id = s.writer_id
  WHERE s.submission_code = upper(trim(p_code))
    AND lower(w.email)    = lower(trim(p_email));
END;
$$;

GRANT EXECUTE ON FUNCTION get_submission_by_code TO anon;
