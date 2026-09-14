# Aplikasi Web Hitung Cepat (Quick Count) Pemilihan Perbekel Desa Belega 2026

Aplikasi web Hitung Cepat (Quick Count) resmi internal untuk **Pemilihan Perbekel Desa Belega 2026** (Kecamatan Blahbatuh, Kabupaten Gianyar) yang menampilkan rekapitulasi suara secara **real-time** dengan dua mode tampilan:
1. **TV Broadcast (Desktop ≥1024px):** Satu layar penuh tanpa scroll untuk layar proyektor / TV balai banjar.
2. **Mobile (<768px):** Tampilan responsif vertikal untuk warga & saksi via HP.

---

## 🛠️ Tech Stack & Design Tokens
- **Frontend:** React, TypeScript, Vite, Tailwind CSS.
- **Backend & Database:** Supabase (Postgres + Auth + Realtime + Storage).
- **Design System:** **"Balinese Civic Broadcast"**
  - **Palet Warna:** Latar `#F3ECDC` (Kertas Hangat), Hijau Lumut `#2F4030` (Otoritas / Paslon Unggul), Terracotta `#9C4A32` (Paslon 01), Ocher Emas `#B8933F` (Paslon 02), Tinta `#211D17`, Hairline `#D5CBBA`.
  - **Tipografi:** Playfair Display (Headline), IBM Plex Sans (Body & Label), OpenType `tabular-nums` untuk angka realtime.

---

## 🚀 Panduan Setup & Jalankan Lokal

### 1. Prasyarat System
- Node.js (v18+)
- npm atau pnpm

### 2. Install Dependencies
```bash
npm install
```

### 3. Konfigurasi Environment Variables (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi variabel dengan kredensial proyek Supabase Anda:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ **PERINGATAN KEAMANAN PRODUKSI:**
> Mode demo offline (`isSupabaseConfigured = false`) **HANYA** diperbolehkan untuk pengembangan lokal (`npm run dev`). Di lingkungan produksi (`import.meta.env.PROD`), aplikasi akan memblokir akses jika variabel Supabase tidak dikonfigurasi. Mode demo tidak boleh ter-deploy ke server publik karena seluruh verifikasi hanya di sisi browser (tanpa proteksi hash password kriptografis & tanpa Row Level Security PostgreSQL).

### 4. Jalankan Server Dev Lokal
```bash
npm run dev
```
Buka browser di `http://localhost:5173`.

---

## 🗄️ Setup Database Supabase & Migration

1. Buka Dashboard Supabase ([supabase.com](https://supabase.com)) → Buat proyek baru.
2. Buka **SQL Editor** pada Dashboard Supabase Anda.
3. Jalankan SQL migration secara berurutan:
   - `supabase/migrations/20260907000000_init_schema.sql` (Skema awal & tabel)
   - `supabase/migrations/20260911000000_add_additional_voters.sql` (DPT Tambahan / DPTb)
   - `supabase/migrations/20260914000001_fix_rls_security.sql` (Perbaikan RLS, isolasi hak akses operator, & RPC server-side)
   - `supabase/migrations/20260914000002_fix_audit_log_rpc.sql` (RPC `log_audit_event` dengan verifikasi identitas `auth.uid()`)
4. (Opsional) Jalankan SQL seed data dari file `supabase/seed.sql` untuk mengunggah paslon dan data TPS Desa Belega awal.

---

## 📦 Build & Deployment (Vercel / Netlify)

### Vercel Deployment
1. Import repository ini ke [Vercel](https://vercel.com).
2. Tentukan **Framework Preset**: `Vite`.
3. Tambahkan Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Klik **Deploy**.

### Netlify Deployment
1. Import repository ini ke [Netlify](https://netlify.com).
2. Set **Build command**: `npm run build`.
3. Set **Publish directory**: `dist`.
4. Tambahkan Environment Variables di Site Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy Site.

---

## 🔐 Hak Akses & Fitur Admin
- **Public (`/`)**: Menampilkan siaran resmi hasil hitung cepat, grafik paslon, tabel TPS, dan modal foto bukti C-Hasil (hanya data `verified` atau `locked` yang tampil).
- **Admin Login (`/admin/login`)**: Login panitia via Supabase Auth email/password dengan pemilih akun per petugas TPS.
- **Admin Dashboard (`/admin`)**:
  - Input/edit suara per kandidat + suara tidak sah per TPS.
  - Upload foto formulir C-Hasil per TPS dengan kompresi otomatis di browser.
  - Verifikasi dan penguncian data TPS (`verify`, `lock` / `unlock`).
  - Riwayat jejak digital / audit log per TPS.
  - Cetak / Export Berita Acara Tabulasi Resmi (PDF / Print).
  - Manajemen Petugas TPS, DPT, Calon, dan Pengaturan Judul/Logo.
