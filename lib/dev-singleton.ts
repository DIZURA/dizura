import "server-only";

/**
 * One instance per process for the in-memory development stores. Next dev compiles pages and
 * route handlers into separate module graphs, so a plain module-level variable would give each
 * graph its own "database". Never used for production data (stores use Supabase there).
 */
export function devSingleton<T>(key: string, create: () => T): T {
  const g = globalThis as unknown as Record<string, T | undefined>;
  return (g[`__dizura_dev_${key}`] ??= create());
}
