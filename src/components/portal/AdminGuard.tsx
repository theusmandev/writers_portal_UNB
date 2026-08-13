import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";

/**
 * AdminGuard — wraps protected admin routes.
 * Redirects to /admin/login if there is no active Supabase session.
 * Shows a spinner while the session is being restored from storage.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
