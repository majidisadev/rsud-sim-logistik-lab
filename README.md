# Sistem Informasi Manajemen Logistik Laboratorium Rumah Sakit

Sistem informasi manajemen logistik laboratorium rumah sakit berbasis web menggunakan PERN Stack (PostgreSQL, Express, React, Node.js) dan Tailwind CSS dengan Shadcn UI.

## Prasyarat

- Node.js 18+
- PostgreSQL berjalan dan dapat diakses

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: React, Vite, Tailwind CSS, Shadcn UI
- **Authentication**: JWT

## Express Install

1. Buka install-all.bat
2. Ganti `.env.example` menjadi `.env` pada folder backend dan frontend. Atur sesuaikan database.
3. Siapkan database PostgreSQL. Buat database baru dengan nama sesuai dengan `DB_NAME` di `backend/.env` (default: `sim_logistik_lab`)
4. Buka setup-database.bat
5. Buka build.bat
6. Buka start.bat (jangan ditutup)

## Instalasi

1. Install dependencies dari root:

```bash
npm run install:all
```

2. Siapkan environment variables:

   **Backend:**

   - Copy `backend/.env.example` ke `backend/.env`
   - Update konfigurasi di `backend/.env` sesuai dengan setup Anda:
     - Database PostgreSQL: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
     - Server: `PORT` (default: 5000), `CORS_ORIGIN`
     - JWT: `JWT_SECRET` (wajib diubah untuk production), `JWT_EXPIRES_IN`

   **Frontend:**

   - Copy `frontend/.env.example` ke `frontend/.env`
   - Update `VITE_API_URL` jika backend berjalan di port/alamat yang berbeda (default: `http://localhost:5000/api`)

3. Siapkan database PostgreSQL:

   - Buat database baru dengan nama sesuai dengan `DB_NAME` di `backend/.env` (default: `sim_logistik_lab`)

4. Build backend lalu jalankan migrasi database:

```bash
cd backend
npm run build
npm run migrate
```

## Development

Jalankan backend dan frontend secara bersamaan dari root:

```bash
npm run dev
```

Backend akan berjalan di `http://0.0.0.0:5000` (dapat diakses dari jaringan lokal)
Frontend akan berjalan di `http://0.0.0.0:5173` (dapat diakses dari jaringan lokal)

Untuk mengakses dari perangkat lain dalam jaringan yang sama:

- Gunakan alamat IP komputer server (misal: `http://192.168.1.100:5173`)
- Pastikan firewall mengizinkan koneksi pada port 5000 dan 5173

## Production Build

Build untuk production (root):

```bash
npm run build
```

Jalankan production:

```bash
npm start
```

## Default Login

- Username: `admin`
- Password: `admin123`

## Network Access

Sistem dapat diakses dari perangkat lain dalam jaringan yang sama menggunakan alamat IP server.
