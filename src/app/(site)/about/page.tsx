import Image from "next/image";

import { ContentRequirement } from "@/components/content/ContentRequirement";
import { SectionsView } from "@/components/content/SectionsView";
import { PageIntro } from "@/components/content/PageIntro";
import { Container } from "@/components/layout/Container";
import { getAsset, getImage } from "@/assets/manifest";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/metadata";
import { getPublicPage } from "@/studio/public";
import styles from "./about.module.css";

export const dynamic = "force-static";

const defaultDescription = `About ${siteConfig.name}, ${siteConfig.role.toLowerCase()}.`;

export async function generateMetadata() {
  const published = await getPublicPage("about");
  return pageMetadata({
    title: "About",
    description: published?.seoDescription.trim() || defaultDescription,
    path: "/about",
  });
}

const portrait = getImage("portrait-optimized");
const portraitAlt = getAsset("portrait-optimized").alt ?? "";

export default async function AboutPage() {
  const published = await getPublicPage("about");
  const hasVisibleContent = published !== null && published.sections.some((section) => section.visible);

  return (
    <Container>
      <PageIntro
        eyebrow="Profile"
        title={published?.title || "About"}
        lead={published?.lead.trim() || siteConfig.role}
      />

      <figure className={styles.figure}>
        <Image
          src={portrait}
          alt={portraitAlt}
          width={portrait.width}
          height={portrait.height}
          sizes="(min-width: 720px) 360px, 80vw"
          unoptimized
          className={styles.image}
        />
      </figure>

      {published && hasVisibleContent ? (
        <SectionsView sections={published.sections} />
      ) : (
        <ContentRequirement
          title="Biography pending"
          description="The biography and career history will be published once they have been written and approved by the artist."
          items={[
            "Approved biography in English",
            "Career timeline with verified dates and projects",
          ]}
        />
      )}
    </Container>
  );
}
