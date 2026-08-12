import { Link } from "react-router-dom";
import { site } from "@/data/content";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <h3 className="font-display text-lg font-semibold">{site.name}</h3>
          <p className="urdu mt-2 max-w-sm text-sm text-muted-foreground">{site.taglineUrdu}</p>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">{site.tagline}</p>
        </div>
        <div>
          <p className="text-sm font-semibold">For Writers</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/process" className="hover:text-foreground">
                Publication Process
              </Link>
            </li>
            <li>
              <Link to="/guidelines" className="hover:text-foreground">
                Submission Guidelines
              </Link>
            </li>
            <li>
              <Link to="/policy" className="hover:text-foreground">
                Publication Policy
              </Link>
            </li>
            <li>
              <Link to="/timeline" className="hover:text-foreground">
                Publication Timeline
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Portal</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/submit" className="hover:text-foreground">
                Submit Your Novel
              </Link>
            </li>
            <li>
              <Link to="/track" className="hover:text-foreground">
                Track Submission
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-foreground">
                FAQs
              </Link>
            </li>
            <li>
              <a href={site.mainSite} className="hover:text-foreground">
                Main Website
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto max-w-6xl px-5 py-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {site.name}. Writer &amp; Publication Portal.
        </div>
      </div>
    </footer>
  );
}