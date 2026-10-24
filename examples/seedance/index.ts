/**
 * Seedance 2.5 text-to-video via the official Higgsfield SDK (v2 client).
 *
 *   npm run example:seedance
 *
 * Credentials: HF_CREDENTIALS="KEY_ID:KEY_SECRET" in .env.local (gitignored), loaded by Node's
 * --env-file-if-exists at runtime. The SDK reads it from the environment itself; this script
 * only checks that it is present and never prints it.
 *
 * This makes a billable generation request.
 */
import { createHiggsfieldClient, HiggsfieldError, TimeoutError } from "@higgsfield/client/v2";

const MODEL = "bytedance/seedance-2.5/text-to-video";
const INPUT = {
  prompt: "A cinematic scene at sunset",
  duration: 5,
  resolution: "720p",
  aspect_ratio: "16:9",
};

if (!process.env.HF_CREDENTIALS?.includes(":")) {
  console.error('HF_CREDENTIALS is missing. Add HF_CREDENTIALS="KEY_ID:KEY_SECRET" to .env.local (never commit it).');
  process.exit(1);
}

// No credentials passed here: the SDK picks HF_CREDENTIALS up from the environment.
// Video can take longer than the SDK's 5-minute default poll window. The SDK only stops polling on
// completed / nsfw / failed, so a canceled request ends as a TimeoutError (reported as not done).
const client = createHiggsfieldClient({ maxPollTime: 15 * 60_000 });

try {
  // subscribe() resolves with the final status response: { status, request_id, video?: { url } }.
  const result = await client.subscribe(MODEL, { input: INPUT, withPolling: true });
  const status: string = result.status;
  const url = result.video?.url;

  if (status === "completed" && url) {
    console.log(`Completed (request ${result.request_id})`);
    console.log(`Video URL: ${url}`);
  } else {
    const state = status === "nsfw" ? "rejected by moderation (nsfw)"
      : status === "completed" ? "completed without a video URL"
      : status; // failed / canceled
    console.error(`Generation ${state} (request ${result.request_id}). No video was produced.`);
    process.exitCode = 1;
  }
} catch (err) {
  if (err instanceof TimeoutError) console.error("Gave up waiting: the request did not complete (it may have been canceled).");
  else if (err instanceof HiggsfieldError) console.error(`Higgsfield error: ${err.name}: ${err.message}`);
  else console.error("Request failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
