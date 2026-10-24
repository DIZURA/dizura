# DIZURA — Project Context

> Source of truth for architecture, decisions, routes and roadmap.
> **Every session: read this first; update it in the same change as any architectural edit.**
> Last updated: 2026-10-24 (Agency suite: Strategist, strategy files, swap, voice, agency services)

## 1. Product
AI creative studio for GCC brands, Arabic-first (RTL) with English (LTR).
Two studios (ADR 40): **Visual Character** (`/visual-character` — build a consistent character, make it act out (or swap into) any reference video, then add a dialect voiceover) and **Ads Creative Studio** (`/ads-studio` — product photo → ad creatives). Agency layer (ADR 50): **DIZURA Strategist** chat drawer in every studio, **Strategy files** (`/blueprints`) and done-for-you **Agency** services (`/agency`, 3000 SAR each). The UI shows only the DIZURA brand — never provider/model names (ADR 42).
Monetisation: prepaid **credits** bought via **Tap Payments** (KWD default).

## 2. Stack
| Layer | Choice |
|---|---|
| Framework | Next.js 16.4 App Router (Turbopack), React 19.3, TypeScript 5.9 strict (`noUncheckedIndexedAccess`) |
| Styling | Tailwind CSS 4 (`@theme` tokens in `app/globals.css`) |
| Validation | Zod 4 — every env var, request body and provider response |
| 3D | three.js + @react-three/fiber, lazy-loaded client-only |
| Auth / DB | Supabase project `mxzeeyqektwdncsryhyk` ("DIZURA's Project", ap-south-1, Postgres 17). Cookie-based Supabase Auth via `@supabase/ssr` 0.12.7 + `@supabase/supabase-js` 2.117.3 (exact pins) |
| AI | Higgsfield API (`api.higgsfield.ai`), server-side only: characters = Soul 2 `higgsfield-ai/soul/v2/standard` (+ Soul ID), make-it-act = Genjutsu `higgsfield/genjutsu/motion-transfer/v1.0`, ads = Marketing Studio Image `marketing-studio/image`. (WAN 3.0 i2v/t2v still supported by `/api/ai/generate` but no longer used by the UI.) |
| Strategy AI | Claude API via `@anthropic-ai/sdk` 0.132.1 (exact pin), server-side only, model `ANTHROPIC_MODEL` (default `claude-opus-5-5`), effort low, server-side refusal fallback |
| Voice | ElevenLabs TTS (`eleven_multilingual_v2`), server-side only |
| Payments | Tap Payments hosted charge page + webhook (credit packs + agency service orders) |

Scripts: `npm run dev | build | start | lint | typecheck | scan:secrets | check` (`check` = typecheck + lint + secret scan).

