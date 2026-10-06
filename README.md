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
| **Superadmin** | Mengelola pengguna, pengaturan approval dan AI, memantau pemakaian AI per pengguna, serta melihat seluruh konten (read-only). |

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
cp .env.example .env        # VITE_API_URL=/api
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

Syarat pengiriman ke satu user: channel aktif di `.env` **dan** preferensi channel pada akun aktif (WhatsApp juga butuh nomor telepon). Bagian preferensi Email/WhatsApp pada menu **Pengaturan** hanya ditampilkan kepada Superadmin; API menolak perubahan preferensi tersebut dari User/Approval. Nilai preferensi akun yang sudah ada tetap berlaku. Provider `webhook` mengirim `POST` JSON `{ to, message, title, link }` ke `WA_API_URL`, sehingga mudah disambungkan ke gateway lain atau n8n. Kegagalan kirim hanya dicatat di log dan tidak menggagalkan request.

Kejadian yang memicu notifikasi: pengajuan / pengajuan ulang (ke Approval), persetujuan, permintaan revisi, kalender selesai direview, dan komentar baru (ke pihak lawan).

## Build production

```bash
# Backend
cd api && npm ci && npm run build && npm run migrate:deploy && npm start

# Frontend (hasilnya di app/dist, sajikan sebagai static site)
cd app && npm ci && npm run build
```

Checklist production: `NODE_ENV=production`, `JWT_SECRET` acak ≥ 32 karakter, `CORS_ORIGIN` = domain frontend, `APP_URL` = domain frontend, `TRUST_PROXY=1` jika di belakang reverse proxy, dan SPA fallback ke `index.html` di web server. Frontend memakai `/api` secara default: arahkan `/api` ke backend dengan reverse proxy sebelum aturan SPA fallback. Jika backend memakai domain terpisah, isi `VITE_API_URL` dengan URL API publik sebelum build dan sesuaikan CORS.

Pada development dan preview lokal, Vite meneruskan `/api` ke backend `127.0.0.1:4000`. Backend tetap harus berjalan. Dengan default ini, login dapat digunakan dari `localhost`, `127.0.0.1`, atau IP LAN tanpa mengarahkan browser HP ke `localhost` milik HP. Jika file `app/.env` lama memakai URL localhost absolut, ubah menjadi `VITE_API_URL=/api` lalu restart Vite.

## Pengaturan alur approval

Superadmin dapat mengubah **Pengaturan → Alur approval aplikasi → Wajib approval**, lalu memilih **Simpan pengaturan approval**. Pengaturan ini tersimpan di database dan berlaku untuk script, ide, dan kalender seluruh pengguna; default-nya aktif.

- **Aktif:** pengajuan wajib memilih minimal satu approver aktif dan menunggu review. Error ditampilkan jika approver belum dipilih. Validasi berlaku di tampilan dan API, termasuk pengajuan ulang.
- **Nonaktif:** saat diajukan, script/ide langsung berstatus `APPROVED`; kalender dan semua jadwal yang belum disetujui juga langsung disetujui. Waktu persetujuan dan catatan persetujuan otomatis disimpan pada riwayat. Tidak ada notifikasi meminta review kepada approver.
- **Draft:** approver selalu boleh kosong. Menyimpan draft tidak otomatis menyetujui data, bahkan ketika approval nonaktif.
- Perubahan berlaku untuk pengajuan berikutnya. Data yang sudah menunggu review tidak otomatis diubah. Persyaratan isi konten dan minimal satu jadwal kalender tetap berlaku sebelum pengajuan.

API: `GET /api/settings` dapat dibaca semua pengguna yang login; `PATCH /api/settings` dengan JSON `{ "approvalEnabled": true }` hanya untuk Superadmin. Flag approval dari payload pengguna tidak dapat menggantikan pengaturan server.

Deployment versi ini memerlukan `npm run migrate:deploy` dari folder `api`, lalu build/restart backend dan build frontend. Migrasi menambahkan tabel `application_settings` tanpa mengubah data konten yang sudah ada.

