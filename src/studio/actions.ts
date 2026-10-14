"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdminRequest, clearSession, setSessionCookie } from "./auth";
import { getStudioConfigStatus } from "./config";
import { StudioNotConfiguredError } from "./db";
import { isPageSlug } from "./content-model";
import { verifyPassword } from "./password";
import type { FormState } from "./form-state";
import { createSessionToken, hashSessionToken, isLockedOut, LOGIN_FAILURE_WINDOW_MS, recordFailure, SESSION_TTL_MS } from "./security";
import { createSession, getFailureState, getPageRecord, publishDocument, saveDraft, setFailureState } from "./store";
import { validatePageForm } from "./validation";

// Every mutation below checks the session on the server first. Client state is never trusted.

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const config = getStudioConfigStatus();
  if (!config.ready) {
    return { status: "error", message: "NAWA STUDIO is not configured yet." };
  }

  try {
    const now = Date.now();
    const failure = await getFailureState();
    if (isLockedOut(failure, now)) {
      const minutes = Math.ceil(LOGIN_FAILURE_WINDOW_MS / 60000);
      return { status: "error", message: `Too many failed attempts. Wait up to ${minutes} minutes, then try again.` };
    }

    const password = formData.get("password");
    if (typeof password !== "string" || password.length === 0) {
      return { status: "error", message: "Enter the password." };
    }

    const valid = await verifyPassword(password, process.env.STUDIO_ADMIN_PASSWORD_HASH as string);
    if (!valid) {
      await setFailureState(recordFailure(failure, now));
      return { status: "error", message: "Incorrect password." };
    }

    await setFailureState(null);
    const token = createSessionToken();
    await createSession(hashSessionToken(token), now, now + SESSION_TTL_MS);
    await setSessionCookie(token);
  } catch (error) {
    return failureResult(error, "Sign-in failed. Try again.");
  }

  redirect("/studio");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/studio/login");
}

/** Saves the form as a draft, or publishes it. The intent is validated; anything else is rejected. */
export async function saveOrPublishAction(_previous: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdminRequest())) {
    return { status: "error", message: "Your session has ended. Sign in again to save." };
  }

  const slug = formData.get("slug");
  if (typeof slug !== "string" || !isPageSlug(slug)) {
    return { status: "error", message: "This page cannot be edited." };
  }

  const intent = formData.get("intent");
  if (intent !== "save" && intent !== "publish") {
    return { status: "error", message: "Unknown action." };
  }

  const result = validatePageForm({
    title: textField(formData, "title"),
    lead: textField(formData, "lead"),
    seoDescription: textField(formData, "seoDescription"),
    body: textField(formData, "body"),
  });
  if (!result.ok) {
    return {
      status: "error",
      message: "Some fields need attention. Check the highlighted items.",
      errors: result.errors,
    };
  }

  try {
    const now = Date.now();
    // Ensures the page record exists before it is updated.
    await getPageRecord(slug);

    if (intent === "publish") {
      await publishDocument(slug, result.value, now);
      revalidatePath(`/${slug}`);
      return { status: "ok", message: "Published. The public page now shows this version.", unpublishedChanges: false, savedAt: now };
    }

    await saveDraft(slug, result.value, now);
    return {
      status: "ok",
      message: "Draft saved. Only you can see it until you publish.",
      unpublishedChanges: true,
      savedAt: now,
    };
  } catch (error) {
    return failureResult(error, "Could not save. Try again in a moment.");
  }
}

function textField(formData: FormData, name: string): unknown {
  const value = formData.get(name);
  if (value === null) return "";
  return value;
}

function failureResult(error: unknown, fallback: string): FormState {
  if (error instanceof StudioNotConfiguredError) {
    return { status: "error", message: "NAWA STUDIO is not configured yet." };
  }
  console.error("[studio] action failed", error);
  return { status: "error", message: fallback };
}
