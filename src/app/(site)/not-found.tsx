import Link from "next/link";

import { PageIntro } from "@/components/content/PageIntro";
import { Container } from "@/components/layout/Container";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({ title: "Page not found", path: "/" });

export default function NotFound() {
  return (
    <Container>
      <PageIntro eyebrow="404" title="Page not found" lead="This page does not exist or has moved." />
      <p>
        <Link href="/">Back to home</Link>
      </p>
    </Container>
  );
}