Pengujian integrasi: jalankan `npm run test:approval` dari folder `api`. Tes memerlukan PostgreSQL lokal dan izin membuat database sementara. Tes membuat database terpisah dengan nama acak, menguji API HTTP dengan database nyata, lalu menghapus database sementara setelah selesai; database aplikasi tidak digunakan untuk fixture tes.

## Penugasan pekerjaan

Approver membuka **Pekerjaan → Assign pekerjaan baru**, memilih user aktif, jenis **Script video / Ide konten**, platform, judul, brief, dan deadline wajib di masa depan. Penugasan langsung menyiapkan draft milik user dengan reviewer pemberi tugas. User menerima notifikasi dan melihat task pada dashboard serta menu **Pekerjaan**, diurutkan berdasarkan deadline terdekat.

Tombol **Kerjakan / Lanjutkan / Perbaiki** membuka editor draft tersebut. Menyimpan perubahan pertama mengubah task dari **Belum dikerjakan** menjadi **Sedang dikerjakan**; setelah diajukan status menjadi **Menunggu review**, lalu **Perlu revisi** atau **Selesai**. Task selesai saat konten disetujui, bukan sekadar diajukan. User dapat memfilter status dan pekerjaan yang melewati deadline. Deadline dikirim sebagai waktu UTC dan ditampilkan mengikuti zona waktu perangkat; pekerjaan terlambat tetap dapat dikerjakan dan diajukan.

Reviewer penugasan dikunci di UI dan backend kepada pemberi tugas. Approver lain tidak bisa membaca daftar penugasan tersebut atau mereview hasilnya. Alur global tetap berlaku: jika approval nonaktif, pengajuan langsung disetujui dan task selesai; jika aktif, pemberi tugas melakukan review. User masih bisa membuat konten sendiri dengan alur pemilihan approver sebelumnya. Pemberi tugas dapat memperbarui brief/deadline sebelum pekerjaan selesai; perubahan mengirim notifikasi kepada penerima.

Konten penugasan dan akun yang memiliki riwayat penugasan tidak dapat dihapus agar riwayat tetap terjaga; akun dapat dinonaktifkan. Role akun tidak dapat diganti selama masih mempunyai pekerjaan aktif. Superadmin dapat melihat seluruh penugasan. Tidak ada pengingat deadline otomatis pada fitur ini.

API: `GET /api/tasks` (scope sesuai role, pagination, filter status), `GET /api/tasks/assignees`, `POST /api/tasks`, dan `PATCH /api/tasks/:id` (mutasi hanya untuk approver pemberi tugas). Deploy perlu menjalankan `npm run migrate:deploy` dari direktori `api` untuk migration `20261006010000_work_tasks`.

## Bantuan AI dan pemantauan

Editor **Isi script** dan **Deskripsi ide** memiliki tombol **Bantu dengan AI**. Isi judul terlebih dahulu, tambahkan arahan jika perlu, lalu pilih **Buat saran**. Hasil muncul sebagai pratinjau; **Gunakan hasil** mengganti isi editor dan **Tambahkan** menambahkan ke akhir. Hasil belum disimpan atau diajukan sampai pengguna memilih tombol simpan/pengajuan. Batas karakter editor tetap berlaku.

Pengaturan khusus Superadmin ada di **Pengaturan → Bantuan AI**:

Sebelum menggunakan model lokal, pastikan server Ollama tetap berjalan. Pada Windows, jalankan `powershell -ExecutionPolicy Bypass -File .\Start-AI.ps1` dari root proyek untuk memeriksa atau menyalakan Ollama di background. Alternatifnya, jalankan `ollama serve` dan biarkan terminal tersebut terbuka. Script tidak mengunduh model; gunakan nama model yang sudah terpasang. Setelah komputer restart, jalankan lagi jika Ollama belum aktif.

