import { Hero3D } from "@/components/landing/Hero3D";

/** Slim studio header: eyebrow, gradient title, one-line body and the DIZURA globe. */
export function StudioHero({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <section className="relative my-5 overflow-hidden rounded-[var(--radius-card)] border border-mint-500/15 bg-ink-950 px-6 py-6 sm:px-8">
      <div aria-hidden className="pointer-events-none absolute -top-32 start-1/4 size-[26rem] rounded-full bg-mint-500/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-mint-500)_6%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-mint-500)_6%,transparent)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="relative flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-mint-500/30 bg-mint-500/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-mint-300">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-mint-500 motion-reduce:animate-none" />
            {eyebrow}
          </p>
          <h1 className="text-gradient mt-3 text-balance text-3xl font-black leading-[1.15] sm:text-4xl xl:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-pretty text-sm text-ink-300 sm:text-base">{body}</p>
        </div>
        <div className="hidden w-48 shrink-0 md:block lg:w-56">
          <Hero3D />
        </div>
      </div>
    </section>
  );
}
