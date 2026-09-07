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
> *Catatan: Jika Supabase belum dihubungkan, aplikasi akan otomatis berjalan dalam mode fallback offline/standalone dengan seed data 6 TPS Desa Belega.*

### 4. Jalankan Server Dev Lokal
```bash
npm run dev
```
Buka browser di `http://localhost:5173`.

---

## 🗄️ Setup Database Supabase & Migration

1. Buka Dashboard Supabase ([supabase.com](https://supabase.com)) → Buat proyek baru.
2. Buka **SQL Editor** pada Dashboard Supabase Anda.
3. Jalankan SQL migration dari file [`supabase/migrations/20260907000000_init_schema.sql`](file:///d:/project/quick-count-pilkel/supabase/migrations/20260907000000_init_schema.sql):
   - Membuat 7 Tabel (`elections`, `candidates`, `polling_stations`, `vote_results`, `invalid_votes`, `profiles`, `audit_logs`).
   - Membuat PostgreSQL Trigger Function `log_audit_change()`.
   - Mengaktifkan Row Level Security (RLS) & Policies.
   - Membuat RPC Function `get_election_summary()` dan `get_tps_recap()`.
   - Membuat Storage Bucket `evidence-photos` dan `candidate-photos`.
4. (Opsional) Jalankan SQL seed data dari file [`supabase/seed.sql`](file:///d:/project/quick-count-pilkel/supabase/seed.sql) untuk mengunggah 2 paslon dan 6 TPS Desa Belega awal.

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
- **Admin Login (`/admin/login`)**: Login panitia via Supabase Auth email/password atau tombol pilihan role testing.
- **Admin Dashboard (`/admin`)**:
  - Input/edit suara per kandidat + suara tidak sah per TPS.
  - Upload foto formulir C-Hasil per TPS.
  - **Role Operator**: Input data dan mengubah status dari `pending` → `submitted`.
  - **Role Admin**: Melakukan `verify`, `lock` / `unlock` TPS, dan melihat riwayat audit log.
