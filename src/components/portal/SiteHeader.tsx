import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/data/content";

type NavItem = {
  to?: string;
  label: string;
  children?: { to: string; label: string }[];
};

const nav: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/writers", label: "Writers" },
  { to: "/spotlights", label: "Spotlights" },
  { to: "/updates", label: "Updates" },
  { 
    label: "How it Works", 
    children: [
      { to: "/process", label: "Process" },
      { to: "/guidelines", label: "Guidelines" },
      { to: "/timeline", label: "Timeline" },
    ]
  },
  { to: "/faq", label: "FAQs" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const handleLinkClick = (to: string) => {
    if (location.pathname === to) {
      window.scrollTo(0, 0);
    }
    setOpen(false); // Close mobile menu if open
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex-none border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link to="/" className="flex items-center gap-3" onClick={() => handleLinkClick("/")}>
          <img 
            src="/unb-logo.png" 
            alt="Urdu Novel Bank" 
            className="h-12 w-12 md:h-14 md:w-14 object-cover rounded-full shadow-md" 
          />
          <span className="leading-tight">
            <span className="block font-display text-base font-semibold">{site.name}</span>
            <span className="block text-[11px] tracking-wide text-muted-foreground uppercase">
              Writer Portal
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            item.children ? (
              <div key={item.label} className="group relative">
                <button className="flex items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/10">
                  {item.label}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:rotate-180" />
                </button>
                <div className="pointer-events-none absolute left-0 top-full z-50 w-48 pt-1.5 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                  <div className="overflow-hidden rounded-md border border-border bg-background shadow-md">
                    <div className="flex flex-col py-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={() => handleLinkClick(child.to)}
                          className={({ isActive }) =>
                            `px-4 py-2 text-sm transition-colors ${
                              isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              item.to && (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => handleLinkClick(item.to)}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive ? "text-primary-foreground bg-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/10"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              )
            )
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary/5">
            <Link to="/track" onClick={() => handleLinkClick("/track")}>Track</Link>
          </Button>
          <Button asChild size="sm" className="shadow-soft">
            <Link to="/submit" onClick={() => handleLinkClick("/submit")}>Submit Novel</Link>
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
        <div className="border-t border-border bg-background lg:hidden relative z-50">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
            {nav.map((item) => (
              item.children ? (
                <div key={item.label} className="flex flex-col gap-1 py-1">
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {item.label}
                  </div>
                  <div className="flex flex-col pl-4 gap-1 border-l-2 border-border/50 ml-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={() => handleLinkClick(child.to)}
                        className={({ isActive }) =>
                          `rounded-md px-3 py-2 text-sm transition-colors ${
                            isActive ? "text-primary-foreground bg-primary" : "text-muted-foreground hover:bg-muted/50"
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ) : (
                item.to && (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => handleLinkClick(item.to)}
                    className={({ isActive }) =>
                      `rounded-md px-3 py-2.5 text-sm transition-colors ${
                        isActive ? "text-primary-foreground bg-primary" : "text-muted-foreground"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                )
              )
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
              <Button asChild variant="outline" onClick={() => handleLinkClick("/track")} className="border-primary/20 text-primary">
                <Link to="/track">Track</Link>
              </Button>
              <Button asChild onClick={() => handleLinkClick("/submit")} className="shadow-soft">
                <Link to="/submit">Submit Novel</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
      </header>

      {/* Mobile Menu Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}