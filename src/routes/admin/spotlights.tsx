import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, EyeOff, Eye, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminSpotlights, deleteSpotlight, type AdminSpotlight } from "@/services/portalApi";
import { formatDate } from "@/lib/utils";

export default function AdminSpotlights() {
  const navigate = useNavigate();
  const [spotlights, setSpotlights] = useState<AdminSpotlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await getAdminSpotlights();
      if (res.success) {
        setSpotlights(res.data);
      } else {
        setError(res.error);
      }
      setLoading(false);
    }
    void load();
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this spotlight?")) return;
    const res = await deleteSpotlight(id);
    if (res.success) {
      setSpotlights((prev) => prev.filter((s) => s.id !== id));
    } else {
      alert("Failed to delete spotlight: " + res.error);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Writer Spotlights</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage featured spotlights for writers.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/spotlights/new">
            <Plus className="mr-2 h-4 w-4" /> Create Spotlight
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      ) : spotlights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No spotlights found. Create one to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Mobile View */}
          <div className="md:hidden flex flex-col divide-y divide-border">
            {spotlights.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium leading-tight">{s.spotlight_label || "Untitled Spotlight"}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">/{s.slug}</div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      s.is_published
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {s.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Writer: {s.writers?.full_name || "Unknown"}
                  {s.writers?.pen_name && ` (${s.writers.pen_name})`}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{formatDate(s.created_at)}</div>
                  <div className="flex items-center gap-1">
                    {s.is_published ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View spotlight">
                        {/* Note: Public page routing will be handled in Phase 3, linking to intended slug for now */}
                        <a href={`/spotlights/${s.slug}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50" title="Cannot view draft spotlight" disabled>
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Edit spotlight">
                      <Link to={`/admin/spotlights/${s.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => void handleDelete(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View */}
          <table className="hidden md:table w-full text-left text-sm relative">
            <thead className="bg-muted text-muted-foreground border-b border-border shadow-sm">
              <tr>
                <th className="px-4 py-3 font-medium">Label / Slug</th>
                <th className="px-4 py-3 font-medium">Writer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {spotlights.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{s.spotlight_label || "Untitled Spotlight"}</div>
                    <div className="text-xs text-muted-foreground font-mono">/{s.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.writers?.full_name || "Unknown"}</div>
                    {s.writers?.pen_name && (
                      <div className="text-xs text-muted-foreground">Pen: {s.writers.pen_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        s.is_published
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {s.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {s.is_published ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View spotlight">
                          {/* Note: Public page routing will be handled in Phase 3, linking to intended slug for now */}
                          <a href={`/spotlights/${s.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50" title="Cannot view draft spotlight" disabled>
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Edit spotlight">
                        <Link to={`/admin/spotlights/${s.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => void handleDelete(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
