# DIZURA — Project Context

> Source of truth for architecture, decisions, routes and roadmap.
> **Every session: read this first; update it in the same change as any architectural edit.**
> Last updated: 2026-10-22

## 1. Product
AI creative studio for GCC brands, Arabic-first (RTL) with English (LTR).
Studios (one page each, Higgsfield-style): **AI Influencer**, **Motion**, **Image**, **Video** (WAN 3.0 Prime), **Ads Studio**. Business tools: **Free GEO Audit**, **Scheduler**, **B2B**.
Monetisation: prepaid **credits** bought via **Tap Payments** (KWD default).

## 2. Stack
| Layer | Choice |
|---|---|
| Framework | Next.js 16.4 App Router (Turbopack), React 19.3, TypeScript 5.9 strict (`noUncheckedIndexedAccess`) |
| Styling | Tailwind CSS 4 (`@theme` tokens in `app/globals.css`) |
| Validation | Zod 4 — every env var, request body and provider response |
| 3D | three.js + @react-three/fiber, lazy-loaded client-only |
| Auth / DB | Supabase project `mxzeeyqektwdncsryhyk` ("DIZURA's Project", ap-south-1, Postgres 17). Cookie-based Supabase Auth via `@supabase/ssr` 0.12.7 + `@supabase/supabase-js` 2.117.3 (exact pins) |
| AI | Higgsfield API (`api.higgsfield.ai`) for all generation: images = `higgsfield-ai/soul/v2/standard`, video = `alibaba/wan-3.0-prime/text-to-video`, animate-a-character = `alibaba/wan-3.0-prime/image-to-video` (WAN is hosted by Higgsfield). GSC via MCP (audit) |
| Payments | Tap Payments hosted charge page + webhook |

Scripts: `npm run dev | build | start | lint | typecheck | scan:secrets | check` (`check` = typecheck + lint + secret scan).

