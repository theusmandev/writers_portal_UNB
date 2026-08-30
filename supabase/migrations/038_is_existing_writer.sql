-- ============================================================
--  Writers Portal — Migration 038
--  Feature: Allow Existing Writers During Pause (Database)
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- Used by the frontend's pause gate to check if an email belongs to an existing writer
-- without returning any PII (personal identifiable information).
CREATE OR REPLACE FUNCTION is_existing_writer(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM writers 
        WHERE lower(email) = lower(trim(p_email))
    );
END;
$$;

-- Grant access to anonymous users (public submission form gate)
GRANT EXECUTE ON FUNCTION is_existing_writer(text) TO anon;
