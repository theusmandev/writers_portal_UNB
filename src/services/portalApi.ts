/**
 * Service layer — the ONLY place that knows how the portal talks to a backend.
 *
 * With Supabase configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set),
 * all operations use Supabase. File uploads optionally go to Google Drive via
 * VITE_PORTAL_API_URL (Apps Script) — if not set, submissions save without
 * Drive links (graceful degradation).
 *
 * Without Supabase credentials the app falls back to "demo mode":
 * submissions are stored in localStorage so the flow can be previewed.
 */
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { SubmissionStatus } from "@/data/content";
import type { WriterRow, SubmissionRow, PublicWriterRow } from "@/lib/supabase.types";

// ── Public Types ──────────────────────────────────────────────────────────────

export type SubmissionInput = {
  fullName: string;
  penName: string;
  email: string;
  whatsapp: string;
  location?: string | undefined;
  bio?: string | undefined;
  socialMediaLink?: string | undefined;
  novelTitle: string;
  genre: string;
  novelStatus: "Complete" | "Ongoing";
  language: string;
  synopsis: string;
  manuscriptName?: string | undefined;
  coverName?: string | undefined;
  /** Actual File object for Drive upload (optional) */
  manuscriptFile?: File | undefined;
  /** Actual File object for Drive upload (optional) */
  coverFile?: File | undefined;
  episodeCount?: number | undefined;
};

export type SubmissionRecord = {
  submissionId: string;
  email: string;
  novelTitle: string;
  penName: string;
  genre: string;
  submittedAt: string;
  lastUpdated: string;
  status: SubmissionStatus;
  stage: string;
  note?: string | undefined;        // admin_notes — internal update message
  statusNote?: string | undefined;  // status_note — reason for Rejected / Action Required
  publishedUrl?: string | undefined;
  hasResponse?: boolean;            // whether writer has already submitted a response
  manuscriptUrl?: string | null;
  coverUrl?: string | null;
  manuscriptUploadFailed?: boolean;
  coverUploadFailed?: boolean;
  novelStatus?: string | undefined;
  episodeCount?: number | undefined;
  episodes?: Array<{ episode_number: number; upload_failed: boolean; drive_url?: string | null }> | undefined;
};

export type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

export type WriterSubmissionSummary = {
  submission_code: string;
  novel_title: string;
  genre: string | null;
  novel_status: string | null;
  current_status: string;
  submission_date: string;
  last_updated: string;
  published_url: string | null;
  manuscript_drive_url: string | null;
  cover_drive_url: string | null;
  manuscript_upload_failed: boolean;
  cover_upload_failed: boolean;
  full_name?: string;
};

export type WriterDetailWithSubmissions = WriterRow & {
  submissions: SubmissionRow[];
};

// Admin-facing types
export type AdminSubmission = SubmissionRow & {
  writers: Pick<WriterRow, "full_name" | "pen_name" | "email" | "whatsapp" | "bio"> | null;
};

// ── Internal: demo-mode store ─────────────────────────────────────────────────

const STORE_KEY = "unb-portal-submissions";

function readStore(): SubmissionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "[]") as SubmissionRecord[];
  } catch {
    return [];
  }
}

function writeStore(rows: SubmissionRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(rows));
}

function nextDemoId(rows: SubmissionRecord[]) {
  const year = new Date().getFullYear();
  const count = rows.filter((r) => r.submissionId.includes(`-${year}-`)).length + 1;
  return `UNB-${year}-${String(count).padStart(4, "0")}`;
}

// ── Public: uploadFileToScript ───────────────────────────────────────────────
// Converts a File object to base64 and POSTs it to the Google Apps Script Web App.
// Returns the file details on success.

export interface UploadFileResponse {
  success: boolean;
  fileId?: string;
  fileUrl?: string;
  downloadUrl?: string;
  error?: string;
}

export async function uploadFileToScript(
  submissionCode: string,
  fileType: "manuscript" | "cover" | "image" | "episode",
  file: File,
  signal?: AbortSignal,
  episodeNumber?: number
): Promise<UploadFileResponse> {
  const scriptUrl = import.meta.env["VITE_PORTAL_API_URL"] as string | undefined;
  if (!scriptUrl) {
    return { success: false, error: "Google Apps Script API URL (VITE_PORTAL_API_URL) is not configured." };
  }

  // Convert File to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip "data:...;base64," prefix
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "uploadFile",
        submissionCode,
        fileType,
        fileName: file.name,
        mimeType: file.type,
        base64Data,
        episodeNumber,
      }),
      signal: signal as any,
    });

    if (!res.ok) {
      return { success: false, error: `Server responded with status ${res.status}` };
    }

    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.error || "Upload failed." };
    }

    return {
      success: true,
      fileId: data.fileId,
      fileUrl: data.fileUrl,
      downloadUrl: data.downloadUrl,
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { success: false, error: "Upload timed out" };
    }
    return { success: false, error: err?.message || "Failed to communicate with upload service." };
  }
}

