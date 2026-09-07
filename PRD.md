# PRD — Sistem Hitung Cepat (Quick Count) Pemilihan Perbekel Desa Belega 2026

**Versi:** 1.0
**Tanggal:** 07 September 2026
**Pemilik produk:** Panitia Pemilihan Perbekel Desa Belega, Kec. Blahbatuh, Kab. Gianyar
**Status:** Draft untuk pengembangan

---

## 1. Latar Belakang & Tujuan

Desa Belega mengadakan Pemilihan Perbekel (Kepala Desa) 2026 dengan 2 pasangan calon dan 6 TPS. Panitia membutuhkan sistem hitung cepat (quick count) internal yang menampilkan rekapitulasi suara secara **real-time**, dapat diakses publik dalam dua bentuk tampilan:

1. **Layar siaran (TV/proyektor)** — dipasang di lokasi rekapitulasi/balai banjar, tampilan satu layar penuh tanpa scroll.
2. **Web publik (mobile & desktop)** — diakses warga/saksi lewat HP atau komputer, tampilan responsif.

Tujuan produk:
- Transparansi hasil real count kepada warga secara cepat, sebelum rapat pleno resmi.
- Mengurangi potensi kesalahpahaman/kecurigaan dengan menampilkan data per TPS secara rinci dan dapat diverifikasi (foto bukti C-Hasil).
- Mempermudah panitia menginput data dari lapangan tanpa proses manual (rekap kertas → papan tulis).

**Yang bukan tujuan (out of scope):**
- Sistem ini **bukan** hasil resmi pemilihan. Hasil resmi tetap ditetapkan lewat rapat pleno panitia.
- Tidak menggantikan proses pemungutan/penghitungan suara fisik di TPS.
- Tidak menyediakan e-voting atau sistem pemungutan suara digital.

---

## 2. Target Pengguna

| Peran | Kebutuhan |
|---|---|
| **Warga / masyarakat umum** | Melihat hasil rekap terkini, transparan, mudah dipahami, lewat HP atau layar siaran di balai banjar. |
| **Saksi pasangan calon** | Memverifikasi angka per TPS sesuai dengan formulir C-Hasil yang mereka pegang. |
| **Operator/Admin panitia** | Input data suara per TPS begitu formulir C-Hasil diterima dari petugas TPS. |
| **Ketua Panitia / Panwaslukel** | Memantau progres data masuk, memverifikasi/mengunci data sebelum dipublikasikan. |

---

## 3. Referensi Desain

Desain visual mengacu pada eksplorasi yang sudah dibuat di Google Stitch dengan design system **"Balinese Civic Broadcast"**:

- **Palet warna:** latar kertas hangat (`#F3ECDC`), hijau lumut tua sebagai warna otoritas/leading candidate (`#2F4030`), terracotta untuk Paslon 01 (`#9C4A32`), ocher/emas untuk Paslon 02 (`#B8933F`), tinta hitam hangat untuk teks (`#211D17`).
- **Tipografi:** Playfair Display (headline/judul), IBM Plex Sans (body & label), angka menggunakan tabular figures agar tidak "loncat" saat update real-time.
- **Bentuk:** sudut membulat minimal (4–8px), tanpa drop shadow tebal, tanpa bentuk pill kecuali indikator status live. Gaya "ledger/administratif", bukan SaaS generik.
- **Dua mode tampilan:**
  - *TV broadcast* — satu layar penuh (grid 12 kolom), panel kandidat di kiri (5 kolom), tabel rekap TPS di kanan (7 kolom), header status di atas, ticker/footer di bawah.
  - *Mobile* — kandidat side-by-side di atas, kartu ringkasan (suara sah/tidak sah/partisipasi), lalu daftar TPS ditumpuk vertikal per kartu.

File referensi desain (hasil export Stitch): `code.html` (2 varian) dan `screen.png` (2 varian) — dipakai sebagai acuan visual dan struktur komponen saat implementasi React + Tailwind.

---

## 4. Ruang Lingkup Fitur (MVP)

