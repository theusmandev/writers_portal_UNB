-- ============================================================
--  Writers Portal — Migration 003: Writer Submissions by Email
--  File: supabase/migrations/003_writer_submissions.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
--    (Run AFTER 002_status_responses.sql has already been applied)
-- ============================================================

CREATE OR REPLACE FUNCTION get_submissions_by_email(p_email text)
RETURNS TABLE (
  submission_code text,
  novel_title     text,
  genre           text,
  novel_status    text,
  current_status  text,
  submission_date timestamptz,
  last_updated    timestamptz,
  published_url   text
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
    s.published_url
  FROM submissions s
  JOIN writers w ON w.id = s.writer_id
  WHERE lower(w.email) = lower(trim(p_email))
  ORDER BY s.submission_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_submissions_by_email TO anon;
