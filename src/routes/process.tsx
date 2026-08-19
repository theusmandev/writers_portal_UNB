import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/portal/PageHero";
import { processStages } from "@/data/content";
import { FadeIn } from "@/components/portal/FadeIn";



export default function ProcessPage() {
  return (
    <div>
      <PageHero
        eyebrow="For Writers"
        title="Publication Process"
        titleUrdu="اشاعت کا مکمل طریقۂ کار"
        description="Nothing about publishing with us is hidden. This is the exact journey your manuscript takes, and roughly how long each stage lasts."
      />
      <div className="mx-auto max-w-3xl px-5 py-16">
        <ol className="relative border-l border-border pl-8">
          {processStages.map((stage, i) => (
            <FadeIn as="li" key={stage.key} className="relative pb-10 last:pb-0" delayMs={i * 100}>
              <span className="absolute -left-[41px] flex size-6 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold text-primary">
                {i + 1}
              </span>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-display text-xl font-semibold">{stage.title}</h2>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary font-medium">
                  {stage.duration}
                </span>
              </div>
              <p className="urdu text-lg text-muted-foreground">{stage.titleUrdu}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {stage.description}
              </p>
            </FadeIn>
          ))}
        </ol>

        <FadeIn className="mt-12 rounded-xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-semibold">Ready to begin?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Read the submission guidelines first, then send your manuscript.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/submit">Submit Your Novel</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/guidelines">Submission Guidelines</Link>
            </Button>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}