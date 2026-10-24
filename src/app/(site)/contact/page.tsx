import { PageIntro } from "@/components/content/PageIntro";
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
 */
export default function ContactPage() {
  return (
    <Container>
      <PageIntro
        eyebrow="Kontak"
        title="Kontak"
        lead="Booking, permintaan remix, kolaborasi, lisensi, dan materi pers. Satu alamat, dijawab langsung."
      />

      <section className={styles.mail} aria-labelledby="contact-email-title">
        <h2 id="contact-email-title" className={styles.label}>
          Email
        </h2>
        <p className={styles.address}>
          <a href={contactHref}>{contactEmail}</a>
        </p>
        <p className={styles.note}>
          Sebutkan jenis pekerjaan, tenggat, dan referensi. Permintaan remix dengan brief yang jelas
          dijawab paling cepat.
        </p>
      </section>

      <section className={styles.block} aria-labelledby="contact-services-title">
        <h2 id="contact-services-title" className={styles.title}>
          Yang bisa ditulis
        </h2>
        <ul className={styles.services}>
          {artistServices.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className={styles.block} aria-labelledby="contact-links-title">
        <h2 id="contact-links-title" className={styles.title}>
          Semua kanal resmi
        </h2>
        <p className={styles.note}>
          Akun-akun ini dikelola sendiri oleh Akbar. Selain yang tercantum di sini, bukan kanal resmi.
        </p>

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
  );
}
