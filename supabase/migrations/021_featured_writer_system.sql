-- ============================================================
--  Writers Portal — Migration 021: Featured Writer System
--  File: supabase/migrations/021_featured_writer_system.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
--    (Run AFTER 020_delete_submission_cleanup_writer.sql has been applied)
--
--  SCOPE:
--    - Adds featured-writer columns to the writers table
--    - Creates three new SECURITY DEFINER / SECURITY INVOKER functions
--    - Does NOT modify any existing function's return type or signature
--    - No DROP FUNCTION required for existing functions
-- ============================================================


-- ── 1. ADD COLUMNS TO writers ────────────────────────────────────────────────

ALTER TABLE writers
  ADD COLUMN IF NOT EXISTS is_featured          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_bio         text,
  ADD COLUMN IF NOT EXISTS featured_slug        text,
  ADD COLUMN IF NOT EXISTS looker_studio_embed_url text,
  ADD COLUMN IF NOT EXISTS dashboard_token      text;

COMMENT ON COLUMN writers.is_featured IS
  'Admin sets true to show this writer on the /featured/<slug> public profile page';
COMMENT ON COLUMN writers.featured_bio IS
  'Rich HTML biography shown on the featured writer public page (same pattern as posts.content)';
COMMENT ON COLUMN writers.featured_slug IS
  'URL-friendly slug for the featured writer public page, e.g. "fatima-malik"';
COMMENT ON COLUMN writers.looker_studio_embed_url IS
  'Private Looker Studio embed URL — only surfaced through get_writer_dashboard_by_token()';
COMMENT ON COLUMN writers.dashboard_token IS
  'Opaque random token granting access to the writer''s analytics dashboard; generated server-side, never from the frontend';


-- ── 2. UNIQUE CONSTRAINTS ────────────────────────────────────────────────────
--  Applied separately from IF NOT EXISTS column additions so they are
--  idempotent-safe even if the migration is accidentally re-run.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'writers_featured_slug_key'
      AND conrelid = 'writers'::regclass
  ) THEN
    ALTER TABLE writers ADD CONSTRAINT writers_featured_slug_key UNIQUE (featured_slug);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'writers_dashboard_token_key'
      AND conrelid = 'writers'::regclass
  ) THEN
    ALTER TABLE writers ADD CONSTRAINT writers_dashboard_token_key UNIQUE (dashboard_token);
  END IF;
END;
$$;


-- ── 3. FUNCTION: get_featured_writer_public ───────────────────────────────────
--
--  Public-facing. Returns the featured writer's profile + published novels for
--  the given slug. Deliberately does NOT select dashboard_token or
--  looker_studio_embed_url anywhere in the query body.
--  Returns nothing if is_featured = false or slug not found.

CREATE OR REPLACE FUNCTION get_featured_writer_public(p_slug text)
RETURNS TABLE (
  full_name         text,
  pen_name          text,
  featured_bio      text,
  featured_slug     text,
  social_media_link text,
  published_novels  json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.full_name,
    w.pen_name,
    w.featured_bio,
    w.featured_slug,
    w.social_media_link,
    COALESCE(
      json_agg(
        json_build_object(
          'novel_title',   s.novel_title,
          'genre',         s.genre,
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
  WHERE w.featured_slug = p_slug
    AND w.is_featured = true
  GROUP BY
    w.full_name,
    w.pen_name,
    w.featured_bio,
    w.featured_slug,
    w.social_media_link;
  -- NOTE: dashboard_token and looker_studio_embed_url are intentionally
  -- not selected anywhere in the query above and are not part of the return type.
END;
$$;

GRANT EXECUTE ON FUNCTION get_featured_writer_public(text) TO anon;
GRANT EXECUTE ON FUNCTION get_featured_writer_public(text) TO authenticated;


-- ── 4. FUNCTION: get_writer_dashboard_by_token ───────────────────────────────
--
--  Token-gated. Returns only the embed URL and display name for the writer
--  whose dashboard_token matches p_token AND who is currently featured.
--  Returns nothing (zero rows) on any mismatch — no error, no partial info.

CREATE OR REPLACE FUNCTION get_writer_dashboard_by_token(p_token text)
RETURNS TABLE (
  full_name                text,
  pen_name                 text,
  looker_studio_embed_url  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.full_name,
    w.pen_name,
    w.looker_studio_embed_url
  FROM writers w
  WHERE w.dashboard_token = p_token
    AND w.is_featured = true
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_writer_dashboard_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_writer_dashboard_by_token(text) TO authenticated;


-- ── 5. FUNCTION: admin_set_featured_writer ────────────────────────────────────
--
--  Admin-only write operation. Uses SECURITY INVOKER so the caller's RLS
--  context applies — the same pattern as our other admin-only write operations.
--
--  TOKEN LOGIC:
--    * If the writer currently has NO dashboard_token AND p_is_featured = true
--      => generate a new 32-hex-char token server-side using gen_random_bytes(16).
--    * If the writer already HAS a dashboard_token => never regenerate it,
--      preserving any previously-shared links.
--
--  SLUG UNIQUENESS:
--    The UNIQUE constraint on writers.featured_slug will raise a natural
--    Postgres error on collision; the frontend (Phase 2) will surface this.

CREATE OR REPLACE FUNCTION admin_set_featured_writer(
  p_writer_id              uuid,
  p_is_featured            boolean,
  p_featured_bio           text,
  p_featured_slug          text,
  p_looker_studio_embed_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing_token text;
  v_new_token      text;
BEGIN
  -- Fetch the writer's current dashboard_token
  SELECT dashboard_token
    INTO v_existing_token
    FROM writers
   WHERE id = p_writer_id;

  -- Determine the token to write:
  --   * Has no token yet AND being featured now => generate one server-side
  --   * Already has a token => keep it unchanged regardless of is_featured value
  IF v_existing_token IS NULL AND p_is_featured = true THEN
    v_new_token := encode(gen_random_bytes(16), 'hex');
  ELSE
    v_new_token := v_existing_token;  -- preserve existing token (may be NULL if not yet featured)
  END IF;

  UPDATE writers
     SET is_featured              = p_is_featured,
         featured_bio             = p_featured_bio,
         featured_slug            = p_featured_slug,
         looker_studio_embed_url  = p_looker_studio_embed_url,
         dashboard_token          = v_new_token
   WHERE id = p_writer_id;
END;
$$;

-- Granted to authenticated only — NOT anon (admin-only operation)
GRANT EXECUTE ON FUNCTION admin_set_featured_writer(uuid, boolean, text, text, text) TO authenticated;
