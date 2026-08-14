import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, AlertCircle, Globe, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AdminPagination } from "@/components/admin/AdminPagination";
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
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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
    return (
      !q ||
      w.full_name.toLowerCase().includes(q) ||
      (w.pen_name ?? "").toLowerCase().includes(q) ||
      w.email.toLowerCase().includes(q)
    );
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

  const hasFilters = search.trim() !== "";
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

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          id="writers-search"
          placeholder="Search name, pen name, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
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
          <table className="w-full text-sm">
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
                    <td className="px-4 py-3 font-medium">{w.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{w.pen_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{w.email}</td>
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
