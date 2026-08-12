import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/portal/PageHero";
import { guidelines, site } from "@/data/content";



export default function GuidelinesPage() {
  return (
    <div>
      <PageHero
        eyebrow="For Writers"
        title="Submission Guidelines"
        titleUrdu="ناول بھیجنے کی ہدایات"
        description={`Please read these before submitting. Manuscripts that follow the guidelines are reviewed faster — usually within ${site.reviewWindow}.`}
      />
      <div className="mx-auto max-w-4xl px-5 py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          {guidelines.map((section) => (
            <section
              key={section.title}
              className="rounded-xl border border-border bg-card p-6 shadow-soft"
            >
              <h2 className="font-display text-lg font-semibold">{section.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              {section.note && (
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground italic">
                  {section.note}
                </p>
              )}
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-border bg-primary/5 p-6">
          <p className="urdu text-lg leading-loose">
            براہِ کرم اپنا مسودہ یونیکوڈ اردو فونٹ میں بھیجیں۔ مکمل ناول کو ترجیح دی جاتی ہے، اور
            ہر مسودے کا جائزہ ادارتی ٹیم خود لیتی ہے۔
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/submit">Submit Your Novel</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/policy">Read the Publication Policy</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}