// ── Public: renamePostFolder ─────────────────────────────────────────────────
// Sends a request to the Apps Script to rename a post's Google Drive folder.

export async function renamePostFolder(token: string, title: string): Promise<ApiResult<null>> {
  const scriptUrl = import.meta.env["VITE_PORTAL_API_URL"] as string | undefined;
  if (!scriptUrl) {
    return { success: false, error: "API URL not configured." };
  }

  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "renamePostFolder",
        token,
        title,
      }),
    });

    if (!res.ok) {
      return { success: false, error: `Server responded with status ${res.status}` };
    }

    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.error || "Rename failed." };
    }

    return { success: true, data: null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to communicate with API." };
  }
}


// ── Public: updateSubmissionFiles ────────────────────────────────────────────
// Updates the manuscript/cover Drive file references on a submission in Supabase.

export async function updateSubmissionFiles(
  submissionCode: string,
  files: {
    manuscriptUrl?: string;
    manuscriptId?: string;
    coverUrl?: string;
    coverId?: string;
    manuscriptUploadFailed?: boolean;
    coverUploadFailed?: boolean;
  }
): Promise<ApiResult<null>> {
  if (!isSupabaseConfigured) {
    // Demo mode: update local store
    await new Promise((r) => setTimeout(r, 200));
    const all = readStore();
    const idx = all.findIndex(r => r.submissionId === submissionCode);
    if (idx !== -1) {
      if (files.manuscriptUrl !== undefined) all[idx]!.manuscriptUrl = files.manuscriptUrl;
      if (files.coverUrl !== undefined) all[idx]!.coverUrl = files.coverUrl;
      if (files.manuscriptUploadFailed !== undefined) all[idx]!.manuscriptUploadFailed = files.manuscriptUploadFailed;
      if (files.coverUploadFailed !== undefined) all[idx]!.coverUploadFailed = files.coverUploadFailed;
      writeStore(all);
    }
    return { success: true, data: null };
  }
  try {
    const { error } = await supabase.rpc("update_submission_files", {
      p_submission_code: submissionCode,
      p_manuscript_url: files.manuscriptUrl,
      p_manuscript_id: files.manuscriptId,
      p_cover_url: files.coverUrl,
      p_cover_id: files.coverId,
      p_manuscript_upload_failed: files.manuscriptUploadFailed,
      p_cover_upload_failed: files.coverUploadFailed,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update file details in database." };
  }
}

// ── Public: uploadEpisodeFile ────────────────────────────────────────────────

export async function uploadEpisodeFile(
  submissionCode: string,
  episodeNumber: number,
  file: File,
  signal?: AbortSignal
): Promise<UploadFileResponse> {
  return uploadFileToScript(submissionCode, "episode", file, signal, episodeNumber);
}

// ── Public: saveEpisodeRecord ────────────────────────────────────────────────

export async function saveEpisodeRecord(
  submissionCode: string,
  episodeNumber: number,
  driveUrl: string | null,
  driveFileId: string | null,
  fileName: string | null,
  uploadFailed: boolean
): Promise<ApiResult<null>> {
  if (!isSupabaseConfigured) {
    // Demo mode: skip local store update for now (or could add logic here)
    await new Promise((r) => setTimeout(r, 200));
    return { success: true, data: null };
  }
  try {
    const { error } = await supabase.rpc("save_episode_record", {
      p_submission_code: submissionCode,
      p_episode_number: episodeNumber,
      p_drive_url: driveUrl,
      p_drive_file_id: driveFileId,
      p_file_name: fileName,
      p_upload_failed: uploadFailed,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save episode record." };
  }
}

// ── Public: addEpisodesToSubmission ──────────────────────────────────────────

export async function addEpisodesToSubmission(
  submissionCode: string,
  email: string,
  episodeFiles: Array<{
    driveUrl: string | null;
    driveFileId: string | null;
    fileName: string | null;
    uploadFailed: boolean;
  }>
): Promise<ApiResult<null>> {
  if (!isSupabaseConfigured) {
    // Demo mode fallback
    await new Promise((r) => setTimeout(r, 600));
    return { success: true, data: null };
  }
  
  try {
    // Process each file sequentially
    for (const file of episodeFiles) {
      const { error } = await supabase.rpc("add_episode_to_submission", {
        p_submission_code: submissionCode.trim().toUpperCase(),
        p_email: email.trim().toLowerCase(),
        p_drive_url: file.driveUrl,
        p_drive_file_id: file.driveFileId,
        p_file_name: file.fileName,
        p_upload_failed: file.uploadFailed,
      });

      if (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: true, data: null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to add episodes." };
  }
}

// ── Public: sendNotificationEmail ────────────────────────────────────────────
// Triggers an email notification via Google Apps Script Web App.

export interface EmailPayload {
  writerEmail: string;
  writerName: string;
  novelTitle: string;
  submissionCode: string;
  statusNote?: string;
  publishedUrl?: string;
  missingFiles?: string;
  episodeCount?: number;
}

export async function sendNotificationEmail(
  emailType: "received" | "action_required" | "rejected" | "published" | "episodes_added",
  payload: EmailPayload
): Promise<ApiResult<null>> {
  const scriptUrl = import.meta.env["VITE_PORTAL_API_URL"] as string | undefined;
  if (!scriptUrl) {
    // Graceful fallback if not configured
    return { success: true, data: null };
  }

  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "sendEmail",
        emailType,
        ...payload,
      }),
    });

    if (!res.ok) {
      return { success: false, error: `Server responded with status ${res.status}` };
    }

    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.message || "Failed to send email notification." };
    }

    return { success: true, data: null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to communicate with email service." };
  }
}

