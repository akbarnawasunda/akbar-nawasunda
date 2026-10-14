import type { Metadata } from "next";
import type { ReactNode } from "react";

import { isAdminRequest } from "@/studio/auth";
import { StudioShell } from "@/studio/ui/StudioShell";

// NAWA STUDIO is never indexed. Every page here is also protected server-side; see requireAdmin().
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: { default: "NAWA STUDIO", template: "%s — NAWA STUDIO" },
};

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const signedIn = await isAdminRequest();
  return <StudioShell signedIn={signedIn}>{children}</StudioShell>;
}