### 4.1 Halaman Publik
- **Dashboard utama (responsive)**
  - Header: logo/lambang desa, nama pemilihan, lokasi, status "X / Y TPS masuk (Z%)", jam pembaruan terakhir.
  - Panel kandidat: foto, nama, nama wakil (jika ada), nomor urut, total suara, persentase, status "Unggul" / "Peringkat 2", jumlah banjar/TPS di mana unggul.
  - Kartu ringkasan: total suara sah, suara tidak sah, tingkat partisipasi (dibanding DPT).
  - Tabel/daftar rekap per TPS: nama TPS/banjar, suara sah, suara tiap kandidat (angka + persentase), selisih suara, status "01 unggul" / "02 unggul".
  - Badge "Bukan Hasil Resmi" / "Siaran Resmi" (tergantung status verifikasi panitia) selalu terlihat.
  - Bukti C-Hasil: tombol/link untuk melihat foto formulir hasil penghitungan per TPS.
- **Mode tampilan:**
  - Desktop/TV: 1 layar penuh, auto-refresh tanpa reload manual.
  - Mobile: scroll vertikal, kolom disederhanakan (mis. kolom DPT disembunyikan).

### 4.2 Panel Admin (Panitia)
- Login admin (email/password via Supabase Auth), role: `operator` dan `admin`.
- Input/edit data suara per TPS per kandidat.
- Upload foto formulir C-Hasil per TPS.
- Tandai TPS sebagai "terverifikasi" (dua operator input independen, dibandingkan — jika beda, munculkan flag konflik untuk direview admin).
- Kunci (lock) TPS setelah diverifikasi agar tidak bisa diubah sembarangan (perlu unlock eksplisit oleh admin + dicatat di log).
- Log audit: siapa mengubah data apa, kapan (untuk transparansi & investigasi jika ada sengketa).
- Kelola data master: kandidat (nama, foto, nomor urut, wakil), TPS (nama, lokasi, jumlah DPT).

### 4.3 Realtime & Sinkronisasi
- Perubahan data di admin panel langsung terpantul ke dashboard publik tanpa refresh (via Supabase Realtime subscription).
- Indikator status koneksi (live/terputus) di header.

---

## 5. Model Data (Supabase / PostgreSQL)

```
elections
├── id (uuid, pk)
├── name                text        -- "Pemilihan Perbekel Desa Belega 2026"
├── location             text        -- "Kec. Blahbatuh, Kab. Gianyar"
├── status               enum        -- draft | live | closed
├── created_at

candidates
├── id (uuid, pk)
├── election_id          fk -> elections
├── number               int          -- nomor urut paslon (1, 2, ...)
├── name                 text
├── vice_name            text nullable
├── photo_url            text
├── color_hex            text         -- warna identitas di UI
├── created_at

polling_stations (tps)
├── id (uuid, pk)
├── election_id          fk -> elections
├── code                 text         -- "TPS 01"
├── banjar_name          text         -- "Balai Banjar Belega Kangin"
├── registered_voters    int          -- DPT
├── status               enum         -- pending | submitted | verified | locked | disputed
├── evidence_photo_url   text nullable
├── verified_by          fk -> profiles, nullable
├── verified_at          timestamptz nullable
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
├── role                 enum         -- admin | operator | viewer
├── created_at

audit_logs
├── id (uuid, pk)
├── actor_id             fk -> profiles
├── action               text         -- "update_votes", "verify_tps", "lock_tps", ...
├── table_name           text
├── record_id            uuid
├── old_value            jsonb
├── new_value            jsonb
├── created_at
```

**Perhitungan turunan (dilakukan di view/RPC, bukan disimpan manual):**
- `total_votes_per_candidate` = SUM(votes) semua TPS per kandidat.
- `total_valid_votes` = SUM semua votes semua kandidat semua TPS.
- `participation_rate` = total_valid_votes / SUM(registered_voters).
- `tps_reported_ratio` = COUNT(polling_stations WHERE status IN (verified, locked)) / COUNT(all polling_stations).
- `leading_candidate` dihitung on-the-fly di frontend/view, bukan field statis.

---

