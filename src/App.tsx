import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { SiteHeader } from "./components/portal/SiteHeader";
import { SiteFooter } from "./components/portal/SiteFooter";
import { AdminGuard } from "./components/portal/AdminGuard";
import { AdminLayout } from "./components/portal/AdminLayout";
import { NotificationBar } from "./components/portal/NotificationBar";
import { ScrollToTop } from "./components/portal/ScrollToTop";
import { BackToTop } from "./components/portal/BackToTop";

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
import FeaturedWritersList from "./routes/writers/featured-writers-list";
import FeaturedWriterPage from "./routes/writers/featured-writer";
import PostsPage from "./routes/posts";
import PostDetailPage from "./routes/post-detail";
import SpotlightsPage from "./routes/spotlights/index";
import SpotlightPage from "./routes/spotlights/spotlight";

// ── Admin pages ───────────────────────────────────────────────────────────────
const AdminLoginPage = React.lazy(() => import("./routes/admin/login"));
const AdminDashboard = React.lazy(() => import("./routes/admin/index"));
const AdminSubmissions = React.lazy(() => import("./routes/admin/submissions"));
const AdminSubmissionDetail = React.lazy(() => import("./routes/admin/submission-detail"));
const AdminWriters = React.lazy(() => import("./routes/admin/writers"));
const AdminWriterDetail = React.lazy(() => import("./routes/admin/writer-detail"));
const AdminPosts = React.lazy(() => import("./routes/admin/posts"));
const AdminPostEdit = React.lazy(() => import("./routes/admin/post-edit"));
const AdminSpotlights = React.lazy(() => import("./routes/admin/spotlights"));
const AdminSpotlightEdit = React.lazy(() => import("./routes/admin/spotlight-edit"));
const AdminSettings = React.lazy(() => import("./routes/admin/settings"));
const NotFound = React.lazy(() => import("./routes/not-found"));
const WriterStatsPage = React.lazy(() => import("./routes/writer-stats"));

/** Public layout — wraps all public routes with the site header and footer */
function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <NotificationBar />
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <BackToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* ── Admin login (no auth guard, no public layout) ── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* ── Writer analytics dashboard (bare, token-gated, noindex) ── */}
        <Route path="/writer-stats/:token" element={<WriterStatsPage />} />

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
          <Route path="posts" element={<AdminPosts />} />
          <Route path="posts/new" element={<AdminPostEdit />} />
          <Route path="posts/:id/edit" element={<AdminPostEdit />} />
          <Route path="spotlights" element={<AdminSpotlights />} />
          <Route path="spotlights/new" element={<AdminSpotlightEdit />} />
          <Route path="spotlights/:id/edit" element={<AdminSpotlightEdit />} />
          <Route path="settings" element={<AdminSettings />} />
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
          <Route path="/writers/featured" element={<FeaturedWritersList />} />
          <Route path="/writers/featured/:slug" element={<FeaturedWriterPage />} />
          <Route path="/updates" element={<PostsPage />} />
          <Route path="/updates/:slug" element={<PostDetailPage />} />
          <Route path="/spotlights" element={<SpotlightsPage />} />
          <Route path="/spotlights/:slug" element={<SpotlightPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
