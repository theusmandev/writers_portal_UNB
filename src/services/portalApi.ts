/**
 * Service layer — the ONLY place that knows how the portal talks to a backend.
 *
 * Today (Phase 1) it runs in "demo" mode: submissions are validated, given a
 * realistic Submission ID and stored in the browser so the full flow can be
 * demonstrated and tested. Nothing is sent anywhere.
 *
 * Phase 2: set VITE_PORTAL_API_URL to your deployed Google Apps Script web app
 * URL. Every call below then posts to that endpoint instead — no UI changes.
 * See docs/google-apps-script/Code.gs for the matching backend.
 */
import type { SubmissionStatus } from "@/data/content";

export type SubmissionInput = {
  fullName: string;
  penName: string;
  email: string;
  whatsapp: string;
  location?: string | undefined;
  bio?: string | undefined;
  novelTitle: string;
  genre: string;
  novelStatus: "Complete" | "Ongoing";
  wordCount?: string | undefined;
  pages?: string | undefined;
  language: string;
  synopsis: string;
  manuscriptName?: string | undefined;
  coverName?: string | undefined;
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
  note?: string | undefined;
};

export type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

const API_URL = import.meta.env["VITE_PORTAL_API_URL"] as string | undefined;
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

function nextId(rows: SubmissionRecord[]) {
  const year = new Date().getFullYear();
  const count = rows.filter((r) => r.submissionId.includes(`-${year}-`)).length + 1;
  return `UNB-${year}-${String(count).padStart(4, "0")}`;
}

async function callApi<T>(action: string, payload: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_URL}?action=${action}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { success: false, error: "The server could not be reached. Please try again." };
    const json = (await res.json()) as { success: boolean; data?: T; message?: string };
    if (!json.success) return { success: false, error: json.message ?? "Request failed." };
    return { success: true, data: json.data as T };
  } catch {
    return {
      success: false,
      error: "Network error. Please check your connection and try again.",
    };
  }
}

export async function submitNovel(input: SubmissionInput): Promise<ApiResult<SubmissionRecord>> {
  if (API_URL) return callApi<SubmissionRecord>("submit", input);

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
    submissionId: nextId(rows),
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

export async function trackSubmission(
  submissionId: string,
  email: string,
): Promise<ApiResult<SubmissionRecord>> {
  if (API_URL) return callApi<SubmissionRecord>("track", { submissionId, email });

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

export const isDemoMode = !API_URL;