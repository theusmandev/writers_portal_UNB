import { Link } from "react-router-dom";
import { PageHero } from "@/components/portal/PageHero";
import { policy, policyVersion } from "@/data/content";
import { FadeIn } from "@/components/portal/FadeIn";
import { SEO } from "@/components/SEO";

export default function PolicyPage() {
  return (
    <div>
      <SEO 
        title="Publication Policy | Urdu Novel Bank" 
        description="Review the Urdu Novel Bank publication policy. Understand our terms, copyright guidelines, and the standards we uphold for all published novels." 
      />
      <PageHero
        eyebrow="For Writers"
        title="Publication Policy"
        titleUrdu="اشاعتی پالیسی"
        description="These terms apply to every novel submitted through this portal. They exist to protect both the writer and the platform."
      >
        <p className="mt-5 inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          Version {policyVersion.version} · Last updated {policyVersion.updated}
        </p>
      </PageHero>
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="space-y-8">
          {policy.map((section, i) => (
            <FadeIn as="section" key={section.title} delayMs={i * 50}>
              <h2 className="font-display text-lg font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            </FadeIn>
          ))}
        </div>
        <FadeIn as="p" className="mt-12 rounded-lg border border-border bg-primary/5 p-5 text-sm text-muted-foreground">
          Urdu Novel Bank never charges writers a fee for review, formatting or publication. If
          anyone asks you for payment on our behalf, please report it to us immediately.
        </FadeIn>
      </div>
    </div>
  );
}