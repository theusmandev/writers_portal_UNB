import DOMPurify from 'dompurify';
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getPostBySlug } from "@/services/portalApi";
import type { PostRow } from "@/lib/supabase.types";
import { Loader2, Calendar, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function PostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<PostRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sanitizedContent, setSanitizedContent] = useState("");

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const res = await getPostBySlug(slug);
      if (res.success && res.data) {
        setPost(res.data);
        
        // Sanitize the HTML content for safe rendering
        // Need to allow target="_blank" for links to work properly
        DOMPurify.addHook('afterSanitizeAttributes', function(node) {
          if ('target' in node && node.nodeName === 'A') {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
          }
        });
        
        setSanitizedContent(DOMPurify.sanitize(res.data.content, { 
          ADD_ATTR: ['target', 'style', 'data-align'] 
        }));
      } else {
        setError(res.error || "Post not found.");
      }
      setLoading(false);
    }
    void load();
  }, [slug]);

  // Handle SEO
  useEffect(() => {
    if (post) {
      // Title
      const titleText = post.meta_title || `${post.title} | Umera Ahmed Novel Bank`;
      document.title = titleText;

      // Meta Description
      const rawText = (() => {
        const tmp = document.createElement("div");
        tmp.innerHTML = post.content;
        return tmp.textContent || tmp.innerText || "";
      })();
      const descText = post.meta_description || rawText.substring(0, 150).replace(/\n/g, ' ') + '...';
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', descText);
    }
  }, [post]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center px-6">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-destructive max-w-md w-full">
          <p className="font-medium">{error || "This post could not be found."}</p>
        </div>
        <Link to="/updates" className="text-primary hover:underline flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Updates
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 md:py-20">
      <Link 
        to="/updates" 
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-10"
      >
        <ArrowLeft className="h-4 w-4" /> Back to all updates
      </Link>

      <header className="mb-10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Calendar className="h-4 w-4" />
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
        </div>
        <h1 className="urdu font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl" dir="auto">
          {post.title}
        </h1>
      </header>

      <div 
        className="urdu prose prose-lg prose-stone dark:prose-invert max-w-none prose-headings:font-urdu prose-a:text-primary hover:prose-a:text-primary/80 prose-p:leading-loose prose-headings:leading-[1.8] leading-loose"
        dir="auto"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    </article>
  );
}
