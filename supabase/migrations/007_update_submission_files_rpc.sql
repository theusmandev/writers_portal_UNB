-- ============================================================
--  Writers Portal — Migration 007: RPC for Updating Files
--  File: supabase/migrations/007_update_submission_files_rpc.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
--    (Run AFTER 006_upload_failed_flags.sql has already been applied)
-- ============================================================

-- 4d. update_submission_files — updates file URLs/IDs/failed flags (bypasses RLS)
--     Called by: the public submission form when an upload finishes or fails
CREATE OR REPLACE FUNCTION update_submission_files(
  p_submission_code text,
  p_manuscript_url text DEFAULT NULL,
  p_manuscript_id text DEFAULT NULL,
  p_cover_url text DEFAULT NULL,
  p_cover_id text DEFAULT NULL,
  p_manuscript_upload_failed boolean DEFAULT NULL,
  p_cover_upload_failed boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We use COALESCE to keep the existing value if the parameter is NULL
  UPDATE submissions
  SET
    manuscript_drive_url = COALESCE(p_manuscript_url, manuscript_drive_url),
    manuscript_drive_file_id = COALESCE(p_manuscript_id, manuscript_drive_file_id),
    cover_drive_url = COALESCE(p_cover_url, cover_drive_url),
    cover_drive_file_id = COALESCE(p_cover_id, cover_drive_file_id),
    manuscript_upload_failed = COALESCE(p_manuscript_upload_failed, manuscript_upload_failed),
    cover_upload_failed = COALESCE(p_cover_upload_failed, cover_upload_failed)
  WHERE submission_code = upper(trim(p_submission_code));
END;
$$;

GRANT EXECUTE ON FUNCTION update_submission_files TO anon;
