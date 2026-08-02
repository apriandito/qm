# Agent Inovasi

Agent untuk coding dan pekerjaan sehari-hari, di web dan (opsional) di Slack.

Agent Inovasi dapat memperbaiki bug dan membuka PR, menjawab pertanyaan berdasarkan dokumen
internal, serta menjalankan pekerjaan rutin secara otomatis. Instruksi diberikan lewat
chat, lalu agent mengerjakannya.

![Tampilan chat Agent Inovasi dengan menu di kiri dan kolom chat di kanan](./docs/screenshots/web-ui-hero.png)

## Daftar isi

- [Apa itu Agent Inovasi](#apa-itu-agent-inovasi)
- [Panduan cepat: menjalankan di mesin sendiri](#panduan-cepat-menjalankan-di-mesin-sendiri)
- [Mengenal tampilan](#mengenal-tampilan)
- [Cara pakai sehari-hari](#cara-pakai-sehari-hari)
- [Deploy untuk organisasi](#deploy-untuk-organisasi)
- [Cek kesiapan sebagai coding agent](#cek-kesiapan-sebagai-coding-agent)
- [Keamanan](#keamanan)
- [Cara kerja di balik layar](#cara-kerja-di-balik-layar)
- [Lisensi](#lisensi)

## Apa itu Agent Inovasi

Agent Inovasi adalah agent yang bekerja untuk tim. Setiap orang dan setiap tim memiliki
ruang kerja sendiri yang terpisah (file, ingatan, kunci akses, izin, jadwal otomatis, dan
aplikasi), tetapi tetap dapat berkolaborasi di channel, group, dan project. Semua aktivitas
tercatat untuk audit.

Agent Inovasi bersifat terbuka: model AI yang digunakan dapat dipilih sendiri, termasuk
**open model** seperti DeepSeek. Mesin yang menjalankan agent pun dapat dipilih (Pi,
OpenCode, Codex, atau Claude Code), dan semuanya menggunakan sistem yang sama di balik
layar.

Yang dapat dikerjakan:

- **Mengerjakan kode**: bekerja langsung di repository yang ada, menjalankan test, membuka PR, memantau CI, membaca log.
- **Menjawab dari dokumen internal**: catatan, email, dokumen, database, dan web sekaligus, lengkap dengan sumbernya.
- **Otomasi rutin**: tugas terjadwal yang berjalan otomatis tanpa perlu ditunggu, misalnya merapikan inbox atau membuat laporan berkala.
- **Membangun dan menerbitkan aplikasi internal** ke orang yang tepat.
- **Mengingat dan belajar**: ingatan per ruang kerja, ditambah skills (langkah kerja yang dapat digunakan ulang dan dibagikan).

## Panduan cepat: menjalankan di mesin sendiri

Agent Inovasi dapat dijalankan di mesin sendiri. Tampilan chat, panel admin, model
(DeepSeek), database (Postgres), dan komputer agent semuanya sudah terhubung.

**Yang perlu disiapkan:** Node ≥ 24.15, Docker, dan DeepSeek API key.

**Langkahnya:**

```bash
npm install
npm run quickstart
```

Perintah ini memeriksa kebutuhan sistem, menanyakan DeepSeek API key, menyiapkan database
dan komputer agent, lalu menjalankan aplikasinya. Setelah selesai, alamatnya ditampilkan di
terminal (default `http://localhost:8096`).

Detail lengkap dan opsi lain tersedia di [`QUICKSTART.md`](./QUICKSTART.md).

### Masuk pertama kali

Jika belum ada sistem login yang dipasang, Agent Inovasi menggunakan login lokal sederhana
(mode dev). Alamat email dimasukkan pada kolom yang tersedia, lalu tombol **Lanjut**
ditekan.

![Halaman masuk Agent Inovasi dalam mode dev: kolom email dan tombol Lanjut](./docs/screenshots/masuk.png)

## Mengenal tampilan

Menu utama berada di bilah kiri (**Jelajah**). Berikut fungsi tiap bagian.

### Chat

Tempat instruksi diberikan ke agent. Permintaan diketik di kolom **Tanya apa saja**, lalu
agent mengerjakannya. Model AI yang digunakan dapat diganti di kanan bawah kolom chat.
Setiap percakapan tersimpan otomatis, dan dapat dibagikan ke project agar tim ikut melihat.

### File

Semua file yang di-upload, yang dibuat agent, atau yang dibagikan ada di sini. File dapat
disaring berdasarkan pemilik dan tipe, atau agent dapat diminta untuk membuat file baru.

![Halaman File Agent Inovasi dengan area upload dan filter pemilik serta tipe](./docs/screenshots/files.png)

### Cron

Untuk pekerjaan yang berjalan otomatis dan terjadwal, misalnya merapikan inbox tiap pagi
atau membuat laporan mingguan. Tugas ini tetap berjalan meski tidak ada yang menunggu.

![Halaman Cron Agent Inovasi dengan tombol Cron baru](./docs/screenshots/cron.png)

### Skills

Skill adalah langkah kerja siap pakai yang dapat digunakan ulang dan dibagikan. Skill
dimiliki tiap ruang kerja, dapat dibagikan ke orang lain, dan dapat dijadikan standar untuk
seluruh organisasi. Agent Inovasi sudah membawa sejumlah skill bawaan (misalnya `/browse`,
`/cloud-cli`, `/connect-apps`).

![Halaman Skills Agent Inovasi menampilkan daftar skill bawaan](./docs/screenshots/skills.png)

### Memory

Fakta yang diingat agent dan dibawa ke setiap percakapan. Fakta dapat diedit langsung
seperti buku catatan, atau dibuka pada tampilan fakta untuk dicari dan dihapus satu per
satu.

![Halaman Memory Agent Inovasi dengan editor catatan dan tombol Simpan perubahan](./docs/screenshots/memory.png)

### Aplikasi

Agent dapat membangun aplikasi internal, lalu aplikasi tersebut diterbitkan (deploy) ke
orang yang tepat. Untuk memulai, tombol **Deploy pakai Agent** ditekan.

![Halaman Aplikasi Agent Inovasi dengan tombol Deploy pakai Agent](./docs/screenshots/app.png)

## Cara pakai sehari-hari

Agent Inovasi digunakan dengan alur berikut: membuka Chat, menulis permintaan, lalu agent
mengerjakannya. Beberapa contoh permintaan:

- "Clone repository ini, jalankan test-nya, lalu perbaiki yang gagal dan buka PR."
- "Rangkum semua email minggu ini dari klien, kelompokkan per topik."
- "Buatkan jadwal otomatis yang mengirim laporan penjualan tiap Senin jam 8 pagi."
- "Buat aplikasi internal sederhana untuk mencatat absensi, lalu deploy ke tim HR."

Agent akan menjelaskan langkah yang diambil, meminta persetujuan bila diperlukan (sesuai
tingkat keamanan yang dipilih), lalu menyimpan hasilnya di File, Memory, atau Aplikasi.

## Deploy untuk organisasi

Untuk menjalankan Agent Inovasi bagi satu organisasi, tersedia CLI yang menyiapkan
deployment ke **Docker**, **Fly.io**, atau **AWS**:

```bash
node cli/bin/qm.ts init . --org <slug> --target <docker|fly|aws>
```

Setiap deployment berjalan di akun cloud milik operator. Untuk menggunakan DeepSeek,
`MODEL_PROVIDER=deepseek` dan `DEEPSEEK_API_KEY` perlu diatur. Detail lengkap tersedia di
[`deployment.md`](./deployment.md) dan [`cli/README.md`](./cli/README.md).

## Cek kesiapan sebagai coding agent

```bash
npm run coding-check
```

Perintah ini memeriksa bahwa mesin agent dapat menggunakan model yang dipilih, sandbox
memiliki alat pengembang (git/node/python), dan agent dapat menjalankan perintah, tanpa
perlu API key.

## Keamanan

Agent bertindak atas nama orang yang diwakilinya, menggunakan kredensial dan izin mereka,
dan semua tindakannya tercatat. Organisasi memilih satu tingkat keamanan, yang dapat
diperketat oleh tiap ruang kerja:

- **Strict**: setiap tindakan agent menunggu persetujuan manusia.
- **Auto** (default): sistem otomatis menyaring data dari sumber luar sebelum sampai ke model AI.
- **Dangerous**: tanpa penyaringan, tanpa jeda.

Aturan perintah (persetujuan dan larangan keras seperti `rm -rf` atau perintah SQL yang
merusak) berlaku di semua tingkat. Rincian model ancaman dan batasan yang diketahui
tersedia di [`SECURITY.md`](./SECURITY.md).

## Cara kerja di balik layar

Agent Inovasi bekerja dengan alur sebagai berikut:

1. Permintaan diberikan lewat **web** atau **Slack**.
2. Permintaan masuk ke satu **pusat (core)** yang mengatur identitas, izin, dan jadwal.
3. Untuk menjalankan perintah, agent menggunakan **komputer sendiri yang aman dan terpisah** (disebut sandbox).
4. Semua data (akun, riwayat chat, dan hal yang perlu diingat) tersimpan di **database Postgres**.

Web, admin, dan Slack hanyalah pintu masuk ke pusat yang sama, sehingga identitas dan
pengaturan tetap konsisten di mana pun diakses.

Komputer agent (sandbox) sudah berisi alat pengembang seperti git, Node, dan Python,
sehingga agent dapat langsung menyalin kode, mengubah, menguji, lalu menyimpannya. Model
dan mesin yang menjalankan agent pun dapat dipilih tanpa mengubah bagian lain.

Secara teknis, semuanya berjalan di Node (TypeScript).

## Lisensi

Kecuali dinyatakan lain, Agent Inovasi tersedia di bawah [MIT License](./LICENSE).
