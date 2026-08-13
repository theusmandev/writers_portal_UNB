import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, FileText, Users, LogOut, BookOpen } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/submissions", label: "Submissions", icon: FileText, end: false },
  { to: "/admin/writers", label: "Writers", icon: Users, end: false },
] as const;

/**
 * AdminLayout — shell for all protected admin pages.
 * Fixed left sidebar with nav links and logout; right <Outlet /> for page content.
 */
export function AdminLayout() {
  const { signOut, session } = useAdminAuth();

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar ── */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
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
        <nav className="flex-1 space-y-0.5 p-2">
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
            {session?.user.email}
          </p>
          <button
            onClick={() => void signOut()}
            className="mt-0.5 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Page content ── */}
      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