## 3. Directory map
```
app/
  layout.tsx                 html lang/dir from locale cookie, fonts, I18nProvider
  page.tsx                   Landing: hero + two StudioShowcase cards (example collages) + SiteFooter
  (workspaces)/layout.tsx    TopBar with tool nav (no sidebar), full-width main
  (workspaces)/visual-character/page.tsx   StudioHero + InfluencerWorkspace (Step 1 builder → Step 2 make-it-act; CanvasPanel: Workspace | How it works)
  (workspaces)/blueprints/page.tsx   Strategy files: list (search/tags) · wizard (?new=1: goal → details → ⚡15) · document (?id=: Strategy | 2-week plan | UGC scripts | Prompt formulas, copy buttons, rename/tags/delete)
  agency/page.tsx            Public DIZURA Agency: 4 done-for-you services (3000 SAR) + order modal → Tap
  (workspaces)/ads-studio/page.tsx   StudioHero + AdsStudio (product photo, ad format photo cards, size, quality, extra direction; CanvasPanel)
  icon.png / apple-icon.png   favicon + touch icon from the DIZURA mark
  (old tool URLs → 308: /ai-influencer/* → /visual-character/*, /motion /video /wan-prime → /visual-character, /image → /ads-studio, /geo-audit /scheduler /b2b → /)
  (legal)/{privacy,terms}/page.tsx   Public Privacy Policy + Terms (ar/en, text in dictionaries `legal`), linked from SiteFooter (landing, auth, legal) — required by Google OAuth branding
  (auth)/{login,forgot-password,reset-password}/page.tsx   Login (?mode=signup, ?next=), reset request, new password
  auth/callback/route.ts     Email-link target: PKCE ?code= or ?token_hash=&type= -> session -> safe redirect
  actions/auth.ts            Server Actions: signIn, signUp, requestPasswordReset, updatePassword, signOut
  billing/return/page.tsx    Tap redirect target (re-verifies + fulfils idempotently)
  pricing/page.tsx           Public pricing: credit packs (PackGrid; guests → /login?next=/pricing) + per-feature cost table + notes (one-time, no subscription)
  actions/locale.ts          Server Action: set dz_locale cookie
  api/…                      see §5
components/
  ui/            Button (+buttonClass), Card, Modal (<dialog>), cn
  layout/        SiteFooter (© + Privacy/Terms/contact), LegalDocument, TopBar (nav prop), NavLinks (active state, mobile scroll row), CreditsBadge, nav.ts (TOOLS + EXTRAS)
  landing/       Hero3D (reduced-motion aware) -> Hero3DScene (R3F): mint wireframe globe + DIZURA S-band emblem, orbit ring, pulse; StudioShowcase
  studio/        StudioHero, CanvasPanel (Workspace | How it works tabs; guide until first result), StudioGuide (Higgsfield-style "The idea" carousel w/ step strip),
                 examples.ts (manifest of public/examples/*.webp), useGenerator (shared submit → poll w/ 2→10 s backoff + jitter → result; generate / transfer / ad)
  studio/ads/    AdsStudio
  studio/influencer/  InfluencerWorkspace (left: Step 1 builder [base identity: New face | From a photo (ReferencePhoto) | Soul ID + likeness], output Sheet 16:9 | Portrait 9:16/3:4/1:1 + scene, details, ⚡5; Step 2 GenjutsuStep; Soul ID panel. Right: preview canvas + workspace thumbs, "Use in video"), CharacterBuilder (character type cards + Builder/Face/Body/Style tabs, 19 groups: photo cards for visual groups, colour swatches, chips), GenjutsuStep (reference video upload w/ progress → character images [own creations + uploaded photos, ≤ 8] → quality 480/720/1080p → optional changes → cost from duration), media.ts (toJpeg, uploadPhoto, uploadVideo [direct signed PUT], videoMeta), option-photos.ts (generated manifest), traits.ts (GROUPS incl. kind [human/animal/alien/robot/fantasy + variants], look [photoreal/3D/anime/clay/comic], expression/Emotion; IdentityMode new|soul|photo; PHOTO_GROUPS, GLYPHS, SWATCHES, toggle/normalize/randomize/photoDefaults, composeCharacterPrompt, composeSoulIdPrompt, composePhotoPrompt), ReferencePhoto (one photo → JPEG in-browser → signed upload token), SoulIdPanel (train: name, 5–30 photos re-encoded to JPEG ≤1536px in-browser [strips EXIF], consent, ⚡40; list w/ status + delete), useCharacters (polls while training)
  strategist/    StrategistPanel (collapsible inline-end drawer in (workspaces)/layout, ⚡2/msg, sessionStorage chat, "Turn into blueprint"), RichText (safe mini-markdown), context.ts (session hand-off)
  blueprints/    BlueprintsApp, BlueprintWizard, BlueprintDoc, SectionView, CopyButton, types.ts
  agency/        AgencyServices (cards + order modal)
  studio/voice/  VoiceStudio (Step 3: dialect, voice, "Write it for me" ⚡2, script, speed, takes w/ audio + download; lip-sync "Coming soon")
  ui/CostChip    ember ⚡ cost chip
  billing/       PackGrid (packs from CREDIT_PACKS → POST /api/payments/checkout → Tap hosted page), BuyCreditsModal (opened by the credits badge or `insufficient_credits`), events.ts (openBuyCredits)
  i18n/          I18nProvider/useI18n, LanguageToggle
  auth/          AuthForms (SignIn/SignUp/ForgotPassword/ResetPassword, useActionState), AuthCard, fields (TextField, PasswordField w/ show-hide), FormStatus
  layout/AccountMenu  Sign-in button or user + sign-out (server component)
lib/
  env.ts         SERVER-ONLY validated env + requireEnv()   | env.public.ts  NEXT_PUBLIC_* only
  app-url.ts     resolveAppUrl() — build-time origin (explicit > Netlify URL/DEPLOY_PRIME_URL > localhost); used by next.config.ts
  http.ts        ApiError, ok/fail, route() wrapper, parseJson (size-capped), providerFetch
  api-client.ts  Browser fetch for our own API (typed ApiResult)
  ai/index.ts    Provider facade (Higgsfield only)
  higgsfield/client.ts   Higgsfield API: MODELS (+motionTransfer = Genjutsu), buildSubmission (+custom_reference_id), submitGeneration / submitMotionTransfer (Idempotency-Key), getJob, uploadMedia (presigned PUT), create/get/deleteSoulReference
  ai/resolve.ts  resolveJobImage (caller's own completed job → provider image URL), resolveUploadImage (caller's own upload token)
  media/         mp4.ts (range-read moov/mvhd duration), reference-videos.ts (private Supabase Storage bucket: signed upload URL, header inspect, signed download URL; memory store + /api/uploads/video/dev in dev only)
  ai/claude.ts   Claude client (server-only): strategistReply, generateSection (4 Zod-validated sections via structured outputs), writeVoiceScript; SDK errors → ApiError
  blueprints/store.ts  BlueprintStore (Supabase REST service role, per-section conditional PATCH `<section>=is.null` / memory in dev)
  agency/store.ts      ServiceOrderStore (create, attachCharge, markPaid idempotent on status=pending)
  voice/         elevenlabs.ts (VOICES, DIALECTS, synthesize), store.ts (private `voiceovers` bucket `<userId>/<uuid>.mp3`; memory in dev)
  supabase/rest.ts  serviceRest() + restRows() helpers for service-role REST stores
  ads/formats.ts AD_FORMATS (7 ad formats → English prompt templates, server-side) + composeAdPrompt
  tap/client.ts  createCharge, retrieveCharge, verifyWebhookHash (HMAC hashstring)
  tap/fulfill.ts fulfillCharge() — re-fetch, validate amount, idempotent grant
  credits/       pricing.ts (packs + generationCost + SOUL_ID + GENJUTSU/genjutsuCost + AD_IMAGE tiers), store.ts (CreditStore: memory dev / Supabase RPC)
  characters/    store.ts (CharacterStore: Supabase REST as service role w/ uuid-validated filters / memory in dev)
  auth/session.ts getCurrentUser() (React cache) + requireUser(req): getClaims() on cookie or Bearer; same-origin check for cookie-auth writes
  auth/redirect.ts safeNext() (open-redirect guard), PROTECTED_PREFIXES, GUEST_ONLY
  supabase/      server.ts (per-request cookie client, publishable key), proxy.ts (refreshSession for proxy.ts)
  security/      rate-limit.ts, signed-token.ts (HMAC job handles)
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
supabase/migrations/20261023014838_0007_reference_videos_bucket.sql   private `reference-videos` bucket (50 MB, mp4/mov), no client policies (APPLIED)
supabase/pending/0008_agency_suite.sql   blueprints + service_orders (RLS select-own, service_role grants) + private `voiceovers` bucket — **NOT YET APPLIED** (apply, then move to migrations/ with the remote version, ADR 19)
scripts/import-examples.mjs  Imports Lovable-designed example JPGs → public/influencer/options/<group>/<id>.webp (256 px) + public/examples/<name>.webp (1280 px) and rewrites both manifests
scripts/generate-option-photos.mjs  `npm run photos:options [-- --dry|--force|--only=g1,g2]` — Soul 2 option photos (white bg, quirky; art direction docs/design/option-photos.md) → public/influencer/options/<group>/<id>.webp (320 px square) + manifest
scripts/check-margins.mjs  `npm run margins [-- --live]` — gross margin per action from pricing.ts (+ live Higgsfield /estimate)
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
| 13 | Dark-only brand theme via tokens: `ink-*` (charcoal, page `#0A0A0B`) + **`mint-*` primary (`#00E599`, from the DIZURA globe mark)** + `ember-*` secondary (credits/cost chips, orange focus glow). `glass` utility = panel with a mint/20 edge (no backdrop-filter, ADR 47). No raw hex in components (three.js scene constants are the documented exception). | Colour consistency; owner's brand brief (2026-10-22). |
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
| 35 | **Influencer page mirrors the Higgsfield AI Influencer Studio structure** in DIZURA's design: character type tiers (Average/Bold/Extreme ↔ their normal/freak/total; Bold+ unlock exaggerated options), 18 trait groups in 4 tabs modelled on their builder's option catalogue (read via the Higgsfield MCP, `ai_influencer_get_options`), randomize, presets, character-sheet output (close-up + full body on white, 16:9). GCC additions: Gulf/Levantine/North African origins, hijab, modest + Khaleeji styling, majlis/desert scenes; gender limited to female/male. Labels are ours (i18n), the catalogue → English prompt mapping lives in `traits.ts`; a compile-time check ensures every option has a dictionary label. **Only portraits are animatable** (WAN i2v uses the image as the first frame; a two-panel sheet would animate as a split screen) — sheets are told apart by their 16:9 ratio. Video prompts describe motion only (the image carries identity). | "Exactly like Higgsfield" request (2026-10-23); their page itself is unreachable from the sandbox, so structure follows their API catalogue + published guides, with original copy/visuals. |
| 36 | **Step 2 = Genjutsu motion transfer** (`higgsfield/genjutsu/motion-transfer/v1.0`) replaces WAN 3.0 i2v on the influencer page: the user uploads a reference video and picks 1–8 character images (own Step-1 creations via signed job handles and/or own photo uploads); Genjutsu makes the character perform the video. Reference videos go **browser → private Supabase Storage** via a server-minted single-use signed upload URL (videos exceed Netlify's ~6 MB function body limit; CSP `connect-src` already allows the Supabase origin). The server then range-reads only the MP4/MOV header (`moov/mvhd`) to get the **real duration** — price = ceil(duration, 4–30 s) × {480p 4, 720p 8, 1080p 16} credits/s (Higgsfield $0.318/0.681/1.632 per s) — and gives the provider a 6 h signed download URL. Paths are `<userId>/<uuid>.mp4|mov`, sealed in a 2 h token and re-checked for ownership. Bucket has no anon/authenticated policies. Character sheets are now valid inputs (Genjutsu takes reference images, not a first frame). | Owner's spec (2026-10-23): "copy the exact style of the reference" is the core offer. Client never sends a URL, price or duration. |
| 37 | **Option photo cards**: visual trait groups (character type, gender, emotion, origin, age, facial hair, distinctive, build, hairstyle, style, accessories) render as photo cards; colour groups as swatches (hex values live in `traits.ts` as *data* — documented exception to the no-raw-hex rule); fine details stay chips. Photos are generated by us with Soul 2 (`npm run photos:options`, 83 images, idempotent per prompt), stored as 256 px WebP in `public/`, listed in `option-photos.ts`; missing photos fall back to placeholder art. New **Emotion** group (8 expressions) feeds the prompt and also applies to Soul ID characters. Marketing sections (presets, how-it-works, features, FAQ, CTA) removed — the page is the studio. | Owner: "photos of the options… easier and comfortable to choose". Not Higgsfield's images (copyright); our own generations. Higgsfield MCP account had 0 credits on 2026-10-23, so photos are pending. |
| 38 | **Public Supabase values are committed in `netlify.toml` `[build.environment]`** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) and referenced literally in `lib/env.ts`, so Next inlines them into server + client bundles at build time (same pattern as `NEXT_PUBLIC_APP_URL`). Secrets never go in `netlify.toml`. Rotating the publishable key = edit `netlify.toml` + redeploy. | Production sign-in failed for hours with `notConfigured`: the values set in the Netlify UI/API repeatedly went missing (API reported success, listing showed none), and Netlify Functions don't reliably expose `NEXT_PUBLIC_*` at runtime. Verified: build with the values, run with them unset → server reaches Supabase. |
| 39 | **"Continue with Google"** = Server Action `signInWithGoogle` → `supabase.auth.signInWithOAuth({ provider: "google", skipBrowserRedirect })` (PKCE; verifier in an httpOnly cookie) → redirect to Supabase → `/auth/callback` exchanges the code. Rate-limited per IP (20/10 min). Google users are email-verified, so the welcome trigger grants credits on insert. Supabase auth errors now map to specific messages (`email_address_invalid` → invalidEmail, `over_email_send_rate_limit` → emailRateLimited, provider disabled → googleUnavailable). | 2026-10-23 logs: sign-ups failed on Supabase's built-in email limit (`over_email_send_rate_limit`) and on rejected test addresses; Google sign-in needs no confirmation email. **Owner must enable the Google provider** (Supabase → Authentication → Sign In / Providers → Google, with a Google Cloud OAuth client) and should configure custom SMTP. |
| 40 | **DIZURA = two studios** (owner, 2026-10-23): Visual Character (renamed from AI Influencer) + Ads Creative Studio. Motion/Image/Video/GEO Audit/Scheduler/B2B pages, the public `/api/geo-audit` endpoint (+ SSRF-guarded fetcher, GSC MCP client, `GSC_MCP_*` env) and the generic `Studio`/`ToolHero`/bento components were removed; old URLs 308-redirect. Workspace ids: `visual-character`, `ads-studio`. Each studio = left controls + right `CanvasPanel` (Workspace | How it works). Design source: Lovable project "DIZURA AI Influencer Studio" (frontend-only prototype). | Focus on the two products; smaller attack surface (public SSRF-capable endpoint gone). |
| 41 | **Ads Creative Studio = Higgsfield Marketing Studio Image** (`POST /marketing-studio/image` `{ prompt, image_urls:[product], aspect_ratio, resolution, quality, enhance_prompt:false }`, then `/requests/{id}/status` → `images[]`). Product photo goes through `/api/uploads/image` (re-encoded JPEG, signed token); `/api/ai/ad` takes `{ product, format, aspectRatio, quality, notes≤500 }` — format → server-side prompt template (`lib/ads/formats.ts`), quality tier → credits/resolution/quality (`AD_IMAGE`: standard 3 = 1k/medium, high 6 = 2k/high, ultra 10 = 4k/high). Reserve → submit (Idempotency-Key) → refund on failure, poll via `/api/ai/jobs/[token]`. Video ads: later (Marketing Studio Video API not yet documented for us). | Request shape taken from an integration verified against docs.higgsfield.ai (docs host unreachable from the sandbox); **owner: confirm per-tier cost with `POST /estimate/marketing-studio/image`** and the first live call. |
| 42 | **Brand-neutral UI**: user-facing text shows only DIZURA (e.g. "DIZURA Character", "DIZURA Motion", "DIZURA Ads", "DIZURA ID"); no Higgsfield/Soul/Genjutsu/WAN/Supabase/Netlify/Tap/Claude names on the site. The privacy policy lists processor *categories*. Exception: "Continue with Google" (Google's sign-in branding rules require it). Internal code identifiers keep provider names. | Owner instruction (2026-10-23). |
| 43 | **Example imagery** (option cards, ad formats, How-it-works steps, landing collages) was generated in Lovable (fictional people, unbranded products) and is imported as WebP via `scripts/import-examples.mjs`; manifests (`option-photos.ts`, `examples.ts`) list only files on disk, everything else shows placeholder art. | Owner asked for Higgsfield-like example pictures; Higgsfield account had 0 credits. Lovable binaries can't be read intact through the MCP, so they come via the Lovable project's GitHub repo. |
| 44 | **Monetisation UI = one-time credit packs** (no subscription yet): public `/pricing` + a Buy-credits modal. The credits badge is a button that opens the modal; any `insufficient_credits` (402) from a studio or DIZURA ID opens it with "You're out of credits". The client only sends `packId`; amounts stay server-side (ADR 7). Without `TAP_SECRET_KEY` checkout returns 503 → "Payments are being set up". Pricing shows per-feature costs computed from `pricing.ts`, so it can't drift. | Owner (2026-10-23): "there is no subscription after generating" — users had no way to pay once the welcome credits ran out. Auto-renewing plans need Tap saved cards + scheduled charges — roadmap. |
| 45 | **Character kinds + "From a photo"** (owner, 2026-10-23: "real people, animals, aliens and much more"). Builder gets a **Character kind** (Human, Animal [12 species, dressed or natural], Alien, Robot, Fantasy) and a **Look** (Photoreal, 3D animated, Anime, Clay, Comic); trait groups declare the `kinds` they apply to, so human-only groups hide for other kinds. Option cards without a photo show an emoji glyph. **From a photo**: one photo (person, pet, toy, mascot) re-encoded in the browser → `/api/uploads/image` → signed token; `/api/ai/generate` takes `referencePhoto` (caller's own token, images only, not with a DIZURA ID) and sends it with the prompt to the reference-image model (`marketing-studio/image`, 2k/medium) at the normal **5 credits**. Photo mode hides identity groups + hair, defaults to "As in photo" + "Keep outfit from photo", and can reimagine the subject as any kind. | One-photo characters without training a DIZURA ID (40 credits); broader creative range. Marketing Studio Image is the reference-image endpoint we already integrate (verify the first live run + per-image cost via `/estimate`). Users must have rights to the photo (UI note + Terms). |
| 46 | **Auth links return to the host the flow started on** (amends ADR 24 for auth only): `callbackUrl()` uses the request `Host` **only** if it equals the app host or is a Netlify alias of it (`<deploy-id>--<app host>`, `[a-z0-9-]+` prefix, https); anything else falls back to `NEXT_PUBLIC_APP_URL`. Supabase Redirect URLs must include `https://*--sparkly-swan-cf292e.netlify.app/**`. | 2026-10-23 logs: Google sign-in + password reset failed with "PKCE code verifier not found" — the owner used the deploy permalink (`6adb…--sparkly-swan…`), so the verifier cookie lived there while links returned to the main host. Spoofed hosts (evil.com, `evil.com/--site`, `a.b--site`) tested → main host. |
| 47 | **Scroll performance budget**: no `backdrop-filter` on large or scrolling areas (`glass` panels, sticky top bar, canvas tabs, image labels) — use near-opaque token backgrounds instead. The 3D globe renders only while on screen and the tab is visible (IntersectionObserver + `visibilitychange`), at 30 fps via `frameloop="demand"` + a ticker, `dpr` ≤ 1.5, `powerPreference: "low-power"`. | Owner (2026-10-23): "black brightness when I scrolled… lagging". Measured (prod build, headless Chromium, scroll test): /visual-character 69.9 → 17.0 ms/frame (116 → 0 janky frames), /ads-studio 69.4 → 16.7, landing 44.4 → 22.2; background work after scrolling past the globe ~1000 → ~30 ms/s. Large blurred layers are also what render as black tiles on some GPUs. |
| 48 | **Option photos v2 = white-background, quirky casting** (art direction in `docs/design/option-photos.md`, inspired by the owner's Higgsfield builder references — style only, no Higgsfield images stored). `scripts/generate-option-photos.mjs` v2: 122 prompts covering every photo group incl. kinds/animals/aliens/robots/fantasy/looks (animals wear human hairstyles; builds and outfits played for kind humour; GCC styling), square 1:1 → 320 px WebP, `--force` / `--only=` / `--dry`, idempotency keys versioned. Photo cards render as white "paper" tiles with the label underneath (`--color-paper` token); options without a photo keep glyph/placeholder art. Generation runs on the owner's machine/Codespace with their Higgsfield API keys (sandbox can't reach the API; MCP account has 0 credits). | Owner (2026-10-23): "characters with white background and different styles… looking like this… and more from your imagination". |
| 49 | **Margin-based pricing**: every action keeps ≥ ~60% gross margin when paid with the cheapest credit (Studio pack ≈ $0.106/credit, 1 KWD = $3.25) after ~3% payment fees. Provider costs live in `PROVIDER_COST_USD` (`lib/credits/pricing.ts`, sourced from open.higgsfield.ai model pages; `estimate: true` where our exact settings aren't published); `npm run margins` prints the table, `-- --live` queries `POST /estimate/{model}` with the owner's keys. New prices: DIZURA ID 40 → **65**; Motion 4/8/16 → **8/17/40** cr/s (480/720/1080p); Ads 3/6/10 → **3/8/20**; images stay **5**. | Owner (2026-10-23): "make the calculation to make great profits". Old Motion 1080p (16 cr/s ≈ $1.70 vs $1.632 cost) and Ultra ads (10 cr ≈ $1.06 vs $0.72) ran at ~4% / ~32% margin. The pricing page couldn't be fetched from the sandbox (DNS), so figures came from Higgsfield's model pages via search — confirm with `--live`. |
| 50 | **Agency suite** (owner, 2026-10-23). (a) **DIZURA Strategist** = Claude API, server-only (`lib/ai/claude.ts`), never named in the UI (ADR 42); a collapsible drawer in every studio, 2 credits per reply, refunded if the call fails; chat lives in sessionStorage only. (b) **Strategy files** (`blueprints` table): 15 credits charged once at creation (`bp:<id>`), then the client calls one route per section (strategy / 14-day plan / 3 UGC scripts / 6 prompt formulas) so each request stays far under Netlify's 60 s limit; each section is its own jsonb column written with a conditional PATCH (`<section>=is.null`), so parallel writes and retries never overwrite or double-bill; unfinished sections are generated when the file is reopened. Output is Zod-validated structured JSON rendered as text (no HTML). (c) **Swap mode** = Genjutsu with the product photo appended as the last reference image + a fixed swap direction (no new provider). (d) **DIZURA Voice** = ElevenLabs TTS, 1 credit / 100 chars (min 2, ≤ 2500 chars), refunded on failure; MP3 stored in the private `voiceovers` bucket and streamed through `/api/voice/audio/[token]` (signed 7-day handle, owner check); "Write it for me" drafts the script in the dialect via Claude (2 credits). Lip-sync shows *Coming soon* (no verified API). (e) **Agency services**: 4 fixed-price services (3000 SAR) in `AGENCY_SERVICES`; client sends only the service id + brief; Tap charge metadata `kind: service` → `fulfillService` re-fetches the charge, checks amount/currency/order, marks the order paid (idempotent) and logs `[agency] new paid order`. Margins: chat 78%, blueprint 80%, voice 71% (`npm run margins`). | Owner: "AI Agency features, strategy management, and local voice dubbing". Lovable workspace ran out of credits mid-design, so screens were built in our codebase from its drafts. |
| 19 | Migration files named `<remote version>_<name>.sql`, matching `supabase_migrations.schema_migrations` exactly. New migrations: apply via MCP/CLI, then name the file with the version Supabase records. Migrations must also replay cleanly on a fresh preview branch (guard project-specific objects). | Supabase GitHub integration (Preview check) fails when remote versions are missing locally. |
| 29 | `APP_SECRET` optional at boot (Netlify agent, PR #4); `signed-token.ts` enforces presence + ≥32 chars at use (→ 503 `not_configured`); `/api/ai/generate` checks it before reserving credits | `lib/env.ts` is evaluated during `next build` (page-data collection), so a missing/short secret was failing Netlify builds. |

## 5. API routes
| Method | Route | Auth | Limit | Purpose |
|---|---|---|---|---|
| POST | `/api/ai/generate` | user | 20/min/user | Validate, compute cost, reserve credits, submit to provider; returns `GenerationJob` (202) with signed `id`. Optional `sourceJob` (animate own image, ADR 31), `characterId` + `characterStrength` (Soul ID, images only, ADR 33) or `referencePhoto` (own upload token → reference-image model, ADR 45) |
| GET | `/api/ai/jobs/[token]` | user (must own) | 120/min/user | Poll provider; auto-refunds once on failed/cancelled |
| GET | `/api/credits` | user | – | `{ balance }` |
| POST | `/api/uploads/image` | user | 60/10 min | multipart `file` (JPEG/PNG/WebP by magic bytes, ≤ 5 MB) → `{ token }` (signed 1 h upload handle) |
| POST | `/api/uploads/video` | user | 20/10 min | `{ type: video/mp4|video/quicktime, size ≤ 50 MB }` → `{ uploadUrl, headers, token }` (browser PUTs the file straight to private storage; token = signed 2 h handle) |
| POST | `/api/ai/ad` | user | 20/min/user | `{ product: uploadToken, format, aspectRatio (1:1/3:4/9:16/16:9), quality (standard/high/ultra), notes? }` → `GenerationJob` (202); Marketing Studio Image; credits 3/6/10 by quality |
| POST | `/api/ai/motion-transfer` | user | 20/min/user | `{ video: token, characters: jobToken[], photos: uploadToken[] (1–8 total incl. product), resolution, prompt?, mode: standard|swap, product?: uploadToken (swap) }` → `GenerationJob` (202); server reads duration, prices, reserves, submits Genjutsu; poll via `/api/ai/jobs/[token]` |
| PUT/GET | `/api/uploads/video/dev` | – | – | **Dev/test only** stand-in for storage; 404 whenever real storage is configured and always in production |
| GET | `/api/characters` | user | 60/min | caller's Soul ID characters `{id,name,state,thumbnailUrl,…}`; refreshes training ones; refunds failed once |
| POST | `/api/characters` | user | 5/10 min | `{ name, uploads: token[5–30], consent: true }` → train (⚡40) |
| DELETE | `/api/characters/[id]` | user (owner) | 20/min | delete here + at Higgsfield |
| GET | `/auth/callback?code=…|token_hash=…&type=…&next=` | – | – | Exchange email link for session; failure → `/login?error=link` |
| POST | `/api/strategy/chat` | user | 20/min | `{ messages[1–20, user first+last], locale, studio }` → `{ reply }` (⚡2, refunded on failure) |
| GET/POST | `/api/blueprints` | user | 60/min · 5/10 min | list (`done` = finished sections) · create `{ goal, title?, locale, inputs{product, audience, market, budget, tone, notes, context} }` (⚡15) → 201 |
| GET/PATCH/DELETE | `/api/blueprints/[id]` | user (owner) | 120/30/30 per min | read · `{ title?, tags≤8 }` · delete |
| POST | `/api/blueprints/[id]/sections/[section]` | user (owner) | 24/10 min | generate one section (free; existing → returned as-is) |
| POST | `/api/voice/speech` | user | 20/10 min | `{ text 2–2500, voice, speed 0.7–1.2 }` → `{ token }` (⚡1/100 chars, min 2) |
| GET | `/api/voice/audio/[token]` | user (owner) | – | streams the MP3 |
| POST | `/api/voice/script` | user | 20/10 min | `{ dialect, brief, seconds 5–90 }` → `{ script }` (⚡2) |
| GET/POST | `/api/agency/orders` | user | 60/min · 5/10 min | list · `{ service, brief{brand, phone, link?, notes?} }` → `{ redirectUrl, orderId }` (Tap, price server-side; 503 without Tap keys) |
| POST | `/api/payments/checkout` | user | 5/min/user | `{ packId }` → `{ redirectUrl, chargeId }` (Tap hosted page) |
| POST | `/api/webhooks/tap` | Tap HMAC | – | Verify + fulfil; 401 bad sig, 500 → Tap retries |
| Page | `/billing/return?tap_id=` | – | – | Re-verify + idempotent fulfil, show status |
| Page | `/pricing` | – (buy needs user) | – | Credit packs + cost table; Buy → `/api/payments/checkout` |

"user" = Supabase session cookie or `Authorization: Bearer <access token>`; cookie-auth writes must be same-origin (403 otherwise).

Error codes → HTTP: bad_request 400, unauthorized 401, insufficient_credits 402, forbidden 403, not_found 404, rate_limited 429 (+Retry-After), internal 500, provider_error 502, not_configured 503.

## 6. Environment variables
Template: `.env.example` (committed). Real values: `.env.local` (gitignored via `.env.*`, chmod 600; `APP_SECRET` auto-generated).
Server-only: `APP_SECRET`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HIGGSFIELD_API_KEY` + `HIGGSFIELD_API_SECRET` (or combined `KEY_ID:KEY_SECRET` in the key), optional `HIGGSFIELD_API_BASE_URL` (default `https://api.higgsfield.ai`), `TAP_SECRET_KEY`, `TAP_API_BASE_URL`, `ANTHROPIC_API_KEY` (+ optional `ANTHROPIC_MODEL`), `ELEVENLABS_API_KEY` (+ optional `ELEVENLABS_MODEL_ID`, `ELEVENLABS_API_BASE_URL`). The Anthropic SDK also honours `ANTHROPIC_BASE_URL` (tests only).
Public: `NEXT_PUBLIC_APP_URL` (optional; see ADR 24), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_TAP_PUBLIC_KEY`.
Rule: never add a secret with the `NEXT_PUBLIC_` prefix; add every new var to `.env.example` + `lib/env.ts` schema.
Dev/test only: `DEV_STARTING_CREDITS` (read only by the in-memory credit store, which never runs in production).

## 6b. Deployment — Netlify
- Site: **`sparkly-swan-cf292e`** → `https://sparkly-swan-cf292e.netlify.app` (Next.js runtime auto-detected; any env change needs a **redeploy**).
- **Public Supabase URL + publishable key live in `netlify.toml`** (ADR 38) — not in the Netlify UI.
- Google Search Console ownership: `metadata.verification.google` in `app/layout.tsx` (URL-prefix property for the Netlify URL; needed for Google OAuth branding verification). Re-verify when the custom domain is added.
- Env per context: `NEXT_PUBLIC_APP_URL` → Production only (custom domain when added). `APP_SECRET` → every context (different value each; build fails without it). `SUPABASE_SERVICE_ROLE_KEY` + `TAP_SECRET_KEY` (`sk_live_`) → Production only; previews get `sk_test_` / no service key. Agent Runners: test keys only. Local dev context: no secrets.
- Scopes: `NEXT_PUBLIC_*` → Builds; server secrets → Builds + Functions. Tick "Contains secret values" for all non-public keys.
- **Supabase → Authentication → URL Configuration** (owner): Site URL `https://sparkly-swan-cf292e.netlify.app` (or custom domain); Redirect URLs: `http://localhost:3000/**`, `https://sparkly-swan-cf292e.netlify.app/**`, `https://*--sparkly-swan-cf292e.netlify.app/**` (single `*` — never `**` before the host, which could match an attacker-controlled host).

## 7. Credit economy (`lib/credits/pricing.ts`)
Welcome bonus: **30 credits** on email confirmation (ADR 25).
Pricing rule (ADR 49): ≥ ~60% margin at the cheapest credit ($0.106, Studio pack); `npm run margins`.
Soul ID training: **65 credits** (Higgsfield ≈ $2.50/request) — needs a credit purchase after the welcome bonus.
Packs: starter 100cr/5 KWD · pro 500cr/20 KWD · studio 2000cr/65 KWD.
Costs: image **5** (every studio); video **8 cr/s** for every studio, 3–15 s, default 3 s (= 24). Character + first video = 29 ≤ welcome 30.
Ads Creative Studio: **3 / 8 / 20 credits** per ad (Standard 1k / High 2k / Ultra 4k; Ultra cost $0.7219 published, others estimated — `npm run margins -- --live`).
Strategist: **2** credits per reply · Strategy file: **15** (all four sections) · Voice: **1 per 100 characters** (min 2) · "Write it for me": **2**.
Agency services (not credits): **3000 SAR** each — Single Product Store, Landing Page, Print on Demand, Shopify (Tap).
Genjutsu (influencer Step 2): **8 / 17 / 40 cr per second** of reference video at 480p / 720p / 1080p, 4–30 s (e.g. 6 s at 720p = 102). Welcome credits (30) cover 6 characters or 10 standard ads; videos need a pack.

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
- [ ] **Apply `supabase/pending/0008_agency_suite.sql`** (blueprints, service_orders, voiceovers bucket), run both advisors, then rename into `supabase/migrations/` with the remote version. Until then Strategy files / agency orders / voice storage fail in production.
- [ ] Netlify (Production): `ANTHROPIC_API_KEY` (Strategist, Strategy files, "Write it for me") and `ELEVENLABS_API_KEY` (DIZURA Voice); without them those features return 503 before charging.
- [ ] Agency orders: paid orders appear in `service_orders` + function logs (`[agency] new paid order`) — add an email/WhatsApp notification to the team.
- [x] **Higgsfield** paths/auth/response shape now match the official docs; verified against a mock of the documented API (request path, `Key` header, Idempotency-Key, body, status polling, image/video/nsfw results). **Still to do: one live generation with real keys** (sandbox can't reach api.higgsfield.ai).
- [x] **WAN 3.0 Prime** = Higgsfield model `alibaba/wan-3.0-prime/text-to-video` (duration 2–30 s, resolution 480p/720p/1080p, aspect incl. 3:4).
- [ ] **Marketing Studio Image**: first live ad + `POST /estimate/marketing-studio/image` per tier (ADR 41).
- [ ] Import Lovable example images (`scripts/import-examples.mjs`) once the Lovable project is connected to GitHub.
- [ ] Tap: confirm `hashstring` field order for the account's API version; register webhook URL in Tap dashboard.
- [x] `TAP_SECRET_KEY` set on Netlify (2026-10-23, all contexts, **`sk_test_` = test mode**; switch Production to `sk_live_` to take real payments). Register webhook `https://sparkly-swan-cf292e.netlify.app/api/webhooks/tap` in Tap.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` on Netlify is only 10 characters — looks like a placeholder, not a real key. Credit ledger, payment fulfilment, DIZURA ID and video uploads fail (503) until it is replaced with the real `service_role`/`sb_secret_` key (Production only).

## 10. Roadmap
1. ~~Login UI~~ ✅ (email/password, confirm, reset). ~~Google OAuth button~~ ✅ (ADR 39; provider must be enabled in Supabase). Next: `profiles` (plan via `app_metadata`/table), ~~welcome credits~~ ✅, **custom SMTP** (Supabase built-in email hit its rate limit on 2026-10-23).
2. ~~Pricing/checkout UI~~ ✅ (ADR 44; live once Tap keys are set + webhook registered). Next: monthly subscription plans (Tap saved card + recurring charge + monthly credit grant).
2b. ~~Influencer animate (i2v)~~ ✅ → replaced by ~~Genjutsu motion transfer~~ ✅ (ADR 36, verified vs mocks; first live run still to confirm). ~~Soul ID~~ ✅. Next: run `npm run photos:options` once the Higgsfield account has credits; purge reference videos after N days (storage lifecycle / scheduled delete via Storage API); copy outputs to our storage. Next: Motion photo upload + i2v (reuse `/api/uploads/image`), copy outputs to Supabase Storage (provider URLs expire ≥7 d), price check via `/estimate`, real thumbnails for style/idea cards.
3. Persist generation jobs (history gallery per workspace) + media upload for reference images.
4. Shared rate limiter (Upstash Redis or Postgres) before multi-instance deploy.
5. Ads Creative Studio: video ads (Marketing Studio Video), brand kits, presets (`enhance_prompt` + `preset_id`).
6. Visual Character: Motion library of licensed reference clips (Lovable thumbnails `motion-*` are ready).
8. Observability (Sentry), tests (Vitest for lib/, Playwright for flows), CI.
