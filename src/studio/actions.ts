"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearSession, isAdminRequest, setSessionCookie } from "./auth";
import { getStudioConfigStatus } from "./config";
import { StudioNotConfiguredError } from "./db";
import { isPageSlug, PAGE_CONFIG, type PageSlug } from "./content-model";
import type { FormState } from "./form-state";
import { releaseArtworkIds } from "./artwork";
import { validateDesign, validatePageDocument, validateRelease, validateSlug } from "./validation";
import { createReleaseDraft, createSession, getFailureState, getPageRecord, getReleaseRecord, publishDesign, publishPage, publishRelease, saveDesignDraft, savePageDraft, saveReleaseDraft, setFailureState, unpublishRelease } from "./store";
import { createSessionToken, hashSessionToken, isLockedOut, LOGIN_FAILURE_WINDOW_MS, recordFailure, SESSION_TTL_MS } from "./security";
import { verifyPassword } from "./password";
import { slugify } from "./releases";

// Every mutation below checks the session on the server first. Client state is never trusted.
// Validation runs on the server for every save and publish; the browser's checks are convenience only.

const NOT_SIGNED_IN: FormState = { status: "error", message: "Sesi berakhir. Masuk lagi untuk menyimpan." };

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const config = getStudioConfigStatus();
  if (!config.ready) {
    return { status: "error", message: "NAWA STUDIO belum dikonfigurasi." };
  }

  try {
    const now = Date.now();
    const failure = await getFailureState();
    if (isLockedOut(failure, now)) {
      const minutes = Math.ceil(LOGIN_FAILURE_WINDOW_MS / 60000);
      return { status: "error", message: `Terlalu banyak percobaan gagal. Tunggu sampai ${minutes} menit, lalu coba lagi.` };
    }

    const password = formData.get("password");
    if (typeof password !== "string" || password.length === 0) {
      return { status: "error", message: "Masukkan password." };
    }

    const valid = await verifyPassword(password, process.env.STUDIO_ADMIN_PASSWORD_HASH as string);
    if (!valid) {
      await setFailureState(recordFailure(failure, now));
      return { status: "error", message: "Password salah." };
    }

    await setFailureState(null);
    const token = createSessionToken();
    await createSession(hashSessionToken(token), now, now + SESSION_TTL_MS);
    await setSessionCookie(token);
  } catch (error) {
    return failureResult(error, "Gagal masuk. Coba lagi.");
  }

  redirect("/studio");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/studio/login");
}

function text(formData: FormData, name: string): unknown {
  const value = formData.get(name);
  return value === null ? "" : value;
}

function intentOf(formData: FormData): "save" | "publish" | null {
  const intent = formData.get("intent");
  return intent === "save" || intent === "publish" ? intent : null;
}

/** Saves a page draft, or publishes it. Pages are restricted to the slugs in PAGE_CONFIG. */
export async function saveOrPublishAction(_previous: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdminRequest())) return NOT_SIGNED_IN;

  const slug = formData.get("slug");
  if (typeof slug !== "string" || !isPageSlug(slug)) {
    return { status: "error", message: "Halaman ini tidak bisa diedit." };
  }
  const intent = intentOf(formData);
  if (!intent) return { status: "error", message: "Aksi tidak dikenali." };

  const input: Record<string, unknown> = {
    title: text(formData, "title"),
    lead: text(formData, "lead"),
    seoDescription: text(formData, "seoDescription"),
    sections: text(formData, "sections"),
  };
  const result = validatePageDocument(slug as PageSlug, input);
  if (!result.ok) {
    return { status: "error", message: "Ada isian yang perlu diperbaiki. Periksa bagian yang ditandai.", errors: result.errors };
  }

  try {
    const now = Date.now();
    await getPageRecord(slug as PageSlug); // make sure the document exists
    if (intent === "publish") {
      await publishPage(slug as PageSlug, result.value, now);
      revalidatePath(PAGE_CONFIG[slug as PageSlug].path);
      return { status: "ok", message: "Terbit. Halaman publik sekarang memakai versi ini.", unpublishedChanges: false, savedAt: now };
    }
    await savePageDraft(slug as PageSlug, result.value, now);
    return { status: "ok", message: "Draf tersimpan. Hanya kamu yang bisa melihatnya sampai diterbitkan.", unpublishedChanges: true, savedAt: now };
  } catch (error) {
    return failureResult(error, "Gagal menyimpan. Coba lagi sebentar.");
  }
}