## 3. Directory map
```
app/
  layout.tsx                 html lang/dir from locale cookie, fonts, I18nProvider
  page.tsx                   Landing (3D hero + bento grid)
  (workspaces)/layout.tsx    TopBar with tool nav (no sidebar), full-width main
  (workspaces)/ai-influencer/page.tsx   Brand hero (3D DIZURA globe) + InfluencerWorkspace (Step 1 create → Step 2 animate → workspace panel)
  (workspaces)/{motion,image,video,ads-studio}/page.tsx   ToolHero + Studio (ideas from components/studio/ideas.ts)
  icon.png / apple-icon.png   favicon + touch icon from the DIZURA mark
  (workspaces)/{geo-audit,b2b,scheduler}/page.tsx   WorkspaceHeader + tool UI
  (/wan-prime -> 308 /video via next.config redirects)
  (auth)/{login,forgot-password,reset-password}/page.tsx   Login (?mode=signup, ?next=), reset request, new password
  auth/callback/route.ts     Email-link target: PKCE ?code= or ?token_hash=&type= -> session -> safe redirect
  actions/auth.ts            Server Actions: signIn, signUp, requestPasswordReset, updatePassword, signOut
  billing/return/page.tsx    Tap redirect target (re-verifies + fulfils idempotently)
  actions/locale.ts          Server Action: set dz_locale cookie
  api/…                      see §5
components/
  ui/            Button (+buttonClass), Card, Modal (<dialog>), cn
  dashboard/     BentoGrid, BentoCard
  layout/        TopBar (nav prop), NavLinks (active state, mobile scroll row), CreditsBadge, nav.ts (TOOLS + EXTRAS)
  landing/       Hero3D (reduced-motion aware) -> Hero3DScene (R3F): mint wireframe globe + DIZURA S-band emblem, orbit ring, pulse
  studio/        Studio (results canvas + floating prompt bar, generate/poll, session history, ideas), ToolHero,
                 useGenerator (shared submit → poll w/ 2→10 s backoff + jitter → result; keeps signed jobId per creation), MotionStudio (10 CSS camera presets), ideas.ts
  studio/influencer/  InfluencerWorkspace (Soul ID card, Step 1 identity picker [New look | trained character + likeness], style presets, TraitBuilder(only=), templates, prompt bar; Step 2 animate; gallery), traits.ts (composeInfluencerPrompt, composeSoulIdPrompt, STYLES, ANIMATIONS), SoulIdPanel (train: name, 5–30 photos re-encoded to JPEG ≤1536px in-browser [strips EXIF], consent, ⚡40; list w/ status + delete), useCharacters (polls while training)
  workspace/     WorkspaceHeader (geo-audit, b2b, scheduler)
  geo/           GeoAuditForm
  i18n/          I18nProvider/useI18n, LanguageToggle
  auth/          AuthForms (SignIn/SignUp/ForgotPassword/ResetPassword, useActionState), AuthCard, fields (TextField, PasswordField w/ show-hide), FormStatus
  layout/AccountMenu  Sign-in button or user + sign-out (server component)
lib/
  env.ts         SERVER-ONLY validated env + requireEnv()   | env.public.ts  NEXT_PUBLIC_* only
  app-url.ts     resolveAppUrl() — build-time origin (explicit > Netlify URL/DEPLOY_PRIME_URL > localhost); used by next.config.ts
  http.ts        ApiError, ok/fail, route() wrapper, parseJson (size-capped), providerFetch
  api-client.ts  Browser fetch for our own API (typed ApiResult)
  ai/index.ts    Provider facade (Higgsfield only)
  higgsfield/client.ts   Higgsfield API: MODELS, buildSubmission (+custom_reference_id), submitGeneration (Idempotency-Key), getJob, uploadMedia (presigned PUT), create/get/deleteSoulReference
  gsc/mcp.ts     MCP Streamable-HTTP client (initialize -> tools/call), degrades to null
  geo/audit.ts   GEO checks (AI crawlers in robots.txt, llms.txt, JSON-LD, meta, depth…)
  tap/client.ts  createCharge, retrieveCharge, verifyWebhookHash (HMAC hashstring)
  tap/fulfill.ts fulfillCharge() — re-fetch, validate amount, idempotent grant
  credits/       pricing.ts (packs + generationCost + SOUL_ID limits/price), store.ts (CreditStore: memory dev / Supabase RPC)
  characters/    store.ts (CharacterStore: Supabase REST as service role w/ uuid-validated filters / memory in dev)
  auth/session.ts getCurrentUser() (React cache) + requireUser(req): getClaims() on cookie or Bearer; same-origin check for cookie-auth writes
  auth/redirect.ts safeNext() (open-redirect guard), PROTECTED_PREFIXES, GUEST_ONLY
  supabase/      server.ts (per-request cookie client, publishable key), proxy.ts (refreshSession for proxy.ts)
  security/      rate-limit.ts, safe-fetch.ts (SSRF guard), signed-token.ts (HMAC job handles)
  i18n/          config, dictionaries (ar/en, typed), server getI18n()
types/           ai.ts, credits.ts, payments.ts, session.ts, index.ts
.mcp.json        Project-scoped Supabase MCP (project_ref=mxzeeyqektwdncsryhyk); each dev authenticates via `claude /mcp`
.agents/skills/  Supabase agent skills (supabase, supabase-postgres-best-practices), symlinked into .claude/skills; pinned in skills-lock.json
supabase/migrations/20261022060100_0001_credits.sql   Ledger + balances + RLS + apply_credit_delta RPC (APPLIED)
supabase/migrations/20261022061230_0002_rls_initplan_and_hardening.sql   RLS initplan fix + revoke rls_auto_enable() (guarded) (APPLIED)
supabase/migrations/20261022080434_0003_welcome_credits.sql   private.grant_welcome_credits() trigger on auth.users: welcome bonus on email confirmation (APPLIED)
supabase/migrations/20261022083415_0004_welcome_credits_30.sql   welcome bonus 10 -> 30 (APPLIED)
supabase/migrations/20261022215306_0005_characters.sql   characters table (Soul ID), RLS select-own, no anon/authenticated privileges (APPLIED)
supabase/migrations/20261022215528_0006_service_role_grants.sql   grant service_role EXECUTE on credit RPCs + CRUD on characters (APPLIED — fixes prod credit ledger)
scripts/scan-secrets.mjs  Zero-dep secret scanner (pre-commit hook in .githooks/, CI in .github/workflows/security.yml)
proxy.ts         Session refresh + page guards (guest -> /login?next=, signed-in away from /login) + per-request nonce CSP
```

