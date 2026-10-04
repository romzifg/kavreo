# Kavreo — Creator Workspace

**Kavreo** adalah ruang kreatif untuk mengembangkan ide menjadi karya, dengan tagline **Dari ide, jadi karya.** Identitas visual menggunakan ungu studio, aksen peach, dan mint, dengan dukungan tema terang/gelap.

Aplikasi untuk membuat **script video pendek**, **ide konten**, dan **kalender konten** dengan alur **approval berulang** (User → Approval → kembali ke User sampai disetujui).

## Struktur

```
content-planner/
├── api/    Backend  — Express 5 + TypeScript (modular) + Prisma 7 + PostgreSQL
├── app/    Frontend — React 19 + Vite + Tailwind 4 + daisyUI 5 + TanStack Query + Zustand
└── docker-compose.yml   PostgreSQL untuk development
```

## Role & alur bisnis

| Role | Kemampuan |
|---|---|
| **User** | Membuat script / ide / kalender, memilih satu atau banyak Approval, mengajukan, merevisi, mengajukan ulang. Hanya melihat data buatannya sendiri. |
| **Approval** | Melihat hanya data yang di-assign kepadanya (dan sudah diajukan). Menyetujui atau menolak dengan komentar. Pada kalender, memberi keputusan + catatan **per tanggal**. |
| **Superadmin** | Mengelola pengguna (tambah, ubah role, nonaktifkan, hapus) dan melihat seluruh data (read-only). |

**Alur script / ide:** `Draft → Menunggu review → (Ditolak → Perlu revisi → User perbaiki → ajukan ulang → Menunggu review) … → Disetujui`.
Setiap pengajuan, penolakan (wajib beserta alasan), persetujuan, dan komentar tercatat di riwayat aktivitas, lengkap dengan nomor revisi.

**Alur kalender:** User membuat kalender (periode + approval) lalu menambah jadwal per tanggal. Setelah diajukan, Approval menyetujui / menolak **tiap tanggal** dengan catatan (atau "Setujui semua"). Jika masih ada tanggal ditolak, kalender kembali ke User (Perlu revisi); tanggal yang sudah disetujui tidak direview ulang. Kalender menjadi **Disetujui** setelah semua tanggal disetujui.

## Menjalankan (development)

Prasyarat: **Node.js 22+** dan **PostgreSQL 15+** (atau Docker).

### 1. Database

```bash
docker compose up -d
```

Tanpa Docker, buat database PostgreSQL bernama `content_planner` lalu sesuaikan `DATABASE_URL`.

### 2. Backend (`api`)

```bash
cd api
cp .env.example .env        # sesuaikan DATABASE_URL dan JWT_SECRET
npm install                 # otomatis menjalankan prisma generate
npm run migrate:deploy      # menerapkan migration ke database
npm run db:seed             # superadmin + akun & data demo
npm run dev                 # http://localhost:4000
```

Saat mengembangkan skema, gunakan `npm run migrate:dev` untuk membuat migration baru.

### 3. Frontend (`app`)

```bash
cd app
cp .env.example .env        # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                 # http://localhost:5173
```

### Akun hasil seed

| Role | Email | Password |
|---|---|---|
| Superadmin | `admin@contentplanner.test` | `Admin12345!` |
| Approval | `rina@contentplanner.test` / `bima@contentplanner.test` | `Password123!` |
| User | `dina@contentplanner.test` | `Password123!` |

Ganti password superadmin (`SEED_ADMIN_*` di `.env`) dan set `SEED_DEMO_DATA=false` untuk production.

## Notifikasi email & WhatsApp (diaktifkan belakangan)

Notifikasi **di dalam aplikasi** selalu aktif. Pengiriman email / WhatsApp **nonaktif secara default** dan diatur lewat `api/.env`:

```env
NOTIFY_EMAIL_ENABLED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="Content Planner <no-reply@domain.com>"

NOTIFY_WHATSAPP_ENABLED=true
WA_PROVIDER=fonnte          # fonnte | webhook
WA_API_TOKEN=...            # token Fonnte
# WA_API_URL=               # wajib untuk provider "webhook"; opsional untuk fonnte
```

Syarat pengiriman ke satu user: channel aktif di `.env` **dan** user menyalakannya di menu **Pengaturan** (WhatsApp juga butuh nomor telepon). Provider `webhook` mengirim `POST` JSON `{ to, message, title, link }` ke `WA_API_URL`, sehingga mudah disambungkan ke gateway lain atau n8n. Kegagalan kirim hanya dicatat di log dan tidak menggagalkan request.

Kejadian yang memicu notifikasi: pengajuan / pengajuan ulang (ke Approval), persetujuan, permintaan revisi, kalender selesai direview, dan komentar baru (ke pihak lawan).

## Build production

```bash
# Backend
cd api && npm ci && npm run build && npm run migrate:deploy && npm start

# Frontend (hasilnya di app/dist, sajikan sebagai static site)
cd app && npm ci && npm run build
```

Checklist production: `NODE_ENV=production`, `JWT_SECRET` acak ≥ 32 karakter, `CORS_ORIGIN` = domain frontend, `APP_URL` = domain frontend, `TRUST_PROXY=1` jika di belakang reverse proxy, `VITE_API_URL` diisi sebelum build frontend, dan SPA fallback ke `index.html` di web server.