- Default: Ollama lokal, Base URL `http://localhost:11434`, model `llama3:latest`, output maksimal 800 token, timeout 180 detik, kuota 20 permintaan per pengguna per hari.
- Jalankan Ollama di mesin backend dan pastikan model tersedia (`ollama list`; jika belum ada, install model yang dipilih melalui Ollama). Di instalasi lokal ini juga tersedia `mistral:latest`. Base URL diakses oleh **backend**, bukan langsung dari browser. Untuk Docker atau mesin backend lain, `localhost` merujuk ke mesin/container tersebut.
- Protokol **OpenAI compatible / gateway** menggunakan Base URL yang berakhir pada path versi API, misalnya `https://api.openai.com/v1`, atau Gemini `https://generativelanguage.googleapis.com/v1beta/openai`. Nama model dan API key mengikuti penyedia. Endpoint akhir adalah `/chat/completions`. Gateway seperti LiteLLM dapat menghubungkan platform lain yang tidak menyediakan protokol ini.
- Protokol **Anthropic / Claude** menggunakan Base URL `https://api.anthropic.com/v1`, endpoint `/messages`, key dan nama model dari Anthropic. Dukungan ini bukan klaim kompatibilitas otomatis dengan seluruh protokol penyedia; platform yang berbeda membutuhkan gateway atau adapter baru.
- API cloud memerlukan HTTPS. Key disimpan terenkripsi AES-256-GCM dan tidak dikembalikan ke browser. Saat Base URL/protokol berubah, key lama dibuang agar tidak terkirim ke host baru; masukkan key baru jika diperlukan.
- Untuk produksi, isi `AI_ENCRYPTION_KEY` dengan rahasia acak tetap minimal 32 karakter di environment backend. Jika kosong, enkripsi menggunakan turunan `JWT_SECRET`. Jangan mengganti rahasia enkripsi tanpa menyiapkan penyimpanan ulang API key. Backup database dan rahasia enkripsi secara terpisah.
- Isi harga input/output **USD per satu juta token** dari penyedia untuk estimasi biaya. Harga tidak diambil otomatis; estimasi disimpan pada tiap permintaan sehingga perubahan harga tidak mengubah riwayat. Ollama tercatat biaya API USD 0, di luar listrik/perangkat.
- **Uji koneksi & model** menjalankan generate singkat menggunakan pengaturan yang sudah disimpan, dan dicatat sebagai fitur `TEST`. Pengujian cloud dapat memakai kuota/biaya penyedia.

Menu **Pemakaian AI** hanya tersedia untuk Superadmin. Dashboard menyediakan filter tanggal dan pengguna, ringkasan per pengguna, token input/output yang dilaporkan penyedia, estimasi biaya USD, dan riwayat dengan status/durasi/model. Token atau biaya yang tidak diketahui tidak diklaim sebagai nol. Prompt, isi script/deskripsi, dan hasil AI tidak disimpan pada log pemakaian.

Kuota memakai reservasi transaksional database: permintaan gagal juga dihitung, maksimal satu permintaan berjalan per pengguna dan tiga secara keseluruhan. Kuota harian reset **00.00 UTC (07.00 WIB)**. Tidak ada retry otomatis yang dapat menimbulkan tagihan ganda. Permintaan yang terputus saat backend restart ditandai gagal setelah melewati 310 detik. Pada API cloud, konteks yang dimasukkan pengguna dikirim ke penyedia yang dipilih.

Migrasi `20261005010000_ai_assistance` menambahkan konfigurasi dan tabel `ai_usage`. Jalankan migrasi production sebelum restart backend. Pengujian integrasi dengan database sementara mencakup adapter Ollama/compatible/Claude (respons cloud dimock), enkripsi, hak akses, kuota, dan pencatatan. Generate nyata tetap perlu diuji dengan key/model akun produksi.

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
- Gunakan `/api` dengan reverse proxy pada production, atau isi `VITE_API_URL` dengan alamat API publik yang dapat diakses perangkat sebelum build. `localhost` di HP merujuk ke HP tersebut. Untuk API pada domain terpisah, sesuaikan `CORS_ORIGIN` dengan origin frontend.
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

Template script, ekspor kalender (PDF / iCal), paket langganan & multi-workspace untuk dijual ke banyak kreator, serta pengingat jadwal tayang (H-1) lewat notifikasi.
