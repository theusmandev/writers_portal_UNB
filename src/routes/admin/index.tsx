import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, FileText, CheckCircle2, XCircle, BookMarked, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SubmissionRow } from "@/lib/supabase.types";

interface Stats {
  totalWriters: number;
  totalSubmissions: number;
  byStatus: Record<string, number>;
  recentSubmissions: Array<SubmissionRow & { writers: { full_name: string; pen_name: string | null } | null }>;
}

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

function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  href?: string;
}) {
  const card = (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
  return href ? <Link to={href}>{card}</Link> : card;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [writersRes, submissionsRes, recentRes] = await Promise.all([
          supabase.from("writers").select("*", { count: "exact", head: true }),
          supabase.from("submissions").select("current_status"),
          supabase
            .from("submissions")
            .select("*, writers(full_name, pen_name)")
            .order("submission_date", { ascending: false })
            .limit(5),
        ]);

        if (writersRes.error) throw writersRes.error;
        if (submissionsRes.error) throw submissionsRes.error;
        if (recentRes.error) throw recentRes.error;

        // Tally by status
        const byStatus: Record<string, number> = {};
        for (const row of submissionsRes.data ?? []) {
          byStatus[row.current_status] = (byStatus[row.current_status] ?? 0) + 1;
        }

        setStats({
          totalWriters: writersRes.count ?? 0,
          totalSubmissions: submissionsRes.data?.length ?? 0,
          byStatus,
          recentSubmissions: (recentRes.data ?? []) as Stats["recentSubmissions"],
        });
      } catch {
        setError("Could not load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-sm text-destructive flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        {error}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of the Writers Portal</p>
      </div>

      {/* Top stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Writers" value={stats.totalWriters} icon={Users} href="/admin/writers" />
        <StatCard label="Total Submissions" value={stats.totalSubmissions} icon={FileText} href="/admin/submissions" />
        <StatCard label="Published" value={stats.byStatus["Published"] ?? 0} icon={CheckCircle2} />
        <StatCard label="Pending Review" value={(stats.byStatus["Received"] ?? 0) + (stats.byStatus["Under Initial Review"] ?? 0) + (stats.byStatus["Under Editorial Review"] ?? 0)} icon={Clock} />
      </div>

      {/* Status breakdown */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">By Status</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div
              key={status}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status] ?? "bg-muted text-muted-foreground"}`}>
                {status}
              </span>
              <span className="text-sm font-semibold tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent submissions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Submissions</h2>
          <Link to="/admin/submissions" className="text-xs text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Mobile View */}
          <div className="md:hidden flex flex-col divide-y divide-border">
            {stats.recentSubmissions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No submissions yet
              </div>
            ) : (
              stats.recentSubmissions.map((s) => (
                <div key={s.id} className="flex flex-col gap-2 p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <Link to={`/admin/submissions/${s.id}`} className="font-mono text-xs text-primary hover:underline">
                      {s.submission_code}
                    </Link>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[s.current_status] ?? "bg-muted text-muted-foreground"}`}>
                      {s.current_status}
                    </span>
                  </div>
                  <div className="font-medium">{s.novel_title}</div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{s.writers?.full_name ?? "—"}</span>
                    <span>{formatDate(s.submission_date)}</span>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Novel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Writer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No submissions yet
                  </td>
                </tr>
              ) : (
                stats.recentSubmissions.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-primary">
                      <Link to={`/admin/submissions/${s.id}`} className="hover:underline">
                        {s.submission_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate">{s.novel_title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.writers?.full_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[s.current_status] ?? "bg-muted text-muted-foreground"}`}>
                        {s.current_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(s.submission_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
