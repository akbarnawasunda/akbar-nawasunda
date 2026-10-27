/**
 * MusicBrainz reconciliation — `npm run releases:sync`.
 *
 * The catalogue in `src/content/releases.ts` is the site's single source of truth, and this script is
 * how it is checked against the outside world. It asks MusicBrainz for every release group of the
 * artist, compares that list with the file, and prints what is missing on either side.
 *
 * Why a script and not a fetch at build time:
 *
 *   - a build must never depend on a third party being up. MusicBrainz rate-limits to one request
 *     per second per client and asks every consumer to identify itself with a real User-Agent; a
 *     build that ignores both is a build that fails at 3 a.m.;
 *   - the catalogue carries the owner's own links, which MusicBrainz' release-group list does not
 *     have. Merging by hand — a human reading the diff below — is the only way to keep both;
 *   - the file stays reviewable in a pull request, which a generated runtime response is not.
 *
 * Usage:
 *
 *   npm run releases:sync           # report
 *   npm run releases:sync -- --check # exit 1 if MusicBrainz has a release the file does not
 *   npm run releases:sync -- --json  # machine-readable release-group list
 */
import { releases } from "../src/content/releases";

const ARTIST_MBID = "bb843d35-fc0a-4d3b-b445-390b9b299812";

/* MusicBrainz' documented requirement: a descriptive User-Agent with a contact URL. Requests
   without one are throttled or refused outright. */
const USER_AGENT = "AkbarNawasundaOfficial/1.0 ( webmaster@akbarnawasunda.com )";

interface ReleaseGroup {
  id: string;
  title: string;
  "primary-type"?: string;
  "secondary-types"?: string[];
  "first-release-date"?: string;
}

interface ReleaseGroupResponse {
  "release-group-count"?: number;
  "release-groups"?: ReleaseGroup[];
}

/** Lowercase, accent-free, punctuation-free — the same shape the site's slugs use. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * A MusicBrainz title and a catalogue entry are the same release when one contains the other:
 * MusicBrainz prints "Masih Mencintainya — Papinka" and the file stores the title plus a `source`.
 */
function matches(group: ReleaseGroup, entry: { title: string; source?: string; mbid?: string }): boolean {
  if (entry.mbid && entry.mbid === group.id) return true;
  const a = normalise(group.title);
  const b = normalise(`${entry.title}${entry.source ? ` ${entry.source}` : ""}`);
  return a.includes(b) || b.includes(a);
}

async function fetchGroups(): Promise<ReleaseGroup[]> {
  const url = `https://musicbrainz.org/ws/2/release-group?artist=${ARTIST_MBID}&fmt=json`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`MusicBrainz answered ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as ReleaseGroupResponse;
  return data["release-groups"] ?? [];
}

function describe(group: ReleaseGroup): string {
  const types = [group["primary-type"], ...(group["secondary-types"] ?? [])].filter(Boolean).join(" · ");
  return [group.title, types || "Rilis", group["first-release-date"] ?? "—"].join("  |  ");
}

async function main() {
  const args = new Set(process.argv.slice(2));

  let groups: ReleaseGroup[];
  try {
    groups = await fetchGroups();
  } catch (error) {
    console.error("✗ MusicBrainz tidak bisa dihubungi:", error instanceof Error ? error.message : error);
    console.error("  Skrip ini butuh jaringan. Katalog statis tetap dipakai situs tanpa jaringan.");
    process.exit(1);
  }

  if (args.has("--json")) {
    console.log(JSON.stringify(groups, null, 2));
    return;
  }

  const missing = groups.filter((group) => !releases.some((entry) => matches(group, entry)));
  const orphaned = releases.filter((entry) => !groups.some((group) => matches(group, entry)));

  console.log(`MusicBrainz: ${groups.length} release group untuk ${ARTIST_MBID}`);
  console.log(`Katalog statis: ${releases.length} rilis\n`);

  if (missing.length === 0) {
    console.log("✓ Semua rilis MusicBrainz sudah ada di src/content/releases.ts");
  } else {
    console.log(`✗ ${missing.length} rilis MusicBrainz belum ada di katalog:`);
    for (const group of missing) console.log(`  + ${describe(group)}`);
  }

  if (orphaned.length > 0) {
    /*
     * Not an error: the owner's files carry releases MusicBrainz has never seen (independent
     * uploads, remixes released only on SoundCloud). They stay in the catalogue — this list is a
     * reminder to keep their `mbid` empty rather than inventing one.
     */
    console.log(`\n· ${orphaned.length} rilis ada di katalog tapi tidak di MusicBrainz:`);
    for (const entry of orphaned) console.log(`  - ${entry.title} (${entry.slug})`);
  }

  if (args.has("--check") && missing.length > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error("✗", error instanceof Error ? error.message : error);
  process.exit(1);
});
