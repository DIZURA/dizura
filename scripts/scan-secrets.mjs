#!/usr/bin/env node
/**
 * DIZURA secret scanner — zero dependencies.
 *   node scripts/scan-secrets.mjs            scan every tracked + untracked (non-ignored) file
 *   node scripts/scan-secrets.mjs --staged   scan only staged content (pre-commit hook)
 * Exit code 1 on any finding. Matched values are masked in output.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const staged = process.argv.includes("--staged");
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const files = (staged
  ? git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")
  : git("ls-files", "--cached", "--others", "--exclude-standard", "-z")
)
  .split("\0")
  .filter(Boolean);

const read = (f) => {
  try {
    return staged ? git("show", `:${f}`) : readFileSync(f, "utf8");
  } catch {
    return null;
  }
};

/** Files that must never be committed, regardless of content. */
const FORBIDDEN_FILES = [
  [/(^|\/)\.env(\.(?!example$)[^/]*)?$/, "environment file (only .env.example may be committed)"],
  [/\.(pem|key|p12|pfx|keystore)$/i, "private key / certificate file"],
  [/(^|\/)(service-account|credentials)[^/]*\.json$/i, "cloud credentials file"],
  [/(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/, "SSH private key"],
];

/** Content patterns. Public-by-design keys (Tap pk_, Supabase sb_publishable_ / anon JWT) are intentionally not flagged. */
const RULES = [
  ["Private key block", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/],
  ["Tap secret key", /\bsk_(?:test|live)_[A-Za-z0-9]{16,}/],
  ["Stripe secret key", /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/],
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]{16,}/],
  ["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["OpenAI API key", /\bsk-(?:proj-)?[A-Za-z0-9]{32,}/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})/],
  ["AWS access key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ["Postgres URL with real password", /postgres(?:ql)?:\/\/[^:\s/]+:(?!password@|postgres@|\$\{|<)[^@\s]{6,}@(?!localhost|127\.0\.0\.1)/],
  ["Secret exposed via NEXT_PUBLIC_", /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE)[A-Z0-9_]*/],
  [
    "Hardcoded credential assignment",
    /\b[A-Za-z0-9_]*(?:SECRET|PASSWORD|PASSWD|PRIVATE_KEY|API_KEY|ACCESS_TOKEN|AUTH_TOKEN)[A-Za-z0-9_]*\s*[:=]\s*["'`]([^"'`\s$<{]{16,})["'`]/i,
  ],
];

/** JWTs: flag anything that isn't a Supabase anon token (e.g. service_role). */
const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g;

const SKIP = [/^package-lock\.json$/, /^scripts\/scan-secrets\.mjs$/, /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|mp4|glb)$/i];
const mask = (s) => (s.length <= 8 ? "****" : `${s.slice(0, 4)}…${s.slice(-2)} (${s.length} chars)`);

const findings = [];
for (const file of files) {
  for (const [re, why] of FORBIDDEN_FILES) if (re.test(file)) findings.push(`${file}: ${why}`);
  if (SKIP.some((re) => re.test(file))) continue;
  const text = read(file);
  if (text === null || text.includes("\0")) continue;

  text.split("\n").forEach((line, i) => {
    if (line.includes("scan-secrets: allow")) return;
    for (const [name, re] of RULES) {
      const m = line.match(re);
      if (m) findings.push(`${file}:${i + 1}: ${name} → ${mask(m[1] ?? m[0])}`);
    }
    for (const m of line.matchAll(JWT)) {
      let role = "unknown";
      try {
        role = JSON.parse(Buffer.from(m[1], "base64url").toString()).role ?? "unknown";
      } catch {}
      if (role !== "anon") findings.push(`${file}:${i + 1}: JWT with role "${role}" → ${mask(m[0])}`);
    }
  });
}

if (findings.length) {
  console.error(`\n✖ secret-scan: ${findings.length} finding(s) — commit blocked.\n`);
  for (const f of findings) console.error(`  ${f}`);
  console.error(`\nMove secrets to .env.local (gitignored). False positive? Append "scan-secrets: allow" to that line.\n`);
  process.exit(1);
}
console.log(`✓ secret-scan: ${files.length} file(s) clean${staged ? " (staged)" : ""}.`);
