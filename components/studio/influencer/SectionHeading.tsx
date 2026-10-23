/** Centered marketing-section heading used on the AI Influencer page. */
export function SectionHeading({ eyebrow, id, title, body }: { eyebrow: string; id: string; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint-400">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-balance text-3xl font-black sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 text-pretty text-ink-300">{body}</p>}
    </div>
  );
}
