/**
 * Single source of truth for all editable portal content.
 *
 * Phase 2 note: every export here mirrors a Google Sheet tab
 * (Policies / Timelines / FAQs / Guidelines). Once the Apps Script API is
 * live, `src/services/portalApi.ts` can fetch the same shapes remotely and
 * these objects become the offline fallback — no component changes needed.
 */

export const site = {
  name: "Urdu Novel Bank",
  portalName: "Writer & Publication Portal",
  nameUrdu: "اردو ناول بینک",
  tagline: "A structured, transparent home for Urdu novels and the writers behind them.",
  taglineUrdu: "اردو ناولوں اور ان کے لکھنے والوں کے لیے ایک منظم اور شفاف پلیٹ فارم۔",
  mainSite: "https://www.urdunovelbanks.com",
  email: "urdunovelbankofficial@gmail.com",
  reviewWindow: "7–21 days",
};

export type ProcessStage = {
  key: string;
  title: string;
  titleUrdu: string;
  description: string;
  duration: string;
};

export const processStages: ProcessStage[] = [
  {
    key: "submission",
    title: "Submission",
    titleUrdu: "ناول جمع کروانا",
    description:
      "You send the manuscript through the submission form along with your writer details and novel information.",
    duration: "Same day",
  },
  {
    key: "confirmation",
    title: "Submission Confirmation",
    titleUrdu: "وصولی کی تصدیق",
    description:
      "A unique Submission ID is generated and emailed to you. Keep it safe — it is used for all future tracking.",
    duration: "Within 24 hours",
  },
  {
    key: "screening",
    title: "Initial Screening",
    titleUrdu: "ابتدائی جانچ",
    description:
      "We check completeness, file readability, language, originality and whether the work fits our content guidelines.",
    duration: "2–4 days",
  },
  {
    key: "editorial",
    title: "Editorial Review",
    titleUrdu: "ادارتی جائزہ",
    description:
      "The manuscript is read by our editorial team for story quality, structure, language and reader suitability.",
    duration: "7–14 days",
  },
  {
    key: "corrections",
    title: "Corrections / Information Required",
    titleUrdu: "اصلاح یا اضافی معلومات",
    description:
      "If something is missing or needs improvement, we contact you with clear, specific notes.",
    duration: "Depends on the writer",
  },
  {
    key: "approval",
    title: "Approval",
    titleUrdu: "منظوری",
    description: "The novel is accepted for publication on Urdu Novel Bank.",
    duration: "1–3 days after review",
  },
  {
    key: "formatting",
    title: "Formatting & Preparation",
    titleUrdu: "فارمیٹنگ اور تیاری",
    description:
      "Text is cleaned, paginated, episode-split where needed, and the cover is prepared or finalised.",
    duration: "3–7 days",
  },
  {
    key: "scheduling",
    title: "Publication Scheduling",
    titleUrdu: "اشاعت کا شیڈول",
    description: "A publication date (or episode schedule) is assigned and shared with you.",
    duration: "1–5 days",
  },
  {
    key: "publication",
    title: "Publication",
    titleUrdu: "اشاعت",
    description:
      "The novel goes live on urdunovelbanks.com and is shared with our readers' community.",
    duration: "On schedule",
  },
];

export type GuidelineSection = {
  title: string;
  items: string[];
  note?: string;
};

