import { ContentRequirement } from "@/components/content/ContentRequirement";
import { PageIntro } from "@/components/content/PageIntro";
import { Container } from "@/components/layout/Container";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Kontak",
  description: "Kontak resmi untuk booking, permintaan remix, dan lisensi.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <Container>
      <PageIntro
        eyebrow="Kontak"
        title="Kontak"
        lead="Formulir kontak belum tersedia. Akan ditambahkan setelah alamat tujuan pesan dikonfirmasi."
      />
      <ContentRequirement
        title="Detail kontak menyusul"
        description="Kontak resmi akan dicantumkan di sini setelah dikonfirmasi."
        items={[
          "Alamat booking atau kontak manajemen",
          "Jalur permintaan remix dan kolaborasi",
          "Kontak lisensi musik, bila tersedia",
        ]}
      />
    </Container>
  );
}
