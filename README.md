# Urdu Quill Portal

# Urdu Novel Bank — Writer & Publication Portal

## Complete Project Brief & Development Plan

### 1. Project Background

I run a platform called **Urdu Novel Bank**, which is focused on Urdu novels and Urdu literature.

The main website is:

**https://www.urdunovelbanks.com**

The platform publishes Urdu novels written by different writers/authors. We receive novel submissions from writers, review their submissions, communicate with writers, format their novels when required, and publish eligible novels on our platform.

The platform has a growing writers' community, and I regularly communicate with writers regarding:

* Novel submissions
* Publication requirements
* Manuscript formatting
* Episode/complete novel requirements
* Publication timelines
* Writer guidelines
* Cover requirements
* Corrections
* Publication status
* General questions about publishing on Urdu Novel Bank

Currently, much of this communication and process is handled manually through WhatsApp, email, Google Drive, Google Sheets, and the main website.

As the number of writers and submissions increases, I want to create a **dedicated Writer & Publication Portal** to make the entire process more organized and professional.

---

# 2. Why I Am Building This Portal

The purpose of this portal is to create a central place where writers can understand the complete publication process and submit their novels.

I do NOT want the portal to simply be another information website.

It should eventually become a proper **writer management and submission system**.

The portal should allow a writer to:

1. Understand Urdu Novel Bank's publication policies.
2. Read submission guidelines.
3. Understand how the publication process works.
4. Know the expected review/publication timelines.
5. Prepare their manuscript according to the requirements.
6. Submit their novel through an online form.
7. Upload their manuscript.
8. Receive a unique submission ID.
9. Track their submission status.
10. Receive updates when the status changes.
11. Eventually have a personal writer dashboard.

The system should also make the administrator's work easier by organizing all submissions and writer information.

---

# 3. Main Domain Structure

The main website is:

**urdunovelbanks.com**

The new portal should use a subdomain:

**portal.urdunovelbanks.com**

The portal should have its own independent frontend but remain visually and professionally connected to the Urdu Novel Bank brand.

---

# 4. Technology Requirements

The website should be built using:

### Frontend

* React
* Vite
* React Router
* Modern JavaScript
* Responsive CSS
* Prefer a clean component-based architecture

Tailwind CSS can be used if it improves development and maintainability.

### Hosting

The frontend must be deployable on:

**GitHub Pages**

It must not require paid hosting.

### Backend

Use:

**Google Apps Script**

as the backend/API layer.

### Database

Use:

**Google Sheets**

as the initial database.

### File Storage

Use:

**Google Drive**

for storing uploaded manuscripts and related files.

### Email

Use:

**Google Apps Script + Gmail**

for automated emails/notifications where appropriate.

---

# 5. Overall Architecture

The expected architecture is:

```text
                    Urdu Novel Bank
                          |
                          |
             portal.urdunovelbanks.com
                          |
                          ▼
                    GitHub Pages
                          |
                          ▼
                    React Frontend
                          |
                          ▼
                 Google Apps Script
                    Backend / API
                    /           \
                   /             \
                  ▼               ▼
         Google Sheets       Google Drive
           Database          File Storage
                  |
                  ▼
              Gmail
        Email Notifications
```

The frontend must never directly expose private Google Drive or Google Sheet information.

The Google Apps Script layer should handle communication with Google services.

---

# 6. Main Website Sections

The portal should initially contain the following sections:

## Home

A professional introduction to the Urdu Novel Bank Writer Portal.

Possible sections:

* Welcome message
* What is Urdu Novel Bank?
* Who can submit?
* How the process works
* Important guidelines
* Submit Your Novel button
* Track Submission button
* FAQs

---

# 7. For Writers

Create a dedicated section called:

**For Writers**

It should contain:

### Publication Process

Explain the complete journey:

```text
Submission
   ↓
Submission Confirmation
   ↓
Initial Screening
   ↓
Editorial Review
   ↓
Corrections / Additional Information
   ↓
Approval
   ↓
Formatting / Preparation
   ↓
Publication Scheduling
   ↓
Publication
```

The exact stages should be configurable from the admin side later.

---

# 8. Submission Guidelines

Create a detailed page explaining:

