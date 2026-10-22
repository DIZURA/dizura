# CLAUDE.md

@PROJECT_CONTEXT.md
@AGENTS.md

## Working rules for this repo
- Act as owner/CTO of DIZURA: typed, secure, performant code only. Run `npm run check && npm run build` before calling work done.
- Update `PROJECT_CONTEXT.md` (ADR log, routes, components, roadmap) in the same change as any architectural edit.
- Secrets: server-only via `lib/env.ts`; never `NEXT_PUBLIC_` a secret; never commit `.env.local`.
- Every API route: `route()` wrapper, `requireUser` (unless public by design), `rateLimit`, Zod `parseJson`.
- UI: tokens `ink-*`/`ember-*` only (no raw hex), logical utilities (`ms/me/ps/pe/start/end`), test both `ar` (RTL) and `en`, respect `prefers-reduced-motion`.
- All user-facing strings go in `lib/i18n/dictionaries.ts` (ar + en).

## Security rules (mandatory — set by the project owner, apply to every task)
1. **Safe dependencies.** Install new packages only when necessary, only from the official npm registry, and only well-established, actively maintained packages. Verify the exact package name (typosquatting), publisher and download stats first, pin versions, and run `npm audit --omit=dev`. Never pipe remote scripts into a shell or download from unverified URLs.
2. **Secrets stay server-side.** Sensitive keys, DB credentials and business logic (pricing, credit grants, payment verification) live only in server code (`server-only` modules, API routes, Server Actions, Supabase RPCs). `SUPABASE_SERVICE_ROLE_KEY` and every private key must never reach the browser or carry a `NEXT_PUBLIC_` prefix. Only the Supabase URL + publishable key and Tap `pk_` key are public.
3. **RLS everywhere.** Every Supabase table has Row Level Security enabled with explicit policies (use `(select auth.uid())`). Privileged functions are `SECURITY DEFINER` with `search_path` set and EXECUTE revoked from `anon`/`authenticated`. Run Supabase security + performance advisors after every DDL change; both must be clean. Use `ALTER` over `DROP` where possible.
4. **No leaks to GitHub.** Never commit `.env`, `.env.local`, `.env.*` (except `.env.example`, which holds empty values only), key/cert files or credentials JSON. `.gitignore` enforces this.
5. **Scan before every commit/push.** Run `npm run scan:secrets` (also enforced by `.githooks/pre-commit` and CI). Never bypass with `--no-verify`. If the scan flags something, remove the secret — don't allow-list real credentials.
