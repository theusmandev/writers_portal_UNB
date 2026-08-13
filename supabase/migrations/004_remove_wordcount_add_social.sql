-- ============================================================
--  Writers Portal — Migration 004: Remove Word Count & Add Social Link
--  File: supabase/migrations/004_remove_wordcount_add_social.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
--    (Run AFTER 003_writer_submissions.sql has already been applied)
-- ============================================================

-- 1. Drop existing functions so we can recreate them with new signatures
DROP FUNCTION IF EXISTS submit_novel(text, text, text, text, text, text, text, text, text, integer, text, text, text, text);
DROP FUNCTION IF EXISTS get_public_writers();

-- 2. Modify tables
ALTER TABLE submissions DROP COLUMN IF EXISTS word_count;
ALTER TABLE submissions DROP COLUMN IF EXISTS pages; 
ALTER TABLE submissions DROP COLUMN IF EXISTS number_of_pages;
ALTER TABLE writers ADD COLUMN IF NOT EXISTS social_media_link text;

-- 3. Recreate submit_novel (removed p_word_count, added p_social_media_link)
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
  p_cover_drive_file_id    text       DEFAULT NULL
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
    cover_drive_url, cover_drive_file_id
  )
  VALUES (
    v_code, v_writer_id, p_novel_title, p_genre, p_novel_status,
    p_description, 'Received', 'Submission Confirmation', v_submission_date,
    p_manuscript_drive_url, p_manuscript_drive_file_id,
    p_cover_drive_url, p_cover_drive_file_id
  );

  RETURN json_build_object(
    'submission_code',  v_code,
    'submission_date',  v_submission_date,
    'current_status',   'Received',
    'current_stage',    'Submission Confirmation'
  );
END;
$$;

-- 4. Recreate get_public_writers (added social_media_link)
CREATE OR REPLACE FUNCTION get_public_writers()
RETURNS TABLE (
  id               uuid,
  full_name        text,
  pen_name         text,
  bio              text,
  social_media_link text,
  published_novels json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.full_name,
    w.pen_name,
    w.bio,
    w.social_media_link,
    COALESCE(
      json_agg(
        json_build_object(
          'id',          s.id,
          'novel_title', s.novel_title,
          'genre',       s.genre,
          'published_url', s.published_url
        )
        ORDER BY s.submission_date DESC
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::json
    ) AS published_novels
  FROM writers w
  LEFT JOIN submissions s
    ON s.writer_id = w.id
    AND s.current_status = 'Published'
  WHERE w.is_public = true
  GROUP BY w.id, w.full_name, w.pen_name, w.bio, w.social_media_link
  ORDER BY w.full_name;
END;
$$;

-- 5. Re-grant execute permissions to anon
GRANT EXECUTE ON FUNCTION submit_novel TO anon;
GRANT EXECUTE ON FUNCTION get_public_writers TO anon;
