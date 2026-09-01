import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, FileText, ShieldCheck, Clock, Search, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { getPublicWriters, getSpotlightsList } from "@/services/portalApi";
import type { PublicWriterRow } from "@/lib/supabase.types";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs, processStages, site } from "@/data/content";
import { FadeIn } from "@/components/portal/FadeIn";
import { SEO } from "@/components/SEO";


const steps = [
  { icon: FileText, title: "Read the guidelines", to: "/guidelines", text: "Formats, formatting, covers and content rules — in one page." },
  { icon: BookOpen, title: "Prepare your manuscript", to: "/process", text: "Unicode Urdu file, clear chapters, complete story where possible." },
  { icon: ArrowRight, title: "Submit your novel", to: "/submit", text: "One short form. You receive a unique Submission ID instantly." },
  { icon: Search, title: "Track your status", to: "/track", text: "Follow every stage with your ID and email address." },
] as const;

export default function Index() {
  const [writers, setWriters] = useState<PublicWriterRow[]>([]);
  const [latestSpotlight, setLatestSpotlight] = useState<any | null>(null);

  useEffect(() => {
    async function loadData() {
      const [writersRes, spotlightsRes] = await Promise.all([
        getPublicWriters(),
        getSpotlightsList()
      ]);
      
      if (writersRes.success && writersRes.data.length > 0) {
        setWriters(writersRes.data.slice(0, 8));
      }
      
      if (spotlightsRes.success && spotlightsRes.data.length > 0) {
        setLatestSpotlight(spotlightsRes.data[0]);
      }
    }
    void loadData();
  }, []);

  return (
    <div>
      <SEO 
        title="Urdu Novel Bank — Writer & Publication Portal | Submit Your Urdu Novel" 
        description="Submit your Urdu novel to Urdu Novel Bank. Our writer portal offers an easy submission process, real-time tracking, and a transparent publication journey." 
      />
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-6xl px-5 pt-12 pb-20 sm:pt-8 sm:pb-10">
          <p className="text-xs font-semibold tracking-[0.25em] text-primary-foreground/70 uppercase">
            {site.portalName}
          </p>
          <h1 className="mt-5 sm:mt-3 max-w-3xl text-4xl leading-tight font-semibold text-balance sm:text-4xl">
            Your novel deserves a clear, professional path to publication.
          </h1>
          <p className="urdu mt-5 sm:mt-2 max-w-2xl text-2xl text-primary-foreground/85">
            اردو ناول بینک — لکھنے والوں کے لیے ایک منظم اشاعتی پورٹل
          </p>
          <p className="mt-5 sm:mt-2 max-w-2xl leading-relaxed text-primary-foreground/80">
            Submit your Urdu novel, know exactly how it will be reviewed, and follow its progress
            from screening to publication — no messages lost, no guessing.
          </p>
          <div className="mt-9 sm:mt-5 flex gap-3">
            <Button asChild className="bg-foreground text-background hover:bg-foreground/90 h-[40px] px-4 text-[11px] sm:h-9 sm:px-6 sm:text-[13px] shadow-elegant border-transparent">
              <Link to="/submit">Submit Your Novel</Link>
            </Button>
            <Button asChild variant="outline" className="border-transparent bg-card/95 text-foreground hover:bg-card hover:text-foreground h-[40px] px-4 text-[11px] sm:h-9 sm:px-6 sm:text-[13px] shadow-soft font-semibold">
              <Link to="/track">Track Submission</Link>
            </Button>
          </div>
          <div className="mt-12 sm:mt-6 grid max-w-3xl gap-6 border-t border-primary-foreground/20 pt-8 sm:pt-5 sm:grid-cols-3">
            {[
              { label: "Cost to writers", value: "Free" },
              { label: "Typical review", value: site.reviewWindow },
              { label: "Stay with you", value: "Rights" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-2xl font-semibold">{stat.value}</p>
                <p className="text-xs tracking-wide text-primary-foreground/70 uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <FadeIn>
            <h2 className="text-2xl font-semibold sm:text-3xl">What is Urdu Novel Bank?</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Urdu Novel Bank publishes Urdu novels by writers from across Pakistan and the wider
              Urdu-reading world. We receive manuscripts, review them editorially, format them for
              comfortable online reading, and publish them on{" "}
              <a href={site.mainSite} className="text-primary underline-offset-4 hover:underline">
                urdunovelbanks.com
              </a>
              .
            </p>
            <p className="urdu mt-4 text-lg leading-loose text-muted-foreground">
              یہ پورٹل لکھاریوں کے لیے بنایا گیا ہے تاکہ ناول بھیجنے، جائزے اور اشاعت کا سارا عمل
              واضح، منظم اور شفاف ہو۔
            </p>
          </FadeIn>
          <FadeIn delayMs={100}>
            <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg font-semibold">Who can submit?</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>• New and established Urdu writers alike — we read every submission.</li>
                <li>• The novel must be written by you, in Urdu script.</li>
                <li>• Complete novels are preferred; ongoing work needs 5+ ready episodes.</li>
                <li>• You keep the copyright; we only ask for permission to publish.</li>
              </ul>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/guidelines">Full Guidelines</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-5 py-20">
          <FadeIn>
            <h2 className="text-2xl font-semibold sm:text-3xl">How it works</h2>
            <p className="mt-2 text-muted-foreground">Four steps, start to finish.</p>
          </FadeIn>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <FadeIn key={step.title} delayMs={i * 100}>
                <Link
                  to={step.to}
                  className="block group rounded-xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-elegant h-full"
                >
                  <div className="flex items-center justify-between">
                    <step.icon className="size-5 text-primary" />
                    <span className="font-display text-sm text-muted-foreground">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <FadeIn>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">The publication journey</h2>
              <p className="mt-2 text-muted-foreground">
                Every manuscript passes through the same stages.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/timeline">See expected timings</Link>
            </Button>
          </div>
        </FadeIn>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {processStages.map((stage, i) => (
            <FadeIn key={stage.key} delayMs={i * 100}>
              <div className="rounded-lg border border-border bg-card p-4 h-full">
                <p className="text-xs text-muted-foreground">Stage {i + 1}</p>
                <p className="mt-1 font-medium">{stage.title}</p>
                <p className="urdu text-base text-muted-foreground">{stage.titleUrdu}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Writer Spotlight ── */}
      {latestSpotlight && (
        <section className="bg-muted/30 border-y border-border">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <FadeIn className="flex flex-col md:flex-row items-center gap-8 md:gap-10 lg:gap-16">
              <div className="w-full md:flex-1 space-y-6">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold tracking-[0.15em] text-amber-700 dark:text-amber-400 uppercase shadow-sm">
                  <Star className="h-3.5 w-3.5" /> 
                  {latestSpotlight.spotlight_label ? `${latestSpotlight.spotlight_label} Spotlight` : "Monthly Spotlight"}
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground">
                  {latestSpotlight.display_name}
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-lg">
                  Dive into the journey and works of our highlighted author. Read their story, discover their published novels, and connect with their writing.
                </p>
                <div className="flex flex-wrap items-center gap-6 pt-2">
                  <Button asChild className="h-11 px-6 shadow-elegant bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link to={`/spotlights/${latestSpotlight.slug}`}>
                      Read the Spotlight <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Link to="/spotlights" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline">
                    View All Spotlights &rarr;
                  </Link>
                </div>
              </div>
              <div className="w-full md:w-5/12 aspect-square md:aspect-auto md:h-80 bg-card rounded-2xl border border-border shadow-soft flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-primary/5 transition-opacity group-hover:opacity-70" />
                <div className="relative text-center p-8 space-y-5">
                   <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-4xl font-serif text-white shadow-md">
                      {latestSpotlight.display_name.charAt(0).toUpperCase()}
                   </div>
                   <div>
                     <div className="font-serif text-2xl font-semibold text-foreground">{latestSpotlight.display_name}</div>
                     <div className="text-xs uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500 font-bold mt-1">
                       {latestSpotlight.spotlight_label || "Featured Writer"}
                     </div>
                   </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/* ── Meet Our Writers ── */}
      {writers.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-24">
          <FadeIn className="text-center mb-14">
            <h2 className="text-3xl font-semibold text-foreground">Meet Our Writers</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-lg">
              Meet the writers bringing their stories to Urdu Novel Bank.
            </p>
          </FadeIn>
          
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            {writers.map((w, i) => (
              <FadeIn key={w.pen_name} delayMs={i * 50} className="flex flex-col items-center gap-3 group">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-muted border border-border flex items-center justify-center text-2xl sm:text-3xl font-serif text-muted-foreground shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:border-primary/30 group-hover:bg-primary/5 group-hover:text-primary">
                  {w.pen_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm sm:text-base font-medium text-foreground transition-colors group-hover:text-primary">{w.pen_name}</span>
              </FadeIn>
            ))}
          </div>
          
          <FadeIn delayMs={300} className="mt-14 text-center">
            <Button asChild variant="outline" className="h-11 px-8 rounded-full shadow-soft hover:bg-card">
              <Link to="/writers">Browse All Writers &rarr;</Link>
            </Button>
          </FadeIn>
        </section>
      )}

      <section>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-3">
          <FadeIn>
            <ShieldCheck className="size-6 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold">Important to know</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We never charge writers for review, formatting or publication. Your contact details
              stay private, and your novel is always published under your name or pen name.
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" /> Typical review time: {site.reviewWindow}
            </div>
          </FadeIn>
          <FadeIn delayMs={100} className="lg:col-span-2">
            <h2 className="text-2xl font-semibold">Common questions</h2>
            <Accordion type="single" collapsible className="mt-4 rounded-xl border border-border bg-card px-5">
              {faqs.slice(0, 5).map((f) => (
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
            <Button asChild variant="ghost" className="mt-4">
              <Link to="/faq">All FAQs</Link>
            </Button>
          </FadeIn>
        </div>
      </section>

      <FadeIn>
        <section className="mx-auto max-w-4xl px-5 py-20 text-center">
          <h2 className="text-3xl font-semibold text-balance">Ready to send your novel?</h2>
          <p className="mt-3 text-muted-foreground">
            Prepare your manuscript, fill the form, and keep your Submission ID safe.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/submit">Submit Your Novel</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/policy">Read the Policy</Link>
            </Button>
          </div>
        </section>
      </FadeIn>
    </div>
  );
}