// ── Public: submitNovel ───────────────────────────────────────────────────────

export async function submitNovel(input: SubmissionInput): Promise<ApiResult<SubmissionRecord>> {
  // Demo mode fallback
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 700));
    const rows = readStore();
    if (
      rows.some(
        (r) =>
          r.email.toLowerCase() === input.email.toLowerCase() &&
          r.novelTitle.trim().toLowerCase() === input.novelTitle.trim().toLowerCase(),
      )
    ) {
      return {
        success: false,
        error: "You have already submitted a novel with this title from this email address.",
      };
    }
    const now = new Date().toISOString();
    const record: SubmissionRecord = {
      submissionId: nextDemoId(rows),
      email: input.email,
      novelTitle: input.novelTitle,
      penName: input.penName || input.fullName,
      genre: input.genre,
      submittedAt: now,
      lastUpdated: now,
      status: "Received",
      stage: "Submission Confirmation",
    };
    writeStore([...rows, record]);
    return { success: true, data: record };
  }

  // Supabase path
  try {
    // Call the submit_novel DB function (atomic writer upsert + submission insert)
    // Files are uploaded and references updated post-creation
    const { data, error } = await supabase.rpc("submit_novel", {
      p_full_name: input.fullName,
      p_pen_name: input.penName || input.fullName,
      p_email: input.email,
      p_whatsapp: input.whatsapp,
      p_bio: input.bio ?? null,
      p_social_media_link: input.socialMediaLink ?? null,
      p_novel_title: input.novelTitle,
      p_genre: input.genre || null,
      p_novel_status: input.novelStatus,
      p_description: input.synopsis || null,
      p_manuscript_drive_url: null,
      p_manuscript_drive_file_id: null,
      p_cover_drive_url: null,
      p_cover_drive_file_id: null,
      p_episode_count: input.episodeCount ?? null,
    });

    if (error) {
      // Surface DB-level validation errors (duplicate title, etc.)
      return { success: false, error: error.message };
    }

    const result = data as {
      submission_code: string;
      submission_date: string;
      current_status: string;
      current_stage: string;
    };

    return {
      success: true,
      data: {
        submissionId: result.submission_code,
        email: input.email,
        novelTitle: input.novelTitle,
        penName: input.penName || input.fullName,
        genre: input.genre,
        submittedAt: result.submission_date,
        lastUpdated: result.submission_date,
        status: result.current_status as SubmissionStatus,
        stage: result.current_stage,
      },
    };
  } catch {
    return { success: false, error: "Network error. Please check your connection and try again." };
  }
}

// ── Public: trackSubmission ───────────────────────────────────────────────────

