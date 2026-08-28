import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, ExternalLink, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { supabase } from "@/lib/supabase";
import { submissionStatuses, genres } from "@/data/content";
import type { SubmissionRow } from "@/lib/supabase.types";
import { deleteSubmission } from "@/services/portalApi";

type SubmissionWithWriter = SubmissionRow & {
  writers: { full_name: string; pen_name: string | null } | null;
  episodes?: { id: string }[];
};

const statusColors: Record<string, string> = {
  Received: "bg-blue-500/10 text-blue-600",
  "Under Initial Review": "bg-yellow-500/10 text-yellow-600",
  "Under Editorial Review": "bg-purple-500/10 text-purple-600",
  "Action Required": "bg-orange-500/10 text-orange-600",
  Approved: "bg-green-500/10 text-green-600",
  Formatting: "bg-teal-500/10 text-teal-600",
  "Scheduled for Publication": "bg-indigo-500/10 text-indigo-600",
  Published: "bg-primary/10 text-primary",
  Rejected: "bg-destructive/10 text-destructive",
  Withdrawn: "bg-muted text-muted-foreground",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminSubmissions() {
  const [rows, setRows] = useState<SubmissionWithWriter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [novelTypeFilter, setNovelTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("All time");
  const [sortDesc, setSortDesc] = useState(true);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showPendingReview, setShowPendingReview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCodeInput, setDeleteCodeInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [submissionToDelete, setSubmissionToDelete] = useState<SubmissionWithWriter | null>(null);

  // Reset to page 1 when any filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, genreFilter, dateFilter, sortDesc, showPendingOnly, showPendingReview, novelTypeFilter]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let q = supabase
          .from("submissions")
          .select("*, writers(full_name, pen_name), episodes(id)")
          .eq("episodes.published", false)
          .eq("episodes.upload_failed", false)
          .not("episodes.drive_url", "is", null)
          .limit(1, { foreignTable: "episodes" })
          .order("submission_date", { ascending: !sortDesc });

        const { data, error: err } = await q;
        if (err) throw err;
        setRows((data ?? []) as SubmissionWithWriter[]);
      } catch {
        setError("Could not load submissions.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [sortDesc]);

  async function handleDelete() {
    if (!submissionToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    const res = await deleteSubmission(submissionToDelete.id, submissionToDelete.submission_code);
    if (!res.success) {
      setDeleteError(res.error);
      setIsDeleting(false);
    } else {
      // Remove from local state
      setRows((prev) => prev.filter((r) => r.id !== submissionToDelete.id));
      setDeleteModalOpen(false);
      setSubmissionToDelete(null);
      setIsDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    return rows.filter((r) => {
      const matchesSearch =
        !q ||
        r.novel_title.toLowerCase().includes(q) ||
        (r.writers?.full_name ?? "").toLowerCase().includes(q) ||
        r.submission_code.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || r.current_status === statusFilter;
      const matchesGenre = !genreFilter || r.genre === genreFilter;
      const matchesNovelType = !novelTypeFilter || r.novel_status === novelTypeFilter;
      
      let matchesDate = true;
      if (dateFilter !== "All time") {
        const subDate = new Date(r.submission_date);
        if (dateFilter === "Today") {
          matchesDate = subDate >= today;
        } else if (dateFilter === "Yesterday") {
          matchesDate = subDate >= yesterday && subDate < today;
        } else if (dateFilter === "Last 7 Days") {
          matchesDate = subDate >= sevenDaysAgo;
        } else if (dateFilter === "This Month") {
          matchesDate = subDate >= thisMonthStart;
        } else if (dateFilter === "Last Month") {
          matchesDate = subDate >= lastMonthStart && subDate <= lastMonthEnd;
        }
      }

      const hasPendingEpisode = r.novel_status === "Ongoing" && r.episodes && r.episodes.length > 0;
      const matchesPending = !showPendingOnly || hasPendingEpisode;

      const PENDING_REVIEW_STATUSES = [
        "Received",
        "Under Initial Review",
        "Under Editorial Review",
        "Action Required",
      ];
      const matchesPendingReview = !showPendingReview || PENDING_REVIEW_STATUSES.includes(r.current_status);

      return matchesSearch && matchesStatus && matchesGenre && matchesNovelType && matchesDate && matchesPending && matchesPendingReview;
    });
  }, [rows, search, statusFilter, genreFilter, novelTypeFilter, dateFilter, showPendingOnly, showPendingReview]);

  const hasFilters = search || statusFilter || genreFilter || novelTypeFilter || dateFilter !== "All time" || showPendingOnly || showPendingReview;

  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages) || 1;

  const paginatedRows = filtered.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safePage * itemsPerPage, filtered.length);

  const countText = hasFilters 
    ? `Showing ${startItem}–${endItem} of ${filtered.length} entries (filtered from ${rows.length} total)`
    : `Showing ${startItem}–${endItem} of ${rows.length} entries`;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold">Submissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {countText}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="submissions-search"
            placeholder="Search title, writer, code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            if (e.target.value) {
              setShowPendingReview(false);
            }
          }}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All statuses</option>
          {submissionStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          id="genre-filter"
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          id="novel-type-filter"
          value={novelTypeFilter}
          onChange={(e) => setNovelTypeFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All novel types</option>
          <option value="Complete">Complete</option>
          <option value="Ongoing">Ongoing</option>
        </select>
        <select
          id="date-filter"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="All time">All time</option>
          <option value="Today">Today</option>
          <option value="Yesterday">Yesterday</option>
          <option value="Last 7 Days">Last 7 Days</option>
          <option value="This Month">This Month</option>
          <option value="Last Month">Last Month</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortDesc((v) => !v)}
          className="h-9 gap-1.5"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {sortDesc ? "Newest first" : "Oldest first"}
        </Button>
        <Button
          variant={showPendingOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowPendingOnly((v) => !v)}
          className={`h-9 gap-1.5 ${showPendingOnly ? "bg-amber-500 hover:bg-amber-600 text-white border-transparent" : "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"}`}
        >
          ⚡ Pending Episodes Only
        </Button>
        <Button
          variant={showPendingReview ? "default" : "outline"}
          size="sm"
          onClick={() => {
            const next = !showPendingReview;
            setShowPendingReview(next);
            if (next) {
              setStatusFilter("");
            }
          }}
          className={`h-9 gap-1.5 ${showPendingReview ? "bg-blue-500 hover:bg-blue-600 text-white border-transparent" : "border-blue-500/30 text-blue-600 hover:bg-blue-500/10"}`}
        >
          📋 Pending Review Only
        </Button>

        {hasFilters && (
          <div className="w-full flex justify-center mt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setGenreFilter("");
                setDateFilter("All time");
                setShowPendingOnly(false);
                setShowPendingReview(false);
              }}
              className="h-9 min-w-[120px]"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="md:hidden flex flex-col divide-y divide-border">
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">
                  No submissions found
                </div>
              ) : (
                paginatedRows.map((s) => (
                  <div key={s.id} className="flex flex-col gap-3 p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-primary">{s.submission_code}</span>
                        <span className="font-medium leading-tight">{s.novel_title}</span>
                      </div>
                      <div className="flex flex-col gap-1.5 items-end">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[s.current_status] ?? "bg-muted text-muted-foreground"}`}>
                          {s.current_status}
                        </span>
                        {s.novel_status === "Ongoing" && (
                          <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                            Ongoing • {s.episode_count || 0} eps
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {s.novel_status === "Ongoing" && s.episodes && s.episodes.length > 0 && (
                      <div className="flex">
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 flex items-center gap-1 border border-amber-500/20 shadow-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          New Episode Pending
                        </span>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>By {s.writers?.full_name ?? "—"}</span>
                      <span>{s.genre ?? "—"}</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">{formatDate(s.submission_date)}</span>
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/admin/submissions/${s.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </Link>
                        <button
                          onClick={() => {
                            setSubmissionToDelete(s);
                            setDeleteCodeInput("");
                            setDeleteError(null);
                            setDeleteModalOpen(true);
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          title="Delete Submission"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Desktop View */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Novel Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Writer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Genre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No submissions found
                  </td>
                </tr>
              ) : (
                paginatedRows.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-primary">{s.submission_code}</td>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{s.novel_title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.writers?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.genre ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[s.current_status] ?? "bg-muted text-muted-foreground"}`}>
                          {s.current_status}
                        </span>
                        {s.novel_status === "Ongoing" && (
                          <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                            Ongoing • {s.episode_count || 0} episodes
                          </span>
                        )}
                        {s.novel_status === "Ongoing" && s.episodes && s.episodes.length > 0 && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 flex items-center gap-1 border border-amber-500/20 shadow-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            New Episode Pending
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(s.submission_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/admin/submissions/${s.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </Link>
                        <button
                          onClick={() => {
                            setSubmissionToDelete(s);
                            setDeleteCodeInput("");
                            setDeleteError(null);
                            setDeleteModalOpen(true);
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          title="Delete Submission"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </>
        )}
      </div>

      <AdminPagination 
        currentPage={safePage} 
        totalPages={totalPages} 
        onPageChange={(page) => {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }} 
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && submissionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg p-6 space-y-6">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight">Delete Submission?</h3>
              <p className="text-sm text-muted-foreground">
                This will permanently delete <strong>{submissionToDelete.novel_title}</strong> ({submissionToDelete.submission_code}), all its data, and its files from Google Drive. This cannot be undone.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delete-confirm" className="text-sm font-medium">
                To confirm, type <strong>{submissionToDelete.submission_code}</strong> below:
              </Label>
              <Input
                id="delete-confirm"
                value={deleteCodeInput}
                onChange={(e) => setDeleteCodeInput(e.target.value)}
                placeholder={submissionToDelete.submission_code}
                className="font-mono text-center"
              />
            </div>
            
            {deleteError && (
              <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {deleteError}
              </div>
            )}
            
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => void handleDelete()}
                disabled={deleteCodeInput !== submissionToDelete.submission_code || isDeleting}
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
