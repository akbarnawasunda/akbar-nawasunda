import { Container } from "@/components/layout/Container";
import { artistServices } from "@/content/artist";
import { contactEmail, contactHref, listenLinks, socialLinks } from "@/config/socials";
import { pageMetadata } from "@/lib/metadata";
import styles from "./contact.module.css";

export const metadata = pageMetadata({
  title: "Kontak",
  description: "Kontak resmi untuk booking, permintaan remix, dan lisensi: akbarnawasunda@gmail.com.",
  path: "/contact",
});

/**
 * /contact — one real address, no form.
 *
 * The site deliberately does not ship a contact form: a form with no backend, or one whose mail
 * delivery the owner has to maintain, is worse than an email link for an artist who answers his own
 * messages. The address, the service list and the fourteen profiles are the owner's own (D-090).
 *
 * The address is the page (R8): it is set at 5vw on a full sheet of the identity blue, which makes
 * the contact page the loudest page on the site and also the most useful one. Every other page ends
 * by pointing here; this is where the colour stops being decoration and becomes a mailbox.
 */
export default function ContactPage() {
  return (
    <>
      <header className={styles.head}>
        <div className={styles.headInner}>
          <p className={styles.eyebrow}>05 — Kontak</p>
          <h1 className={`${styles.title} ink`}>Kontak</h1>
          <p className={styles.lead}>Booking, remix, kolaborasi, lisensi, dan materi pers.</p>

          <a className={styles.mail} href={contactHref}>
            {contactEmail}
          </a>

          <p className={styles.mailNote}>Sertakan jenis pekerjaan, tenggat, dan referensi.</p>
        </div>

      </header>

      <Container>
        <section className={styles.block} aria-labelledby="contact-services-title">
          <h2 id="contact-services-title" className={styles.sectionTitle}>
            Yang bisa ditulis
          </h2>
          <ul className={styles.services}>
            {artistServices.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.block} aria-labelledby="contact-links-title">
          <h2 id="contact-links-title" className={styles.sectionTitle}>
            Semua kanal resmi
          </h2>
          <p className={styles.note}>Dikelola sendiri. Di luar daftar ini bukan kanal resmi.</p>

          <div className={styles.groups}>
            <div>
              <p className={styles.label}>Dengarkan</p>
              <ul className={styles.links}>
                {listenLinks.map((link) => (
                  <li key={link.platform}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                      <span aria-hidden="true"> ↗</span>
                      <span className="sr-only"> (membuka tab baru)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={styles.label}>Ikuti</p>
              <ul className={styles.links}>
                {socialLinks.map((link) => (
                  <li key={link.platform}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                      <span aria-hidden="true"> ↗</span>
                      <span className="sr-only"> (membuka tab baru)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </Container>
    </>
  );
}
