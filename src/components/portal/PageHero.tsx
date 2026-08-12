import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  titleUrdu,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  titleUrdu?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-border bg-secondary/40">
      <div className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-[0.2em] text-accent-foreground/70 uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 text-3xl font-semibold text-balance sm:text-4xl">{title}</h1>
        {titleUrdu && <p className="urdu mt-2 text-xl text-muted-foreground">{titleUrdu}</p>}
        {description && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}