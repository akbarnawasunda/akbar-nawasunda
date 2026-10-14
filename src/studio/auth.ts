import "server-only";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getStudioConfigStatus } from "./config";
import { hashSessionToken, isSessionActive, SESSION_COOKIE, SESSION_TTL_MS } from "./security";
import { deleteSession, findSessionExpiry } from "./store";

/**
 * Server-side admin check. Reads the session cookie, looks up its hash, and checks expiry.
 * Fails closed: if the system is not configured or the database errors, the request is not an admin.
 */
export async function isAdminRequest(): Promise<boolean> {
  if (!getStudioConfigStatus().ready) return false;
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return false;
    const expiresAt = await findSessionExpiry(hashSessionToken(token));
    return expiresAt !== null && isSessionActive(expiresAt, Date.now());
  } catch (error) {
    console.error("[studio] session check failed", error);
    return false;
  }
}

/** Use at the top of every protected page. Redirects unauthenticated visitors to the login page. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminRequest())) redirect("/studio/login");
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token && getStudioConfigStatus().ready) {
    try {
      await deleteSession(hashSessionToken(token));
    } catch (error) {
      console.error("[studio] could not delete session", error);
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}