* What types of novels are accepted
* Whether complete novels are preferred/required
* Accepted file formats
* Manuscript formatting requirements
* Author information requirements
* Cover requirements
* Content guidelines
* Originality requirements
* Copyright-related requirements
* What information writers need to provide
* Reasons a submission may be rejected
* Expected review time
* Publication timeline

All of these should ideally be stored in a configurable manner rather than hard-coded throughout the application.

---

# 9. Publication Policy

Create a professional policy page.

The policy should explain:

* Submission conditions
* Publication conditions
* Editorial review
* Formatting
* Corrections
* Publication rights/permissions
* Author responsibilities
* Platform responsibilities
* Withdrawal/cancellation process
* Rejection conditions
* Communication policy
* Any other relevant terms

The admin should eventually be able to update the policy without modifying the React source code.

---

# 10. Timeline Page

Create a dedicated:

**Publication Timeline**

page.

For example:

```text
Submission Received
        ↓
Initial Review
        ↓
Editorial Review
        ↓
Decision
        ↓
Formatting
        ↓
Publication
```

The timeline should clearly explain that actual processing time may vary depending on:

* Number of submissions
* Manuscript length
* Required corrections
* Formatting requirements
* Editorial workload
* Communication delays

The timeline values should ideally be configurable from Google Sheets.

---

# 11. Submit Your Novel

This is one of the most important parts of the portal.

Create a professional submission form.

Suggested fields:

### Writer Information

* Full Name
* Pen Name
* Email Address
* WhatsApp Number
* City/Country (optional)
* Writer Bio

### Novel Information

* Novel Title
* Author/Pen Name
* Genre
* Novel Status

  * Complete
  * Ongoing
* Approximate Word Count
* Number of Pages
* Short Description/Synopsis
* Novel Language

### Files

* Manuscript
* Cover (optional/if required)

### Confirmation

Checkboxes such as:

* I have read the submission guidelines.
* I agree to the publication policy.
* I confirm that the submitted work belongs to me / I have the necessary rights to submit it.

Then:

**Submit Novel**

---

# 12. Submission ID

Every successful submission must receive a unique ID.

Example:

```text
UNB-2026-0001
UNB-2026-0002
UNB-2026-0003
```

The ID should be generated automatically by the backend.

The writer should see:

```text
Submission Successful

Thank you for submitting your novel.

Submission ID:
UNB-2026-0001

Please save this ID for future reference.
```

The writer should also receive the submission ID by email.

---

# 13. Google Sheets Database

Google Sheets will initially act as the database.

Create separate sheets/tables such as:

### Writers

```text
Writer ID
Full Name
Pen Name
Email
WhatsApp
Bio
Registration Date
Status
```

### Submissions

```text
Submission ID
Writer ID
Writer Name
Email
Novel Title
Genre
Novel Status
Description
Word Count
Manuscript File ID
Manuscript URL
Cover File ID
Submission Date
Current Status
Current Stage
Last Updated
Admin Notes
```

### Status History

```text
Submission ID
Old Status
New Status
Changed By
Date
Comment
```

### Policies

```text
Policy ID
Title
Content
Version
Last Updated
Status
```

### Timelines

```text
Stage
Expected Duration
Description
Active
```

### FAQs

```text
Question
Answer
Category
Order
Published
```

---

# 14. Google Drive Structure

Create a structured Google Drive system.

Example:

```text
Urdu Novel Bank
│
└── Writer Portal
    │
    ├── Submissions
    │   ├── 2026
    │   │   ├── UNB-2026-0001
    │   │   ├── UNB-2026-0002
    │   │   └── UNB-2026-0003
    │
    ├── Covers
    │
    ├── Published
    │
    ├── Rejected
    │
    └── Other Files
```

The backend should automatically organize uploaded files where possible.

---

# 15. Submission Tracking

Create a page:

**Track Submission**

The initial version can use:

```text
Submission ID
+
Email Address
```

Example:

```text
Submission ID:
UNB-2026-0001

Email:
writer@example.com

[Track Submission]
```

The system should verify both pieces of information before showing submission details.

---

# 16. Submission Status

Possible statuses:

```text
Received
Under Initial Review
Under Editorial Review
Action Required
Approved
Formatting
Scheduled for Publication
Published
Rejected
Withdrawn
```

The administrator should be able to change the status.

---

