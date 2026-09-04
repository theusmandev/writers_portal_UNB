--  Writers Portal — Migration 040: Add Location and Language fields
--  File: supabase/migrations/040_add_location_language.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- 1. Add location to writers table
ALTER TABLE writers ADD COLUMN IF NOT EXISTS location text;

-- 2. Add language to submissions table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS language text DEFAULT 'Urdu';

-- 3. Update submit_novel function to accept and save new fields
-- First, drop the old function to avoid overloaded function ambiguity
DROP FUNCTION IF EXISTS submit_novel(text, text, text, text, text, text, text, text, text, text, text, text, text, text, integer);

CREATE OR REPLACE FUNCTION submit_novel(
  p_full_name              text,
  p_pen_name               text,
  p_email                  text,
  p_whatsapp               text,
  p_bio                    text       DEFAULT NULL,
  p_social_media_link      text       DEFAULT NULL,
  p_location               text       DEFAULT NULL,
  p_novel_title            text       DEFAULT '',
  p_genre                  text       DEFAULT NULL,
  p_novel_status           text       DEFAULT NULL,
  p_language               text       DEFAULT 'Urdu',
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
  v_max_num        integer;
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

  -- Validate episode count for ongoing novels
  IF p_novel_status = 'Ongoing' THEN
    IF is_episode_minimum_exception(p_email) THEN
      IF p_episode_count IS NULL OR p_episode_count < 1 THEN
        RAISE EXCEPTION 'At least 1 episode is required for an ongoing novel submission.';
      END IF;
    ELSE
      IF p_episode_count IS NULL OR p_episode_count < 5 THEN
        RAISE EXCEPTION 'At least 5 episodes are required for an ongoing novel submission.';
      END IF;
    END IF;
  END IF;

  -- Upsert writer
  INSERT INTO writers (full_name, pen_name, email, whatsapp, bio, social_media_link, location)
  VALUES (p_full_name, p_pen_name, p_email, p_whatsapp, p_bio, p_social_media_link, p_location)
  ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        pen_name  = EXCLUDED.pen_name,
        whatsapp  = EXCLUDED.whatsapp,
        bio       = EXCLUDED.bio,
        social_media_link = EXCLUDED.social_media_link,
        location  = EXCLUDED.location
  RETURNING id INTO v_writer_id;

  -- Check for duplicate title
  IF EXISTS (
    SELECT 1 FROM submissions
    WHERE writer_id = v_writer_id
      AND lower(trim(novel_title)) = lower(trim(p_novel_title))
  ) THEN
    RAISE EXCEPTION 'You have already submitted a novel with this title.';
  END IF;

  -- Generate code using MAX instead of COUNT to prevent collisions on delete
  v_year := date_part('year', now())::text;
  SELECT COALESCE(MAX(
    substring(submission_code from '^UNB-' || v_year || '-([0-9]+)$')::integer
  ), 0) INTO v_max_num
  FROM submissions
  WHERE submission_code LIKE 'UNB-' || v_year || '-%';
  
  v_code := 'UNB-' || v_year || '-' || lpad((v_max_num + 1)::text, 4, '0');

  v_submission_date := now();

  -- Insert submission
  INSERT INTO submissions (
    submission_code, writer_id, novel_title, genre, novel_status, language,
    description, current_status, current_stage, submission_date,
    manuscript_drive_url, manuscript_drive_file_id,
    cover_drive_url, cover_drive_file_id, episode_count
  )
  VALUES (
    v_code, v_writer_id, p_novel_title, p_genre, p_novel_status, p_language,
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
