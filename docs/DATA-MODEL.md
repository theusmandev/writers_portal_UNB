# Data model — Google Sheets & Drive

Create one spreadsheet named **Urdu Novel Bank — Writer Portal** with these tabs.
Column order matters: the Apps Script backend writes by position.

## Writers
`Writer ID | Full Name | Pen Name | Email | WhatsApp | Bio | Registration Date | Status`

## Submissions
`Submission ID | Writer ID | Writer Name | Email | Novel Title | Genre | Novel Status | Description | Word Count | Manuscript File ID | Manuscript URL | Cover File ID | Submission Date | Current Status | Current Stage | Last Updated | Admin Notes`

Allowed values for **Current Status**:
Received, Under Initial Review, Under Editorial Review, Action Required, Approved,
Formatting, Scheduled for Publication, Published, Rejected, Withdrawn.

## StatusHistory
`Submission ID | Old Status | New Status | Changed By | Date | Comment`

## Policies
`Policy ID | Title | Content | Version | Last Updated | Status`

## Timelines
`Stage | Expected Duration | Description | Active`

## FAQs
`Question | Answer | Category | Order | Published`

---

## Google Drive structure

```text
Urdu Novel Bank
└── Writer Portal            <- put this folder ID in CONFIG.DRIVE_ROOT_ID
    ├── Submissions
    │   └── 2026
    │       ├── UNB-2026-0001
    │       └── UNB-2026-0002
    ├── Covers
    ├── Published
    ├── Rejected
    └── Other Files
```

The script creates `Submissions/<year>/<Submission ID>` automatically and stores
the manuscript and cover inside it. Keep the root folder **private** — the
portal only ever shows file IDs to the admin, never to writers.

## Editing content without touching React

Today the Policies, Timelines, FAQs and Guidelines text lives in
`src/data/content.ts` — one file, plain text, no JSX. Edit it and republish.

Once the Apps Script API is connected, point `src/services/portalApi.ts` at the
`policies`, `timeline` and `faqs` GET actions and the same pages will read
straight from the spreadsheet, so you can edit content in Sheets.