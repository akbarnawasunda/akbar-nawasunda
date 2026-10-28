# VISUAL-VERIFICATION — protokol verifikasi visual

**Vision capability HARUS ditest ulang di SETIAP sesi baru — jangan asumsikan dari sesi sebelumnya.
Tes dengan `read_file` pada 1 PNG. Kalau hasilnya "no vision capabilities", SEMUA analisis visual
selanjutnya di sesi itu WAJIB pakai frasa 'dianalisis via [axe-core/DOM-assertion/pixel-sampling/
ASCII-render]' — JANGAN PERNAH menulis 'saya lihat/baca gambar' kalau itu tidak benar terjadi.**

---

## 1. Hasil tes vision — sesi 2026-10-28

| Item | Hasil |
| --- | --- |
| File uji | `docs/05-CONTENT-AND-ASSETS/assets/logo-an.png` (1000×1000) |
| Perintah | `read_file` pada path di atas |
| Hasil | **Gambar benar tertampil** — bukan pesan "no vision capabilities" |
| Yang terlihat | Monogram **A/N** hitam bertumpuk, dua sapuan foil biru di sisi kanan monogram, teks "AKBAR" (A bergaya segitiga tanpa palang), "N A W A S U N D A" ber-tracking lebar dengan garis biru di kiri-kanan, dan "RMX" biru; latar putih gading dengan butir tinta halus |
| Kesimpulan | **Vision AKTIF di sesi ini.** Frasa "saya lihat" boleh dipakai untuk file yang benar-benar dibuka dan dirender |

Catatan pemakaian: aktivasi vision per-file. Kalau sebuah file **tidak** dibuka di sesi ini, file itu
tidak boleh dikomentari secara visual — tulis "belum dibuka".

---

## 2. Protokol screenshot

| Parameter | Nilai |
| --- | --- |
| Viewport desktop | **1440 × 900** |
| Viewport mobile | **390 × 844** |
| Path output | `artifacts/visual-check/<kategori>/<nama>-<viewport>.png` |
| Kategori yang dipakai | `baseline/`, `hero/`, `ledger/`, `header/`, `hud/`, `motion/`, `copy/`, `final/` |
| Format | PNG (wajib >0 byte **dan** signature PNG valid: `89 50 4E 47 0D 0A 1A 0A`) |
| Prasyarat | production build sedang disajikan (`npm run build && npm run start`) |
| Tunggu sebelum potret | font siap, loading curtain dilewati, smooth-scroll berhenti |

`artifacts/` **gitignored** (`/artifacts/` di `.gitignore`). Kalau satu file bukti harus bertahan
lintas sesi sandbox, `git add -f artifacts/visual-check/<...>/<file>.png` untuk file itu saja —
jangan mengubah ignore rule.

Nama file: `home-hero-1440.png`, `music-ledger-390.png`, dst. `<nama>` = halaman + elemen.

---

## 3. Status tooling (diverifikasi 2026-10-28)

| Item | Status | Bukti |
| --- | --- | --- |
| `scripts/visual-check.mjs` | **TIDAK ADA** | `ls: cannot access 'scripts/visual-check.mjs'` |
| `scripts/setup-visual-tools.sh` | **TIDAK ADA** | `ls: cannot access 'scripts/setup-visual-tools.sh'` |
| `scripts/setup-playwright-cli.sh` | **ADA** | memasang `@playwright/cli@0.1.22` + `@sparticuz/chromium@153`, unpack ke `~/.cache/ms-playwright`, tulis `.playwright/cli.config.json` |
| `.playwright/cli.config.json` | **ADA** | flag `--no-sandbox --disable-dev-shm-usage --disable-gpu --use-gl=swiftshader --enable-unsafe-swiftshader` |
| `scripts/review/shots.mjs` | **ADA** | screenshot berbasis `playwright-cli` (dipakai untuk `docs/08-IMPLEMENTATION/design-review/`) |
| `scripts/a11y-audit.mjs` | **ADA** | axe-core via `puppeteer-core`, 7 route × 2 lebar = 14 page load, exit 1 bila ada violation |
| `scripts/qa-motion.mjs` | **ADA** | perilaku motion via `puppeteer-core`, termasuk kontrak canvas |
| `scripts/check-web.mjs` | **ADA** | budget JS/CSS + link internal |
| `puppeteer-core` | **ADA** di devDependencies | `package.json` |
| `scripts/visual-check.mjs` | **DIBUAT di Langkah 1** (2026-10-28) | 14 shot + axe + console capture + self-test |
| `scripts/setup-visual-tools.sh` | **DIBUAT di Langkah 1** (2026-10-28) | unpack Chromium + libs sistem |
| `@playwright/test` | **ADA** (devDependency) | `1.64.1`, menyertakan `playwright-core` |
| Browser terpasang di sandbox ini | **ADA** setelah `npm run visual:setup` | `~/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome` |

