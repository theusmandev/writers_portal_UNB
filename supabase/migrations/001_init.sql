-- ============================================================
--  Writers Portal — Initial Schema Migration
--  File: supabase/migrations/001_init.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
--    (or: supabase db push if using the CLI)
-- ============================================================

-- ── 1. TABLES ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS writers (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name         text        NOT NULL,
  pen_name          text,
  email             text        NOT NULL UNIQUE,
  whatsapp          text,
  bio               text,
  registration_date timestamptz NOT NULL DEFAULT now(),
  status            text        NOT NULL DEFAULT 'active',
  is_public         boolean     NOT NULL DEFAULT false
);
COMMENT ON COLUMN writers.is_public IS
  'Admin sets true to show this writer on the public /writers page';

CREATE TABLE IF NOT EXISTS submissions (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_code          text        NOT NULL UNIQUE,
  writer_id                uuid        NOT NULL REFERENCES writers(id) ON DELETE RESTRICT,
  novel_title              text        NOT NULL,
  genre                    text,
  novel_status             text,        -- 'Complete' | 'Ongoing'
  description              text,
  word_count               integer,
  manuscript_drive_url     text,
  manuscript_drive_file_id text,
  cover_drive_url          text,
  cover_drive_file_id      text,
  submission_date          timestamptz NOT NULL DEFAULT now(),
  current_status           text        NOT NULL DEFAULT 'Received',
  current_stage            text,
  last_updated             timestamptz NOT NULL DEFAULT now(),
  admin_notes              text,
  published_url            text        -- live URL on urdunovelbanks.com once published
);

CREATE TABLE IF NOT EXISTS status_history (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid        NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  old_status    text,
  new_status    text,
  changed_by    text        NOT NULL DEFAULT 'system',
  changed_at    timestamptz NOT NULL DEFAULT now(),
  comment       text
);
COMMENT ON TABLE status_history IS
  'Audit log — written exclusively by DB trigger, never from frontend';

CREATE TABLE IF NOT EXISTS policies (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text,
  content      text,
  version      text,
  last_updated timestamptz NOT NULL DEFAULT now(),
  status       text        NOT NULL DEFAULT 'published'
);