/** Saves or publishes the design settings. Values are enum-checked on the server. */
export async function saveDesignAction(_previous: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdminRequest())) return NOT_SIGNED_IN;
  const intent = intentOf(formData);
  if (!intent) return { status: "error", message: "Aksi tidak dikenali." };

  const result = validateDesign({ accent: formData.get("accent"), titleCase: formData.get("titleCase") });
  if (!result.ok) {
    return { status: "error", message: "Pilih opsi yang valid untuk setiap pengaturan.", errors: result.errors };
  }

  try {
    const now = Date.now();
    if (intent === "publish") {
      await publishDesign(result.value, now);
      revalidatePath("/", "layout");
      return { status: "ok", message: "Terbit. Situs publik memakai pengaturan ini.", unpublishedChanges: false, savedAt: now };
    }
    await saveDesignDraft(result.value, now);
    return { status: "ok", message: "Draf tersimpan. Situs publik belum berubah sampai diterbitkan.", unpublishedChanges: true, savedAt: now };
  } catch (error) {
    return failureResult(error, "Gagal menyimpan. Coba lagi sebentar.");
  }
}

/** Creates a new release as a private draft, then opens its editor. Slug is fixed after creation. */
export async function createReleaseAction(_previous: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdminRequest())) return NOT_SIGNED_IN;

  const input: Record<string, unknown> = releaseInput(formData);
  const result = validateRelease(input, { allowedArtworkIds: releaseArtworkIds() });

  const requestedSlug = typeof formData.get("slug") === "string" ? (formData.get("slug") as string).trim() : "";
  const slug = requestedSlug.length > 0 ? requestedSlug : slugify(typeof input.title === "string" ? input.title : "");
  const slugError = slug.length === 0 ? "Isi judul atau alamat untuk rilis ini." : validateSlug(slug);

  if (!result.ok || slugError) {
    const errors = { ...(result.ok ? {} : result.errors) } as Record<string, string>;
    if (slugError) errors.slug = slugError;
    return { status: "error", message: "Ada isian yang perlu diperbaiki. Periksa bagian yang ditandai.", errors };
  }

  try {
    const created = await createReleaseDraft(slug, result.value, Date.now());
    if (!created) {
      return { status: "error", message: "Rilis dengan alamat ini sudah ada.", errors: { slug: "Alamat ini sudah dipakai." } };
    }
  } catch (error) {
    return failureResult(error, "Gagal membuat rilis. Coba lagi sebentar.");
  }
  redirect(`/studio/music/${slug}?created=1`);
}

/** Saves a release draft, publishes it, or unpublishes it (draft is kept). */
export async function saveReleaseAction(_previous: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdminRequest())) return NOT_SIGNED_IN;

  const slug = formData.get("slug");
  if (typeof slug !== "string" || validateSlug(slug) !== null) {
    return { status: "error", message: "Rilis ini tidak bisa diedit." };
  }
  const intent = formData.get("intent");
  if (intent !== "save" && intent !== "publish" && intent !== "unpublish") {
    return { status: "error", message: "Aksi tidak dikenali." };
  }

  try {
    const record = await getReleaseRecord(slug);
    if (!record) return { status: "error", message: "Rilis ini tidak ada." };
    const now = Date.now();

    if (intent === "unpublish") {
      await unpublishRelease(slug);
      revalidateRelease(slug);
      return { status: "ok", message: "Ditarik dari publik. Rilis disembunyikan dari situs; draf tetap disimpan.", unpublishedChanges: true, savedAt: now };
    }

    const result = validateRelease(releaseInput(formData), { allowedArtworkIds: releaseArtworkIds() });
    if (!result.ok) {
      return { status: "error", message: "Ada isian yang perlu diperbaiki. Periksa bagian yang ditandai.", errors: result.errors };
    }

    if (intent === "publish") {
      await publishRelease(slug, result.value, now);
      revalidateRelease(slug);
      return { status: "ok", message: "Terbit. Rilis sekarang terlihat di halaman Music.", unpublishedChanges: false, savedAt: now };
    }
    await saveReleaseDraft(slug, result.value, now);
    return { status: "ok", message: "Draf tersimpan. Hanya kamu yang bisa melihatnya sampai diterbitkan.", unpublishedChanges: true, savedAt: now };
  } catch (error) {
    return failureResult(error, "Gagal menyimpan. Coba lagi sebentar.");
  }
}

function releaseInput(formData: FormData): Record<string, unknown> {
  return {
    title: text(formData, "title"),
    type: text(formData, "type"),
    releaseDate: text(formData, "releaseDate"),
    dateVerified: formData.get("dateVerified"),
    description: text(formData, "description"),
    artworkId: text(formData, "artworkId"),
    links: text(formData, "links"),
    seoTitle: text(formData, "seoTitle"),
    seoDescription: text(formData, "seoDescription"),
  };
}

function revalidateRelease(slug: string): void {
  revalidatePath("/music");
  revalidatePath(`/music/${slug}`);
  revalidatePath("/");
}

function failureResult(error: unknown, fallback: string): FormState {
  if (error instanceof StudioNotConfiguredError) {
    return { status: "error", message: "NAWA STUDIO belum dikonfigurasi." };
  }
  console.error("[studio] action failed", error);
  return { status: "error", message: fallback };
}
