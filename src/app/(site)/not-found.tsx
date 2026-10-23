import Link from "next/link";

import { PageIntro } from "@/components/content/PageIntro";
import { Container } from "@/components/layout/Container";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({ title: "Halaman tidak ditemukan", path: "/" });

export default function NotFound() {
  return (
    <Container>
      <PageIntro eyebrow="404" title="Halaman tidak ditemukan" lead="Halaman ini tidak ada atau sudah dipindahkan." />
      <p>
        <Link href="/">Kembali ke beranda</Link>
      </p>
    </Container>
  );
}