# 17. Writer Dashboard — Future Feature

The architecture should be designed so that a full writer account system can be added later.

Future dashboard:

```text
Writer Dashboard

Welcome, [Writer Name]

My Submissions

----------------------------------
Novel          Status
----------------------------------
Mera Safar     Under Review
Mazi           Approved
----------------------------------

Recent Updates

Profile

Publication History

Messages

Logout
```

Do not over-engineer authentication in version 1 unless necessary.

The first version can use:

**Email + Submission ID**

for tracking.

---

# 18. Admin Dashboard

The portal should eventually have a separate admin area.

Example:

```text
Admin Dashboard

Total Writers
Total Submissions
Pending Reviews
Approved
Rejected
Published
```

### Admin Menu

```text
Dashboard
Writers
Submissions
Pending Review
Approved
Rejected
Published
Policies
Guidelines
Timelines
FAQs
Settings
```

---

# 19. Admin Submission Management

Admin should be able to:

* View submissions
* Search submissions
* Filter by status
* Filter by genre
* Open writer details
* Open manuscript
* Download manuscript
* Change status
* Add internal notes
* Update timeline
* Send notification
* View submission history

Every important status change should be logged.

---

# 20. Email Notifications

Automated emails should eventually be supported.

Examples:

### Submission Received

```text
Your novel submission has been received.

Submission ID:
UNB-2026-0001
```

### Status Changed

```text
Your submission status has been updated.

Previous Status:
Under Initial Review

New Status:
Under Editorial Review
```

### Action Required

```text
Additional information/correction is required for your submission.
```

### Approved

```text
Your novel has been approved for publication.
```

### Published

```text
Your novel has been published on Urdu Novel Bank.
```

Email templates should ideally be configurable.

---

# 21. Design Requirements

The design should feel:

* Professional
* Elegant
* Modern
* Literary
* Trustworthy
* Clean
* Responsive

The portal is related to Urdu literature, so the design should subtly reflect Urdu publishing/literature without becoming overly decorative.

Avoid an overly complicated or flashy design.

Use generous spacing, readable typography, clear cards, professional forms, and intuitive navigation.

---

# 22. Urdu + English Support

The portal should support Urdu properly.

The interface may contain both:

**English labels + Urdu explanatory content**

or eventually support:

```text
اردو | English
```

The architecture should allow bilingual content later.

For Urdu content, use a suitable Urdu font such as:

**Jameel Noori Nastaleeq**

where appropriate.

However, UI elements such as buttons, forms and dashboards should prioritize readability.

---

# 23. Responsive Design

The portal must work properly on:

* Desktop
* Laptop
* Tablet
* Android phones
* iPhones

A large number of writers may access the portal through mobile devices, so the submission form must be especially mobile-friendly.

---

# 24. GitHub Repository Structure

Suggested structure:

```text
urdu-novel-bank-portal/
│
├── public/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   ├── data/
│   ├── App.jsx
│   └── main.jsx
│
├── .github/
│   └── workflows/
│
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

Use a clean, scalable architecture.

---

# 25. GitHub Pages Deployment

The project must be configured specifically for GitHub Pages.

Use:

**Vite + React**

and configure the correct base path if required.

Prefer automated deployment using:

**GitHub Actions**

so that whenever I push changes to the main branch, the website can automatically build and deploy.

The custom domain will be:

```text
portal.urdunovelbanks.com
```

---

# 26. Custom Domain

The final website should work at:

**portal.urdunovelbanks.com**

The project should include instructions for:

* GitHub Pages custom domain
* DNS configuration
* CNAME
* HTTPS
* Deployment

Do not hard-code the domain in a way that makes local development difficult.

---

# 27. Google Apps Script API

Create a separate Google Apps Script backend.

The API should eventually support operations such as:

```text
POST /submit
GET /track
GET /policies
GET /guidelines
GET /timeline
GET /faqs
POST /admin/status
POST /admin/notification
```

The exact implementation can use Apps Script `doGet()` and `doPost()`.

Use structured JSON responses.

Example:

```json
{
  "success": true,
  "submissionId": "UNB-2026-0001",
  "message": "Submission received successfully."
}
```

---

# 28. Security Requirements

Security is important.

Never expose:

* Google Sheet IDs unnecessarily
* Google Drive private file IDs unnecessarily
* Google service credentials
* API secrets
* Admin credentials
* private information

The React frontend should not directly access private Google services.

Google Apps Script should validate incoming requests.

Submission tracking should require sufficient verification.

Admin functionality must not be publicly accessible without authentication/authorization.

---

# 29. Error Handling

The system should handle:

* Missing fields
* Invalid email
* Invalid file type
* File too large
* Network failure
* Google Apps Script failure
* Duplicate submission
* Invalid submission ID
* Invalid email/submission combination
* Server/API errors

Users should receive understandable messages instead of technical errors.

---

# 30. Important UX Principle

Do not make the writer feel like they are filling out a complicated government form.

The process should be simple:

```text
Read Guidelines
      ↓
