-- ============================================================
--  Writers Portal — Migration 046: Email Broadcast Logs
--  File: supabase/migrations/046_email_broadcast_logs.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_broadcast_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  subject          text NOT NULL,
  heading_en       text,
  heading_ur       text,
  body_en          text,
  body_ur          text,
  audience_filter  text NOT NULL,
  total_targeted   integer NOT NULL DEFAULT 0,
  sent_count       integer NOT NULL DEFAULT 0,
  failed_count     integer NOT NULL DEFAULT 0,
  remaining_quota  integer
);

-- Index on created_at for fast descending history queries
CREATE INDEX IF NOT EXISTS idx_email_broadcast_logs_created_at
  ON public.email_broadcast_logs (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.email_broadcast_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admin users full access
CREATE POLICY "Admins have full access to email_broadcast_logs"
  ON public.email_broadcast_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

