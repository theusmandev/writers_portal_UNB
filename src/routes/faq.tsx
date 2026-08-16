import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/portal/PageHero";
import { faqs } from "@/data/content";
import { FadeIn } from "@/components/portal/FadeIn";



export default function FaqPage() {
  const categories = [...new Set(faqs.map((f) => f.category))];

  return (
    <div>
      <PageHero
        eyebrow="Support"
        title="Frequently Asked Questions"
        titleUrdu="اکثر پوچھے جانے والے سوالات"
        description="If your question is not answered here, write to us and we will reply."
      />
      <div className="mx-auto max-w-3xl px-5 py-16">
        {categories.map((category, i) => (
          <FadeIn as="section" key={category} className="mb-10" delayMs={i * 100}>
            <h2 className="mb-3 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              {category}
            </h2>
            <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-5 shadow-soft">
              {faqs
                .filter((f) => f.category === category)
                .map((f) => (
                  <AccordionItem key={f.q} value={f.q}>
                    <AccordionTrigger className="text-left text-sm font-medium">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          </FadeIn>
        ))}

        <FadeIn className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/submit">Submit Your Novel</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/contact">Ask a Question</Link>
          </Button>
        </FadeIn>
      </div>
    </div>
  );
}