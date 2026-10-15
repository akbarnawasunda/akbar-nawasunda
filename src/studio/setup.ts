/**
 * Activation checks for NAWA STUDIO. Pure functions only: no database, no network, no environment
 * access beyond the object passed in. The activation page (`/studio/setup`) adds the live database
 * probe separately, so everything here can be unit tested.
 *
 * Rules of this module:
 * - Values of secrets are never returned. Only presence, shape, and a masked host are reported.
 * - A check never says "ok" for something that has not been verified. DB reachability is "todo"
 *   here and is decided by the live probe.
 */

import { getStudioConfigStatus } from "./config";
import { normalizeStoredHash } from "./hash-format";

export type SetupLevel = "ok" | "warn" | "bad" | "todo";

export interface SetupCheck {
  id: string;
  label: string;
  level: SetupLevel;
  detail: string;
}

export type DatabaseKind = "missing" | "file" | "libsql" | "remote" | "postgres" | "unsupported";

export interface DatabaseUrlInfo {
  kind: DatabaseKind;
  /** Masked host for display, or null when there is no host (missing value, file database). */
  host: string | null;
  /** Human-readable reason when the value cannot be used. Null when the shape is acceptable. */
  problem: string | null;
}

const POSTGRES_SCHEMES = ["postgres:", "postgresql:"];
const UNSUPPORTED_SCHEMES = ["mysql:", "mongodb:", "redis:", "mssql:", "mariadb:"];

/**
 * Masks the host so a screenshot or a shared page does not expose the database name, while keeping
 * the provider domain readable for troubleshooting: `my-database-owner.turso.io` → `my-….turso.io`.
 */
export function maskHost(host: string): string {
  const trimmed = host.trim();
  if (trimmed.length === 0) return "";
  const [first = "", ...others] = trimmed.split(".");
  const keep = first.length > 4 ? first.slice(0, 3) : first.slice(0, 1);
  const maskedFirst = `${keep}…`;
  return others.length > 0 ? `${maskedFirst}.${others.join(".")}` : maskedFirst;
}