## 4. Architectural decisions (ADR log)
| # | Decision | Why |
|---|---|---|
| 1 | All provider calls server-side only; `lib/env.ts` imports `server-only` | Secrets can't be bundled to the client (verified: APP_SECRET absent from `.next/static`). |
| 2 | Provider keys optional at boot, enforced by `requireEnv()` at use → 503 `not_configured` | App runs with partial config; clear failure per feature. |
| 3 | Uniform `ApiResult<T>` envelope + `route()` wrapper; internal errors logged, never returned | Consistent client handling, no info leaks. |
| 4 | Credits: **reserve before submit, refund on failure**; ledger idempotent on `(user, reason, referenceId)` | No free generations, no double charge/credit on retries. |
| 5 | Job handle = HMAC-signed token (`APP_SECRET`) containing user, provider job id, cost, reservation id | Stateless polling with ownership check; forged tokens → 404. |
| 6 | Tap webhook: verify `hashstring` HMAC → **re-fetch charge from Tap** → check amount/currency vs server pack → idempotent grant by charge id | Body never trusted; replay/forgery/tampering safe. Redirect page runs the same fulfil path. |
| 7 | Prices live only in `lib/credits/pricing.ts` | Client never sends amounts. |
| 8 | Memory credit store allowed only outside production; prod without Supabase → 503 | Never run a money ledger in memory in prod. |
| 9 | ~~Dev auth fallback user~~ — **removed** (superseded by ADR 20). | Real login exists; no bypass in any environment. |
| 10 | GEO audit fetches user URLs via `safeFetchText` (DNS-resolve + private-IP block per redirect hop, std ports, size/time caps) | SSRF protection on a public endpoint. |
| 11 | Nonce CSP in `proxy.ts` + static headers (HSTS, XFO DENY, nosniff, COOP) in `next.config.ts` | XSS/clickjacking hardening. Forces dynamic rendering (accepted). |
| 12 | Arabic default locale, cookie `dz_locale`, `<html dir>` server-rendered; **logical Tailwind utilities only** (`ms/me/ps/pe/start/end`) | No RTL flash; mirrored layouts for free. Use `.flip-rtl` for directional icons, `dir="ltr"` for URLs/ratios. |
| 13 | Dark-only brand theme via tokens: `ink-*` (charcoal, page `#0A0A0B`) + **`mint-*` primary (`#00E599`, from the DIZURA globe mark)** + `ember-*` secondary (credits/cost chips, orange focus glow). `glass` utility = glassmorphic panel with a mint/20 edge. No raw hex in components (three.js scene constants are the documented exception). | Colour consistency; owner's brand brief (2026-10-22). |
| 14 | In-memory rate limiter (fixed window) | Fine for single instance; replace before scaling (roadmap). |
| 15 | Supabase **publishable key** (`sb_publishable_…`) instead of legacy anon JWT; env var `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Independently rotatable; Supabase-recommended. |
| 16 | ~~Dev fallback user~~ — **removed** (superseded by ADR 20). | |
| 17 | Secret scanning at 3 layers: pre-commit hook, `npm run check`, GitHub Actions CI (CI also runs `npm audit --omit=dev --audit-level=high`) | Owner's rule: scan before every commit/push. No third-party scanner dependency. |
| 18 | Mandatory security rules recorded in `CLAUDE.md` | Owner-set; apply to all sessions. |
| 20 | **Auth = Supabase cookie sessions via `@supabase/ssr`.** Identity always from `getClaims()` (JWT signature verified via JWKS) — never `getSession()` on the server. Proxy refreshes tokens and applies Supabase's anti-cache headers; page guards in proxy are UX only — every API route / Server Action re-verifies. | Supabase-recommended SSR pattern; no tokens in JS-readable storage. |
| 21 | Auth mutations are **Server Actions** (no browser Supabase client). Generic errors (no account enumeration), per-IP rate limit (10/10 min sign-in, 5/10 min signup & reset), passwords 8–72 chars, `user_metadata` (name, locale) display-only — never used for authorization. Email is echoed back on error; passwords never. | Small attack surface, CSP stays `connect-src 'self'`. |
| 22 | CSRF: cookie-authenticated non-GET API calls require same-origin `Origin` (or `Sec-Fetch-Site: same-origin`) → else 403; plus SameSite=Lax cookies; Server Actions have Next's built-in origin check. | Cookie auth makes CSRF relevant. |
| 23 | Redirect targets pass through `safeNext()` (relative paths only); email links land on `/auth/callback` which handles PKCE code and token_hash. | Prevents open redirects / phishing via `?next=`. |
| 24 | **App URL resolved at build time** (`lib/app-url.ts` → `next.config.ts` `env`, inlined into server + client). `NEXT_PUBLIC_APP_URL` is set for Netlify **Production only**; previews/branch deploys use `DEPLOY_PRIME_URL`, production falls back to `URL`. Never derived from the request `Host` header. | One config value; correct auth-email + Tap redirect URLs per deploy; Host-header injection can't redirect reset links. |
| 25 | **Welcome bonus = 30 credits** (was 10; migration 0004), granted by a DB trigger when the email is confirmed** (or on insert if pre-confirmed, e.g. OAuth); never for anonymous users; idempotent (`promo`/`welcome_bonus`). Trigger fn lives in non-exposed `private` schema, `SECURITY DEFINER`, `search_path=''`, EXECUTE revoked; failures only warn (never block signup). Amount mirrored in `WELCOME_CREDITS`. | Lets new users try the product; confirmation gate stops throwaway-account farming; works even if the app is down. |
| 26 | **Higgsfield API per official docs** (docs.higgsfield.ai): `POST /{model-id}` with top-level params + `Idempotency-Key` = our credit reservation id; poll `GET /requests/{id}/status` (queued → in_progress → completed / failed / nsfw / canceled); outputs `images[].url` / `video.url`. WAN 3.0 Prime via Higgsfield (separate WAN provider + env vars removed). Aspect ratios limited to 1:1, 9:16, 16:9, 3:4 (supported by both models). | Previous endpoints were unverified guesses (generation failed). Idempotency key means a retried submit is never billed twice. |
| 27 | **Studio UI = one page per tool** with a top nav (sidebar removed), `ToolHero` banner, shared `Studio` (results canvas, floating prompt bar with type/ratio/duration/cost chips, idea cards). Guided studios compose an English `basePrompt` from controls (influencer traits, motion preset); user text is appended. Motion previews are pure CSS keyframes (`.motion-scene .m-*`), still for reduced-motion. Image upload for Motion is marked *Coming soon* (needs image-to-video models). | Matches the Higgsfield-style per-tool layout the owner asked for; ships UI before wiring more models. English prompts give the models the most reliable results. |
| 28 | **Video price unified at 8 credits/s** (3–15 s, default 3 s = 24 credits) since every video runs on WAN 3.0 Prime. | A new user's 30 welcome credits cover a first video. |
| 30 | **Netlify must apply its Next.js runtime**: `[[plugins]] package = "@netlify/plugin-nextjs"` declared in `netlify.toml` (unpinned). Without it, deploys "succeed" with *No functions deployed* (plugin state none) → no SSR/API/Server Actions. Netlify's secret scanner then blocks deploys if any secret env value appears in build output — a short/common `APP_SECRET` value matches unrelated files (libvips, sha256.js), so every context needs a generated 64-char value. | Found 2026-10-22: production of `ee040cf` deployed without functions; PR #8 preview built the server handler but was blocked by the scanner. Canary build proves a real `APP_SECRET` never reaches build output. |
| 31 | **Animate a character = image-to-video from the caller's own job.** `/api/ai/generate` accepts `sourceJob` (signed job handle); the server unseals it, checks ownership, polls the provider for that job's completed image and passes its https URL as `image_url` to `alibaba/wan-3.0-prime/image-to-video`. The client never sends an image URL. Resolved before credits are reserved. | No SSRF/abuse via arbitrary URLs; can only animate your own completed characters. |
| 32 | Image cost unified at **5 credits** (influencer was 8). | Character (5) + shortest video (24) = 29 fits the 30 welcome credits — verified end-to-end (30 → 25 → 1). |
| 33 | **Soul ID characters**: photos are re-encoded in the browser (JPEG ≤ 1536 px, EXIF stripped) → `POST /api/uploads/image` (magic-byte type check, ≤ 5 MB) → Higgsfield presigned PUT (provider headers sent verbatim, our API key never sent, upload URL never logged) → returns a **signed 1 h upload token** (not a URL). `POST /api/characters` accepts only the caller's own upload tokens + explicit consent, reserves 40 credits (`soul:<id>`), trains `model_version v2`; refunds once if training fails. Provider reference ids never reach the browser; generation takes our `characterId`, resolved server-side with an ownership + "completed" check, sent as `custom_reference_id` (+ strength 0.1–1). Delete removes the provider identity too (non-404 provider errors block the delete so nothing is orphaned). Limits: 5–30 photos, ≤ 5 characters/user. | Consistent faces with consent, privacy (EXIF/GPS) and cost controls; no URL injection or cross-user access. |
| 34 | **Service role needs explicit grants** in this project (no default privileges, and revoking from PUBLIC removed its EXECUTE). Every new table/function the server uses must `grant … to service_role` explicitly. | Found 2026-10-22: production credit RPCs were not executable by service_role (would have broken every generation once the service key was set). Fixed in 0006, verified in a rolled-back transaction. |
| 19 | Migration files named `<remote version>_<name>.sql`, matching `supabase_migrations.schema_migrations` exactly. New migrations: apply via MCP/CLI, then name the file with the version Supabase records. Migrations must also replay cleanly on a fresh preview branch (guard project-specific objects). | Supabase GitHub integration (Preview check) fails when remote versions are missing locally. |
| 29 | `APP_SECRET` optional at boot (Netlify agent, PR #4); `signed-token.ts` enforces presence + ≥32 chars at use (→ 503 `not_configured`); `/api/ai/generate` checks it before reserving credits | `lib/env.ts` is evaluated during `next build` (page-data collection), so a missing/short secret was failing Netlify builds. |

## 5. API routes
| Method | Route | Auth | Limit | Purpose |
|---|---|---|---|---|
| POST | `/api/ai/generate` | user | 20/min/user | Validate, compute cost, reserve credits, submit to provider; returns `GenerationJob` (202) with signed `id`. Optional `sourceJob` (animate own image, ADR 31) or `characterId` + `characterStrength` (Soul ID, images only, ADR 33) |
| GET | `/api/ai/jobs/[token]` | user (must own) | 120/min/user | Poll provider; auto-refunds once on failed/cancelled |
| GET | `/api/credits` | user | – | `{ balance }` |
| POST | `/api/uploads/image` | user | 60/10 min | multipart `file` (JPEG/PNG/WebP by magic bytes, ≤ 5 MB) → `{ token }` (signed 1 h upload handle) |
| GET | `/api/characters` | user | 60/min | caller's Soul ID characters `{id,name,state,thumbnailUrl,…}`; refreshes training ones; refunds failed once |
| POST | `/api/characters` | user | 5/10 min | `{ name, uploads: token[5–30], consent: true }` → train (⚡40) |
| DELETE | `/api/characters/[id]` | user (owner) | 20/min | delete here + at Higgsfield |
| GET | `/auth/callback?code=…|token_hash=…&type=…&next=` | – | – | Exchange email link for session; failure → `/login?error=link` |
| POST | `/api/geo-audit` | public | 5/min/IP | `{ url }` → `GeoAuditReport` |
| POST | `/api/payments/checkout` | user | 5/min/user | `{ packId }` → `{ redirectUrl, chargeId }` (Tap hosted page) |
| POST | `/api/webhooks/tap` | Tap HMAC | – | Verify + fulfil; 401 bad sig, 500 → Tap retries |
| Page | `/billing/return?tap_id=` | – | – | Re-verify + idempotent fulfil, show status |

"user" = Supabase session cookie or `Authorization: Bearer <access token>`; cookie-auth writes must be same-origin (403 otherwise).

Error codes → HTTP: bad_request 400, unauthorized 401, insufficient_credits 402, forbidden 403, not_found 404, rate_limited 429 (+Retry-After), internal 500, provider_error 502, not_configured 503.

## 6. Environment variables
Template: `.env.example` (committed). Real values: `.env.local` (gitignored via `.env.*`, chmod 600; `APP_SECRET` auto-generated).
Server-only: `APP_SECRET`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HIGGSFIELD_API_KEY` + `HIGGSFIELD_API_SECRET` (or combined `KEY_ID:KEY_SECRET` in the key), optional `HIGGSFIELD_API_BASE_URL` (default `https://api.higgsfield.ai`), `GSC_MCP_ENDPOINT/TOKEN`, `TAP_SECRET_KEY`, `TAP_API_BASE_URL`.
Public: `NEXT_PUBLIC_APP_URL` (optional; see ADR 24), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_TAP_PUBLIC_KEY`.
Rule: never add a secret with the `NEXT_PUBLIC_` prefix; add every new var to `.env.example` + `lib/env.ts` schema.
Dev/test only: `DEV_STARTING_CREDITS` (read only by the in-memory credit store, which never runs in production).

## 6b. Deployment — Netlify
- Site: **`sparkly-swan-cf292e`** → `https://sparkly-swan-cf292e.netlify.app` (Next.js runtime auto-detected; any env change needs a **redeploy**).
- Env per context: `NEXT_PUBLIC_APP_URL` → Production only (custom domain when added). `APP_SECRET` → every context (different value each; build fails without it). `SUPABASE_SERVICE_ROLE_KEY` + `TAP_SECRET_KEY` (`sk_live_`) → Production only; previews get `sk_test_` / no service key. Agent Runners: test keys only. Local dev context: no secrets.
- Scopes: `NEXT_PUBLIC_*` → Builds; server secrets → Builds + Functions. Tick "Contains secret values" for all non-public keys.
- **Supabase → Authentication → URL Configuration** (owner): Site URL `https://sparkly-swan-cf292e.netlify.app` (or custom domain); Redirect URLs: `http://localhost:3000/**`, `https://sparkly-swan-cf292e.netlify.app/**`, `https://*--sparkly-swan-cf292e.netlify.app/**` (single `*` — never `**` before the host, which could match an attacker-controlled host).

