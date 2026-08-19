import { Link } from "react-router-dom";
import { Mail, Instagram, Globe } from "lucide-react";
import { PageHero } from "@/components/portal/PageHero";
import { site } from "@/data/content";
import { FadeIn } from "@/components/portal/FadeIn";
import { SEO } from "@/components/SEO";

const channels = [
  {
    icon: Mail,
    label: "Email",
    value: site.email,
    href: `mailto:${site.email}`,
    note: "Best for submission questions and corrections. Always include your Submission ID.",
  },
  {
    icon: Instagram,
    label: "Instagram",
    value: "@urdunovelbank",
    href: "https://www.instagram.com/urdunovelbank/",
    note: "Have a quick question about the portal or your submission? Need guidance? Message us on Instagram.",
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
      <SEO 
        title="Contact Us | Urdu Novel Bank" 
        description="Get in touch with the Urdu Novel Bank team. Reach out for support, inquiries, or feedback regarding your novel submissions and publication." 
      />
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
                <a 
                  href={c.href} 
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-1 block text-sm break-words text-primary underline-offset-4 hover:underline"
                >
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
            کسی بھی فوری سوال یا رہنمائی کے لیے انسٹاگرام پر رابطہ کریں۔ سبمیشن
            سے متعلق سوالات یا اصلاح کے لیے ای میل کریں، اور براہِ کرم اپنا
            سبمیشن آئی ڈی ضرور لکھیں تاکہ ہم جلد جواب دے سکیں۔
          </p>
        </FadeIn>
      </div>
    </div>
  );
}