-- Add episode_count to submissions table
ALTER TABLE submissions ADD COLUMN episode_count integer;

-- Create episodes table
CREATE TABLE episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  episode_number integer NOT NULL,
  drive_url text,
  drive_file_id text,
  file_name text,
  upload_failed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(submission_id, episode_number)
);

-- Enable RLS on episodes
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

-- Block anonymous SELECT completely. Only get_submission_by_code will read this later.
CREATE POLICY "Anon SELECT blocked" ON episodes FOR SELECT USING (false);
-- Block direct anonymous INSERT
CREATE POLICY "Anon INSERT blocked" ON episodes FOR INSERT WITH CHECK (false);

-- Authenticated admins get full access
CREATE POLICY "Admin ALL access episodes" ON episodes FOR ALL USING (auth.role() = 'authenticated');

-- SECURITY DEFINER function to allow saving episode uploads safely
CREATE OR REPLACE FUNCTION save_episode_record(
  p_submission_code text,
  p_episode_number integer,
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
BEGIN
  -- Lookup submission_id from submission_code
  SELECT id INTO v_submission_id
  FROM submissions
  WHERE submission_code = p_submission_code;

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'Submission code % not found', p_submission_code;
  END IF;

  -- Insert or update the episode record
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
    p_episode_number,
    p_drive_url,
    p_drive_file_id,
    p_file_name,
    p_upload_failed
  )
  ON CONFLICT (submission_id, episode_number) 
  DO UPDATE SET
    drive_url = EXCLUDED.drive_url,
    drive_file_id = EXCLUDED.drive_file_id,
    file_name = EXCLUDED.file_name,
    upload_failed = EXCLUDED.upload_failed;
END;
$$;


-- 1. Drop existing submit_novel function
DROP FUNCTION IF EXISTS submit_novel(text, text, text, text, text, text, text, text, text, text, text, text, text, text);

-- 2. Recreate submit_novel with p_episode_count
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
BEGIN
  -- Validate required fields
  IF trim(p_email) = '' OR p_email IS NULL THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  IF trim(p_novel_title) = '' OR p_novel_title IS NULL THEN
    RAISE EXCEPTION 'Novel title is required';
  END IF;

  -- Upsert writer (update info on conflict so it stays fresh)
  INSERT INTO writers (full_name, pen_name, email, whatsapp, bio, social_media_link)
  VALUES (p_full_name, p_pen_name, p_email, p_whatsapp, p_bio, p_social_media_link)
  ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        pen_name  = EXCLUDED.pen_name,
        whatsapp  = EXCLUDED.whatsapp,
        bio       = EXCLUDED.bio,
        social_media_link = EXCLUDED.social_media_link
  RETURNING id INTO v_writer_id;

  -- Check for duplicate title from this writer
  IF EXISTS (
    SELECT 1 FROM submissions
    WHERE writer_id = v_writer_id
      AND lower(trim(novel_title)) = lower(trim(p_novel_title))
  ) THEN
    RAISE EXCEPTION 'You have already submitted a novel with this title.';
  END IF;

  -- Generate unique submission code: UNB-YEAR-NNNN
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
  );

  RETURN json_build_object(
    'submission_code',  v_code,
    'submission_date',  v_submission_date,
    'current_status',   'Received',
    'current_stage',    'Submission Confirmation'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_novel TO anon;
GRANT EXECUTE ON FUNCTION save_episode_record TO anon;
