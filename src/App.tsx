import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { SiteHeader } from "./components/portal/SiteHeader";
import { SiteFooter } from "./components/portal/SiteFooter";
import { AdminGuard } from "./components/portal/AdminGuard";
import { AdminLayout } from "./components/portal/AdminLayout";

// ── Public pages ──────────────────────────────────────────────────────────────
import Index from "./routes/index";
import Process from "./routes/process";
import Guidelines from "./routes/guidelines";
import Policy from "./routes/policy";
import Timeline from "./routes/timeline";
import Faq from "./routes/faq";
import Contact from "./routes/contact";
import SubmitPage from "./routes/submit";
import TrackPage from "./routes/track";
import WritersPage from "./routes/writers";

// ── Admin pages ───────────────────────────────────────────────────────────────
import AdminLoginPage from "./routes/admin/login";
import AdminDashboard from "./routes/admin/index";
import AdminSubmissions from "./routes/admin/submissions";
import AdminSubmissionDetail from "./routes/admin/submission-detail";
import AdminWriters from "./routes/admin/writers";
import AdminWriterDetail from "./routes/admin/writer-detail";
import NotFound from "./routes/not-found";

/** Public layout — wraps all public routes with the site header and footer */
function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Admin login (no auth guard, no public layout) ── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* ── Protected admin routes (require session, own layout) ── */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="submissions" element={<AdminSubmissions />} />
          <Route path="submissions/:id" element={<AdminSubmissionDetail />} />
          <Route path="writers" element={<AdminWriters />} />
          <Route path="writers/:id" element={<AdminWriterDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ── Public routes (with site header + footer) ── */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/process" element={<Process />} />
          <Route path="/guidelines" element={<Guidelines />} />
          <Route path="/policy" element={<Policy />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/writers" element={<WritersPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
