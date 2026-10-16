# Ekspor konten NAWA STUDIO

Ekspor adalah salinan konten website dalam format JSON. Fitur ini hanya bisa diunduh setelah login admin.

## Cara unduh dari Android

1. Buka halaman NAWA STUDIO dan login seperti biasa.
2. Di halaman **Dashboard**, scroll ke bagian **Export**.
3. Tap **Unduh ekspor**.
4. Browser akan mengunduh file dengan nama `nawa-studio-export-TANGGAL.json`. Tanggalnya memakai waktu Asia/Jakarta.
5. Cek hasilnya di aplikasi Unduhan (Downloads) atau di notifikasi browser.

Tidak perlu komputer. Jika ingin memindahkan file, gunakan aplikasi Files atau Drive di HP.

## Isi file

- `pages`: halaman About dan Homepage. Setiap halaman punya `draft` (versi kerja) dan `published` (versi yang tampil di website). Jika belum pernah dipublikasikan, `published` bernilai `null`.
- `design`: pengaturan desain, dengan draft dan published.
- `releases`: daftar rilis musik, diurutkan berdasarkan slug, dengan draft dan published.
- `complete`: `true` jika semua konten bisa dibaca dan tidak ada kunci yang tidak dikenal.
- `unreadable`: daftar dokumen yang tidak bisa dibaca.
- `omitted.unrecognizedKeys`: jumlah data yang tidak dikenali sistem. Isinya tidak ikut diekspor.

## Peringatan penting

- **File ini berisi draf yang belum dipublikasikan.** Perlakukan seperti dokumen pribadi. Jangan kirim ke orang lain atau ke grup publik.
- **Ekspor bukan backup lengkap.** File ini tidak mencakup file gambar atau media, pengaturan server, password, sesi login, atau salinan database di penyedia hosting. Restore (memasukkan kembali file ke website) belum tersedia.
- Simpan salinan ekspor di tempat yang aman, dan hapus salinan lama jika sudah tidak diperlukan.

## Arti ekspor tidak lengkap

Jika `complete` bernilai `false`, ada sebagian konten yang tidak bisa diekspor secara utuh:

- Setiap entri di `unreadable` menunjukkan kunci dokumen dan bagian yang bermasalah (`draft`, `published`, atau `metadata`).
- Isi dokumen yang rusak **tidak** ikut diekspor, dan sistem **tidak** menggantinya dengan data kosong. Bagian itu bernilai `null`.
- Jangan mengandalkan file tidak lengkap sebagai satu-satunya salinan. Beri tahu developer sebelum melakukan perubahan besar.

## Jika unduhan gagal

- **401 (Sign in):** sesi login sudah habis. Login ulang, lalu coba lagi.
- **403 (Cross-site):** permintaan dari situs lain ditolak. Unduh langsung dari halaman Dashboard NAWA STUDIO.
- **500:** ekspor gagal dibuat. Coba lagi nanti. Detail teknisnya hanya ada di log server.

## Keamanan

- Route: `GET /studio/export`. Hanya admin yang sudah login yang bisa mengunduh.
- Respons memakai `Cache-Control: private, no-store`, sehingga tidak disimpan di cache.
- Tidak ada header CORS. Website lain tidak bisa membaca isi file.
- Permintaan yang ditandai browser sebagai `Sec-Fetch-Site: cross-site` ditolak.