CREATE TABLE IF NOT EXISTS timelines (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  stage             text,
  expected_duration text,
  description       text,
  active            boolean NOT NULL DEFAULT true,
  sort_order        integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS faqs (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  question   text,
  answer     text,
  category   text,
  sort_order integer NOT NULL DEFAULT 0,
  published  boolean NOT NULL DEFAULT true
);

-- ── 2. INDEXES ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_submissions_code
  ON submissions (submission_code);

CREATE INDEX IF NOT EXISTS idx_submissions_writer_id
  ON submissions (writer_id);

CREATE INDEX IF NOT EXISTS idx_writers_email
  ON writers (email);

CREATE INDEX IF NOT EXISTS idx_status_history_submission
  ON status_history (submission_id);

CREATE INDEX IF NOT EXISTS idx_submissions_status
  ON submissions (current_status);

-- ── 3. INTERNAL TRIGGERS ─────────────────────────────────────────────────────

-- 3a. Auto-record status changes into status_history
CREATE OR REPLACE FUNCTION fn_record_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    INSERT INTO status_history (submission_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.current_status, NEW.current_status, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_status_history ON submissions;
CREATE TRIGGER trg_status_history
  AFTER UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION fn_record_status_change();

-- 3b. Auto-update last_updated on any submission UPDATE
CREATE OR REPLACE FUNCTION fn_touch_last_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_last_updated ON submissions;
CREATE TRIGGER trg_last_updated
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION fn_touch_last_updated();

-- ── 4. PUBLIC API FUNCTIONS (SECURITY DEFINER) ───────────────────────────────
--
-- Anon users NEVER touch the raw tables directly.
-- All public-facing operations go through these SECURITY DEFINER functions,
-- which run as the table owner (bypassing RLS) and enforce their own
-- input-level security.
-- ─────────────────────────────────────────────────────────────────────────────

-- 4a. submit_novel — creates writer (upsert) + submission in one atomic transaction
--     Called by: the public submission form
CREATE OR REPLACE FUNCTION submit_novel(
  p_full_name              text,
  p_pen_name               text,
  p_email                  text,
  p_whatsapp               text,
  p_bio                    text       DEFAULT NULL,
  p_novel_title            text       DEFAULT '',
  p_genre                  text       DEFAULT NULL,
  p_novel_status           text       DEFAULT NULL,
  p_description            text       DEFAULT NULL,
  p_word_count             integer    DEFAULT NULL,
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
  INSERT INTO writers (full_name, pen_name, email, whatsapp, bio)
  VALUES (p_full_name, p_pen_name, p_email, p_whatsapp, p_bio)
  ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        pen_name  = EXCLUDED.pen_name,
        whatsapp  = EXCLUDED.whatsapp,
        bio       = EXCLUDED.bio
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
    description, word_count, current_status, current_stage, submission_date,
    manuscript_drive_url, manuscript_drive_file_id,
    cover_drive_url, cover_drive_file_id
  )
  VALUES (
    v_code, v_writer_id, p_novel_title, p_genre, p_novel_status,
    p_description, p_word_count, 'Received', 'Submission Confirmation', v_submission_date,
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

-- 4b. get_submission_by_code — tracking lookup (requires both code AND matching email)
--     Called by: the public tracking page
CREATE OR REPLACE FUNCTION get_submission_by_code(p_code text, p_email text)
RETURNS TABLE (
  id              uuid,
  submission_code text,
  novel_title     text,
  genre           text,
  novel_status    text,
  description     text,
  submission_date timestamptz,
  current_status  text,
  current_stage   text,
  last_updated    timestamptz,
  admin_notes     text,
  published_url   text,
  pen_name        text,
  full_name       text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.submission_code,
    s.novel_title,
    s.genre,
    s.novel_status,
    s.description,
    s.submission_date,
    s.current_status,
    s.current_stage,
    s.last_updated,
    s.admin_notes,
    s.published_url,
    w.pen_name,
    w.full_name
  FROM submissions s
  JOIN writers w ON w.id = s.writer_id
  WHERE s.submission_code = upper(trim(p_code))
    AND lower(w.email) = lower(trim(p_email));
END;
$$;

-- 4c. get_public_writers — safe public listing for the /writers page
--     Called by: the public /writers page (no auth needed)
CREATE OR REPLACE FUNCTION get_public_writers()
RETURNS TABLE (
  id               uuid,
  full_name        text,
  pen_name         text,
  bio              text,
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
  GROUP BY w.id, w.full_name, w.pen_name, w.bio
  ORDER BY w.full_name;
END;
$$;

-- Grant public functions to anon role
GRANT EXECUTE ON FUNCTION submit_novel TO anon;
GRANT EXECUTE ON FUNCTION get_submission_by_code TO anon;
GRANT EXECUTE ON FUNCTION get_public_writers TO anon;

-- ── 5. ROW LEVEL SECURITY ────────────────────────────────────────────────────
--
-- SECURITY MODEL:
--   Anon users have NO direct table access. All anon operations go through
--   the SECURITY DEFINER functions above.
--   Authenticated (admin) users have full table access.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE writers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs           ENABLE ROW LEVEL SECURITY;

-- ── writers ───────────────────────────────────────────────────────────────────
-- PLAIN LANGUAGE:
--   Anon: NO direct access. The submit_novel() function handles inserts.
--   Admin: Full read + write access to all writer records including private fields.

CREATE POLICY "writers_admin_all"
  ON writers FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── submissions ───────────────────────────────────────────────────────────────
-- PLAIN LANGUAGE:
--   Anon: NO direct access. submit_novel() creates rows, get_submission_by_code() reads them.
--   Admin: Full read + write access. Updating current_status auto-triggers status_history.

CREATE POLICY "submissions_admin_all"
  ON submissions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── status_history ────────────────────────────────────────────────────────────
-- PLAIN LANGUAGE:
--   Anon: Completely blocked. The DB trigger fn_record_status_change() writes here.
--   Admin: Can read the full audit trail of all status changes.

CREATE POLICY "status_history_admin_all"
  ON status_history FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── policies ──────────────────────────────────────────────────────────────────
-- PLAIN LANGUAGE:
--   Anon: Can read policy rows where status = 'published'. Cannot see drafts.
--   Admin: Full access to create, edit, and publish policies.

CREATE POLICY "policies_anon_read_published"
  ON policies FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "policies_admin_all"
  ON policies FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── timelines ─────────────────────────────────────────────────────────────────
-- PLAIN LANGUAGE:
--   Anon: Can read timeline stages where active = true. Inactive stages are hidden.
--   Admin: Full access to manage timeline entries.

CREATE POLICY "timelines_anon_read_active"
  ON timelines FOR SELECT TO anon
  USING (active = true);

CREATE POLICY "timelines_admin_all"
  ON timelines FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── faqs ──────────────────────────────────────────────────────────────────────
-- PLAIN LANGUAGE:
--   Anon: Can read FAQs where published = true. Unpublished drafts are hidden.
--   Admin: Full access to manage FAQ entries.

CREATE POLICY "faqs_anon_read_published"
  ON faqs FOR SELECT TO anon
  USING (published = true);

CREATE POLICY "faqs_admin_all"
  ON faqs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
