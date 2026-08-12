# Connecting the backend (Phase 2)

The portal frontend is finished and runs standalone. To make submissions real:

## 1. Create the spreadsheet and Drive folder
Follow `docs/DATA-MODEL.md`. Note the spreadsheet ID (from its URL) and the
`Writer Portal` folder ID.

## 2. Deploy the Apps Script
1. Open the spreadsheet → **Extensions → Apps Script**.
2. Replace `Code.gs` with `docs/google-apps-script/Code.gs`.
3. Fill in `CONFIG.SHEET_ID`, `CONFIG.DRIVE_ROOT_ID`, `CONFIG.ADMIN_TOKEN`
   (a long random string — never put it in the frontend).
4. **Deploy → New deployment → Web app**: execute as *Me*, access *Anyone*.
5. Copy the `/exec` URL.

## 3. Point the portal at it
Set the environment variable before building:

```
VITE_PORTAL_API_URL=https://script.google.com/macros/s/AKfy.../exec
```

`src/services/portalApi.ts` switches from browser-only preview mode to real API
calls automatically. No component changes are needed.

### File uploads
Apps Script receives files as base64. In `submitNovel()` read the File objects
with `FileReader.readAsDataURL`, strip the `data:...;base64,` prefix and send
`{ name, mimeType, data }` for `manuscript` and `cover`. Keep the 25 MB limit —
Apps Script rejects larger payloads.

## Security notes
- The admin token lives only in the Apps Script `CONFIG` and in your admin tool
  (Apps Script sidebar or a Postman request). Never ship it to the browser.
- Sheet and Drive IDs stay server-side; the frontend only ever sees the fields
  returned by the API.
- Tracking always requires Submission ID **and** the matching email.
- Apps Script free quotas: ~100 emails/day (consumer Gmail), 6 min per request,
  50 MB per file created. These are the practical ceilings of the zero-cost setup.

## Hosting note
This project is built with plain React + Vite and React Router, and is configured
for deployment on GitHub Pages. A GitHub Actions workflow automatically builds
the SPA on pushes to `main` and publishes the static `dist/` directory.

The custom domain (`portal.urdunovelbanks.com`) is preserved via the `public/CNAME` file.