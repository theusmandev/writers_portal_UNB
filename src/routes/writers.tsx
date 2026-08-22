import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, BookOpen, User, AlertCircle, Star, Search } from "lucide-react";
import { PageHero } from "@/components/portal/PageHero";
import { WriterCard } from "@/components/portal/WriterCard";
import { supabase } from "@/lib/supabase";
import type { PublicWriterRow } from "@/lib/supabase.types";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type SortOption = "a-z" | "novels";

export default function WritersPage() {
  const [writers, setWriters] = useState<PublicWriterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("a-z");
  const [featuredFirst, setFeaturedFirst] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase.rpc("get_public_writers");
      if (err) {
        setError("Could not load the writers directory. Please try again later.");
      } else {
        setWriters((data ?? []) as PublicWriterRow[]);
      }
      setLoading(false);
    }
    void load();
  }, []);

  const filteredAndSortedWriters = useMemo(() => {
    let result = [...writers];

    // 1. Filter by search query
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(
        (w) =>
          (w.pen_name && w.pen_name.toLowerCase().includes(q)) ||
          (w.full_name && w.full_name.toLowerCase().includes(q))
      );
    }

    // 2. Sort by primary sort option
    result.sort((a, b) => {
      if (sortOption === "a-z") {
        const nameA = (a.pen_name || a.full_name || "").toLowerCase();
        const nameB = (b.pen_name || b.full_name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      } else if (sortOption === "novels") {
        const countA = a.published_novels?.length || 0;
        const countB = b.published_novels?.length || 0;
        return countB - countA;
      }
      return 0;
    });

    // 3. Sort by featured first
    if (featuredFirst) {
      result.sort((a, b) => {
        const aFeatured = a.is_featured ? 1 : 0;
        const bFeatured = b.is_featured ? 1 : 0;
        return bFeatured - aFeatured;
      });
    }

    return result;
  }, [writers, debouncedQuery, sortOption, featuredFirst]);

  return (
    <div>
      <SEO 
        title="Our Published Writers | Urdu Novel Bank" 
        description="Explore the directory of talented writers published by Urdu Novel Bank. Discover the authors behind your favorite Urdu stories and novels." 
      />
      <PageHero
        eyebrow="Published Authors"
        title="Our Writers"
        titleUrdu="ہمارے ادیب"
        description="Talented authors who have shared their work with Urdu Novel Bank readers."
      />

      <div className="mx-auto max-w-5xl px-5 py-12">
        {loading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && writers.length === 0 && (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">
              No published writers yet — check back soon.
            </p>
          </div>
        )}

        {!loading && !error && writers.length > 0 && (
          <>
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="text-lg font-medium">
                {debouncedQuery.trim() ? (
                  <>Showing {filteredAndSortedWriters.length} of {writers.length} Total Writers</>
                ) : (
                  <>{writers.length} Total {writers.length === 1 ? "Writer" : "Writers"}</>
                )}
              </div>
              
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search writers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 sm:w-[250px]"
                  />
                </div>

                <div className="flex flex-row items-center gap-3">
                  <div className="flex-1 sm:flex-none">
                    <Select value={sortOption} onValueChange={(val) => setSortOption(val as SortOption)}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a-z">A-Z</SelectItem>
                        <SelectItem value="novels">Most Novels First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex h-10 shrink-0 items-center space-x-2 rounded-md border px-3 py-2">
                    <Switch
                      id="featured-first"
                      checked={featuredFirst}
                      onCheckedChange={setFeaturedFirst}
                    />
                    <Label htmlFor="featured-first" className="cursor-pointer whitespace-nowrap text-sm font-medium">
                      Featured First
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {filteredAndSortedWriters.length === 0 ? (
              <div className="py-16 text-center">
                <Search className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-4 text-muted-foreground">
                  No writers found matching "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedWriters.map((writer) => (
                  <WriterCard key={writer.id} writer={writer} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

