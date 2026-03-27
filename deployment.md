# 🚀 Panduan Deploy KeuanganKu ke Vercel

Ikuti langkah-langkah di bawah ini untuk meng-online-kan aplikasi **KeuanganKu** Anda:

## 1. Persiapan Akun
- Pastikan Anda sudah memiliki akun di [vercel.com](https://vercel.com).
- Hubungkan akun GitHub/GitLab Anda jika ingin deploy otomatis setiap kali Anda melakukan `git push`.

## 2. Menggunakan Vercel Dashboard (Rekomendasi)
1. **Push ke GitHub**: Upload seluruh folder `d:\keungan` ke repository GitHub baru.
2. **Import Project**: Di dashboard Vercel, pilih **"Add New"** > **"Project"** dan pilih repository tersebut.
3. **Environment Variables**:
   > [!IMPORTANT]
   > Klik bagian **Environment Variables** dan masukkan variabel dari file `.env` Anda:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Sangat penting agar fitur Admin tetap jalan!)
4. **Deploy**: Klik tombol **"Deploy"**. Vercel akan otomatis membaca file `vercel.json` yang sudah saya buatkan.

## 3. Menggunakan Vercel CLI (Alternatif Terminal)
Jika Anda ingin deploy langsung dari terminal komputer Anda:
1. Instal Vercel CLI: `npm install -g vercel`
2. Jalankan perintah: `vercel`
3. Ikuti petunjuk di terminal (pilih "KeuanganKu", set directory ke `./`, dll).
4. Untuk menambahkan ENV, jalankan: `vercel env add SUPABASE_URL` dan seterusnya.
5. Jalankan `vercel --prod` untuk deploy ke tahap produksi.

## 4. Kenapa Ada File `vercel.json`?
File ini berfungsi untuk memberi tahu Vercel bahwa:
- Aplikasi ini adalah aplikasi **Node.js**.
- Semua permintaan (URL) harus diarahkan ke file `server.js` (Express Router).
- Ini memungkinkan EJS dan rute kustom kita berjalan sebagai *Serverless Functions*.

---
### 💡 Tips Setelah Deploy:
- Setelah sukses, Anda akan mendapatkan URL seperti `keuanganku.vercel.app`.
- Jika ada error, Anda bisa cek log di tab **"Logs"** pada dashboard Vercel.
- Jangan lupa tambahkan URL baru Anda ke daftar **"Redirect URLs"** di Dashboard Supabase (Authentication > URL Configuration) jika diperlukan.

**Selamat Mencoba!** ✨
