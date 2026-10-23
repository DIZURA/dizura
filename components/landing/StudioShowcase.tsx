import Link from "next/link";
import { exampleSrc } from "@/components/studio/examples";
import { buttonClass } from "@/components/ui/Button";

/** Landing card for one studio: example collage, title, one line and an "Open studio" button. */
export function StudioShowcase({ href, title, body, cta, images, index }: { href: string; title: string; body: string; cta: string; images: readonly string[]; index: number }) {
  return (
    <Link href={href} className="glass group flex flex-col overflow-hidden rounded-[var(--radius-card)] transition hover:shadow-[0_30px_80px_-30px_var(--color-mint-500)]">
      <div className="grid aspect-[16/10] grid-cols-3 grid-rows-2 gap-1.5 p-1.5">
        {images.slice(0, 3).map((name, i) => {
          const src = exampleSrc(name);
          return (
            <div key={name} className={i === 0 ? "relative col-span-2 row-span-2 overflow-hidden rounded-2xl" : "relative overflow-hidden rounded-2xl"}>
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element -- static example image
                <img src={src} alt="" className="size-full object-cover transition duration-700 group-hover:scale-105 motion-reduce:transition-none" />
              ) : (
                <span aria-hidden className="block size-full" style={{ background: `var(--art-${(index * 3 + i) % 6})` }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h2 className="text-2xl font-black sm:text-3xl">{title}</h2>
        <p className="text-pretty text-ink-300">{body}</p>
        <span className={buttonClass("primary", "mt-auto self-start px-6")}>{cta}</span>
      </div>
    </Link>
  );
}
