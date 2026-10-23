/**
 * Example pictures (How-it-works steps, ad formats, landing showcase) under /public/examples/<name>.webp.
 * Names listed here exist on disk (import with scripts/import-examples.mjs); anything else falls back
 * to DIZURA placeholder art.
 */
export const EXAMPLE_IMAGES: ReadonlySet<string> = new Set<string>([]);

export const exampleSrc = (name: string): string | null => (EXAMPLE_IMAGES.has(name) ? `/examples/${name}.webp` : null);
