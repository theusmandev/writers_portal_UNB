import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, ExternalLink, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { submissionStatuses, genres } from "@/data/content";
import type { SubmissionRow } from "@/lib/supabase.types";

type SubmissionWithWriter = SubmissionRow & {
  writers: { full_name: string; pen_name: string | null } | null;
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
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let q = supabase
          .from("submissions")
          .select("*, writers(full_name, pen_name)")
          .order("submission_date", { ascending: !sortDesc });

        if (statusFilter) {
          q = q.eq("current_status", statusFilter);
        }

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
  }, [statusFilter, sortDesc]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const matchesSearch =
        !q ||
        r.novel_title.toLowerCase().includes(q) ||
        (r.writers?.full_name ?? "").toLowerCase().includes(q) ||
        r.submission_code.toLowerCase().includes(q);
      const matchesGenre = !genreFilter || r.genre === genreFilter;
      return matchesSearch && matchesGenre;
    });
  }, [rows, search, genreFilter]);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold">Submissions</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} entries</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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
          onChange={(e) => setStatusFilter(e.target.value)}
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortDesc((v) => !v)}
          className="gap-1.5"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {sortDesc ? "Newest first" : "Oldest first"}
        </Button>
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
          <table className="w-full text-sm">
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
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-primary">{s.submission_code}</td>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{s.novel_title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.writers?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.genre ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[s.current_status] ?? "bg-muted text-muted-foreground"}`}>
                        {s.current_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(s.submission_date)}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/submissions/${s.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