export const guidelines: GuidelineSection[] = [
  {
    title: "What we accept",
    items: [
      "Original Urdu novels, novelettes and long-form serialised fiction.",
      "Popular genres: social, romantic, suspense, historical, thriller, family drama, adventure.",
      "Complete novels are strongly preferred. Ongoing novels are accepted only when at least 5 episodes are ready.",
      "Roman Urdu is not accepted. Urdu script only.",
    ],
  },
  {
    title: "Ongoing novel submissions",
    items: [
      "Minimum requirement: At least 5 episodes must be ready and uploaded to submit a new ongoing novel.",
      "Each episode must be uploaded as a separate file (not one combined document).",
      "The same file formats (e.g. .docx) and 25 MB size limit apply to each individual episode file.",
      "Adding more episodes: Once submitted, you can upload new episodes as they become ready by visiting the Track Submission page and using the 'Add New Episodes' option.",
    ],
  },
  {
    title: "File formats",
    items: [
      "Preferred: .docx (Microsoft Word) or .doc",
      "Also accepted: .pdf, .txt, .rtf",
      "Maximum file size: 25 MB per file.",
      "Scanned images of handwritten pages are not accepted.",
    ],
  },
  {
    title: "Manuscript formatting",
    items: [
      "Use a standard Urdu Unicode font (Gulzar, Jameel Noori Nastaleeq, or Noto Nastaliq Urdu).",
      "Font size 14–16, line spacing 1.5, single column.",
      "Clear chapter or episode headings (قسط نمبر / باب).",
      "Remove page decorations, watermarks and unrelated graphics.",
      "Include the novel title and writer name on the first page.",
    ],
  },
  {
    title: "Author information",
    items: [
      "Real full name (kept private) and the pen name you want published.",
      "Working email address and WhatsApp number for communication.",
      "A short writer bio (2–4 lines) in Urdu or English.",
      "City / country is optional.",
    ],
  },
  {
    title: "Cover requirements",
    items: [
      "A cover is optional — we can design one for you.",
      "If you supply one: JPG or PNG, portrait, minimum 1200×1800 px.",
      "You must own the rights to any image used. No stolen or watermarked stock images.",
    ],
  },
  {
    title: "Content guidelines",
    items: [
      "No plagiarised, translated-without-permission or AI-generated-as-original work.",
      "No content that is obscene, sectarian, or promotes hatred or violence.",
      "No defamation of real persons or organisations.",
      "Mature themes must be handled responsibly and without explicit description.",
    ],
  },
  {
    title: "Originality & copyright",
    items: [
      "The work must be written by you, or you must hold written permission to submit it.",
      "The novel must not be already published on another platform without disclosure.",
      "You keep ownership of your novel. You grant Urdu Novel Bank permission to publish and promote it.",
    ],
  },
  {
    title: "Common reasons for rejection",
    items: [
      "Incomplete manuscript with no completion plan.",
      "Plagiarism or copied storyline.",
      "Unreadable file or non-Unicode font.",
      "Content that violates the content guidelines.",
      "Writer does not respond to correction requests within 30 days.",
    ],
    note: "Rejection is never personal. In most cases we explain the reason so the work can be improved and resubmitted.",
  },
];

export type PolicySection = { title: string; body: string };

export const policyVersion = { version: "1.0", updated: "August 2026" };

export const policy: PolicySection[] = [
  {
    title: "1. Submission conditions",
    body: "Submissions are accepted only through the official submission form on this portal. Each submission must include a readable manuscript file and complete writer information. Submitting the same novel more than once creates duplicate records and may delay review.",
  },
  {
    title: "2. Publication conditions",
    body: "A submission is published only after it clears initial screening and editorial review. Acceptance is at the discretion of the Urdu Novel Bank editorial team and is based on quality, originality, completeness and suitability for our readers.",
  },
  {
    title: "3. Editorial review",
    body: "Every manuscript is read by our editorial team. We may suggest changes to structure, language, chapter division or title. Suggestions are advisory; substantial rewriting is always agreed with the writer first.",
  },
  {
    title: "4. Formatting",
    body: "Urdu Novel Bank formats accepted manuscripts for web reading: typography, spacing, episode division and cover preparation. Formatting does not change the story content.",
  },
  {
    title: "5. Corrections",
    body: "If corrections are required, the submission moves to the status 'Action Required' and the writer is contacted by email or WhatsApp. If no response is received within 30 days, the submission may be closed.",
  },
  {
    title: "6. Publication rights",
    body: "The writer retains full copyright of their work. By submitting, the writer grants Urdu Novel Bank a non-exclusive right to publish, format, host and promote the novel on its website and social channels, with author credit.",
  },
  {
    title: "7. Author responsibilities",
    body: "The writer confirms that the work is original, does not infringe anyone's rights, and provides accurate contact information. The writer is responsible for responding to review communication in reasonable time.",
  },
  {
    title: "8. Platform responsibilities",
    body: "Urdu Novel Bank will keep writer contact details private, review every submission fairly, communicate decisions clearly, credit the writer on every published page, and never sell a writer's work to a third party.",
  },
  {
    title: "9. Withdrawal and cancellation",
    body: "A writer may withdraw a submission at any time before publication by contacting us with the Submission ID. After publication, removal requests are handled within 14 days.",
  },
  {
    title: "10. Rejection",
    body: "A submission may be rejected for plagiarism, guideline violations, unreadable files, or unsuitable content. A rejected work may be revised and resubmitted as a new submission.",
  },
  {
    title: "11. Communication policy",
    body: "Official communication happens by email, and by WhatsApp for quick clarifications. We never ask for payment for review or publication. Urdu Novel Bank does not charge writers any fee.",
  },
  {
    title: "12. Changes to this policy",
    body: "This policy may be updated. The current version and its date are shown at the top of this page, and material changes are announced to the writers' community.",
  },
];