### Hasil urutan install (diukur, bukan diasumsikan)

| Percobaan | Hasil |
| --- | --- |
| `npx playwright install chromium --with-deps` | **GAGAL** exit 1 — apt tidak punya package list: `E: Unable to locate package libnss3` (+17 paket lain) |
| `npx playwright install chromium` | **GAGAL** exit 1 — `ECONNRESET` ke `cdn.playwright.dev:443` (CDN diblokir di sandbox; `curl` → `SSL_ERROR_SYSCALL`) |
| `@sparticuz/chromium@153` sendirian | **GAGAL** exit 127 — `libnspr4.so: cannot open shared object file` |
| `@sparticuz/chromium` + libs AL2023 + `LD_LIBRARY_PATH` | **BERHASIL** — Chromium r1248 launch, `navigator.userAgent` terbaca, screenshot 1440×900 valid |

Teknik yang menyelamatkan sama dengan `scripts/setup-playwright-cli.sh`: tarball npm
`@sparticuz/chromium` berisi `chromium.br`, `swiftshader.tar.br`, dan `al2023.tar.br` — yang terakhir
memuat `libnspr4`, `libnss3`, `libgbm`, `libdrm`, dst. Library sistem ditaruh di satu direktori
datar dan dipasang lewat `LD_LIBRARY_PATH`, bukan di `/usr/lib` (tidak ada root).

Catatan dependensi: `@sparticuz/chromium` **tidak** masuk `package.json` — ukurannya ~70 MB unpacked
dan CI GitHub sudah punya Chrome asli dari `browser-actions/setup-chrome`. `setup-visual-tools.sh`
memasangnya on demand ke prefix sementara. `@playwright/test` tetap jadi devDependency (3 paket).

### Cara pakai

```bash
npm run visual:setup                          # sekali per sandbox; idempotent, ada --force
npm run visual:check -- --category baseline   # 7 route × 1440/390 + axe + console
npm run visual:check -- --category hero --routes / --widths 1440,390 --full
```

Script ini **self-test dulu** sebelum mengukur apa pun: ia memicu satu `console.error`, satu uncaught
exception, dan satu request gagal di dokumen sekali pakai, lalu menjalankan axe pada halaman yang
sengaja rusak (gambar tanpa `alt` + tombol tanpa nama). Kalau salah satu penghitung tidak bergerak,
script gagal dengan exit 1 — sehingga "0 console error" berarti "tidak ada yang terjadi", bukan
"listener-nya tidak terpasang".

### Hasil baseline Langkah 1 (kondisi situs SEBELUM perbaikan apa pun)

```
✓ self-test: console 2 · page 1 · request 1 · axe 5
14 shots · PNG invalid 0 · console 0 · page 0 · request 0 · axe 0
```

| Metrik | Angka | Metode |
| --- | --- | --- |
| Screenshot | 14 (7 route × 1440/390) | `visual:check` |
| PNG valid | **14/14** | signature `89 50 4E 47 0D 0A 1A 0A` + IHDR dibaca langsung, independen dari Playwright |
| Ukuran | 218 642 – 1 697 536 byte | `stat` |
| Dimensi | 1440×900 / 390×844 persis | IHDR |
| Console error | **0** | listener `console` (self-test: 2 tertangkap) |
| Page error | **0** | listener `pageerror` (self-test: 1) |
| Request error | **0** | listener `requestfailed` + respons ≥400 (self-test: 1) |
| axe violation | **0** di 14 page load | `axe-core` wcag2a/2aa/21a/21aa (self-test: 5 di halaman rusak) |
| axe cross-check | **0 violation / 16 page load** | `npm run a11y` milik repo, Chromium yang sama, `CHROME_PATH` + `LD_LIBRARY_PATH` |

