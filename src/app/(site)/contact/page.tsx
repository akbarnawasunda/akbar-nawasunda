import { ContentRequirement } from "@/components/content/ContentRequirement";
import { PageIntro } from "@/components/content/PageIntro";
import { Container } from "@/components/layout/Container";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Contact",
  description: "Contact details for bookings, remix requests and licensing enquiries.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <Container>
      <PageIntro
        eyebrow="Enquiries"
        title="Contact"
        lead="For bookings, remix requests, and licensing enquiries."
      />
      <ContentRequirement
        title="Contact details"
        description="Contact details will be listed here."
      />
    </Container>
  );
}
