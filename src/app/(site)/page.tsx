import Image from "next/image";
import Link from "next/link";

import { getAsset, getImage } from "@/assets/manifest";
import { SectionsView } from "@/components/content/SectionsView";
import { Container } from "@/components/layout/Container";
import { SpatialBackdrop } from "@/effects/SpatialBackdrop";
import { roles, siteConfig } from "@/config/site";
import { getPublicPage, getPublishedReleases } from "@/studio/public";
import styles from "./page.module.css";

// Homepage hero is fixed in code. Sections below it are managed in the Studio (Pages > Homepage).
export const dynamic = "force-dynamic";

/**
 * Homepage. The spatial backdrop and the name are the fixed hero. Published CMS sections, if any, are
 * rendered below it. With nothing published, the page is the hero alone, as before.
 */
export default async function HomePage() {
  const [home, releases] = await Promise.all([getPublicPage("home"), getPublishedReleases()]);
  const sections = home?.sections ?? [];
  const hasSections = sections.some((section) => section.visible);
  const portrait = getImage("portrait-optimized");
  const portraitAlt = getAsset("portrait-optimized").alt ?? "";

  return (
    <>
      <section className={styles.hero} aria-label={siteConfig.name}>
        <SpatialBackdrop />

        <Link href="/experiments/lattice" className={styles.study}>
          Visual study 01 →
        </Link>

        <div className={styles.content}>
          <ol className={styles.roles} aria-label="Roles">
            {roles.map((role, index) => (
              <li key={role} className={styles.role}>
                <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
                <span>{role}</span>
              </li>
            ))}
          </ol>
          <h1 className={styles.title}>
            <span>Akbar</span>
            <span>Nawasunda</span>
          </h1>

          <nav aria-label="Explore" className={styles.paths}>
            <Link href="/music" className={`button button-primary ${styles.primary}`}>
              Music <span aria-hidden="true">→</span>
            </Link>
            <Link href="/about" className={styles.path}>
              About
            </Link>
            <Link href="/contact" className={styles.path}>
              Contact
            </Link>
          </nav>
        </div>
      </section>

      <section className={styles.profile} aria-labelledby="profile-heading">
        <Container className={styles.profileInner}>
          <figure className={styles.portrait}>
            <Image
              src={portrait}
              alt={portraitAlt}
              width={portrait.width}
              height={portrait.height}
              sizes="(min-width: 900px) 36vw, 80vw"
              unoptimized
              className={styles.portraitImage}
            />
          </figure>
          <div className={styles.profileText}>
            <p className={styles.eyebrow}>Profile</p>
            <h2 id="profile-heading" className={styles.profileTitle}>
              {siteConfig.role}
            </h2>
            <p className={styles.profileLead}>
              Releases, remixes and mixes are listed in the music archive.
            </p>
            <Link href="/about" className="button">
              Read the profile <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Container>
      </section>

      {hasSections ? (
        <Container className={styles.below}>
          <SectionsView sections={sections} releases={releases} />
        </Container>
      ) : null}
    </>
  );
}
