import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import fs from "fs";
import path from "path";

function prerenderTrackRoute() {
  return {
    name: "prerender-track-route",
    closeBundle() {
      const distPath = path.resolve(__dirname, "dist");
      const indexPath = path.join(distPath, "index.html");
      const trackDirPath = path.join(distPath, "track");
      const trackIndexPath = path.join(trackDirPath, "index.html");

      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, "utf-8");

        // Update Title
        html = html.replace(
          '<title>Urdu Novel Bank — Writer & Publication Portal</title>',
          '<title>Track Your Submission — Urdu Novel Bank</title>'
        );

        // Update Description
        html = html.replace(
          '<meta name="description" content="Submit, review and track Urdu novels with Urdu Novel Bank\'s official writer portal." />',
          '<meta name="description" content="Check your novel\'s submission status and progress on Urdu Novel Bank." />'
        );

        const ogTags = `
    <meta property="og:title" content="Track Your Submission — Urdu Novel Bank" />
    <meta property="og:description" content="Check your novel's submission status and progress on Urdu Novel Bank." />
    <meta property="og:image" content="https://portal.urdunovelbanks.com/banner.png" />
    <meta property="og:url" content="https://portal.urdunovelbanks.com/track" />
    <meta name="twitter:title" content="Track Your Submission — Urdu Novel Bank" />
    <meta name="twitter:description" content="Check your novel's submission status and progress on Urdu Novel Bank." />
    <meta name="twitter:image" content="https://portal.urdunovelbanks.com/banner.png" />
    <meta name="twitter:card" content="summary_large_image" />
`;

        html = html.replace('</head>', ogTags + '  </head>');

        if (!fs.existsSync(trackDirPath)) {
          fs.mkdirSync(trackDirPath, { recursive: true });
        }
        fs.writeFileSync(trackIndexPath, html);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths(), prerenderTrackRoute()],
  base: "/",
  build: {
    outDir: "dist",
  },
});