export async function trackSubmission(
  submissionId: string,
  email: string,
): Promise<ApiResult<SubmissionRecord>> {
  // Demo mode fallback
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 500));
    const match = readStore().find(
      (r) =>
        r.submissionId.trim().toUpperCase() === submissionId.trim().toUpperCase() &&
        r.email.trim().toLowerCase() === email.trim().toLowerCase(),
    );
    if (!match) {
      return {
        success: false,
        error:
          "No submission matches that ID and email address. Please check both and try again — the email must be the one you submitted with.",
      };
    }
    return { success: true, data: match };
  }

  // Supabase path — uses SECURITY DEFINER function, no auth required
  try {
    const { data, error } = await supabase.rpc("get_submission_by_code", {
      p_code: submissionId.trim().toUpperCase(),
      p_email: email.trim().toLowerCase(),
    });

    if (error) {
      return { success: false, error: "Could not reach the server. Please try again." };
    }

    const rows = (data ?? []) as Array<{
      submission_code: string;
      novel_title: string;
      genre: string | null;
      submission_date: string;
      current_status: string;
      current_stage: string | null;
      last_updated: string;
      admin_notes: string | null;
      status_note: string | null;
      published_url: string | null;
      pen_name: string | null;
      full_name: string;
      has_response: boolean;
      manuscript_drive_url: string | null;
      cover_drive_url: string | null;
      manuscript_upload_failed: boolean;
      cover_upload_failed: boolean;
      episode_count: number | null;
      episodes: any;
    }>;

    if (rows.length === 0) {
      return {
        success: false,
        error:
          "No submission matches that ID and email address. Please check both and try again — the email must be the one you submitted with.",
      };
    }

    const row = rows[0]!;
    return {
      success: true,
      data: {
        submissionId: row.submission_code,
        email,
        novelTitle: row.novel_title,
        penName: row.pen_name ?? row.full_name,
        genre: row.genre ?? "",
        submittedAt: row.submission_date,
        lastUpdated: row.last_updated,
        status: row.current_status as SubmissionStatus,
        stage: row.current_stage ?? "",
        note: row.admin_notes ?? undefined,
        statusNote: row.status_note ?? undefined,
        publishedUrl: row.published_url ?? undefined,
        hasResponse: row.has_response,
        manuscriptUrl: row.manuscript_drive_url,
        coverUrl: row.cover_drive_url,
        manuscriptUploadFailed: row.manuscript_upload_failed,
        coverUploadFailed: row.cover_upload_failed,
        novelStatus: row.novel_status,
        episodeCount: row.episode_count ?? undefined,
        episodes: Array.isArray(row.episodes) && row.episodes.length > 0 ? row.episodes : undefined,
      },
    };
  } catch {
    return { success: false, error: "Network error. Please check your connection and try again." };
  }
}

// ── Public: getPublicWriters ──────────────────────────────────────────────────

export async function getPublicWriters(): Promise<ApiResult<PublicWriterRow[]>> {
  if (!isSupabaseConfigured) return { success: true, data: [] };
  try {
    const { data, error } = await supabase.rpc("get_public_writers");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as PublicWriterRow[] };
  } catch {
    return { success: false, error: "Could not load writers." };
  }
}

// ── Public: submitResponse ───────────────────────────────────────────────────
// Called by the Action Required response form on the tracking page.
// Verifies submission_code + email server-side before inserting.

export async function submitResponse(
  submissionCode: string,
  email: string,
  responseText: string,
): Promise<ApiResult<null>> {
  // Demo mode: pretend it worked
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 600));
    return { success: true, data: null };
  }
  try {
    const { error } = await supabase.rpc("submit_response", {
      p_submission_code: submissionCode.trim().toUpperCase(),
      p_email: email.trim().toLowerCase(),
      p_response_text: responseText.trim(),
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}

// ── Public: getSubmissionsByEmail ─────────────────────────────────────────────
// Returns a list of a writer's submissions using their email address.
// Only returns safe, non-sensitive summary fields.

export async function getSubmissionsByEmail(
  email: string,
): Promise<ApiResult<WriterSubmissionSummary[]>> {
  // Demo mode: read from localStorage
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 500));
    const all = readStore();
    const matches = all
      .filter((r) => r.email.trim().toLowerCase() === email.trim().toLowerCase())
      .map((r) => ({
        submission_code: r.submissionId,
        novel_title: r.novelTitle,
        genre: r.genre || null,
        novel_status: null,
        current_status: r.status,
        submission_date: r.submittedAt,
        last_updated: r.lastUpdated,
        published_url: r.publishedUrl || null,
        manuscript_drive_url: r.manuscriptUrl || null,
        cover_drive_url: r.coverUrl || null,
        manuscript_upload_failed: r.manuscriptUploadFailed || false,
        cover_upload_failed: r.coverUploadFailed || false,
      }));
    return { success: true, data: matches };
  }

  try {
    const { data, error } = await supabase.rpc("get_submissions_by_email", {
      p_email: email.trim().toLowerCase(),
    });
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Explicitly cast the returned array to WriterSubmissionSummary[]
    // Since get_submissions_by_email doesn't currently return the missing fields from the DB view,
    // they will just be undefined. The UI will just not show the Drive missing warnings for email lookups.
    return { success: true, data: (data ?? []) as unknown as WriterSubmissionSummary[] };
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}

