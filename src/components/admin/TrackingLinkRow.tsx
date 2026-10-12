import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

export const PORTAL_BASE_URL = "https://portal.urdunovelbanks.com";

export function getTrackingUrl(submissionCode: string, email: string): string {
  return `${PORTAL_BASE_URL}/track?code=${submissionCode}&email=${encodeURIComponent(email)}`;
}

export function getAllSubmissionsUrl(email: string): string {
  return `${PORTAL_BASE_URL}/track?email=${encodeURIComponent(email)}`;
}

interface TrackingLinkRowProps {
  label: string;
  url: string;
  className?: string;
}

export function TrackingLinkRow({ label, url, className = "" }: TrackingLinkRowProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs w-full sm:w-max overflow-hidden ${className}`}
    >
      <span className="text-muted-foreground font-medium shrink-0">{label}</span>
      <span className="font-mono text-muted-foreground truncate min-w-0 flex-1 sm:flex-none sm:max-w-sm">
        {url}
      </span>
      <div className="flex items-center gap-1 ml-2 pl-3 border-l border-border/50 shrink-0">
        <button
          type="button"
          onClick={handleCopy}
          title="Copy Link"
          className="p-2 sm:p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
          className="p-2 sm:p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
