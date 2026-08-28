import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllPosts, deletePost } from "@/services/portalApi";
import type { PostRow } from "@/lib/supabase.types";
import { Button } from "@/components/ui/button";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { formatDate } from "@/lib/utils";
import { Pencil, Trash2, Plus, Loader2, Eye } from "lucide-react";

export default function AdminPosts() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  async function loadPosts() {
    setLoading(true);
    const res = await getAllPosts();
    if (res.success) {
      setPosts(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadPosts();
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    const res = await deletePost(id);
    if (res.success) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert("Failed to delete post: " + res.error);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Posts & Updates</h1>
        <Button asChild>
          <Link to="/admin/posts/new">
            <Plus className="mr-2 h-4 w-4" /> New Post
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No posts found. Create one to get started.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Mobile View */}
            <div className="md:hidden flex flex-col divide-y divide-border">
              {posts.slice((currentPage - 1) * 20, currentPage * 20).map((post) => (
                <div key={post.id} className="flex flex-col gap-3 p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium leading-tight">{post.title}</div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${post.published ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{formatDate(post.created_at)}</div>
                    <div className="flex items-center gap-1">
                      {post.published ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View live post">
                          <a href={`/updates/${post.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50" title="Cannot view draft post" disabled>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Edit post">
                        <Link to={`/admin/posts/${post.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => void handleDelete(post.id)}
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
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts
                .slice((currentPage - 1) * 20, currentPage * 20)
                .map((post) => (
                <tr key={post.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{post.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(post.created_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        post.published
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {post.published ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View live post">
                          <a href={`/updates/${post.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50" title="Cannot view draft post" disabled>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Edit post">
                        <Link to={`/admin/posts/${post.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => void handleDelete(post.id)}
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
        
        <AdminPagination 
          currentPage={currentPage} 
          totalPages={Math.max(1, Math.ceil(posts.length / 20))} 
          onPageChange={(page) => {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }} 
        />
      </>
      )}
    </div>
  );
}
