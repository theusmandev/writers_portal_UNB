import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SiteHeader } from "./components/portal/SiteHeader";
import { SiteFooter } from "./components/portal/SiteFooter";

// Page imports
import Index from "./routes/index";
import Process from "./routes/process";
import Guidelines from "./routes/guidelines";
import Policy from "./routes/policy";
import Timeline from "./routes/timeline";
import Faq from "./routes/faq";
import Contact from "./routes/contact";
import SubmitPage from "./routes/submit";
import TrackPage from "./routes/track";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/process" element={<Process />} />
            <Route path="/guidelines" element={<Guidelines />} />
            <Route path="/policy" element={<Policy />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/submit" element={<SubmitPage />} />
            <Route path="/track" element={<TrackPage />} />
          </Routes>
        </main>
        <SiteFooter />
      </div>
    </BrowserRouter>
  );
}
