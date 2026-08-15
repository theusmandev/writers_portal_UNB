--  Writers Portal — Migration 013: Initialize Episodes on Submit
--  File: supabase/migrations/013_initialize_episodes_on_submit.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- Drop existing submit_novel function
DROP FUNCTION IF EXISTS submit_novel(text, text, text, text, text, text, text, text, text, text, text, text, text, text, integer);

-- Alter episodes table to drop the default false and allow tri-state (NULL, true, false)
ALTER TABLE episodes ALTER COLUMN upload_failed DROP DEFAULT;
ALTER TABLE episodes ALTER COLUMN upload_failed DROP NOT NULL;

-- Recreate submit_novel with episode initialization
CREATE OR REPLACE FUNCTION submit_novel(
  p_full_name              text,
  p_pen_name               text,
  p_email                  text,
  p_whatsapp               text,
  p_bio                    text       DEFAULT NULL,
  p_social_media_link      text       DEFAULT NULL,
  p_novel_title            text       DEFAULT '',
  p_genre                  text       DEFAULT NULL,
  p_novel_status           text       DEFAULT NULL,
  p_description            text       DEFAULT NULL,
  p_manuscript_drive_url   text       DEFAULT NULL,
  p_manuscript_drive_file_id text     DEFAULT NULL,
  p_cover_drive_url        text       DEFAULT NULL,
  p_cover_drive_file_id    text       DEFAULT NULL,
  p_episode_count          integer    DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_writer_id      uuid;
  v_year           text;
  v_count          bigint;
  v_code           text;
  v_submission_date timestamptz;
  v_submission_id  uuid;
  i                integer;
BEGIN
  -- Validate required fields
  IF trim(p_email) = '' OR p_email IS NULL THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  IF trim(p_novel_title) = '' OR p_novel_title IS NULL THEN
    RAISE EXCEPTION 'Novel title is required';
  END IF;

  -- Upsert writer
  INSERT INTO writers (full_name, pen_name, email, whatsapp, bio, social_media_link)
  VALUES (p_full_name, p_pen_name, p_email, p_whatsapp, p_bio, p_social_media_link)
  ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        pen_name  = EXCLUDED.pen_name,
        whatsapp  = EXCLUDED.whatsapp,
        bio       = EXCLUDED.bio,
        social_media_link = EXCLUDED.social_media_link
  RETURNING id INTO v_writer_id;

  -- Check for duplicate title
  IF EXISTS (
    SELECT 1 FROM submissions
    WHERE writer_id = v_writer_id
      AND lower(trim(novel_title)) = lower(trim(p_novel_title))
  ) THEN
    RAISE EXCEPTION 'You have already submitted a novel with this title.';
  END IF;

  -- Generate code
  v_year := date_part('year', now())::text;
  SELECT COUNT(*) INTO v_count
  FROM submissions
  WHERE submission_code LIKE 'UNB-' || v_year || '-%';
  v_code := 'UNB-' || v_year || '-' || lpad((v_count + 1)::text, 4, '0');

  v_submission_date := now();

  -- Insert submission
  INSERT INTO submissions (
    submission_code, writer_id, novel_title, genre, novel_status,
    description, current_status, current_stage, submission_date,
    manuscript_drive_url, manuscript_drive_file_id,
    cover_drive_url, cover_drive_file_id, episode_count
  )
  VALUES (
    v_code, v_writer_id, p_novel_title, p_genre, p_novel_status,
    p_description, 'Received', 'Submission Confirmation', v_submission_date,
    p_manuscript_drive_url, p_manuscript_drive_file_id,
    p_cover_drive_url, p_cover_drive_file_id, p_episode_count
  )
  RETURNING id INTO v_submission_id;

  -- Initialize episode rows
  IF p_novel_status = 'Ongoing' AND p_episode_count IS NOT NULL AND p_episode_count > 0 THEN
    FOR i IN 1..p_episode_count LOOP
      INSERT INTO episodes (submission_id, episode_number, upload_failed)
      VALUES (v_submission_id, i, NULL);
    END LOOP;
  END IF;

  RETURN json_build_object(
    'submission_code',  v_code,
    'submission_date',  v_submission_date,
    'current_status',   'Received',
    'current_stage',    'Submission Confirmation'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_novel TO anon;
