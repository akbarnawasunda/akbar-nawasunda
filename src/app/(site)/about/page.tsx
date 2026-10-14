import { ContentRequirement } from "@/components/content/ContentRequirement";
import { PageIntro } from "@/components/content/PageIntro";
import { Container } from "@/components/layout/Container";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "About",
  description: `About ${siteConfig.name}, ${siteConfig.role.toLowerCase()}.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <Container>
      <PageIntro eyebrow="Profile" title="About" lead={siteConfig.role} />
      <ContentRequirement
        title="Biography pending"
        description="The biography and career history will be published once they have been written and approved by the artist."
        items={[
          "Approved biography in English",
          "Career timeline with verified dates and projects",
          "Portrait photography, only if the artist wishes to publish it",
        ]}
      />
    </Container>
  );
}