## 7. Credit economy (`lib/credits/pricing.ts`)
Welcome bonus: **30 credits** on email confirmation (ADR 25).
Soul ID training: **40 credits** (Higgsfield ≈ $2.50/request; 1 credit ≈ $0.16 at pack prices) — needs a credit purchase after the welcome bonus.
Packs: starter 100cr/5 KWD · pro 500cr/20 KWD · studio 2000cr/65 KWD.
Costs: image **5** (every studio); video **8 cr/s** for every studio, 3–15 s, default 3 s (= 24). Character + first video = 29 ≤ welcome 30.

## 8. Verified status (2026-10-22)
- `typecheck`, `lint`, `build` all clean. All pages 200, no browser console errors, RTL/LTR + mobile screenshots checked.
- Prod mode: unauthenticated API → 503 not_configured. SSRF probes (127.0.0.1, 169.254.169.254, [::1], :8080) blocked. Unsigned Tap webhook → 401. Forged job token → 404. Failed submit → credits refunded. Rate limit → 429.

## 8b. Supabase state (2026-10-22)
- Migrations applied: `0001_credits`, `0002_rls_initplan_and_hardening`, `0003_welcome_credits`, `0004_welcome_credits_30` (30 verified in a rolled-back transaction) (trigger tested in a rolled-back transaction: unconfirmed 0 → confirmed 10 → re-confirm still 10; OAuth insert 10; anonymous 0). Advisors clean after 0003. Tables: `credit_ledger`, `credit_balances` (RLS on, select-own policies for `authenticated`).
- `apply_credit_delta` / `get_credit_balance`: SECURITY DEFINER, EXECUTE revoked from anon/authenticated (service role only).
- Security advisor: 0 findings. Performance advisor: 0 findings.
- `.env.local` has URL + publishable key. Owner added `SUPABASE_SERVICE_ROLE_KEY` on their machine (credits use the real ledger there).
- **Auth dashboard settings (owner, Supabase → Authentication → URL Configuration):** Site URL = app URL; Redirect URLs must include `http://localhost:3000/auth/callback` and the production `https://<domain>/auth/callback`.

