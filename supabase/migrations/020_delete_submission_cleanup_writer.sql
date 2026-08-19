-- ============================================================
--  Writers Portal — Migration 020
--  Feature: Auto-Cleanup Orphaned Writers After Submission Deletion
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- Creates an atomic function to delete a submission and clean up its writer if no other submissions remain.
CREATE OR REPLACE FUNCTION delete_submission_and_cleanup_writer(p_submission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_writer_id uuid;
  v_remaining int;
BEGIN
  -- 1. Get the writer_id for this submission
  SELECT writer_id INTO v_writer_id
  FROM submissions
  WHERE id = p_submission_id;

  IF v_writer_id IS NULL THEN
    RETURN; -- Submission does not exist
  END IF;

  -- 2. Delete the submission
  DELETE FROM submissions
  WHERE id = p_submission_id;

  -- 3. Check if the writer has any remaining submissions
  SELECT COUNT(*) INTO v_remaining
  FROM submissions
  WHERE writer_id = v_writer_id;

  -- 4. If count is 0, delete the orphaned writer
  IF v_remaining = 0 THEN
    DELETE FROM writers
    WHERE id = v_writer_id;
  END IF;
END;
$$;

-- Grant execute access to authenticated users (admins)
GRANT EXECUTE ON FUNCTION delete_submission_and_cleanup_writer TO authenticated;
