import Image from "next/image";

import { PageIntro } from "@/components/content/PageIntro";
import { SectionsView } from "@/components/content/SectionsView";
import { Container } from "@/components/layout/Container";
import { getAsset, getImage } from "@/assets/manifest";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/metadata";
import { getPublicPage } from "@/studio/public";
import styles from "./about.module.css";

// Published content is read on each request so a publish shows immediately and a read failure
// never caches the static fallback.
export const dynamic = "force-dynamic";

const defaultDescription = `Profil ${siteConfig.name} — ${siteConfig.role}.`;

export async function generateMetadata() {
  const published = await getPublicPage("about");
  const description = published?.seoDescription.trim() || defaultDescription;
  return pageMetadata({ title: "Profil", description, path: "/about" });
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
        title={published?.title || "Profil"}
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

      {/*
        Copy cleanup 2026-10-27: the English "Biography pending" placeholder is gone. /about is a
        308 to /artist, so this component only renders for a direct hit in development; when no
        page is published it shows the intro and the portrait, and nothing invented.
      */}
      {published && hasVisibleContent ? <SectionsView sections={published.sections} /> : null}
    </Container>
  );
}