## 6. Alur Kerja Utama (User Flow)

1. Petugas TPS menyerahkan formulir C-Hasil (fisik/foto) ke sekretariat panitia.
2. Operator login ke panel admin → pilih TPS → input jumlah suara tiap kandidat + suara tidak sah → upload foto formulir → simpan (status `submitted`).
3. Operator kedua (independen) melakukan input yang sama untuk TPS yang sama.
4. Sistem membandingkan dua input; jika sama → admin bisa langsung set status `verified`. Jika beda → status `disputed`, muncul notifikasi ke admin untuk pengecekan manual.
5. Setelah `verified`, admin bisa `lock` data TPS tersebut (mencegah perubahan tanpa jejak audit).
6. Dashboard publik (TV & mobile) otomatis menampilkan data begitu status TPS `verified` atau `locked` (data `submitted` belum tampil ke publik, untuk mencegah data mentah yang belum tervalidasi tersebar).
7. Setelah 6 TPS selesai diverifikasi, badge status berubah menjadi "Hasil Sementara Resmi Panitia" sesuai keputusan panitia (tetap dengan disclaimer bukan hasil pleno resmi final).

---

## 7. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
|---|---|
| **Ketersediaan** | Dashboard publik harus tetap bisa diakses meski traffic naik saat malam pemilihan (target ringan, statis di CDN + Supabase sebagai satu-satunya sumber data dinamis). |
| **Realtime** | Update data ke publik ≤ 3 detik setelah admin menyimpan perubahan (Supabase Realtime channel). |
| **Keamanan** | Row Level Security (RLS) aktif: publik hanya boleh `SELECT` data dengan status `verified`/`locked`; hanya `operator`/`admin` yang bisa `INSERT`/`UPDATE`; hanya `admin` yang bisa `lock`/`unlock` dan mengubah data master. |
| **Auditability** | Setiap perubahan data suara & status TPS tercatat di `audit_logs` (siapa, kapan, nilai lama→baru). |
| **Responsif** | Tampilan TV (desktop, ≥1024px, satu layar tanpa scroll) dan mobile (<768px, scroll vertikal, kolom disederhanakan) sesuai desain Stitch. |
| **Aksesibilitas** | Kontras warna memenuhi WCAG AA, ukuran font angka tetap terbaca dari jarak (untuk layar TV). |
| **Performa** | First load < 2 detik di koneksi 4G desa; gunakan caching read query publik. |

---

## 8. Metrik Keberhasilan

- 100% dari 6 TPS berhasil diinput dan diverifikasi dalam waktu ≤ 2 jam setelah TPS terakhir tutup.
- Tidak ada perbedaan data pada dashboard publik dibanding formulir C-Hasil resmi yang tervalidasi (0 sengketa data yang tidak terselesaikan).
- Dashboard dapat diakses tanpa error oleh warga di HP dan layar TV/proyektor selama malam penghitungan.

---

## 9. Rencana Rilis (MVP → Next)

**MVP (harus ada sebelum hari-H):**
- Dashboard publik (TV + mobile) menampilkan data dari Supabase.
- Panel admin: login, input suara per TPS, upload bukti foto, verifikasi & lock.
- Realtime sync dashboard publik.
- RLS dasar (publik read-only data terverifikasi; admin/operator write).

**Next (setelah hari-H / pemilihan berikutnya):**
- Dual-input independen otomatis dengan deteksi selisih (saat ini bisa manual dulu).
- Export hasil ke PDF/rekap resmi untuk rapat pleno.
- Notifikasi (WhatsApp/Telegram bot) ke panitia saat semua TPS selesai.
- Riwayat/log publik yang bisa dilihat warga (transparansi penuh perubahan data, tanpa expose identitas operator).

---

## 10. Lampiran

- Desain referensi (Stitch export): `hitung_cepat_pilkel_belega_2026_tv_broadcast_simpel/` dan `hitung_cepat_pilkel_belega_2026_single_screen_mobile/` (code.html + screen.png).
- Design system: `balinese_civic_broadcast/DESIGN.md` (warna, tipografi, spacing, komponen).
