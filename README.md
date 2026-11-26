This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Backup & Pemulihan (Tahap 13)

- Siapkan kunci age **publik** di variabel `AKIRA_BACKUP_AGE_PUBLIC_KEY` (lihat `.env.example`).
  Kunci **privat** disimpan terpisah oleh pemilik toko dan tidak pernah masuk repositori/image.
- Bangun ulang image setelah perubahan Dockerfile:
  `docker compose up -d --build` (memasang `age`, `pg_dump`, `psql`, `tar`, `gzip`).
- Backup otomatis harian berjalan di dalam aplikasi pada jam `AKIRA_BACKUP_JAM_WIB` (default `02:00` WIB),
  sekali per hari WIB. Arsip retensi 30 hari dibersihkan otomatis.
- Backup manual: panel `/admin/backup` (Admin Utama; kata sandi + OTP) atau CLI:
  `docker compose exec app sh scripts/backup-cli.sh`.
- Pemulihan ke target yang diinginkan:
  `docker compose exec app sh scripts/restore.sh --file <arsip.age> --identity <kunci-privat> --db-url <url-target> --media-dir <folder-target>`.
- Uji restore terisolasi (membuat dan menghapus database uji; tidak menyentuh data utama):
  `docker compose exec app sh scripts/restore-drill.sh`.
