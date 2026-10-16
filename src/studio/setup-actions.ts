"use server";

import { reservePasswordAttempt } from "./store";

/**
 * Server actions for the activation page (`/studio/setup`). Both actions exist to make activation
 * possible from a phone, without a terminal.
 *
 * Security notes:
 * - Neither action creates a session. Testing a password never signs anybody in.
 * - Passwords are read from the submitted form, hashed or verified in memory, and never logged,
 *   returned, or stored.
 * - `generateAdminHashAction` refuses to run once STUDIO_ADMIN_PASSWORD_HASH exists, so the tool
 *   switches itself off the moment the Studio is activated.
 * - `testAdminPasswordAction` shares the same lockout counter as the sign-in form, so it cannot be
 *   used to guess the password faster than signing in could.
 */

import { getStudioConfigStatus } from "./config";
import type { FormState } from "./form-state";
import { hashPassword, verifyPassword } from "./password";
import { LOGIN_FAILURE_WINDOW_MS } from "./security";
import { describePasswordProblem } from "./setup";
import { allowsBootstrapHash } from "./bootstrap-policy";
import { setupHashBudget } from "./setup-budget";
import { isAdminRequest } from "./auth";

function lockedOutMessage(): string {
  const minutes = Math.ceil(LOGIN_FAILURE_WINDOW_MS / 60000);
  return `Too many password attempts. Wait up to ${minutes} minutes, then try again.`;
}

/** Hashes a new administrator password and returns it once, for pasting into the host's settings. */
export async function generateAdminHashAction(_previous: FormState, formData: FormData): Promise<FormState> {
  if (process.env.STUDIO_ADMIN_PASSWORD_HASH?.trim()) {
    return {
      status: "error",
      message:
        "An administrator password is already set on this deployment. Generate a replacement offline and update the configured value; do not remove it to expose setup.",
    };
  }

  if (!allowsBootstrapHash(process.env)) {
    return { status: "error", message: "Browser bootstrap is disabled here. Generate the hash in a trusted local development environment or with the CLI." };
  }

  const password = formData.get("password");
  const confirmation = formData.get("confirmation");
  if (typeof password !== "string" || typeof confirmation !== "string") {
    return { status: "error", message: "Enter the password twice." };
  }

  const problem = describePasswordProblem(password, confirmation);
  if (problem) return { status: "error", message: problem };

  if (!setupHashBudget.acquire(Date.now())) return { status: "error", message: "Please wait before generating another hash." };
  try {
    const value = await hashPassword(password);
    return {
      status: "ok",
      message: "Copy the whole line below into STUDIO_ADMIN_PASSWORD_HASH, then redeploy.",
      result: {
        label: "STUDIO_ADMIN_PASSWORD_HASH",
        value,
        note: "This is a one-way hash: it cannot be turned back into your password. Keep the password itself somewhere safe.",
      },
    };
  } catch {
    return { status: "error", message: "Could not hash the password on this server. Try again." };
  } finally {
    setupHashBudget.release();
  }
}

/** Checks a typed password against the stored hash, without signing in. Used to debug activation. */
export async function testAdminPasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdminRequest())) return { status: "error", message: "Sign in to check configuration." };
  const config = getStudioConfigStatus();
  if (!config.ready) {
    return { status: "error", message: "Complete the missing settings above first." };
  }

  try {
    const now = Date.now();
    if (!(await reservePasswordAttempt(now))) return { status: "error", message: lockedOutMessage() };

    const password = formData.get("password");
    if (typeof password !== "string" || password.length === 0) {
      return { status: "error", message: "Enter the password you want to check." };
    }

    const valid = await verifyPassword(password, process.env.STUDIO_ADMIN_PASSWORD_HASH as string);
    if (!valid) {
      return { status: "error", message: "That password does not match the stored hash." };
    }

    return { status: "ok", message: "The password matches. Sign in at /studio/login with it." };
  } catch {
    return { status: "error", message: "The check could not run. The database may be unreachable." };
  }
}
