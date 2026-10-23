#!/usr/bin/env node
/**
 * Post-deploy smoke test. No dependencies, no browser — just fetch, so it can run anywhere
 * (owner laptop, CI, a Vercel post-deploy hook).
 *
 *   npm run smoke                                  # http://127.0.0.1:3000
 *   npm run smoke -- https://akbarnawasunda.my.id  # production, after the deploy
 *
 * Exits 1 if anything fails, so it can gate a release. Every check prints PASS/FAIL with the value it
 * actually saw — a smoke test that only says "ok" tells you nothing when the site is half-up.
 */

const base = (process.argv[2] ?? process.env.SMOKE_BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const results = [];

function record(ok, label, detail) {
  results.push({ ok, label, detail });
  const icon = ok ? "PASS" : "FAIL";
  console.log(`${icon}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function check(label, fn) {
  try {
    await fn();
  } catch (error) {
    record(false, label, error instanceof Error ? error.message : String(error));
  }
}

async function expectStatus(path, expected, options = {}) {
  const response = await fetch(`${base}${path}`, { redirect: options.followRedirects === false ? "manual" : "follow" });
  const ok = Array.isArray(expected) ? expected.includes(response.status) : response.status === expected;
  record(ok, `GET ${path}`, `HTTP ${response.status}${ok ? "" : ` (expected ${expected})`}`);
  return response;
}

console.log(`smoke test → ${base}\n`);

// ---------------------------------------------------------------- public routes
for (const path of ["/", "/music", "/artist", "/visuals", "/epk", "/contact"]) {
  await check(path, () => expectStatus(path, 200));
}

await check("404 page", async () => {
  const response = await fetch(`${base}/this-page-does-not-exist`, { redirect: "follow" });
  const body = await response.text();
  record(
    response.status === 404 && body.includes("Sinyal"),
    "404 page",
    `HTTP ${response.status}${body.includes("Sinyal") ? ", renders “Sinyal hilang”" : ", MISSING the 404 copy"}`,
  );
});

await check("legacy /about redirect", async () => {
  const response = await fetch(`${base}/about`, { redirect: "manual" });
  const location = response.headers.get("location") ?? "";
  const ok = [308, 301, 302, 307].includes(response.status) && location.endsWith("/artist");
  record(ok, "legacy /about → /artist", `HTTP ${response.status} → ${location || "(no Location)"}`);
});

// ---------------------------------------------------------------- headers
await check("security headers", async () => {
  const response = await fetch(`${base}/`);
  const headers = response.headers;
  const csp = headers.get("content-security-policy") ?? "";
  const checks = [
    ["content-security-policy", /default-src 'self'/.test(csp) && /object-src 'none'/.test(csp)],
    ["x-content-type-options", headers.get("x-content-type-options") === "nosniff"],
    ["referrer-policy", headers.get("referrer-policy") === "strict-origin-when-cross-origin"],
    ["strict-transport-security", /max-age=\d+/.test(headers.get("strict-transport-security") ?? "")],
    ["permissions-policy", (headers.get("permissions-policy") ?? "").includes("camera=()")],
    ["cross-origin-opener-policy", headers.get("cross-origin-opener-policy") === "same-origin"],
  ];
  for (const [name, ok] of checks) record(ok, `header ${name}`, ok ? undefined : "missing or wrong");
});

// ---------------------------------------------------------------- SEO surface
await check("sitemap", async () => {
  const response = await fetch(`${base}/sitemap.xml`);
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  record(response.status === 200 && urls.length >= 12, "sitemap.xml", `HTTP ${response.status}, ${urls.length} URLs`);
  const leaked = urls.filter((url) => /\/(studio|api|privacy|about)(\/|$)/.test(new URL(url).pathname));
  record(leaked.length === 0, "sitemap excludes private routes", leaked.join(", ") || "none listed");
});

await check("robots", async () => {
  const text = await (await fetch(`${base}/robots.txt`)).text();
  const ok = text.includes("Disallow: /studio") && text.includes("Sitemap:");
  record(ok, "robots.txt", ok ? undefined : "missing the studio rule or the sitemap line");
});

await check("manifest", async () => {
  const response = await fetch(`${base}/manifest.webmanifest`);
  const data = await response.json();
  record(response.status === 200 && Boolean(data.name), "manifest.webmanifest", `${data.name ?? "(no name)"}`);
});

await check("structured data", async () => {
  const html = await (await fetch(`${base}/`)).text();
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) return record(false, "JSON-LD", "no ld+json block on /");
  const data = JSON.parse(match[1]);
  const ok = data["@type"] === "MusicGroup" && data.name === "Akbar Nawasunda" && data.sameAs?.length === 4;
  record(ok, "JSON-LD MusicGroup", `${data["@type"]} · ${data.sameAs?.length ?? 0} sameAs`);
});

// ---------------------------------------------------------------- assets
await check("epk download", async () => {
  const response = await fetch(`${base}/epk/akbar-nawasunda-epk.zip`, { method: "HEAD" });
  const length = Number(response.headers.get("content-length") ?? 0);
  record(response.status === 200 && length > 900_000, "EPK zip", `HTTP ${response.status}, ${(length / 1024).toFixed(0)} KB`);
});

await check("release artwork", async () => {
  const html = await (await fetch(`${base}/music`)).text();
  const sleeves = [...html.matchAll(/\/assets\/covers\/([a-z0-9-]+)(@sleeve)?\.webp/g)].map((match) => match[1]);
  const unique = [...new Set(sleeves)];
  record(unique.length >= 6, "artwork on /music", `${unique.length} distinct covers in the HTML`);
  const empty = html.includes('data-cover="generated"');
  record(!empty, "no card falls back to the in-browser sleeve", empty ? "found data-cover=\"generated\"" : "all six resolved to files");
});

await check("no renderer", async () => {
  const html = await (await fetch(`${base}/`)).text();
  record(!html.includes("<canvas"), "no <canvas> on /", html.includes("<canvas") ? "FOUND a canvas" : "0");
  record(!/SignalField|MusicNotesField|liquid-signal/i.test(html), "no signal component in the HTML", "0");
});

// ---------------------------------------------------------------- summary
const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.log("failed:");
  for (const result of failed) console.log(`  - ${result.label}: ${result.detail ?? ""}`);
  process.exit(1);
}
