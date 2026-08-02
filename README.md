# Agent Inovasi

Coding & working agent untuk tim Indonesia, di web dan (opsional) di Slack.

Agent Inovasi mengerjakan tugas nyata: memperbaiki bug dan membuka PR, menjawab dari
dokumen internal, serta menjalankan pekerjaan rutin secara otomatis. Kamu memberi
instruksi lewat chat, dan agent yang mengerjakannya.

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

Agent Inovasi adalah agent yang bekerja untuk **tim**. Setiap orang dan setiap tim punya
ruang kerja sendiri yang terpisah (file, ingatan, kunci akses, izin, jadwal otomatis, dan
aplikasi), tetapi tetap bisa berkolaborasi di channel, group, dan project. Semua aktivitas
tercatat untuk audit.

Agent Inovasi bersifat terbuka: kamu bebas memilih sendiri model AI yang dipakai, termasuk
**open model** seperti DeepSeek. Mesin yang menjalankan agent pun bisa dipilih (Pi,
OpenCode, Codex, atau Claude Code), dan semuanya memakai sistem yang sama di balik layar.

Yang bisa dikerjakan:

- **Mengerjakan kode**: bekerja langsung di repository yang ada, menjalankan test, membuka PR, memantau CI, membaca log.
- **Menjawab dari dokumen internal**: catatan, email, dokumen, database, dan web sekaligus, lengkap dengan sumbernya.
- **Otomasi rutin**: tugas terjadwal yang berjalan otomatis tanpa perlu ditunggu, misalnya merapikan inbox atau membuat laporan berkala.
- **Membangun & menerbitkan aplikasi internal** ke orang yang tepat.
- **Mengingat & belajar**: ingatan per ruang kerja, ditambah skills (langkah kerja yang bisa dipakai ulang dan dibagikan).

## Panduan cepat: menjalankan di mesin sendiri

Coba Agent Inovasi di mesin sendiri. Tampilan chat, panel admin, model (DeepSeek), database
(Postgres), dan komputer agent semuanya sudah terhubung.

**Yang perlu disiapkan:** Node ≥ 24.15, Docker, dan DeepSeek API key.

**Langkahnya:**

```bash
npm install
npm run quickstart
```

Perintah ini memeriksa kebutuhan sistem, menanyakan DeepSeek API key, menyiapkan database
dan komputer agent, lalu menjalankan aplikasinya. Setelah selesai, buka alamat yang
ditampilkan di terminal (default `http://localhost:8096`).

Detail lengkap dan opsi lain ada di [`QUICKSTART.md`](./QUICKSTART.md).

### Masuk pertama kali

Kalau belum ada sistem login yang dipasang, Agent Inovasi memakai login lokal sederhana
(mode dev). Masukkan alamat email kamu, lalu klik **Lanjut**.

![Halaman masuk Agent Inovasi dalam mode dev: kolom email dan tombol Lanjut](./docs/screenshots/masuk.png)

## Mengenal tampilan

Menu utama ada di bilah kiri (**Jelajah**). Berikut fungsi tiap bagian.

### Chat

Tempat kamu memberi instruksi ke agent. Ketik permintaan di kolom **Tanya apa saja**, lalu
agent mengerjakannya. Model AI yang dipakai bisa diganti di kanan bawah kolom chat. Setiap
percakapan tersimpan otomatis, dan bisa dibagikan ke project agar tim ikut melihat.

### File

Semua file yang kamu upload, yang dibuat agent, atau yang dibagikan ke kamu ada di sini.
Kamu bisa menyaringnya berdasarkan pemilik dan tipe, atau meminta agent membuat file baru.

![Halaman File Agent Inovasi dengan area upload dan filter pemilik serta tipe](./docs/screenshots/files.png)

### Cron

Untuk pekerjaan yang berjalan otomatis dan terjadwal, misalnya merapikan inbox tiap pagi
atau membuat laporan mingguan. Tugas ini tetap berjalan meski tidak ada yang menunggu.

![Halaman Cron Agent Inovasi dengan tombol Cron baru](./docs/screenshots/cron.png)

