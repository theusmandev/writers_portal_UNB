import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { PageHero } from "@/components/portal/PageHero";
import { processStages, timelineFactors } from "@/data/content";



export default function TimelinePage() {
  return (
    <div>
      <PageHero
        eyebrow="For Writers"
        title="Publication Timeline"
        titleUrdu="اشاعت کا متوقع دورانیہ"
        description="Typical durations for each stage. These are honest estimates, not guarantees — actual time depends on the factors listed below."
      />
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/70 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-5 py-3 font-semibold">Stage</th>
                <th className="px-5 py-3 font-semibold">Expected duration</th>
              </tr>
            </thead>
            <tbody>
              {processStages.map((stage) => (
                <tr key={stage.key} className="border-t border-border align-top">
                  <td className="px-5 py-4">
                    <span className="font-medium">{stage.title}</span>
                    <span className="urdu block text-base text-muted-foreground">
                      {stage.titleUrdu}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{stage.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 rounded-xl border border-border bg-secondary/50 p-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">What can change these timings</h2>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {timelineFactors.map((factor) => (
              <li key={factor} className="text-sm text-muted-foreground">
                • {factor}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}