// ── Public: getWriterInfoByEmail ─────────────────────────────────────────────
// Looks up an existing writer's information by email for auto-filling the form.

export async function getWriterInfoByEmail(email: string): Promise<ApiResult<Partial<WriterRow>>> {
  // Demo mode fallback
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 400));
    const all = readStore();
    const match = all.find((r) => r.email.trim().toLowerCase() === email.trim().toLowerCase());
    if (match) {
      return {
        success: true,
        data: {
          full_name: match.penName, // In demo mode, fullName isn't always distinct in store
          pen_name: match.penName,
          whatsapp: "",
          bio: "",
          social_media_link: "",
        },
      };
    }
    return { success: false, error: "Not found" };
  }

  try {
    const { data, error } = await supabase.rpc("get_writer_info_by_email", {
      p_email: email.trim().toLowerCase(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: "Not found" };
    }

    return { success: true, data: data[0] as Partial<WriterRow> };
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}

// ── Admin: Dashboard stats ────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [writersRes, submissionsRes] = await Promise.all([
    supabase.from("writers").select("*", { count: "exact", head: true }),
    supabase.from("submissions").select("current_status"),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of submissionsRes.data ?? []) {
    byStatus[row.current_status] = (byStatus[row.current_status] ?? 0) + 1;
  }

  return {
    totalWriters: writersRes.count ?? 0,
    totalSubmissions: submissionsRes.data?.length ?? 0,
    byStatus,
  };
}

// ── Admin: Submissions ────────────────────────────────────────────────────────

export async function getSubmissions(statusFilter?: string): Promise<ApiResult<AdminSubmission[]>> {
  try {
    let q = supabase
      .from("submissions")
      .select("*, writers(full_name, pen_name, email, whatsapp, bio)")
      .order("submission_date", { ascending: false });

    if (statusFilter) q = q.eq("current_status", statusFilter);

    const { data, error } = await q;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as AdminSubmission[] };
  } catch {
    return { success: false, error: "Could not load submissions." };
  }
}

