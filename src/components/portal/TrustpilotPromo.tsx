import { useSiteSettings } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export interface TrustpilotPromoProps {
  variant?: "banner" | "compact" | "card";
  headline?: string;
  className?: string;
}

/** Crisp 5-point star SVG matching Trustpilot's star icon */
function StarSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2l2.92 6.24 6.88.9-5.04 4.77 1.28 6.84L12 17.45l-6.04 3.3 1.28-6.84-5.04-4.77 6.88-.9L12 2z" />
    </svg>
  );
}

/** Standalone Trustpilot Star Icon */
function TrustpilotStarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2l2.92 6.24 6.88.9-5.04 4.77 1.28 6.84L12 17.45l-6.04 3.3 1.28-6.84-5.04-4.77 6.88-.9L12 2z" />
    </svg>
  );
}

export function TrustpilotPromo({
  variant = "banner",
  headline = "Share your experience on Trustpilot",
  className,
}: TrustpilotPromoProps) {
  const { settings } = useSiteSettings();

  if (!settings.show_trustpilot || !settings.trustpilot_url) {
    return null;
  }

  const reviewUrl = settings.trustpilot_url;

  // ── Variant: Compact (For Footer or Header/Sidebar badge) ──────────────────
  if (variant === "compact") {
    return (
      <a
        href={reviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Review Urdu Novel Bank on Trustpilot"
        className={cn(
          "inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-secondary-foreground/20 bg-background/5 text-secondary-foreground text-xs font-medium backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#00B67A]/50 hover:bg-background/10 hover:shadow-[0_0_12px_rgba(0,182,122,0.2)] group",
          className,
        )}
      >
        <div className="flex items-center gap-1.5">
          <TrustpilotStarIcon className="size-4 text-[#00B67A] shrink-0" />
          <span className="font-semibold tracking-tight group-hover:text-primary-foreground transition-colors">
            Review us on <span className="font-bold">Trustpilot</span>
          </span>
        </div>
        {/* 5 mini green star boxes */}
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="size-3.5 bg-[#00B67A] rounded-[2px] flex items-center justify-center p-0.5 shadow-2xs"
            >
              <StarSvg className="size-full text-white fill-white" />
            </div>
          ))}
        </div>
      </a>
    );
  }

  // ── Variants: Banner & Card (Calm, cohesive card design matching portal aesthetic) ─
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-5 md:p-6 shadow-soft transition-all duration-300 hover:shadow-md",
        className,
      )}
    >
      {/* Subtle corner decorative accent */}
      <div className="absolute top-0 right-0 size-28 bg-[#00B67A]/5 rounded-bl-full pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 relative z-10">
        <div className="space-y-2 text-left">
          {/* Trustpilot-style 5-star row & wordmark */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="size-5 sm:size-5.5 bg-[#00B67A] text-white p-1 rounded-xs flex items-center justify-center shadow-xs"
                >
                  <StarSvg className="size-full text-white fill-white" />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1 font-bold text-xs sm:text-sm tracking-tight text-foreground">
              <span>Trustpilot</span>
              <TrustpilotStarIcon className="size-3.5 sm:size-4 text-[#00B67A]" />
            </div>
          </div>

          {/* Headline */}
          <h3 className="font-display text-base sm:text-lg font-semibold text-foreground tracking-tight leading-snug">
            {headline}
          </h3>

          {/* Subtext (English) */}
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
            Your honest feedback helps fellow Urdu writers discover a transparent, respectful
            publishing home.
          </p>

          {/* Subtext (Urdu RTL) */}
          <p
            className="urdu text-sm sm:text-base text-foreground/85 pt-0.5 leading-relaxed"
            dir="rtl"
          >
            اپنا تجربہ ٹرسٹ پائلٹ پر شیئر کریں — آپ کی رائے نئے لکھاریوں کی رہنمائی اور حوصلہ افزائی
            کرتی ہے۔
          </p>
        </div>

        {/* CTA Button */}
        <div className="shrink-0 pt-1 sm:pt-0 self-start sm:self-center">
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#00B67A] hover:bg-[#009e6a] text-white font-medium px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-xl shadow-xs hover:shadow transition-all duration-200 group text-xs sm:text-sm cursor-pointer whitespace-nowrap"
          >
            <span>Write a Review</span>
            <ExternalLink className="size-3.5 sm:size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
