import Image from "next/image";

import { ContentRequirement } from "@/components/content/ContentRequirement";
import { PageIntro } from "@/components/content/PageIntro";
import { Container } from "@/components/layout/Container";
import { getAsset, getImage } from "@/assets/manifest";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/metadata";
import styles from "./about.module.css";

export const metadata = pageMetadata({
  title: "About",
  description: `About ${siteConfig.name}, ${siteConfig.role.toLowerCase()}.`,
  path: "/about",
});

const portrait = getImage("portrait-optimized");
const portraitAlt = getAsset("portrait-optimized").alt ?? "";

export default function AboutPage() {
  return (
    <Container>
      <PageIntro eyebrow="Profile" title="About" lead={siteConfig.role} />

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

      <ContentRequirement
        title="Biography pending"
        description="The biography and career history will be published once they have been written and approved by the artist."
        items={[
          "Approved biography in English",
          "Career timeline with verified dates and projects",
        ]}
      />
    </Container>
  );
}
