--  Writers Portal — Migration 017: Episode Minimum Exceptions
--  File: supabase/migrations/017_episode_minimum_exceptions.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- 1. Create episode_minimum_exceptions table
CREATE TABLE IF NOT EXISTS episode_minimum_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  added_at timestamptz DEFAULT now(),
  note text
);

-- 2. RLS Policies
ALTER TABLE episode_minimum_exceptions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admins full access (assuming authenticated users are admins)
CREATE POLICY "Admins can manage episode_minimum_exceptions"
ON episode_minimum_exceptions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Security Definer function to check exceptions
CREATE OR REPLACE FUNCTION is_episode_minimum_exception(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM episode_minimum_exceptions
    WHERE lower(trim(email)) = lower(trim(p_email))
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION is_episode_minimum_exception TO anon;
GRANT EXECUTE ON FUNCTION is_episode_minimum_exception TO authenticated;

-- 4. Update submit_novel function with validation
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
