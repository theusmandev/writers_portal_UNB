import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, Users, Newspaper, LogOut, BookOpen, Settings, Menu, Star } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { SEO } from "@/components/SEO";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/submissions", label: "Submissions", icon: FileText, end: false },
  { to: "/admin/writers", label: "Writers", icon: Users, end: false },
  { to: "/admin/posts", label: "Posts", icon: Newspaper, end: false },
  { to: "/admin/spotlights", label: "Spotlights", icon: Star, end: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, end: false },
] as const;

/**
 * AdminLayout — shell for all protected admin pages.
 * Desktop: Fixed left sidebar with nav links; right <Outlet /> for page content.
 * Mobile: Top bar with hamburger menu, drawer slides in from left.
 */
export function AdminLayout() {
  const { signOut, session } = useAdminAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Auto-close drawer on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">UNB Portal</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-border p-2">
        <p className="truncate px-3 py-1 text-[11px] text-muted-foreground">
          {session?.user?.email}
        </p>
        <button
          onClick={() => void signOut()}
          className="mt-0.5 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen flex-col md:flex-row bg-background">
      <SEO 
        noindex 
        title="Admin Portal | UNB" 
        description="Internal admin portal" 
      />

      {/* ── Mobile Top Bar ── */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">UNB Portal</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="rounded-md p-1.5 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card md:flex">
        {sidebarContent}
      </aside>

      {/* ── Mobile Drawer ── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative flex w-64 max-w-[80%] flex-col border-r border-border bg-card shadow-lg animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ── Page content ── */}
      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
