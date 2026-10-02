import { Link } from "react-router-dom";
import { Calendar, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { FadeIn } from "@/components/portal/FadeIn";

export type SpotlightSummary = {
  id: string;
  slug: string;
  spotlight_label: string | null;
  created_at: string;
  display_name: string;
};

interface SpotlightCardProps {
  spotlight: SpotlightSummary;
  delayMs?: number;
  layout?: "list" | "grid";
}

export function SpotlightCard({ spotlight, delayMs = 0, layout = "list" }: SpotlightCardProps) {
  const isList = layout === "list";

  return (
    <FadeIn 
      as="article"
      delayMs={delayMs}
      className={`group relative flex flex-col items-start justify-between rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all ${
        isList ? "sm:flex-row sm:items-center sm:gap-8 sm:p-8" : "h-full"
      }`}
    >
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <time dateTime={spotlight.created_at}>{formatDate(spotlight.created_at)}</time>
        </div>
        
        <h2 className={`font-serif font-semibold text-foreground group-hover:text-primary transition-colors leading-[1.3] ${
          isList ? "text-xl sm:text-2xl" : "text-xl"
        }`}>
          <Link to={`/spotlights/${spotlight.slug}`}>
            <span className="absolute inset-0" />
            {spotlight.display_name}
          </Link>
        </h2>
        
        {spotlight.spotlight_label && (
          <p className="text-sm font-medium text-amber-600 dark:text-amber-500 uppercase tracking-wider">
            {spotlight.spotlight_label}
          </p>
        )}
      </div>
      
      <div className={`mt-4 flex shrink-0 items-center ${isList ? "sm:mt-0" : "mt-auto pt-4"}`}>
        <span className="flex items-center gap-1 text-sm font-medium text-primary">
          View Spotlight <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </FadeIn>
  );
}
