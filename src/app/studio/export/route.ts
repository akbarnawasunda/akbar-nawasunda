import { isAdminRequest } from "@/studio/auth";
import { getExportSource } from "@/studio/store";
import { handleStudioExport } from "@/studio/export-response";

// Always dynamic: the response depends on the session cookie and the current content.
export const dynamic = "force-dynamic";

/** Admin-only JSON export of drafts and published content. See src/studio/export-response.ts. */
export async function GET(request: Request): Promise<Response> {
  return handleStudioExport(request, {
    isAdmin: isAdminRequest,
    readSource: getExportSource,
  });
}
