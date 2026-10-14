/**
 * Integration boundary for uploaded media. NOTHING here uploads anything.
 *
 * Uploads stay disabled until (1) an object-storage bucket is configured and (2) an upload handler
 * that enforces type, size, and authorization is implemented and tested. `UPLOADS_IMPLEMENTED` is
 * the switch that flips when (2) is done; the UI reads it and never shows upload controls before.
 *
 * Candidate provider: Cloudflare R2 (S3-compatible, no egress fees, 10 GB Standard storage free per
 * month per Cloudflare's pricing page). Vercel Blob is the alternative; its Hobby allowance is
 * smaller and Hobby terms cover non-commercial use only. See docs/nawa-studio.md.
 */

export const UPLOADS_IMPLEMENTED = false as const;

/** Environment variable names the R2 integration will need. Names only; values are never stored in the repo. */
export const R2_REQUIRED_ENV = [
  "MEDIA_R2_ACCOUNT_ID",
  "MEDIA_R2_BUCKET",
  "MEDIA_R2_ACCESS_KEY_ID",
  "MEDIA_R2_SECRET_ACCESS_KEY",
  "MEDIA_PUBLIC_BASE_URL",
] as const;

export interface MediaStorageStatus {
  /** True when every required variable is present. Says nothing about whether uploads work. */
  configured: boolean;
  /** True only when the upload handler exists. */
  uploadsAvailable: boolean;
  missing: string[];
}

export function getMediaStorageStatus(env: Record<string, string | undefined> = process.env): MediaStorageStatus {
  const missing = R2_REQUIRED_ENV.filter((name) => !(env[name] ?? "").trim());
  return {
    configured: missing.length === 0,
    uploadsAvailable: UPLOADS_IMPLEMENTED && missing.length === 0,
    missing: [...missing],
  };
}
