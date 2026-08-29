-- Migration 035: Update auto-publish functions to support dual publishing

CREATE OR REPLACE FUNCTION auto_publish_due_submissions()
RETURNS TABLE (
  submission_code text,
  novel_title text,
  published_url text,
  writer_email text,
  writer_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH updated AS (
    UPDATE submissions AS s
    SET 
      current_status = 'Published',
      current_stage = 'Publication'
    WHERE 
      s.novel_status = 'Complete'
      AND s.current_status IN ('Approved', 'Formatting', 'Scheduled for Publication')
      AND (
        (s.published_url IS NOT NULL AND s.published_url != '') OR
        (s.published_url_ufb IS NOT NULL AND s.published_url_ufb != '')
      )
      AND s.estimated_publish_at IS NOT NULL 
      AND s.estimated_publish_at <= now()
    RETURNING 
      s.submission_code,
      s.novel_title,
      s.published_url,
      s.published_url_ufb,
      s.writer_id
  )
  SELECT 
    u.submission_code,
    u.novel_title,
    resolve_published_url(u.published_url, u.published_url_ufb) AS published_url,
    w.email AS writer_email,
    COALESCE(NULLIF(w.pen_name, ''), w.full_name) AS writer_name
  FROM updated u
  JOIN writers w ON w.id = u.writer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_publish_due_submissions() TO anon;


CREATE OR REPLACE FUNCTION auto_publish_due_episodes()
RETURNS TABLE (
  submission_code text,
  novel_title     text,
  published_url   text,
  writer_email    text,
  writer_name     text,
  episode_numbers text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH eligible AS (
    SELECT s.id FROM submissions s
    WHERE s.novel_status = 'Ongoing' 
      AND s.estimated_publish_at IS NOT NULL 
      AND s.estimated_publish_at <= now()
      AND EXISTS (
        SELECT 1 FROM episodes e 
        WHERE e.submission_id = s.id 
          AND e.published = false 
          AND e.upload_failed = false 
          AND e.drive_url IS NOT NULL
      )
  ),
  updated_episodes AS (
    UPDATE episodes e
    SET published = true
    FROM eligible el
    WHERE e.submission_id = el.id 
      AND e.published = false 
      AND e.upload_failed = false 
      AND e.drive_url IS NOT NULL
    RETURNING e.submission_id, e.episode_number
  ),
  cleared_timers AS (
    UPDATE submissions s
    SET estimated_publish_at = NULL
    FROM eligible el
    WHERE s.id = el.id
    RETURNING s.id
  )
  SELECT 
    s.submission_code, 
    s.novel_title, 
    resolve_published_url(s.published_url, s.published_url_ufb) AS published_url, 
    w.email AS writer_email,
    COALESCE(NULLIF(w.pen_name, ''), w.full_name) AS writer_name,
    string_agg(ue.episode_number::text, ', ' ORDER BY ue.episode_number) AS episode_numbers
  FROM updated_episodes ue
  JOIN submissions s ON s.id = ue.submission_id
  JOIN writers w ON w.id = s.writer_id
  GROUP BY s.submission_code, s.novel_title, s.published_url, s.published_url_ufb, w.email, w.pen_name, w.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_publish_due_episodes() TO anon;
