-- supabase/migrations/026_auto_publish_due_submissions.sql

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
      -- last_updated is automatically touched by the existing trg_last_updated DB trigger
    WHERE 
      s.novel_status = 'Complete'
      AND s.current_status = 'Scheduled for Publication'
      AND s.published_url IS NOT NULL 
      AND s.published_url != ''
      AND s.estimated_publish_at IS NOT NULL 
      AND s.estimated_publish_at <= now()
    RETURNING 
      s.submission_code,
      s.novel_title,
      s.published_url,
      s.writer_id
  )
  SELECT 
    u.submission_code,
    u.novel_title,
    u.published_url,
    w.email AS writer_email,
    COALESCE(NULLIF(w.pen_name, ''), w.full_name) AS writer_name
  FROM updated u
  JOIN writers w ON w.id = u.writer_id;
END;
$$;

-- Grant execution to anon (per requirements)
GRANT EXECUTE ON FUNCTION auto_publish_due_submissions() TO anon;
