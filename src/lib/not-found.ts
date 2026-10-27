import { pageMetadata } from "./metadata";

/** Shared metadata for both not-found files (see src/lib/not-found.ts callers). */
export const notFoundMetadata = pageMetadata({
  title: "Halaman tidak ditemukan",
  description: "Halaman ini tidak ada atau sudah dipindahkan.",
  path: "/",
});
