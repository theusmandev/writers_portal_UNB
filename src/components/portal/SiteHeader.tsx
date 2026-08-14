import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/data/content";

const nav = [
  { to: "/", label: "Home" },
  { to: "/updates", label: "Updates" },
  { to: "/process", label: "Process" },
  { to: "/guidelines", label: "Guidelines" },
  { to: "/policy", label: "Policy" },
  { to: "/timeline", label: "Timeline" },
  { to: "/faq", label: "FAQs" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <BookOpen className="size-4.5" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-semibold">{site.name}</span>
            <span className="block text-[11px] tracking-wide text-muted-foreground uppercase">
              Writer Portal
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? "text-primary-foreground bg-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/10"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary/5">
            <Link to="/track">Track</Link>
          </Button>
          <Button asChild size="sm" className="shadow-soft">
            <Link to="/submit">Submit Novel</Link>
          </Button>
        </div>

        <button
          className="rounded-md p-2 text-primary lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2.5 text-sm transition-colors ${
                    isActive ? "text-primary-foreground bg-primary" : "text-muted-foreground"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button asChild variant="outline" onClick={() => setOpen(false)} className="border-primary/20 text-primary">
                <Link to="/track">Track</Link>
              </Button>
              <Button asChild onClick={() => setOpen(false)} className="shadow-soft">
                <Link to="/submit">Submit Novel</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}