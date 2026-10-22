import "server-only";
import { z } from "zod";

/**
 * Server-only environment. Importing this from a Client Component fails the build
 * (via `server-only`), so secrets can never be bundled for the browser.
 *
 * Provider keys are optional at boot so the app runs with partial config;
 * use `requireEnv()` at the point of use to fail with a clear `not_configured` error.
 */
const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalUrl = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(z.url({ protocol: /^https?$/ }).optional())
  .optional();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),

  DATABASE_URL: optional,
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optional,
  SUPABASE_SERVICE_ROLE_KEY: optional,

  HIGGSFIELD_API_BASE_URL: z.url().default("https://platform.higgsfield.ai"),
  HIGGSFIELD_API_KEY: optional,
  HIGGSFIELD_API_SECRET: optional,

  WAN_API_BASE_URL: optionalUrl,
  WAN_API_KEY: optional,
  WAN_MODEL: z.string().default("wan-3.0-prime"),

  GSC_MCP_ENDPOINT: optionalUrl,
  GSC_MCP_TOKEN: optional,

  TAP_API_BASE_URL: z.url().default("https://api.tap.company/v2"),
  TAP_SECRET_KEY: optional.refine((v) => v === undefined || /^sk_(test|live)_/.test(v), {
    message: "TAP_SECRET_KEY must start with sk_test_ or sk_live_",
  }),
  NEXT_PUBLIC_TAP_PUBLIC_KEY: optional,
});

export type ServerEnv = z.infer<typeof schema>;

function load(): ServerEnv {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Log variable names only — never values.
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production" && env.TAP_SECRET_KEY?.startsWith("sk_test_")) {
    console.warn("[env] Running in production with a Tap TEST secret key.");
  }
  return env;
}

export const env: ServerEnv = load();

export class NotConfiguredError extends Error {
  constructor(public readonly keys: string[]) {
    super(`Missing configuration: ${keys.join(", ")}`);
    this.name = "NotConfiguredError";
  }
}

/** Returns the requested keys as non-optional, or throws NotConfiguredError. */
export function requireEnv<K extends keyof ServerEnv>(
  ...keys: K[]
): { [P in K]-?: NonNullable<ServerEnv[P]> } {
  const missing = keys.filter((k) => env[k] === undefined);
  if (missing.length > 0) throw new NotConfiguredError(missing as string[]);
  return Object.fromEntries(keys.map((k) => [k, env[k]])) as { [P in K]-?: NonNullable<ServerEnv[P]> };
}
