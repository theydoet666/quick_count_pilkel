# PRD — Sistem Hitung Cepat (Quick Count) Pemilihan Perbekel Desa Belega 2026

**Versi:** 2.0 (Updated)  
**Tanggal Pembaruan:** 14 September 2026  
**Pemilik Produk:** Panitia Pemilihan Perbekel Desa Belega, Kec. Blahbatuh, Kab. Gianyar  
**Domain Resmi:** `http://pilkel.belega.id/`  
**Status:** Siap Digunakan / Production Ready  

---

## 1. Latar Belakang & Tujuan

Desa Belega mengadakan Pemilihan Perbekel (Kepala Desa) 2026 dengan 2 pasangan calon di **6 Banjar Dinas** yang terbagi dalam **9 TPS**. Panitia membutuhkan sistem hitung cepat (quick count / real count) internal yang menampilkan rekapitulasi perolehan suara secara **real-time**, transparan, dan dapat diakses publik dalam bentuk:

1. **Layar Siaran (TV/Proyektor)** — dipasang di lokasi rekapitulasi/balai banjar, tampilan satu layar penuh tanpa scroll (*Full Screen TV Broadcast*).
2. **Web Publik Responsif (Mobile & Desktop)** — diakses langsung oleh warga, saksi, dan pemantau melalui URL resmi [`http://pilkel.belega.id/`](http://pilkel.belega.id/).
3. **Panel Khusus Operator & Admin** — input data formulir C-Hasil per TPS secara terotentikasi, disertai bukti foto formulir fisik.

**Tujuan Produk:**
- Transparansi hasil hitung suara kepada seluruh warga secara cepat, akurat, dan dapat dipertanggungjawabkan sebelum rapat pleno resmi.
- Mengurangi potensi kesalahpahaman atau sengketa dengan menampilkan perolehan suara rinci per TPS (9 TPS) dan lampiran foto C-Hasil yang dapat diverifikasi.
- Mempermudah panitia dan operator TPS menginput data dari lapangan tanpa rekapitulasi manual di papan tulis.
- Pengaturan waktu pembukaan perhitungan suara serentak (mis. pukul 13.00 WITA) dengan *Countdown Timer* otomatis.

**Batasan (Out of Scope):**
- Sistem ini **bukan** pengganti rapat pleno penetapan resmi. Hasil final tetap diputuskan dalam Rapat Pleno Panitia Pemilihan Perbekel Desa Belega.
- Tidak menyelenggarakan *e-voting* (pemungutan suara tetap dilakukan secara fisik di TPS).

---

## 2. Target Pengguna & Hak Akses

| Peran | Kebutuhan & Hak Akses |
|---|---|
| **Warga / Masyarakat Umum** | Melihat hasil rekapitulasi terkini secara live di HP/komputer/layar balai banjar, melihat foto bukti C-Hasil, status progres TPS masuk. |
| **Saksi Paslon** | Memverifikasi angka perolehan suara dan suara tidak sah di setiap TPS sesuai salinan C-Hasil fisik. |
| **Operator TPS** | Login per akun TPS untuk input suara sah paslon, suara tidak sah, serta upload foto C-Hasil setelah jam perhitungan suara dibuka. |
| **Admin Panitia** | Mengelola data master, verifikasi & kunci (lock) data TPS, mengatur waktu buka perhitungan, mengatur nama Ketua Panitia, cetak Berita Acara/Sertifikat Rekapitulasi. |

---

## 3. Identitas Visual & Desain

- **Lambang Resmi:** Logo lingkaran Panitia Pemilihan Perbekel Desa Belega (Candi Bentar, Kotak Suara, Padi-Kapas, Tiga Cincin Emas, serta semboyan *"Abhipraya Nayaka Dharma Rakshaka Desa"*).
- **Design System ("Balinese Civic Broadcast"):**
  - Palet warna: Latar gelap modern (`#0C0F14` / `#161B22`), aksen emas/gold (`#D4AF37`), terracotta untuk Paslon 01 (`#E06D53`), ocher/gold untuk Paslon 02 (`#E5A93C`).
  - Tipografi: **Playfair Display** (judul & headline formal), **IBM Plex Sans** (body text & tabel angka tabular).
  - Dialog interaktif: **SweetAlert2** kustom bertema gelap & emas untuk setiap konfirmasi aksi, input, dan notifikasi sistem.

---

## 4. Ruang Lingkup Fitur (Telah Diimplementasikan)

### 4.1 Halaman Publik & Siaran (`/`)
- **Header Resmi & Status:**
  - Logo resmi Desa Belega, judul pemilihan, status TPS masuk (contoh: *9 / 9 TPS Masuk - 100%*), dan waktu pembaruan terakhir.
  - Indikator status koneksi Supabase Realtime (Online / Offline).
- **Countdown & Pembatasan Waktu:**
  - Tampilan overlay hitung mundur (*Countdown Timer*) sebelum waktu perhitungan resmi dibuka (misal: Hari H pukul 13.00 WITA).
- **Panel Perolehan Suara Pasangan Calon:**
  - Foto paslon, nomor urut, nama calon & wakil, perolehan total suara, persentase suara sah, status keunggulan (*Unggul / Peringkat 2*), serta rincian keunggulan per banjar.
- **Kartu Ringkasan Suara:**
  - Total Suara Masuk, Total Suara Sah, Suara Tidak Sah, dan Tingkat Partisipasi Pemilih (dibanding total DPT seluruh TPS).
- **Tabel Rekapitulasi 9 TPS (6 Banjar Dinas):**
  - Rincian per TPS: DPT, Suara Paslon 01, Suara Paslon 02, Suara Tidak Sah, Total Suara Masuk, Selisih Suara, dan Status TPS (*Menunggu / Terverifikasi / Terkunci*).
  - Modal penampil foto formulir C-Hasil per TPS.
- **Mode Tampilan:**
  - *TV Broadcast Mode*: Tampilan 1 layar penuh otomatis tanpa scroll untuk proyektor/TV balai banjar.
  - *Responsive Mobile Mode*: Tampilan ramah ponsel dengan kartu ringkas per TPS.

### 4.2 Panel Operator TPS (`/operator`)
- Login khusus operator TPS.
- Pengecekan jadwal: Operator baru dapat menyimpan data setelah waktu hitung suara resmi dimulai.
- Input data perolehan suara Paslon 01, Paslon 02, dan Suara Tidak Sah.
- Unggah foto bukti formulir C-Hasil langsung dari kamera HP atau galeri.

### 4.3 Panel Admin Panitia (`/admin`)
- Otentikasi aman via Supabase Auth & Role-based Access Control (Admin).
- **Manajemen & Verifikasi TPS:**
  - Review input data dan foto C-Hasil dari operator.
  - Fitur **Verifikasi** dan **Kunci (Lock)** TPS untuk mencegah perubahan tanpa izin.
  - Fitur **Unlock** dan **Reset Data TPS** dengan konfirmasi SweetAlert2.
- **Pengaturan Pemilihan (`election_settings`):**
  - Mengatur jadwal & jam pembukaan perhitungan suara.
  - Mengatur nama Ketua Panitia Pemilihan untuk pencetakan dokumen.
  - Mengatur status tayang / publikasi.
- **Cetak Berita Acara & Rekapitulasi (Print Report Modal):**
  - Format resmi Berita Acara Sertifikat Hasil Penghitungan Suara siap cetak A4 / PDF.
  - Otomatis mencantumkan data rekapitulasi 9 TPS, perolehan suara sah, suara tidak sah, total pemilih, dan tanda tangan digital Ketua Panitia Pemilihan.
- **Log Audit (`audit_logs`):**
  - Pencatatan riwayat setiap aksi pengubahan, verifikasi, atau penguncian TPS secara kronologis.

### 4.4 Optimasi SEO & Indexing Google
- **Domain:** `http://pilkel.belega.id/`
- **Meta Tags Lengkap:** Title, Meta Description, Keywords, Canonical URL, Geo-targeting (Desa Belega, Blahbatuh, Gianyar, Bali).
- **Open Graph & Twitter Card:** Preview kartu gambar logo resmi saat tautan dibagikan ke media sosial / WhatsApp.
- **JSON-LD Structured Data Schema:** Schema *WebSite*, *GovernmentOrganization*, dan *Event*.
- **Peta Situs & Indeks:** Berkas `robots.txt`, `sitemap.xml`, dan `manifest.json`.

---

## 5. Struktur Data Wilayah & TPS

Desa Belega memiliki **6 Banjar Dinas** dengan total **9 TPS**:

| No | Nama TPS | Banjar Dinas | Alamat / Lokasi |
|:--:|---|---|---|
| 1 | TPS 01 | Banjar Belega Kangin | Balai Banjar Belega Kangin |
| 2 | TPS 02 | Banjar Belega Kangin | Balai Banjar Belega Kangin |
| 3 | TPS 03 | Banjar Belega Kauh | Balai Banjar Belega Kauh |
| 4 | TPS 04 | Banjar Kebon | Balai Banjar Kebon |
| 5 | TPS 05 | Banjar Kebon | Balai Banjar Kebon |
| 6 | TPS 06 | Banjar Jasri | Balai Banjar Jasri |
| 7 | TPS 07 | Banjar Jasri | Balai Banjar Jasri |
| 8 | TPS 08 | Banjar Sala | Balai Banjar Sala |
| 9 | TPS 09 | Banjar Tegal | Balai Banjar Tegal |

---

## 6. Model Database (Supabase / PostgreSQL)

```
elections
├── id (uuid, pk)
├── name                 text        -- "Pemilihan Perbekel Desa Belega 2026"
├── location             text        -- "Kec. Blahbatuh, Kab. Gianyar"
├── status               enum        -- draft | live | closed
├── created_at

election_settings
├── id (uuid, pk)
├── election_id          fk -> elections
├── start_time           timestamptz -- Jadwal pembukaan hitung suara (13.00 WITA)
├── ketua_panitia_name   text        -- Nama Ketua Panitia untuk Berita Acara
├── is_active            boolean
├── updated_at

candidates
├── id (uuid, pk)
├── election_id          fk -> elections
├── number               int         -- 1 atau 2
├── name                 text        -- Nama Calon Perbekel
├── vice_name            text        -- Nama Wakil (opsional)
├── photo_url            text
├── color_hex            text
├── created_at

polling_stations (9 TPS)
├── id (uuid, pk)
├── election_id          fk -> elections
├── code                 text        -- "TPS 01" s/d "TPS 09"
├── banjar_name          text        -- Nama Banjar Dinas
├── registered_voters    int         -- DPT
├── status               enum        -- pending | submitted | verified | locked | disputed
├── evidence_photo_url   text
├── verified_by          fk -> profiles
├── verified_at          timestamptz
├── created_at, updated_at

vote_results
├── id (uuid, pk)
├── polling_station_id   fk -> polling_stations
├── candidate_id         fk -> candidates
├── votes                int
├── entered_by           fk -> profiles
├── created_at, updated_at
├── UNIQUE (polling_station_id, candidate_id)

invalid_votes
├── id (uuid, pk)
├── polling_station_id   fk -> polling_stations (unique)
├── count                int
├── updated_at

profiles
├── id (uuid, pk, = auth.users.id)
├── full_name            text
├── role                 enum        -- admin | operator | viewer
├── assigned_tps_id      fk -> polling_stations (nullable)
├── created_at

audit_logs
├── id (uuid, pk)
├── actor_id             fk -> profiles
├── action               text        -- "update_votes", "verify_tps", "lock_tps", dll
├── table_name           text
├── record_id            uuid
├── old_value            jsonb
├── new_value            jsonb
├── created_at
```

---

## 7. Kebutuhan Non-Fungsional & Kualitas

| Aspek | Target & Realisasi |
|---|---|
| **Ketersediaan** | Aplikasi frontend berbasis SPA cepat (Vite + React) siap di-host di cPanel / VPS / Netlify / Vercel dengan integrasi langsung ke Supabase Cloud. |
| **Realtime** | Latensi sinkronisasi data antar admin, operator, dan publik < 1 detik via *Supabase Realtime Channel*. |
| **Keamanan Data** | Row Level Security (RLS) aktif: publik hanya dapat membaca data yang berstatus terverifikasi/terkunci; penulisan data memerlukan autentikasi operator/admin. |
| **Pencegahan Kunci Windows** | Pengabaian file arsip `dist.zip` pada file-watcher agar proses *hot-reload* dev server berjalan mulus tanpa kendala `EBUSY`. |
| **SEO & Indeks Google** | Memenuhi standar Google Search Console dengan robots.txt, sitemap XML, dan skema JSON-LD. |

---

## 8. Status Pengembangan & Verifikasi

- [x] Dashboard Publik (Desktop/TV & Mobile)
- [x] Desain Bertema Balinese Civic Broadcast
- [x] Input Data Suara & Bukti C-Hasil oleh Operator TPS
- [x] Sinkronisasi Realtime Supabase
- [x] Fitur Verifikasi & Penguncian (Lock) TPS oleh Admin
- [x] Dialog Interaktif & Konfirmasi dengan SweetAlert2
- [x] Pengaturan Jadwal Jam Hitung Suara & Countdown Timer
- [x] Sinkronisasi 6 Banjar Dinas dengan 9 TPS Resmi
- [x] Fitur Cetak Berita Acara / Laporan Rekapitulasi Suara (PDF/Print)
- [x] Integrasi Logo Resmi Desa Belega & Favicon SVG
- [x] Optimasi SEO Lengkap untuk Domain `http://pilkel.belega.id/`
