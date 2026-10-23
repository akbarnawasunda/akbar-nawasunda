// drizzle/seed.ts — seed verified catalogue entries into Turso.
//
//   npm run db:seed            write the verified releases (idempotent)
//   npm run db:seed -- --dry   print what would be written, touch nothing
//
// Only data the owner has confirmed is written: the six verified titles. Release year, date,
// streaming links and artwork stay empty on purpose — the Studio is where the owner fills them in
// later, and nothing here guesses.
//
// Writes to `studio_pages` under `release:<slug>`, with draft and published set to the same JSON so
// the release appears on /music immediately. Rows that already exist are left untouched, so running
// this again never overwrites an edit made in the Studio.
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { releaseDisplayTitle, releases } from "../src/content/releases";
import { readDatabaseEnv } from "../src/lib/turso";
import { applySchema } from "../src/studio/schema";
import type { ReleaseDocument } from "../src/studio/releases";
import { releaseKey } from "../src/studio/releases";
import { studioPages } from "./schema";

const dryRun = process.argv.includes("--dry");

function toDocument(title: string): ReleaseDocument {
  return {
    title,
    type: "unknown",
    releaseDate: null,
    dateVerified: false,
    description: "",
    artworkId: null,
    links: [],
    seoTitle: "",
    seoDescription: "",
  };
}

async function main() {
  const rows = releases.map((release) => {
    const json = JSON.stringify(toDocument(releaseDisplayTitle(release)));
    const now = Date.now();
    return {
      slug: releaseKey(release.slug),
      draftJson: json,
      draftUpdatedAt: now,
      publishedJson: json,
      publishedAt: now,
    };
  });

  if (dryRun) {
    console.log(`[dry] would upsert ${rows.length} release documents:`);
    for (const row of rows) console.log(`  ${row.slug} — ${JSON.parse(row.publishedJson).title}`);
    return;
  }

  const { url, authToken, source } = readDatabaseEnv();
  if (!url) {
    console.error(
      "DATABASE_URL (or TURSO_DATABASE_URL) is not set. Add it to .env.local or the Vercel project settings.",
    );
    process.exit(1);
  }
  console.log(`Seeding ${url} (url from ${source.url ?? "unknown"}, token from ${source.authToken ?? "none"})`);

  const client = createClient({ url, authToken: authToken ?? undefined });
  const db = drizzle(client);

  try {
    // Idempotent CREATE TABLE IF NOT EXISTS, identical to the DDL in src/studio/schema.ts, so the
    // seed also works against a fresh database where `npm run db:migrate` has not run yet.
    await applySchema(client);

    const inserted = await db
      .insert(studioPages)
      .values(rows)
      .onConflictDoNothing({ target: studioPages.slug })
      .returning({ slug: studioPages.slug });

    const skipped = rows.length - inserted.length;
    console.log(`Inserted ${inserted.length} release document(s).`);
    if (skipped > 0) console.log(`Skipped ${skipped} that already existed (left untouched).`);
    console.log("Nothing else was written: no years, dates, links or artwork were invented.");
  } finally {
    client.close();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
