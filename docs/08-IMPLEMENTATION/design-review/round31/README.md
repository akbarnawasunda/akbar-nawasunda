# Round 31 — monogram 3D cair, rumah dibersihkan, tiga micro-interaction

## 1. Monogram: objek padat, bukan bidang shader

Spek round 29 ("jangan 3D kaku") dibalik oleh round 31: mark sekarang **geometri solid** —
enam quad stroke (A: dua kaki + palang; N: dua tegak + diagonal) di-extrude
(`ExtrudeGeometry`, depth .34, bevel .07) menjadi huruf bervolume, lalu `geometry.center()`
dan scale 1.9. Material `MeshPhysicalMaterial` metalness 1 / roughness 0.05 / clearcoat 0.4:
raksa gelap yang hanya hidup dari refleksi.

Cairnya bukan video dan bukan displacement map: `onBeforeCompile` menyuntik simplex noise ke
*vertex stage* — verteks geser sepanjang normal (dua oktaf, amp .075/.035, speed .32) dan
`objectNormal` digeser gradien noise, jadi **refleksinya** yang beriak melintasi permukaan datar.
Kursor adalah raycaster: titik tabrak 3D memicu gelombang radial
`sin(d*5.5 − t*6.5) * exp(−d*1.5)` yang mendorong permukaan menjauh dari tangan, ditambah recoil
lateral 0.12 — objek benar-benar menghindar sedikit.

Pencahayaan: `<Environment>` drei dengan lima Lightformer yang di-bake sekali (`frames={1}`,
resolution 96, tanpa fetch HDR/jaringan). Pelajaran penting round ini: metal metalness 1 tidak
punya diffuse — ia hanya menampilkan isi cube. Bake pertama (empat strip di ruang hampa) membuat
muka depan memantulkan kehampaan = hitam di atas hitam; tes dinding merah membuktikan pipeline
benar, dan studio final (dinding depan terang + garis horizon panas + key putih + strip biru
signal + lantai gelap, semua `target={[0,0,0]}`) membuat huruf terbaca sebagai gunmetal.
`toneMappingExposure 1.25` mengangkat mid-tone yang dimakan ACES.

Perf & kejujuran: `dpr [1, 1.5]`; `frameloop` turun ke `"demand"` begitu band keluar viewport —
dan round ini menemukan bug nyata di sana: gate lama memakai `rootMargin: 15%`, sehingga pada
scroll 0 (band masih satu viewport di bawah) SwiftShader tetap merender full-tilt dan rAF seluruh
halaman anjlok ke ~3 fps (terukur: lerp tilt hero kelaparan frame). Gate kini ketat
`rootMargin: 0px` — loop hanya hidup saat piksel band benar-benar di layar; baterai perangkat
lemah ikut terima kasih. Geometri+material dispose saat unmount; canvas berada DI LUAR lapisan
parallax Depth (akar "jejak" round 29), di `.liquidLayer` dengan `pointer-events: auto` agar
raycaster menerima tangan. Still WebP tetap menjadi fallback (ponsel / reduced-motion / tanpa
WebGL) dan fade keluar saat shader hidup.

Bukti: `01-liquid-monogram.webp`, `02-liquid-ripple-hover.webp`.

## 2. Rumah dibersihkan

- Semua penomoran seksi ala-AI dihapus: `sectionNumber`/`sectionNote`/`transmissionHead` di
  beranda, kicker "01 — Tentang", badge `RMX` dan indeks nomor di drawer header.
- Footer ditulis ulang: wordmark raksasa, strip sosial ber-border, dan contact bar lama hilang.
  Sekarang grid empat kolom (Navigasi / Sosial dengan ikon SVG in-house / Rilis teratas /
  Kontak) bertipe kecil 12 px-an, satu hairline pemisah; 2 kolom ≤899 px, 1 kolom ≤479 px.
- Katalog di ponsel bukan pin JS lagi: baris menjadi scroller native `overflow-x: auto` +
  `scroll-snap-type: x mandatory`, kartu `min(72vw, 20rem)` snap center — jari mengerjakan
  scroll, bukan requestAnimationFrame. Overflow horizontal dokumen tetap 0 di 320–1920
  (terukur ulang setelah fix sr-only di bawah).

## 3. Tiga micro-interaction "wow"

- **Scramble hover** (`src/components/zine/Scramble.tsx`): huruf pecah jadi glyph acak ~250 ms
  lalu terkunci kiri-ke-kanan. `setInterval` yang membersihkan dirinya sendiri (bukan rAF baru),
  hanya untuk `pointerType` mouse/pen (kontrak: bukan media query hover), mati di reduced
  motion, dan teks asli hidup di span `.sr-only` (pelajaran: `aria-label` di span tanpa role
  ditolak axe — empat violasi sekali jalan). Dipakai di label drawer, judul kartu pin, judul
  ticker. Bukti: `04-scramble-mid-burst.webp` ("MUZSW" = "MUSIK" tertangkap mid-burst).
- **MagneticCursor** (`src/components/zine/MagneticCursor.tsx`): dot 6 px + ring 36 px mengganti
  pointer sistem hanya untuk mouse (arm pada `pointermove` pertama ber-`pointerType === "mouse"`;
  `cursor: none` hanya saat `html[data-cursor="on"]`). Tanpa loop rAF: `pointermove` menulis dua
  `transform: translate3d`, CSS transition memberi lag (dot 50 ms, ring 180 ms); rect target
  dibaca sekali per `pointerover`, bukan per move. Dekat link/tombol ring lepas dari tangan dan
  mengunci ke objek, diskalakan ke ukurannya, border jadi biru signal.
  Bukti: `03-magnetic-cursor-lock.webp` (ring terkunci di link drawer, bersamaan dengan scramble).
- **Equalizer** (`src/components/ui/Equalizer.tsx`): empat bar `scaleY` murni CSS, desync lewat
  negative delay, token `--duration-eq: 850ms`; statis di reduced-motion. Hidup di pill "Listen"
  header dan tautan "Sedang diputar" footer.

Semua efek non-shader hanya menyentuh `transform`/`opacity`.

## 4. Gate

`audit:tokens` 104 token ✓ · `typecheck` ✓ · `lint` ✓ · `npm test` 132/132 ✓ (kontrak anti-AI
diperbarui: drei kini disanksi spek, chunk wajib memuat ExtrudeGeometry + MeshPhysicalMaterial +
metalness 1 + roughness 0.05 + onBeforeCompile + Environment + onPointerMove + dpr [1,1.5] +
frameloop demand) · `a11y` 0 violasi / 16 load ✓ · `qa:motion` 23/23 ✓ · `review:shots` 19 ✓ ·
`check:web` JS 191.7 KB gz / CSS 16.8 KB gz (budget 250/40) ✓.

Satu perubahan harness yang jujur di `qa-motion.mjs`: setelah mengunjungi band (yang kini
mengcompile material fisik + bake environment), gestur tilt hero menunggu sepuluh frame beruntun
yang tepat waktu sebelum mengukur — asersi rotasinya tidak diubah; yang diubah hanya perlombaan
melawan compile GL di software rasterizer.

## 5. Berkas

`01-liquid-monogram.webp` objek padat saat idle · `02-liquid-ripple-hover.webp` riak raycaster +
melt · `03-magnetic-cursor-lock.webp` ring mengunci ke link · `04-scramble-mid-burst.webp`
scramble tertangkap tengah ledakan · `05-footer-four-columns.webp` footer grid baru ·
`06-mobile-catalogue-reel.webp` reel scroll-snap di 390 px.