export async function updateSubmissionStatus(
  id: string,
  currentStatus: string,
  options?: {
    adminNotes?: string;
    statusNote?: string | null;
    publishedUrl?: string | null;
  },
): Promise<ApiResult<null>> {
  try {
    const updates: Partial<SubmissionRow> = { current_status: currentStatus };
    if (options?.adminNotes !== undefined) updates.admin_notes = options.adminNotes;
    if (options?.statusNote !== undefined) updates.status_note = options.statusNote;
    if (options?.publishedUrl !== undefined) updates.published_url = options.publishedUrl;

    const { error } = await supabase.from("submissions").update(updates).eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch {
    return { success: false, error: "Could not update submission." };
  }
}

// ── Admin: Writers ────────────────────────────────────────────────────────────

export async function getWriters(): Promise<ApiResult<WriterRow[]>> {
  try {
    const { data, error } = await supabase
      .from("writers")
      .select("*")
      .order("registration_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as WriterRow[] };
  } catch {
    return { success: false, error: "Could not load writers." };
  }
}

export type WriterWithCount = WriterRow & { submission_count: number };

export async function getWriterWithSubmissions(
  writerId: string,
): Promise<ApiResult<WriterDetailWithSubmissions>> {
  try {
    const [writerRes, submissionsRes] = await Promise.all([
      supabase.from("writers").select("*").eq("id", writerId).single(),
      supabase
        .from("submissions")
        .select("*")
        .eq("writer_id", writerId)
        .order("submission_date", { ascending: false }),
    ]);

    if (writerRes.error) throw writerRes.error;
    if (submissionsRes.error) throw submissionsRes.error;

    return {
      success: true,
      data: {
        ...(writerRes.data as WriterRow),
        submissions: (submissionsRes.data ?? []) as SubmissionRow[],
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not load writer detail." };
  }
}

export async function toggleWriterPublic(id: string, isPublic: boolean): Promise<ApiResult<null>> {
  try {
    const { error } = await supabase.from("writers").update({ is_public: isPublic }).eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch {
    return { success: false, error: "Could not update writer." };
  }
}

// ── Public: Posts ─────────────────────────────────────────────────────────────

import type { PostRow } from "@/lib/supabase.types";

export async function getPublishedPosts(): Promise<ApiResult<PostRow[]>> {
  if (!isSupabaseConfigured) return { 
    success: true, 
    data: [{
      id: "demo-id",
      title: 'سوشل میڈیا لنک — کیوں ضروری ہے؟',
      slug: 'social-media-link-importance',
      content: 'السلام علیکم پیارے لکھاریو! 🌸\n\nآپ نے دیکھا ہوگا کہ سبمیشن فارم میں ہم نے ایک نیا اختیاری خانہ شامل کیا ہے — سوشل میڈیا لنک۔ سوچا آپ کو بتا دیں کہ یہ کیوں رکھا گیا ہے۔ 🤍',
      published: true,
      meta_title: 'سوشل میڈیا لنک — کیوں ضروری ہے؟ | Umera Ahmed Novel Bank',
      meta_description: 'جانیے کہ عمیرہ احمد ناول بینک (UNB) پر اپنا سوشل میڈیا لنک دینا کیوں ضروری ہے۔ یہ آپ کے قارئین سے جڑنے اور اپنی پہچان بنانے کا ایک بہترین ذریعہ ہے۔',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }] 
  };
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { success: true, data: (data ?? []) as PostRow[] };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not load posts." };
  }
}

export async function getPostBySlug(slug: string): Promise<ApiResult<PostRow | null>> {
  if (!isSupabaseConfigured) return { 
    success: true, 
    data: {
      id: "demo-id",
      title: 'سوشل میڈیا لنک — کیوں ضروری ہے؟',
      slug: 'social-media-link-importance',
      content: 'السلام علیکم پیارے لکھاریو! 🌸\n\nآپ نے دیکھا ہوگا کہ سبمیشن فارم میں ہم نے ایک نیا اختیاری خانہ شامل کیا ہے — سوشل میڈیا لنک۔ سوچا آپ کو بتا دیں کہ یہ کیوں رکھا گیا ہے۔ 🤍',
      published: true,
      meta_title: 'سوشل میڈیا لنک — کیوں ضروری ہے؟ | Umera Ahmed Novel Bank',
      meta_description: 'جانیے کہ عمیرہ احمد ناول بینک (UNB) پر اپنا سوشل میڈیا لنک دینا کیوں ضروری ہے۔ یہ آپ کے قارئین سے جڑنے اور اپنی پہچان بنانے کا ایک بہترین ذریعہ ہے۔',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } 
  };
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return { success: true, data: data as PostRow | null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not load post." };
  }
}

// ── Admin: Posts ──────────────────────────────────────────────────────────────

export async function getAllPosts(): Promise<ApiResult<PostRow[]>> {
  if (!isSupabaseConfigured) return { success: true, data: [] };
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { success: true, data: (data ?? []) as PostRow[] };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not load posts." };
  }
}

export async function getAdminPostById(id: string): Promise<ApiResult<PostRow | null>> {
  if (!isSupabaseConfigured) return { success: true, data: null };
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return { success: true, data: data as PostRow | null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not load post." };
  }
}

export async function createPost(post: Partial<PostRow>): Promise<ApiResult<PostRow>> {
  if (!isSupabaseConfigured) return { success: false, error: "Demo mode" };
  try {
    const { data, error } = await supabase
      .from("posts")
      .insert(post)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: data as PostRow };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not create post." };
  }
}

export async function updatePost(id: string, updates: Partial<PostRow>): Promise<ApiResult<null>> {
  if (!isSupabaseConfigured) return { success: false, error: "Demo mode" };
  try {
    const { error } = await supabase
      .from("posts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return { success: true, data: null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not update post." };
  }
}

export async function deletePost(id: string): Promise<ApiResult<null>> {
  if (!isSupabaseConfigured) return { success: false, error: "Demo mode" };
  try {
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return { success: true, data: null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not delete post." };
  }
}

// ── isDemoMode export (used by submit.tsx banner) ─────────────────────────────

export const isDemoMode = !isSupabaseConfigured;