## 8c. Pre-PR leak audit (2026-10-22) — all clean
- **Git (all branches/history):** only `.env.example` ever committed (non-secret defaults); no key patterns, JWTs, or local secret values in any commit; `.mcp.json` holds no credentials. Remote branch == local HEAD.
- **Browser bundle:** built with canary secrets in every server var → 0 canary values, 0 secret var names, no `server-only` code in `.next/static` or prerendered HTML/RSC. No client component imports server modules.
- **API runtime:** with canary provider keys, no response body/header or server log contained a key; errors are generic (`provider_error`, `not_found`, …); no `x-powered-by`; client-sent prices ignored; forged webhook → 401, forged job token → 404, oversized body → 400; failed generations refunded.
- **Supabase (anon/authenticated):** no table grants, no EXECUTE on any public function; RLS on; advisors clean. Note: `authenticated` has **no SELECT grant** on credit tables (project doesn't auto-expose tables), so the select-own policies are dormant — add `grant select … to authenticated` only if the browser must read balances directly.
- **CI:** first GitHub Actions run (secret scan + check + build) passed.
- `APP_SECRET` rotated locally after its prefix appeared in a session log (never committed).

## 8d. Higgsfield API facts (owner's cheat sheet, 2026-10-22)
- **Soul ID (consistent character):** `POST /v1/custom-references` {name, input_images[1–100 public https], model_version v1|v2|cinema} → poll `GET /v1/custom-references/{id}` (not_ready/queued/in_progress/completed/failed). Then Soul 2 with `custom_reference_id` + `custom_reference_strength` (>0, ≤1). Not a generation request (no request_id).
- **Soul 2 params:** aspect 9:16/16:9/4:3/3:4/1:1/2:3/3:2 (default 1:1 → we always send it), resolution 720p (default) | 1080p, batch_size 1|4, enhance_prompt, style_id (`GET /v1/text2image/soul-styles/v2`), seed 1–1e6 (never null).
- **Alt animator:** Kling 2.5 Turbo Pro `POST /kling-video/v2.5-turbo/pro/image-to-video` {prompt, image_url, duration 5|10, cfg_scale, negative_prompt} — no aspect/sound. We use WAN 3.0 Prime i2v (owner spec).
- **Errors:** 400 invalid / **concurrency reached** (never 429) · 401 creds · **403 = provider account out of credits** · 404 · 422 validation or Idempotency-Key reuse w/ different body · 423 model blocked · 503 model disabled. `X-Correlation-ID` on every response (we log it).
- **Polling** 2 s → 10 s + jitter (implemented). **Webhooks** `?hf_webhook=` (retries 2 h). **Uploads** `POST /files/generate-upload-url` → PUT → `public_url`. **Cost** `POST /estimate/{model_path}`. Failed/nsfw/canceled not charged. **Outputs live ≥ 7 days → copy to our storage.**

## 9. Open items / things to VERIFY before launch
- [x] **Higgsfield** paths/auth/response shape now match the official docs; verified against a mock of the documented API (request path, `Key` header, Idempotency-Key, body, status polling, image/video/nsfw results). **Still to do: one live generation with real keys** (sandbox can't reach api.higgsfield.ai).
- [x] **WAN 3.0 Prime** = Higgsfield model `alibaba/wan-3.0-prime/text-to-video` (duration 2–30 s, resolution 480p/720p/1080p, aspect incl. 3:4).
- [ ] **GSC MCP** tool name/args (`search_analytics`) — confirm via the server's `tools/list`.
- [ ] Tap: confirm `hashstring` field order for the account's API version; register webhook URL in Tap dashboard.

## 10. Roadmap
1. ~~Login UI~~ ✅ (email/password, confirm, reset). Next: `profiles` (plan via `app_metadata`/table), ~~welcome credits~~ ✅ (10), Google OAuth, custom SMTP (Supabase built-in email is rate-limited).
2. Pricing/checkout UI (Modal + packs) wired to `/api/payments/checkout`.
2b. ~~Influencer animate (i2v)~~ ✅ ~~Soul ID~~ ✅ (verified vs mocks; first live training still to confirm). Next: Motion photo upload + i2v (reuse `/api/uploads/image`), copy outputs to Supabase Storage (provider URLs expire ≥7 d), price check via `/estimate`, real thumbnails for style/idea cards.
3. Persist generation jobs (history gallery per workspace) + media upload for reference images.
4. Shared rate limiter (Upstash Redis or Postgres) before multi-instance deploy.
5. Scheduler: posts table, channel OAuth (TikTok/Instagram/X), cron publisher.
6. B2B: orgs, seats, pooled credits, API keys, invoices.
7. GEO audit: LLM-written recommendations, PDF export, lead capture.
8. Observability (Sentry), tests (Vitest for lib/, Playwright for flows), CI.
