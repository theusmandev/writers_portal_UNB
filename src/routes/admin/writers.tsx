import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, AlertCircle, Globe, EyeOff, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { getDateFilterPredicate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { WriterRow } from "@/lib/supabase.types";

type WriterWithCount = WriterRow & { submission_count: number };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminWriters() {
  const navigate = useNavigate();
  const [writers, setWriters] = useState<WriterWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [publicFilter, setPublicFilter] = useState("All");
  const [featuredFilter, setFeaturedFilter] = useState("All");
  const [minSubmissions, setMinSubmissions] = useState("");
  const [dateFilter, setDateFilter] = useState("All time");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, publicFilter, featuredFilter, minSubmissions, dateFilter]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Fetch writers
      const { data: writerData, error: wErr } = await supabase
        .from("writers")
        .select("*")
        .order("registration_date", { ascending: false });
      if (wErr) throw wErr;

      // Fetch submission counts per writer
      const { data: subData, error: sErr } = await supabase
        .from("submissions")
        .select("writer_id");
      if (sErr) throw sErr;

      const countMap: Record<string, number> = {};
      for (const s of subData ?? []) {
        countMap[s.writer_id] = (countMap[s.writer_id] ?? 0) + 1;
      }

      setWriters(
        (writerData ?? []).map((w) => ({
          ...w,
          submission_count: countMap[w.id] ?? 0,
        })),
      );
    } catch {
      setError("Could not load writers.");
    } finally {
      setLoading(false);
    }
  }

  async function togglePublic(writer: WriterWithCount) {
    setToggling(writer.id);
    const { error: err } = await supabase
      .from("writers")
      .update({ is_public: !writer.is_public })
      .eq("id", writer.id);

    if (!err) {
      setWriters((prev) =>
        prev.map((w) => (w.id === writer.id ? { ...w, is_public: !w.is_public } : w)),
      );
    }
    setToggling(null);
  }

  const filtered = writers.filter((w) => {
    const q = search.toLowerCase().trim();
    const datePredicate = getDateFilterPredicate(dateFilter);
    const matchesSearch =
      !q ||
      w.full_name.toLowerCase().includes(q) ||
      (w.pen_name ?? "").toLowerCase().includes(q) ||
      w.email.toLowerCase().includes(q);

    let matchesPublic = true;
    if (publicFilter === "Public only") matchesPublic = w.is_public;
    if (publicFilter === "Private only") matchesPublic = !w.is_public;

    let matchesFeatured = true;
    if (featuredFilter === "Featured only") matchesFeatured = w.is_featured;
    if (featuredFilter === "Not Featured") matchesFeatured = !w.is_featured;

    let matchesMinSubs = true;
    if (minSubmissions.trim() !== "") {
      const num = parseInt(minSubmissions, 10);
      if (!isNaN(num) && num >= 0) {
        matchesMinSubs = w.submission_count > num;
      }
    }

    const matchesDate = datePredicate(w.registration_date);

    return matchesSearch && matchesPublic && matchesFeatured && matchesMinSubs && matchesDate;
  });

  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages) || 1;

  const paginatedWriters = filtered.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safePage * itemsPerPage, filtered.length);

  const hasFilters = search.trim() !== "" || publicFilter !== "All" || featuredFilter !== "All" || minSubmissions.trim() !== "" || dateFilter !== "All time";
  const countText = hasFilters 
    ? `Showing ${startItem}–${endItem} of ${filtered.length} writers (filtered from ${writers.length} total)`
    : `Showing ${startItem}–${endItem} of ${writers.length} writers`;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold">Writers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Toggle <strong>Public</strong> to show a writer on the public /writers page.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {countText}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="writers-search"
            placeholder="Search name, pen name, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          id="public-filter"
          value={publicFilter}
          onChange={(e) => setPublicFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="All">All Statuses</option>
          <option value="Public only">Public only</option>
          <option value="Private only">Private only</option>
        </select>

        <select
          id="featured-filter"
          value={featuredFilter}
          onChange={(e) => setFeaturedFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="All">All Features</option>
          <option value="Featured only">Featured only</option>
          <option value="Not Featured">Not Featured</option>
        </select>

        <div className="relative w-[110px]">
          <Input
            id="min-submissions-filter"
            type="number"
            min="0"
            placeholder="Subs >"
            value={minSubmissions}
            onChange={(e) => setMinSubmissions(e.target.value)}
            className="h-9"
          />
        </div>

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

        {hasFilters && (
          <div className="w-full flex justify-center mt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
                setPublicFilter("All");
                setFeaturedFilter("All");
                setMinSubmissions("");
                setDateFilter("All time");
              }}
              className="h-9 min-w-[120px]"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

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
                  No writers found
                </div>
              ) : (
                paginatedWriters.map((w) => (
                  <div 
                    key={w.id} 
                    className="flex flex-col gap-3 p-4 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/writers/${w.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 font-medium">
                          {w.full_name}
                          {w.is_featured && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{w.pen_name ? `Pen Name: ${w.pen_name}` : "No pen name"}</div>
                      </div>
                      <button
                        id={`toggle-public-mobile-${w.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void togglePublic(w);
                        }}
                        disabled={toggling === w.id}
                        title={w.is_public ? "Remove from public directory" : "Add to public directory"}
                        className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                          w.is_public
                            ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {w.is_public ? (
                          <>
                            <Globe className="h-3 w-3" /> Public
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" /> Private
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground break-all">{w.email}</div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                      <span>{w.submission_count} {w.submission_count === 1 ? 'Submission' : 'Submissions'}</span>
                      <span>Reg: {formatDate(w.registration_date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Desktop View */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Pen Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Subs</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Registered</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Public</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No writers found
                  </td>
                </tr>
              ) : (
                paginatedWriters.map((w) => (
                  <tr
                    key={w.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/writers/${w.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {w.full_name}
                        {w.is_featured && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{w.pen_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs break-all max-w-[150px] sm:max-w-[250px]">{w.email}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{w.submission_count}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(w.registration_date)}</td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        id={`toggle-public-${w.id}`}
                        onClick={() => void togglePublic(w)}
                        disabled={toggling === w.id}
                        title={w.is_public ? "Remove from public directory" : "Add to public directory"}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                          w.is_public
                            ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {w.is_public ? (
                          <>
                            <Globe className="h-3 w-3" /> Public
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" /> Private
                          </>
                        )}
                      </button>
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
    </div>
  );
}