## Mobile, tablet, dan PWA

Kavreo memakai layout responsif, navigasi bawah di HP, area sentuh yang lebih besar, serta modal yang bisa digulir pada layar pendek. Kalender di HP membuka tampilan daftar terlebih dahulu; tampilan bulanan dapat digeser di dalam area kalender.

PWA aktif pada **build production**, bukan server development. Manifest, ikon Android/maskable, ikon Apple, dan service worker dihasilkan otomatis saat build:

```bash
cd app
npm run build
npm run preview
```

Menu **Pengaturan → Pasang Kavreo / Cara memasang** menyediakan pemasangan dan petunjuk. Android menggunakan Chrome, sedangkan iPhone/iPad menggunakan Safari → Bagikan → Tambahkan ke Layar Utama. Chrome/Edge desktop juga dapat memasangnya. Pemasangan tidak memerlukan paket APK atau aplikasi App Store.

Service worker menyimpan aset tampilan sehingga app shell dapat dibuka kembali tanpa server. Login, memuat data, dan menyimpan konten tetap membutuhkan internet; data API pribadi tidak disimpan dalam cache service worker dan tidak ada antrean penyimpanan offline. Pembaruan versi ditampilkan sebagai pemberitahuan dengan tombol **Perbarui sekarang**, agar pengguna dapat menyimpan pekerjaan terlebih dahulu.

Untuk deployment:

- Sajikan frontend dan API melalui **HTTPS**. HTTP localhost dapat dipakai untuk pengujian pada komputer sendiri; alamat LAN HTTP tidak cukup untuk pemasangan PWA di HP.
- Isi `VITE_API_URL` dengan alamat API yang dapat diakses perangkat sebelum build. `localhost` di HP merujuk ke HP tersebut. Sesuaikan `CORS_ORIGIN` dengan origin frontend.
- Sajikan seluruh `app/dist`, termasuk `manifest.webmanifest`, `sw.js`, `workbox-*.js`, dan folder `icons`. Gunakan MIME `application/manifest+json` untuk manifest dan JavaScript untuk service worker.
- Terapkan SPA fallback ke `index.html` untuk rute aplikasi, tetapi jangan mengubah permintaan API atau aset yang hilang menjadi HTML. Berikan `Cache-Control: no-cache` pada `sw.js` dan `index.html`; aset dengan nama hash dapat memakai cache immutable.
- Konfigurasi saat ini menggunakan root domain (`/`). Deployment di subfolder memerlukan penyesuaian Vite base, scope/start URL manifest, dan path ikon.

Jika logo berubah, jalankan `npm run pwa:icons` dari folder `app`, lalu build ulang. Generator sumber ada di `app/scripts/generate-pwa-icons.mjs`.

## Ringkasan API

Semua endpoint berawalan `/api`, respons berbentuk `{ data, meta? }`. Selain `/auth/login` dan `/auth/register`, wajib header `Authorization: Bearer <token>`.

| Area | Endpoint |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET/PATCH /auth/me`, `POST /auth/change-password` |
| Script & ide | `GET/POST /contents`, `GET/PATCH/DELETE /contents/:id`, `POST /contents/:id/submit`, `POST /contents/:id/review`, `POST /contents/:id/comments` (filter `?type=SCRIPT\|IDEA&status=&q=`) |
| Kalender | `GET/POST /calendars`, `GET/PATCH/DELETE /calendars/:id`, `POST /calendars/:id/items`, `PATCH/DELETE /calendars/:id/items/:itemId`, `POST /calendars/:id/submit`, `POST /calendars/:id/items/:itemId/review`, `POST /calendars/:id/approve-all`, `POST /calendars/:id/comments` |
| Pengguna | `GET /users/approvers` (semua role), `GET/POST/PATCH/DELETE /users` (Superadmin) |
| Lainnya | `GET /dashboard`, `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`, `GET /health` |

## Struktur backend (modular)

```
api/src/
├── config/        env (validasi zod), locale zod
├── common/        errors, middleware (auth, error handler), util
├── lib/           prisma client, logger
└── modules/
    ├── auth/  users/  contents/  calendars/  notifications/  dashboard/
    └── (tiap modul: *.schema.ts, *.service.ts, *.routes.ts)
```

Tambahan yang dipakai: `zod` (validasi), `helmet`, `cors`, `express-rate-limit`, `pino` (log), `nodemailer` (email), `bcryptjs`, `jsonwebtoken`.

## Ide pengembangan lanjutan

Field **Isi script** dan **Deskripsi ide** menggunakan Tiptap rich text editor: bold, italic, underline, highlight, heading, daftar, kutipan, serta undo/redo. Format disimpan sebagai HTML pada field yang sama, disanitasi di backend dan sebelum ditampilkan. Konten plain text lama tetap didukung. Preview daftar, jumlah kata, dan salinan script menggunakan teks tanpa tag HTML. Batas 10.000 karakter untuk script dan 5.000 karakter untuk deskripsi mencakup markup format.

Pengujian sanitasi dan payload rich text: jalankan `node --import tsx --test src/common/rich-text.test.ts` dari folder `api`.

Generator hook/script dengan AI, template script, ekspor kalender (PDF / iCal), paket langganan & multi-workspace untuk dijual ke banyak kreator, serta pengingat jadwal tayang (H-1) lewat notifikasi.
