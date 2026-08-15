-- Create a new SECURITY DEFINER function to securely add new episodes to an existing ongoing submission.
CREATE OR REPLACE FUNCTION add_episode_to_submission(
  p_submission_code text,
  p_email text,
  p_drive_url text,
  p_drive_file_id text,
  p_file_name text,
  p_upload_failed boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission_id uuid;
  v_novel_status text;
  v_current_status text;
  v_next_episode_number integer;
BEGIN
  -- 1. Verify submission code and email match (same pattern as get_submission_by_code)
  SELECT s.id, s.novel_status, s.current_status 
  INTO v_submission_id, v_novel_status, v_current_status
  FROM submissions s
  JOIN writers w ON s.writer_id = w.id
  WHERE s.submission_code = p_submission_code
    AND lower(trim(w.email)) = lower(trim(p_email));

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'Invalid submission code or email.';
  END IF;

  -- 2. Enforce business rules for adding episodes
  IF v_novel_status IS DISTINCT FROM 'Ongoing' THEN
    RAISE EXCEPTION 'Cannot add episodes: this novel is not marked as Ongoing.';
  END IF;

  IF v_current_status IN ('Published', 'Rejected') THEN
    RAISE EXCEPTION 'This novel''s status doesn''t allow adding new episodes right now — please contact us if you need to.';
  END IF;

  -- 3. Calculate next available episode number
  SELECT COALESCE(MAX(episode_number), 0) + 1 INTO v_next_episode_number
  FROM episodes
  WHERE submission_id = v_submission_id;

  -- 4. Insert new episode record
  INSERT INTO episodes (
    submission_id,
    episode_number,
    drive_url,
    drive_file_id,
    file_name,
    upload_failed
  )
  VALUES (
    v_submission_id,
    v_next_episode_number,
    p_drive_url,
    p_drive_file_id,
    p_file_name,
    p_upload_failed
  );

  -- 5. Update submission metadata
  UPDATE submissions
  SET episode_count = COALESCE(episode_count, 0) + 1,
      last_updated = now()
  WHERE id = v_submission_id;

END;
$$;

-- Grant access to anonymous users (since the verification handles security)
GRANT EXECUTE ON FUNCTION add_episode_to_submission TO anon;
