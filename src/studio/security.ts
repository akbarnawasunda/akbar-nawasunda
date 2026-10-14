import { createHash, randomBytes } from "node:crypto";

/**
 * Pure session and rate-limit rules. No I/O here, so they can be tested directly.
 */

export const SESSION_COOKIE = "nawa_studio_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const MAX_LOGIN_FAILURES = 5;
export const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;

/** A random, URL-safe session token. Only its hash is stored. */
export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isSessionActive(expiresAtMs: number, nowMs: number): boolean {
  return expiresAtMs > nowMs;
}

export interface FailureState {
  failures: number;
  windowStartMs: number;
}

export function isLockedOut(state: FailureState | null, nowMs: number): boolean {
  if (!state) return false;
  const inWindow = nowMs - state.windowStartMs < LOGIN_FAILURE_WINDOW_MS;
  return inWindow && state.failures >= MAX_LOGIN_FAILURES;
}

/** The failure counter after one more failed attempt. Starts a new window when the old one has expired. */
export function recordFailure(state: FailureState | null, nowMs: number): FailureState {
  if (!state || nowMs - state.windowStartMs >= LOGIN_FAILURE_WINDOW_MS) {
    return { failures: 1, windowStartMs: nowMs };
  }
  return { failures: state.failures + 1, windowStartMs: state.windowStartMs };
}
