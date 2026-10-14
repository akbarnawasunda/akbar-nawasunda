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
        lead="No contact form is available yet. It will be added once a destination for enquiries is confirmed."
      />
      <ContentRequirement
        title="Contact details pending"
        description="Official contact details will be listed here once they are confirmed."
        items={[
          "Booking enquiry address or management contact",
          "Remix and collaboration enquiry route",
          "Music licensing contact, if licensing is offered",
        ]}
      />
    </Container>
  );
}
