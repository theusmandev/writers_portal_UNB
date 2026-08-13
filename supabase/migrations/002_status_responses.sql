-- ============================================================
--  Writers Portal — Migration 002: Status Responses
--  File: supabase/migrations/002_status_responses.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
--    (Run AFTER 001_init.sql has already been applied)
-- ============================================================

-- ── 1. Add status_note column to submissions ─────────────────────────────────
-- Admin-written explanation shown publicly on the tracking page
-- for "Rejected" and "Action Required" statuses.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS status_note text;
COMMENT ON COLUMN submissions.status_note IS
  'Admin-written note visible to the writer on the tracking page (Rejected / Action Required)';

-- ── 2. Create submission_responses table ──────────────────────────────────────
-- Writer-submitted text responses for Action Required requests.
-- File attachments are intentionally excluded — Drive integration is later.
CREATE TABLE IF NOT EXISTS submission_responses (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid        NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  response_text text        NOT NULL,
  submitted_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_responses_submission_id
  ON submission_responses (submission_id);

-- ── 3. RLS on submission_responses ───────────────────────────────────────────
ALTER TABLE submission_responses ENABLE ROW LEVEL SECURITY;

-- PLAIN LANGUAGE:
--   Anon: no direct access at all. Inserts go through submit_response()
--   function below which validates code + email + status = 'Action Required'.
--   Admin: full access to read all writer responses.
CREATE POLICY "responses_admin_all"
  ON submission_responses FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── 4. submit_response — secure anon INSERT (SECURITY DEFINER) ───────────────
-- Enforces:
--   1. Non-empty response text
--   2. submission_code + email pair must match (same as tracking lookup)
--   3. current_status must be 'Action Required' (prevents stale submits)
--   4. One response per submission (prevents duplicate submissions)
CREATE OR REPLACE FUNCTION submit_response(
  p_submission_code text,
  p_email           text,
  p_response_text   text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission_id uuid;
  v_status        text;
BEGIN
  -- Validate non-empty input
  IF trim(p_response_text) = '' OR p_response_text IS NULL THEN
    RAISE EXCEPTION 'Response text cannot be empty.';
  END IF;

  -- Verify submission_code + email pair (same security pattern as tracking)
  SELECT s.id, s.current_status
  INTO   v_submission_id, v_status
  FROM   submissions s
  JOIN   writers w ON w.id = s.writer_id
  WHERE  s.submission_code = upper(trim(p_submission_code))
    AND  lower(w.email)    = lower(trim(p_email));

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'Submission not found or email does not match.';
  END IF;

  -- Only accept responses when action is actually required
  IF v_status <> 'Action Required' THEN
    RAISE EXCEPTION 'Responses can only be submitted when status is "Action Required".';
  END IF;

  -- Prevent duplicate responses (one per submission)
  IF EXISTS (
    SELECT 1 FROM submission_responses
    WHERE  submission_id = v_submission_id
  ) THEN
    RAISE EXCEPTION 'A response has already been submitted for this submission.';
  END IF;

  INSERT INTO submission_responses (submission_id, response_text)
  VALUES (v_submission_id, trim(p_response_text));

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION submit_response TO anon;

-- ── 5. Update get_submission_by_code (additive — CREATE OR REPLACE) ───────────
-- Adds status_note and has_response to the return set.
-- Replaces the function from 001_init.sql; running both migrations in order
-- produces the correct final state.
CREATE OR REPLACE FUNCTION get_submission_by_code(p_code text, p_email text)
RETURNS TABLE (
  id              uuid,
  submission_code text,
  novel_title     text,
  genre           text,
  novel_status    text,
  description     text,
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
