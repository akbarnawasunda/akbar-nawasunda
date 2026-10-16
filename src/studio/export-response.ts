/**
 * HTTP behaviour of the content export, kept free of server-only imports so tests can call it with
 * fake dependencies. The route file only wires in the real authentication check and data source.
 *
 * Order of checks, which is also the order tests rely on:
 *   1. Explicit cross-site requests are refused before anything else runs.
 *   2. Authentication is checked. Only then is any protected content read.
 *   3. Any failure while reading or building returns a generic 500. Details are logged as a tag only.
 */

import { buildContentExport, exportFilename, serializeContentExport, type ExportSource } from "./export";

export interface ExportDependencies {
  /** The existing server-side admin check (fails closed). */
  isAdmin: () => Promise<boolean>;
  /** Read-only data source. Must not be called before authentication succeeds. */
  readSource: () => Promise<ExportSource>;
  now?: () => Date;
  logError?: (tag: string) => void;
}

/** Headers that apply to every response from this route, success or error. */
const SHARED_HEADERS: Record<string, string> = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

function plainResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { ...SHARED_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** Refuses only requests the browser explicitly marks as cross-site. A missing header is allowed. */
export function isExplicitCrossSite(request: Request): boolean {
  return request.headers.get("sec-fetch-site")?.trim().toLowerCase() === "cross-site";
}

export async function handleStudioExport(request: Request, deps: ExportDependencies): Promise<Response> {
  if (isExplicitCrossSite(request)) {
    return plainResponse(403, "Cross-site requests are not allowed.");
  }

  let authorized = false;
  try {
    authorized = await deps.isAdmin();
  } catch {
    authorized = false;
  }
  if (!authorized) {
    return plainResponse(401, "Sign in to download an export.");
  }

  const now = (deps.now ?? (() => new Date()))();
  try {
    const source = await deps.readSource();
    const body = serializeContentExport(buildContentExport(source, now));
    return new Response(body, {
      status: 200,
      headers: {
        ...SHARED_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFilename(now)}"`,
      },
    });
  } catch {
    // Never log or return the error itself: it may contain connection details.
    (deps.logError ?? console.error)("[studio] export failed");
    return plainResponse(500, "The export could not be created. Try again later.");
  }
}