export const timelineFactors = [
  "Number of submissions currently in the queue",
  "Length of the manuscript",
  "Corrections required after review",
  "Formatting and cover preparation effort",
  "Editorial workload",
  "Delays in writer communication",
];

export type Faq = { q: string; a: string; category: string };

export const faqs: Faq[] = [
  {
    category: "Submitting",
    q: "Is there any fee for submitting or publishing a novel?",
    a: "No. Submission, review and publication on Urdu Novel Bank are completely free. We never ask writers for payment.",
  },
  {
    category: "Submitting",
    q: "Can I submit an incomplete novel?",
    a: "Complete novels are preferred. An ongoing novel is accepted only if at least 5 episodes are ready. You can upload additional episodes later through the Track Submission page.",
  },
  {
    category: "Submitting",
    q: "Can I submit more than one novel?",
    a: "Yes. Submit each novel separately so that each one gets its own Submission ID and review track.",
  },
  {
    category: "Review",
    q: "How long does the review take?",
    a: `Initial screening usually takes 2–4 days and full editorial review ${site.reviewWindow} depending on manuscript length and queue.`,
  },
  {
    category: "Review",
    q: "What happens if my novel is rejected?",
    a: "We explain the reason wherever possible. You are welcome to revise the work and submit it again as a fresh submission.",
  },
  {
    category: "Tracking",
    q: "I lost my Submission ID. What should I do?",
    a: "Email us from the same address you used when submitting, with your novel title, and we will resend your ID.",
  },
  {
    category: "Publication",
    q: "Who owns the novel after publication?",
    a: "You do. Urdu Novel Bank only receives permission to publish and promote it with your name or pen name.",
  },
  {
    category: "Publication",
    q: "Can I publish the same novel on other platforms?",
    a: "Yes, unless we have separately agreed on exclusivity. Please tell us if the novel is already published elsewhere.",
  },
  {
    category: "Publication",
    q: "Do I need to provide a cover?",
    a: "No. A cover is optional — our team can design one. If you provide one, it must be your own image and at least 1200×1800 px.",
  },
];

export const genres = [
  "Social / Samaji",
  "Romantic",
  "Suspense / Thriller",
  "Historical",
  "Family Drama",
  "Adventure",
  "Horror",
  "Islamic / Spiritual",
  "Other",
];

export const submissionStatuses = [
  "Received",
  "Under Initial Review",
  "Under Editorial Review",
  "Action Required",
  "Approved",
  "Formatting",
  "Scheduled for Publication",
  "Published",
  "Rejected",
  "Withdrawn",
] as const;

export type SubmissionStatus = (typeof submissionStatuses)[number];

export function getMissingFileMessage(failedFiles: string[], code: string): string {
  let fileStr = "file";
  if (failedFiles.length === 1) {
    fileStr = failedFiles[0];
  } else if (failedFiles.length === 2) {
    fileStr = `${failedFiles[0]} and ${failedFiles[1]}`;
  } else if (failedFiles.length > 2) {
    const last = failedFiles[failedFiles.length - 1];
    const initial = failedFiles.slice(0, failedFiles.length - 1).join(", ");
    fileStr = `${initial}, and ${last}`;
  }
  return `We couldn't upload your ${fileStr}. Please email it directly to urdunovelbankofficial.com along with your Submission ID: ${code}.`;
}