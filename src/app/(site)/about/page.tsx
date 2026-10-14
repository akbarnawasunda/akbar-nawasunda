import Image from "next/image";

import { ContentRequirement } from "@/components/content/ContentRequirement";
import { PageDocumentBody } from "@/components/content/PageDocumentBody";
import { PageIntro } from "@/components/content/PageIntro";
import { Container } from "@/components/layout/Container";
import { getAsset, getImage } from "@/assets/manifest";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/metadata";
import { getPublicPage } from "@/studio/public";
import styles from "./about.module.css";

// Published content is read on each request so a publish shows immediately and a read failure
// never caches the static fallback.
export const dynamic = "force-dynamic";

const defaultDescription = `About ${siteConfig.name}, ${siteConfig.role.toLowerCase()}.`;

export async function generateMetadata() {
  const published = await getPublicPage("about");
  const description = published?.seoDescription.trim() || defaultDescription;
  return pageMetadata({ title: "About", description, path: "/about" });
}

const portrait = getImage("portrait-optimized");
const portraitAlt = getAsset("portrait-optimized").alt ?? "";

export default async function AboutPage() {
  const published = await getPublicPage("about");

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

      {published && published.sections.length > 0 ? (
        <PageDocumentBody doc={published} />
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