/** Removes secret values from a message before it is shown on screen. */
export function redactSecrets(message: string, secrets: readonly (string | undefined)[]): string {
  let output = message;
  for (const secret of secrets) {
    const value = secret?.trim();
    if (!value || value.length < 4) continue;
    output = output.split(value).join("[hidden]");
  }
  output = output.replace(/libsql:\/\/[^\s"']+/g, "libsql://[hidden]");
  return output;
}

/** Trims a database error into one short line that is safe to display. */
export function shortError(error: unknown, secrets: readonly (string | undefined)[]): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const line = raw.split("\n").map((part) => part.trim()).filter(Boolean)[0] ?? "Unknown error.";
  const redacted = redactSecrets(line, secrets);
  return redacted.length > 240 ? `${redacted.slice(0, 237)}…` : redacted;
}

export function inspectDatabaseUrl(raw: string | undefined): DatabaseUrlInfo {
  const value = raw?.trim() ?? "";
  if (value.length === 0) {
    return { kind: "missing", host: null, problem: "Not set." };
  }

  if (value.startsWith("file:")) {
    return { kind: "file", host: null, problem: null };
  }

  const scheme = value.slice(0, value.indexOf(":") + 1).toLowerCase();

  if (POSTGRES_SCHEMES.includes(scheme)) {
    return {
      kind: "postgres",
      host: null,
      problem:
        "NAWA STUDIO stores its content in libSQL, not Postgres. A Postgres connection string cannot be used here.",
    };
  }
  if (UNSUPPORTED_SCHEMES.includes(scheme)) {
    return { kind: "unsupported", host: null, problem: `The ${scheme.replace(":", "")} protocol is not supported.` };
  }
  if (scheme !== "libsql:" && scheme !== "https:" && scheme !== "http:" && scheme !== "wss:" && scheme !== "ws:") {
    return {
      kind: "unsupported",
      host: null,
      problem: "Expected a value that starts with libsql:// (remote) or file: (local).",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { kind: "unsupported", host: null, problem: "This is not a valid URL. Check for spaces or missing characters." };
  }

  const host = parsed.hostname;
  if (host.length === 0) {
    return { kind: "unsupported", host: null, problem: "The URL has no host name." };
  }

  if (scheme === "libsql:" || scheme === "wss:" || scheme === "ws:") {
    return { kind: "libsql", host: maskHost(host), problem: null };
  }
  return { kind: "remote", host: maskHost(host), problem: null };
}

export interface PasswordHashInfo {
  present: boolean;
  valid: boolean;
  detail: string;
}

export function inspectPasswordHash(raw: string | undefined): PasswordHashInfo {
  const value = normalizeStoredHash(raw ?? "");
  if (value.length === 0) {
    return { present: false, valid: false, detail: "Not set. Generate a hash on this page." };
  }

  const parts = value.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return {
      present: true,
      valid: false,
      detail: "Not in the expected scrypt:N:r:p:salt:key format. The value was probably cut off when copying.",
    };
  }

  const [N, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  if (![N, r, p].every((part) => Number.isInteger(part) && part > 0)) {
    return { present: true, valid: false, detail: "The cost parameters in the hash are not valid numbers." };
  }

  const salt = Buffer.from(parts[4] ?? "", "base64");
  const key = Buffer.from(parts[5] ?? "", "base64");
  if (salt.length < 8 || key.length < 16) {
    return { present: true, valid: false, detail: "The salt or the key part of the hash is too short to be one of ours." };
  }

  return { present: true, valid: true, detail: `Valid scrypt hash (N=${N}, r=${r}, p=${p}). The password itself is not visible anywhere.` };
}

export interface SetupCheckOptions {
  /** True on the deployed site. A file database there cannot work; see the detail text. */
  isProduction: boolean;
}

export function buildSetupChecks(
  env: Record<string, string | undefined>,
  options: SetupCheckOptions,
): SetupCheck[] {
  const checks: SetupCheck[] = [];
  const database = inspectDatabaseUrl(env.DATABASE_URL);
  const hasToken = Boolean(env.DATABASE_AUTH_TOKEN?.trim());

  switch (database.kind) {
    case "missing":
      checks.push({
        id: "database",
        label: "Database location",
        level: "todo",
        detail: "DATABASE_URL is not set. Add it to the hosting environment variables.",
      });
      break;
    case "file":
      checks.push({
        id: "database",
        label: "Database location",
        level: options.isProduction ? "bad" : "ok",
        detail: options.isProduction
          ? "A file database cannot run on a serverless host: the filesystem is temporary and the file is lost between deployments. Use libsql:// for the deployed site."
          : "Local file database. This is the expected setting for development on your computer.",
      });
      break;
    case "libsql":
    case "remote":
      checks.push({
        id: "database",
        label: "Database location",
        level: "ok",
        detail: `Remote database at ${database.host}. Reachability is checked below.`,
      });
      break;
    case "postgres":
    case "unsupported":
      checks.push({
        id: "database",
        label: "Database location",
        level: "bad",
        detail: database.problem ?? "This database URL cannot be used.",
      });
      break;
  }

  const needsToken = database.kind === "libsql" || database.kind === "remote";
  checks.push({
    id: "token",
    label: "Database token",
    level: needsToken && !hasToken ? "bad" : "ok",
    detail: needsToken
      ? hasToken
        ? "DATABASE_AUTH_TOKEN is set. Its value is never shown."
        : "DATABASE_AUTH_TOKEN is missing. A remote libSQL database needs a token."
      : database.kind === "file"
        ? "Not needed for a local file database."
        : "Waiting for a usable database location above.",
  });

  const hash = inspectPasswordHash(env.STUDIO_ADMIN_PASSWORD_HASH);
  checks.push({
    id: "password",
    label: "Administrator password",
    level: hash.valid ? "ok" : hash.present ? "bad" : "todo",
    detail: hash.detail,
  });

  const config = getStudioConfigStatus(env);
  checks.push({
    id: "connection",
    label: "Database connection and tables",
    level: "todo",
    detail: config.ready
      ? "Checked below, when this page loads."
      : "Waiting for the settings above.",
  });

  return checks;
}

/** Replaces the connection check after the live probe has run. */
export function withConnectionResult(checks: readonly SetupCheck[], level: "ok" | "bad", detail: string): SetupCheck[] {
  return checks.map((check) => (check.id === "connection" ? { ...check, level, detail } : check));
}

/** True when the Studio can be used: settings complete and the database answered. */
export function isActivated(checks: readonly SetupCheck[]): boolean {
  return checks.every((check) => check.level === "ok" || check.level === "warn");
}

export const SETUP_ENV_NAMES = ["DATABASE_URL", "DATABASE_AUTH_TOKEN", "STUDIO_ADMIN_PASSWORD_HASH"] as const;

/** Minimum administrator password length. Shared by the CLI script and the activation page. */
export const MIN_ADMIN_PASSWORD_LENGTH = 12;

/** Upper bound on submitted administrator passwords, so hashing work stays bounded. */
export const MAX_ADMIN_PASSWORD_LENGTH = 1024;

/** Validates a candidate administrator password before it is hashed. */
export function describePasswordProblem(password: string, confirmation: string): string | null {
  if (password.length === 0) return "Enter a password.";
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_ADMIN_PASSWORD_LENGTH} characters. A sentence you can remember beats a short jumble.`;
  }
  if (password.length > MAX_ADMIN_PASSWORD_LENGTH) {
    return `Use at most ${MAX_ADMIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirmation) return "The two entries do not match. Type the same password twice.";
  return null;
}
