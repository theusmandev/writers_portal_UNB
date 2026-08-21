/**
 * TypeScript types derived from the Supabase database schema.
 *
 * These are hand-maintained to match supabase/migrations/001_init.sql.
 * For production, you can also generate these automatically with:
 *   npx supabase gen types typescript --project-id your-project-id > src/lib/supabase.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      writers: {
        Row: {
          id: string;
          full_name: string;
          pen_name: string | null;
          email: string;
          whatsapp: string | null;
          bio: string | null;
          social_media_link: string | null;
          registration_date: string;
          status: string;
          is_public: boolean;
          // ── Featured Writer (migration 021) ──────────────────────────
          is_featured: boolean;
          featured_bio: string | null;
          featured_slug: string | null;
          looker_studio_embed_url: string | null;
          dashboard_token: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["writers"]["Row"], "id" | "registration_date"> & {
          id?: string;
          registration_date?: string;
        };
        Update: Partial<Database["public"]["Tables"]["writers"]["Insert"]>;
        Relationships: any[];
      };
      submissions: {
        Row: {
          id: string;
          submission_code: string;
          writer_id: string;
          novel_title: string;
          genre: string | null;
          novel_status: string | null;
          description: string | null;
          manuscript_drive_url: string | null;
          manuscript_drive_file_id: string | null;
          cover_drive_url: string | null;
          cover_drive_file_id: string | null;
          manuscript_upload_failed: boolean;
          cover_upload_failed: boolean;
          submission_date: string;
          current_status: string;
          current_stage: string | null;
          last_updated: string;
          admin_notes: string | null;
          /** Admin-written note visible to writer on the tracking page */
          status_note: string | null;
          published_url: string | null;
          episode_count: number | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["submissions"]["Row"],
          "id" | "submission_date" | "last_updated"
        > & {
          id?: string;
          submission_date?: string;
          last_updated?: string;
        };
        Update: Partial<Database["public"]["Tables"]["submissions"]["Insert"]>;
        Relationships: any[];
      };
      status_history: {
        Row: {
          id: string;
          submission_id: string;
          old_status: string | null;
          new_status: string | null;
          changed_by: string;
          changed_at: string;
          comment: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["status_history"]["Row"], "id" | "changed_at"> & {
          id?: string;
          changed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["status_history"]["Insert"]>;
        Relationships: any[];
      };
      submission_responses: {
        Row: {
          id: string;
          submission_id: string;
          response_text: string;
          submitted_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["submission_responses"]["Row"], "id" | "submitted_at"> & {
          id?: string;
          submitted_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["submission_responses"]["Insert"]>;
        Relationships: any[];
      };
      episodes: {
        Row: {
          id: string;
          submission_id: string;
          episode_number: number;
          drive_url: string | null;
          drive_file_id: string | null;
          original_filename: string | null;
          upload_failed: boolean;
          published: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["episodes"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["episodes"]["Insert"]>;
        Relationships: any[];
      };
      posts: {
        Row: {
          id: string;
          title: string;
          content: string;
          slug: string;
          published: boolean;
          meta_title: string | null;
          meta_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["posts"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
        Relationships: [];
      };
      policies: {
        Row: {
          id: string;
          title: string | null;
          content: string | null;
          version: string | null;
          last_updated: string;
          status: string;
        };
        Insert: Omit<Database["public"]["Tables"]["policies"]["Row"], "id" | "last_updated"> & {
          id?: string;
          last_updated?: string;
        };
        Update: Partial<Database["public"]["Tables"]["policies"]["Insert"]>;
        Relationships: any[];
      };
      timelines: {
        Row: {
          id: string;
          stage: string | null;
          expected_duration: string | null;
          description: string | null;
          active: boolean;
          sort_order: number;
        };
        Insert: Omit<Database["public"]["Tables"]["timelines"]["Row"], "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["timelines"]["Insert"]>;
        Relationships: any[];
      };
      faqs: {
        Row: {
          id: string;
          question: string | null;
          answer: string | null;
          category: string | null;
          sort_order: number;
          published: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["faqs"]["Row"], "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["faqs"]["Insert"]>;
        Relationships: any[];
      };
      site_settings: {
        Row: {
          id: number;
          submissions_paused: boolean;
          pause_message: string | null;
          notification_enabled: boolean;
          notification_message: string | null;
          notification_link_url: string | null;
          notification_link_text: string | null;
          notification_version: number;
        };
        Insert: Omit<Database["public"]["Tables"]["site_settings"]["Row"], "id"> & { id?: number };
        Update: Partial<Database["public"]["Tables"]["site_settings"]["Insert"]>;
        Relationships: any[];
      };
    };
    Views: {
      public_writers_view: {
        Row: {
          id: string;
          full_name: string;
          pen_name: string | null;
          bio: string | null;
          social_media_link: string | null;
          published_novels: Array<{
            id: string;
            novel_title: string;
            genre: string | null;
            published_url: string | null;
          }>;
          /** Added by migration 022. dashboard_token and looker_studio_embed_url
           *  are intentionally NOT present here. */
          is_featured: boolean;
          featured_slug: string | null;
        };
      };
    };
    Functions: {
      get_writer_dashboard_by_token: {
        Args: { p_token: string };
        Returns: Array<{
          full_name: string;
          pen_name: string | null;
          looker_studio_embed_url: string | null;
          featured_slug: string | null;
          // NOTE: dashboard_token is NOT in this return type.
          // The DB function never surfaces it back to the caller.
        }>;
      };
      get_featured_writer_public: {
        Args: { p_slug: string };
        Returns: Array<{
          full_name: string;
          pen_name: string | null;
          featured_bio: string | null;
          featured_slug: string | null;
          social_media_link: string | null;
          published_novels: Array<{
            novel_title: string;
            genre: string | null;
            published_url: string | null;
          }>;
          // NOTE: dashboard_token and looker_studio_embed_url are
          // deliberately NOT in this return type — they are excluded
          // at the database level in 021_featured_writer_system.sql.
        }>;
      };
    };
    Enums: Record<string, never>;
  };
}

export type WriterRow = Database["public"]["Tables"]["writers"]["Row"];
export type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
export type StatusHistoryRow = Database["public"]["Tables"]["status_history"]["Row"];
export type SubmissionResponseRow = Database["public"]["Tables"]["submission_responses"]["Row"];
export type EpisodeRow = Database["public"]["Tables"]["episodes"]["Row"];
export type PostRow = Database["public"]["Tables"]["posts"]["Row"];
export type PublicWriterRow = Database["public"]["Views"]["public_writers_view"]["Row"];
export type SiteSettingsRow = Database["public"]["Tables"]["site_settings"]["Row"];

/** Shape returned by get_writer_dashboard_by_token() RPC.
 *  Only returned when token matches an is_featured=true writer.
 *  The dashboard_token itself is never echoed back. */
export type WriterDashboardData = {
  full_name: string;
  pen_name: string | null;
  looker_studio_embed_url: string | null;
  featured_slug: string | null;
};

/** Shape returned by get_featured_writer_public() RPC.
 *  dashboard_token and looker_studio_embed_url are NOT present — excluded at DB level. */
export type FeaturedWriterPublic = {
  full_name: string;
  pen_name: string | null;
  featured_bio: string | null;
  featured_slug: string | null;
  social_media_link: string | null;
  published_novels: Array<{
    novel_title: string;
    genre: string | null;
    published_url: string | null;
  }>;
};
