/** Normalised shapes for every AI provider (Higgsfield, WAN 3.0). Workspaces only see these. */

export type AiProvider = "higgsfield" | "wan";

export type Workspace = "ads-studio" | "ai-influencer" | "wan-prime";

export type MediaKind = "image" | "video";

export type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export type AspectRatio = "1:1" | "9:16" | "16:9" | "4:5";

export interface GenerationRequest {
  workspace: Workspace;
  prompt: string;
  kind: MediaKind;
  aspectRatio: AspectRatio;
  /** Seconds, video only. */
  durationSec?: number;
  /** Already-uploaded reference media URLs (https only). */
  referenceUrls?: string[];
}

export interface GenerationJob {
  id: string;
  provider: AiProvider;
  providerJobId: string;
  workspace: Workspace;
  status: JobStatus;
  creditsCharged: number;
  outputs: GeneratedMedia[];
  error: string | null;
  createdAt: string;
}

export interface GeneratedMedia {
  url: string;
  kind: MediaKind;
  width?: number;
  height?: number;
}

/** Standard JSON envelope for every API route. */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ApiErrorCode; message: string } };

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "insufficient_credits"
  | "rate_limited"
  | "provider_error"
  | "not_configured"
  | "internal";

export interface GeoAuditCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: "high" | "medium" | "low";
  detail: string;
}

export interface GeoAuditReport {
  url: string;
  score: number; // 0–100
  checks: GeoAuditCheck[];
  searchConsole: GscSummary | null;
  generatedAt: string;
}

export interface GscSummary {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  topQueries: { query: string; clicks: number; impressions: number }[];
}
