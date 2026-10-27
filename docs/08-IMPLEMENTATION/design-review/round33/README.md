# Round 33 — verifikasi mobile pasca-merge + scrollbar webkit

Sesi baru dimulai tepat di merge commit PR #3 (`ca74742`), jadi seluruh kerja mobile round 31–32
sudah hidup di `main`: liquid 3D monta di ponsel (gate lebar layar dihapus round 32), DPR
`[1, 1.5]`, riak raycaster menjawab `pointermove` sentuh (`touch-action: pan-y`), gyroscope
miringkan mark, reel katalog scroll-snap native, footer empat kolom tanpa wordmark raksasa, dan
semua penomoran hiasan sudah pensiun sejak round 31.

Round ini menutup satu celah yang tersisa dari spek owner: iOS Safari mengabaikan
`scrollbar-width`, satu-satunya pegangan yang ia berikan adalah pseudo-element webkit — maka
`.pinContent::-webkit-scrollbar { display: none; }` menambah `scrollbar-width: none` yang sudah
ada, supaya reel tanpa scrollbar di setiap mesin. Komentar usang di `SectionHeader` yang masih
mencontohkan "01 — Katalog" ikut diluruskan agar nomor tidak menyusup lagi lewat dokumen.

Gate: `typecheck` ✓ · `lint` ✓ · `audit:tokens` 106 ✓ · `npm test` 132/132 ✓ · `build` hijau ·
overflow horizontal dokumen 0 di 390 px · nol error konsol.

Berkas: `01-beranda-390-hero.webp` · `02-beranda-390-liquid-sentuh.webp` (riak biru pada jalur
sentuh) · `03-katalog-390-snap-center.webp` (kartu terkunci di tengah, tetangga mengintip, tanpa
scrollbar) · `04-footer-390.webp`.
