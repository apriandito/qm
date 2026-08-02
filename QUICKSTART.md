# Quickstart: menjalankan Agent Inovasi secara lokal

Jalankan Agent Inovasi di mesin kamu sendiri dengan satu perintah. Chat UI,
admin panel, model (DeepSeek), Postgres, dan sandbox agent semuanya sudah terhubung.

## Yang perlu disiapkan

- **Node.js ≥ 24.15**: periksa dengan `node --version` (install lewat `nvm install 24`)
- **Docker** yang berjalan, dipakai untuk sandbox terisolasi milik agent dan untuk Postgres
- Sebuah **DeepSeek API key** dari [platform.deepseek.com](https://platform.deepseek.com)

## Menjalankan

```bash
git clone <repo Agent Inovasi kamu>
cd agent-inovasi
npm install
npm run quickstart
```

Saat pertama kali dijalankan, perintah ini menanyakan DeepSeek API key kamu (disimpan
lokal di `.env.quickstart`, yang sudah gitignored), lalu:

1. Memeriksa Node dan Docker
2. Membuat secret lokal dan menjalankan container Postgres
3. Membangun image sandbox agent (sekali saja, beberapa menit) dan web UI
4. Menjalankan core, chat UI, dan admin panel
5. Menampilkan URL

Setelah selesai, kamu akan melihat:

```
✓ Agent Inovasi is running.

  Chat UI    http://localhost:8096      → sign in as "admin"
  Admin      http://localhost:8090      → in the browser console run:
                                    document.cookie = "admin=admin;path=/"; location.reload()

  Model: DeepSeek · sandbox: local Docker · data: Postgres (container agent-inovasi-postgres)

  Press Ctrl-C to stop. Postgres keeps running; `npm run quickstart:down` removes it.
```

## Cara masuk

- **Chat UI** (`http://localhost:8096`): buka, lalu masuk dengan nama `admin`.
- **Admin panel** (`http://localhost:8090`): buka, lalu jalankan perintah berikut di console browser

  ```js
  document.cookie = "admin=admin;path=/";
  location.reload();
  ```

  (Admin panel biasanya mendapat identitasnya dari sign-in portal, yang di setup lokal
  ini dilewati. `admin` adalah administrator organisasi lewat grant yang dibuat otomatis.)

## Menghentikan

- `Ctrl-C` menghentikan service. Postgres tetap berjalan agar data kamu tetap ada setelah restart.
- `npm run quickstart:down` menghapus container Postgres (volume datanya tetap disimpan;
  `docker volume rm agent-inovasi-pgdata` menghapusnya).

## Konfigurasi

Semuanya berjalan dengan nilai default. Ubah lewat environment variable bila perlu:

| Variable                | Default        | Kegunaan                                      |
| ----------------------- | -------------- | --------------------------------------------- |
| `DEEPSEEK_API_KEY`      | _(ditanyakan)_ | Model key; juga dibaca dari `.env.quickstart` |
| `QUICKSTART_ORG`        | `agentinovasi` | Id organisasi                                 |
| `QUICKSTART_PRINCIPAL`  | `admin`        | User admin lokal                              |
| `QUICKSTART_CORE_PORT`  | `8080`         | Port core API                                 |
| `QUICKSTART_WEB_PORT`   | `8096`         | Port chat UI                                  |
| `QUICKSTART_ADMIN_PORT` | `8090`         | Port admin panel                              |
| `QUICKSTART_DB_PORT`    | `5432`         | Host port untuk Postgres                      |

## Jika ada masalah

- **"needs Node ≥ 24.15"**: upgrade Node (`nvm install 24 && nvm use 24`).
- **"Docker … not reachable"**: jalankan Docker Desktop atau service docker.
- **"Could not start Postgres … port already in use"**: set `QUICKSTART_DB_PORT` ke port
  yang bebas, lalu jalankan ulang.
- **Build image sandbox gagal**: chat UI tetap terbuka, tetapi agent belum bisa
  menjalankan perintah sampai `npm run sandbox:local:build` berhasil (butuh Docker dan jaringan).

## Batasan setup lokal

Ini adalah setup satu mesin untuk satu operator, untuk mencoba dan self-host Agent
Inovasi. Setup ini sengaja melewati sign-in portal produksi dan TLS, yang sekaligus
mematikan signed control plane. Di mode lokal ini agent bisa chat dan menjalankan
perintah di sandbox-nya, tetapi hal berikut **dinonaktifkan**: cron dan reminder
terjadwal, tool yang autentikasi lewat OAuth connector, serta publishing web app.
Semua itu membutuhkan signed deployment. Untuk deployment publik dan multi-user dengan
tool set lengkap, gunakan deployment CLI (`qm init --target fly|aws`).