Catatan penting: **0 axe violation bukan berarti desainnya benar.** axe hanya mengukur apa yang bisa
diputuskan mesin. 5 page load melaporkan `incomplete` (kontras teks di atas foto) — itu tetap butuh
mata manusia atau sampling piksel.

Tidak ada regresi dari tooling baru: `typecheck` bersih, `lint` bersih, `npm run test` **132/132
pass**, `npm run build` sukses dengan 2 warning tracing yang **sama seperti sebelumnya**
(`src/content/covers.ts:33`) dan tabel route identik.

---

## 4. Apa yang bisa dan tidak bisa dibuktikan otomatis

| Bisa otomatis (dan harus dilampiri angka) | Tidak bisa otomatis |
| --- | --- |
| Offset/gap dalam px (`getBoundingClientRect`) | Apakah komposisi "terasa mahal" |
| Elemen masuk fold 900px atau tidak | Apakah desain "kerasa AI-generated" |
| Tidak ada overflow horizontal 320–1920px | Ritme visual antar-section |
| `border-radius` = `0px` (computed style) | Pilihan warna di luar ambang kontras |
| Kontras warna (axe-core) | Apakah foto/artwork terlihat murah |
| Jumlah `canvas` di DOM per posisi scroll | Kualitas retouching gambar |
| Console error count | Apakah copy "berbunyi" seperti label rekaman asli |
| Ukuran font terkomputasi vs token | Apakah animasi terasa mekanis vs organik |
| `opacity`, `pointer-events` hasil media query | Kelayakan karya untuk pasar booking |

---

## 5. BUTUH OWNER REVIEW (jangan diklaim selesai oleh agent)

Item berikut **tidak boleh** diberi status PASS oleh agent, apa pun hasil skripnya:

1. Kualitas komposisi hero — apakah terasa seperti situs label, bukan landing page startup.
2. Kesan "AI-generated" / template — uji dengan kalimat di `docs/DESIGN.md` §7.
3. Ritme visual antar-section (heading → media → teks) pada 1440 dan 390.
4. Selera warna di luar kontras terukur (mis. apakah biru `#0087FF` terlalu dominan).
5. Apakah tiga varian sleeve generatif benar-benar berbeda secara visual.
6. Apakah efek signature terbaca "mekanis/precision" atau justru "particle system generik".
7. Apakah copy publik berbunyi seperti label rekaman independen.
8. Apakah foto/portrait layak dipakai sebagai LCP hero.

Format laporan untuk item di atas:
`BUTUH OWNER REVIEW — <item> — bukti teknis: <path PNG/angka> — belum ada penilaian agent.`

---

## 6. Cara expose ke owner

**PRIORITAS 1 — Vercel preview deployment.** Stabil dan persisten; tidak mati saat sandbox reset.

- Preview dibuat saat branch di-push dan PR dibuka (Langkah 4). Laporkan URL dengan status
  **Ready**.
- **Blocker yang harus dicek owner:** kalau *Ignored Build Step* di project Vercel sudah diisi
  `if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then exit 0; else exit 1; fi`
  (lihat `docs/ARCHITECTURE.md` §3.4), maka **preview untuk branch non-main tidak akan dibangun**.
  Dalam kondisi itu, preview harus dipicu manual dari dashboard (Deploy Hook / *Redeploy* dengan
  override) atau aturan Ignored Build Step dilonggarkan untuk `arena/**`.
- Status: **BELUM DIVERIFIKASI — BUTUH OWNER.**

**PRIORITAS 2 — screenshot statis.** Kirim PNG 1440×900 dan 390×844 per halaman. Ini bukti
terukur dan bisa diarsipkan, tapi tidak bisa di-hover.

**PRIORITAS 3 (hindari) — live preview via port sandbox.** Terbukti rapuh di sesi sebelumnya: mati
setiap sandbox reset. Pakai hanya untuk cek cepat selama sesi berjalan, dan **jangan** jadikan satu-
satunya bukti serah terima.

Hal yang tidak bisa diverifikasi lewat screenshot sama sekali (perlu sesi langsung): perilaku
clipboard (butuh gesture nyata), focus trap drawer, dan `prefers-reduced-motion` — semuanya
dibuktikan lewat `qa:motion`/DOM assertion, bukan mata.