Prepare Manuscript
      ↓
Submit
      ↓
Receive Submission ID
      ↓
Track Status
```

The portal should clearly explain what happens next.

---

# 31. Development Strategy

Do NOT build everything at once.

Build in phases.

## Phase 1 — Foundation

Create:

* React + Vite project
* GitHub repository
* Basic layout
* Navbar
* Footer
* Responsive design
* Home page
* About page
* Publication Process
* Guidelines
* Policy
* Timeline
* FAQ
* Contact

Deploy the first version to GitHub Pages.

---

## Phase 2 — Submission System

Build:

* Submission form
* Form validation
* Google Apps Script backend
* Google Sheets integration
* Google Drive upload
* Unique Submission ID
* Confirmation page
* Email confirmation

---

## Phase 3 — Tracking System

Build:

* Track Submission page
* Submission ID + Email verification
* Status display
* Current stage
* Submission date
* Last updated
* Timeline

---

## Phase 4 — Admin System

Build:

* Admin login
* Dashboard
* Submission management
* Search
* Filters
* Status changes
* Notes
* Status history
* Email notifications

---

## Phase 5 — Writer Accounts

Later add:

* Writer registration
* Login
* Writer dashboard
* Profile
* Multiple submissions
* Submission history
* Notifications
* Publication history

---

# 32. Future Scalability

The system should be designed so that Google Sheets can eventually be replaced by a proper database without rebuilding the entire frontend.

Therefore, keep database/API logic separated from UI components.

For example:

```text
React Components
       ↓
Service Layer
       ↓
API
       ↓
Google Apps Script
       ↓
Google Sheets
```

Later:

```text
React Components
       ↓
Service Layer
       ↓
API
       ↓
Supabase / Firebase / PostgreSQL
```

This is important because the portal may grow significantly in the future.

---

# 33. What I Expect From You as the AI Developer

Do not simply generate random files.

First understand the complete project architecture.

Then:

1. Explain the architecture briefly.
2. Identify any technical risks.
3. Propose the folder structure.
4. Create the frontend.
5. Create the Google Apps Script backend.
6. Define the Google Sheet structure.
7. Define the Google Drive structure.
8. Implement the submission workflow.
9. Implement tracking.
10. Implement responsive design.
11. Provide deployment instructions.
12. Test all important flows.
13. Explain how I can modify policies, FAQs and timelines without editing React code where possible.

When generating code, keep it clean, modular and maintainable.

Do not put the entire application into one huge React component.

---

# 34. Important Constraint

The initial goal is to keep the system as close to **zero-cost** as possible.

The preferred infrastructure is:

* GitHub Pages — hosting
* Google Apps Script — backend
* Google Sheets — database
* Google Drive — file storage
* Gmail — email

Avoid paid hosting or paid backend services unless they become necessary later.

If any part of the proposed system cannot realistically be implemented using these free services, explain the limitation before changing the architecture.

---

# 35. Final Product Goal

The final product should feel like an official **Urdu Novel Bank Writer Portal**, not a generic form website.

A writer should be able to visit:

**portal.urdunovelbanks.com**

and immediately understand:

> What is Urdu Novel Bank?
> Can I submit my novel?
> What are the requirements?
> How does publication work?
> How long does it take?
> How do I submit my novel?
> How can I track my submission?

The long-term goal is to transform the current manual writer communication and submission process into a structured, transparent and professional digital workflow.

The portal should make the process easier for both:

**Writers + Urdu Novel Bank Administration**

while keeping the system simple, affordable and scalable.


## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
