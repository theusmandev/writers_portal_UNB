--  Writers Portal — Migration 006: Upload Failed Flags
--  File: supabase/migrations/006_upload_failed_flags.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
--    (Run AFTER 005_tracking_urls.sql has already been applied)
-- ============================================================

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS manuscript_upload_failed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cover_upload_failed boolean DEFAULT false;

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
  has_response    boolean
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
    ) AS has_response
  FROM submissions s
  JOIN writers w ON w.id = s.writer_id
  WHERE s.submission_code = upper(trim(p_code))
    AND lower(w.email)    = lower(trim(p_email));
END;
$$;
