import { Link } from "react-router-dom";
import { Mail, MessageCircle, Globe } from "lucide-react";
import { PageHero } from "@/components/portal/PageHero";
import { site } from "@/data/content";
import { FadeIn } from "@/components/portal/FadeIn";



const channels = [
  {
    icon: Mail,
    label: "Email",
    value: site.email,
    href: `mailto:${site.email}`,
    note: "Best for submission questions and corrections. Always include your Submission ID.",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "Shared after submission",
    note: "Used for quick clarifications during review.",
  },
  {
    icon: Globe,
    label: "Main website",
    value: "urdunovelbanks.com",
    href: site.mainSite,
    note: "Read published novels and follow the writers' community.",
  },
];

export default function ContactPage() {
  return (
    <div>
      <PageHero
        eyebrow="Support"
        title="Contact Us"
        titleUrdu="ہم سے رابطہ"
        description="We answer writer messages within two working days. Please mention your Submission ID if you already submitted a novel."
      />
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="grid gap-5 sm:grid-cols-3">
          {channels.map((c, i) => (
            <FadeIn key={c.label} delayMs={i * 100} className="rounded-xl border border-border bg-card p-5 shadow-soft h-full">
              <c.icon className="size-5 text-primary" />
              <p className="mt-3 text-sm font-semibold">{c.label}</p>
              {c.href ? (
                <a href={c.href} className="mt-1 block text-sm break-words text-primary underline-offset-4 hover:underline">
                  {c.value}
                </a>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{c.value}</p>
              )}
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{c.note}</p>
            </FadeIn>
          ))}
        </div>

        <FadeIn className="mt-10 rounded-xl border border-border bg-primary/5 p-6">
          <p className="urdu text-lg leading-loose">
            کسی بھی سوال کے لیے ای میل کریں۔ اگر آپ نے ناول بھیج دیا ہے تو براہِ کرم اپنا سبمیشن
            آئی ڈی ضرور لکھیں تاکہ ہم جلد جواب دے سکیں۔
          </p>
        </FadeIn>
      </div>
    </div>
  );
}