### Skills

Skill adalah langkah kerja siap pakai yang bisa dipakai ulang dan dibagikan. Skill dimiliki
tiap ruang kerja, bisa dibagikan ke orang lain, dan bisa dijadikan standar untuk seluruh
organisasi. Agent Inovasi sudah membawa sejumlah skill bawaan (misalnya `/browse`,
`/cloud-cli`, `/connect-apps`).

![Halaman Skills Agent Inovasi menampilkan daftar skill bawaan](./docs/screenshots/skills.png)

### Memory

Fakta yang diingat agent dan dibawa ke setiap percakapan kamu. Kamu bisa mengeditnya
langsung seperti buku catatan, atau membuka tampilan fakta untuk mencari dan menghapus satu
per satu.

![Halaman Memory Agent Inovasi dengan editor catatan dan tombol Simpan perubahan](./docs/screenshots/memory.png)

### Aplikasi

Agent bisa membangun aplikasi internal, lalu kamu terbitkan (deploy) ke orang yang tepat.
Klik **Deploy pakai Agent** untuk memulai.

![Halaman Aplikasi Agent Inovasi dengan tombol Deploy pakai Agent](./docs/screenshots/app.png)

## Cara pakai sehari-hari

Alurnya sederhana: **buka Chat, tulis permintaan, agent mengerjakan**. Beberapa contoh
permintaan yang bisa langsung kamu coba:

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

Setiap deployment berjalan di akun cloud milik kamu sendiri. Untuk memakai DeepSeek, set
`MODEL_PROVIDER=deepseek` dan `DEEPSEEK_API_KEY`. Detail lengkap ada di
[`deployment.md`](./deployment.md) dan [`cli/README.md`](./cli/README.md).

## Cek kesiapan sebagai coding agent

```bash
npm run coding-check
```

Perintah ini memeriksa bahwa mesin agent bisa memakai model yang dipilih, sandbox punya
alat pengembang (git/node/python), dan agent bisa menjalankan perintah, tanpa perlu API
key.

## Keamanan

Agent bertindak atas nama orang yang diwakilinya, memakai kredensial dan izin mereka, dan
semua tindakannya tercatat. Organisasi memilih satu tingkat keamanan, yang bisa diperketat
oleh tiap ruang kerja:

- **Strict**: setiap tindakan agent menunggu persetujuan manusia.
- **Auto** (default): sistem otomatis menyaring data dari sumber luar sebelum sampai ke model AI.
- **Dangerous**: tanpa penyaringan, tanpa jeda.

Aturan perintah (persetujuan dan larangan keras seperti `rm -rf` atau perintah SQL yang
merusak) berlaku di semua tingkat. Rincian model ancaman dan batasan yang diketahui ada di
[`SECURITY.md`](./SECURITY.md).

## Cara kerja di balik layar

Alurnya sederhana:

1. Kamu memberi permintaan lewat **web** atau **Slack**.
2. Permintaan masuk ke satu **pusat (core)** yang mengatur identitas, izin, dan jadwal.
3. Untuk menjalankan perintah, agent memakai **komputer sendiri yang aman dan terpisah** (disebut sandbox).
4. Semua data (akun, riwayat chat, dan hal yang perlu diingat) tersimpan di **database Postgres**.

Web, admin, dan Slack hanyalah pintu masuk ke pusat yang sama, jadi identitas dan
pengaturan kamu tetap konsisten di mana pun kamu mengaksesnya.

Komputer agent (sandbox) sudah berisi alat pengembang seperti git, Node, dan Python,
sehingga agent bisa langsung menyalin kode, mengubah, menguji, lalu menyimpannya. Kamu juga
bebas memilih model dan mesin yang menjalankan agent tanpa mengubah bagian lain.

Secara teknis, semuanya berjalan di Node (TypeScript), jadi mudah dijalankan dan di-deploy.

## Lisensi

Kecuali dinyatakan lain, Agent Inovasi tersedia di bawah [MIT License](./LICENSE).
