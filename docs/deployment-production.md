# Deployment production RumahKas

Arsitektur yang disarankan untuk server laptop:

```text
Pengguna HTTPS
    -> Cloudflare
    -> Cloudflare Tunnel (cloudflared di server)
    -> 127.0.0.1:8080
    -> Nginx container
    -> PHP-FPM/Laravel container
    -> MySQL container + bind mount CasaOS
```

Port aplikasi hanya didengarkan di localhost. MySQL tidak dipublikasikan ke host.
Data keuangan pengguna tetap berada di IndexedDB perangkat; MySQL hanya menyimpan
akun komersial, pembayaran, lisensi, instalasi, dan data admin.

## 1. Simpan source di GitHub

Gunakan repository **private**. `.env`, `.env.production`, database SQLite, log,
dependency, dan hasil build sudah dikecualikan dari Git/Docker image.

Jalankan dari komputer pengembangan:

```bash
git init
git add .
git commit -m "Prepare RumahKas production deployment"
git branch -M main
git remote add origin git@github.com:USERNAME/rumahkas.git
git push -u origin main
```

Sebelum `git add`, tetap periksa `git status` dan pastikan tidak ada secret atau
backup pengguna. Untuk server, gunakan SSH deploy key repository dengan akses
read-only. Jangan menyalin private key pribadi dari komputer pengembangan.

## 2. Persiapan server pertama kali

Prasyarat server:

- Docker Engine dan Docker Compose v2;
- Git;
- `cloudflared`/Cloudflare Tunnel yang sudah aktif;
- server tidak tidur otomatis saat laptop ditutup atau idle.

Clone menggunakan deploy key server. Pada CasaOS, pisahkan source dan data runtime:

```bash
sudo mkdir -p /DATA/AppData/rumahkas/{storage,mysql,backups}
sudo chown -R "$USER":"$USER" /DATA/AppData/rumahkas
git clone git@github.com:USERNAME/rumahkas.git /DATA/AppData/rumahkas/source
cd /DATA/AppData/rumahkas/source
cp .env.production.example .env.production
chmod 600 .env.production
```

Buat secret acak. Perintah berikut hanya mencetak nilai dan tidak menyimpannya:

```bash
docker run --rm php:8.3-cli php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"
docker run --rm php:8.3-cli php -r "echo bin2hex(random_bytes(32)).PHP_EOL;"
```

Isi `.env.production`:

- `APP_KEY`: hasil perintah pertama;
- `APP_URL`: subdomain HTTPS final, misalnya `https://kas.domainanda.com`;
- `APP_VERSION`: sama dengan `version` di `package.json`;
- `APP_DATA_PATH`: `/DATA/AppData/rumahkas`;
- `DB_PASSWORD` dan `DB_ROOT_PASSWORD`: dua nilai acak berbeda;
- `ADMIN_EMAIL`: email admin sebenarnya;
- biarkan `APP_DEBUG=false` dan `APP_PORT=8080`.

Jangan mengubah `APP_KEY` setelah aplikasi digunakan. Perubahan key akan
merusak cookie/session dan data Laravel yang terenkripsi.

Build dan start:

```bash
docker compose --env-file .env.production -f compose.production.yml build --pull
docker compose --env-file .env.production -f compose.production.yml up -d
docker compose --env-file .env.production -f compose.production.yml ps
curl --fail --head http://127.0.0.1:8080/up
```

`rumahkas-app` dan `rumahkas-web` adalah image lokal yang dibangun dari repository,
bukan image Docker Hub. Jika CasaOS menampilkan `pull access denied`, jangan login
ke Docker Hub. Jalankan build dari folder source:

```bash
docker compose --env-file .env.production -f compose.production.yml build --pull app web
docker image ls | grep rumahkas
docker compose --env-file .env.production -f compose.production.yml up -d
```

Builder frontend memakai Node Debian/glibc dan `npm ci --include=optional` agar
binary native Lightning CSS tersedia pada server CasaOS. Jika sebelumnya build
Alpine gagal pada `lightningcss.*-musl.node`, tarik commit terbaru dan build ulang
dengan `--no-cache`.

Gunakan terminal/SSH untuk stack ini; import Compose pada UI CasaOS dapat mencoba
menarik semua nilai `image:` dari registry dan tidak selalu menjalankan build context.

Entrypoint aplikasi menunggu MySQL, menjalankan migration, lalu membuat cache
konfigurasi, route, event, dan view. Buat admin pertama satu kali:

```bash
docker compose --env-file .env.production -f compose.production.yml exec app \
  php artisan app:create-admin
```

## 3. Hubungkan Cloudflare Tunnel

Periksa dahulu bagaimana `cloudflared` berjalan:

```bash
systemctl is-active cloudflared
docker ps --format '{{.Names}}' | grep -i cloudflared
```

### Tunnel sebagai service Linux

Di Cloudflare Zero Trust, tambahkan **Public Hostname**:

```text
Subdomain: kas
Domain: domainanda.com
Service type: HTTP
URL: localhost:8080
```

### Tunnel sebagai container CasaOS

Di dalam container, `localhost` menunjuk ke container cloudflared sendiri. Hubungkan
container tersebut ke network RumahKas:

```bash
docker network ls | grep rumahkas
docker network connect rumahkas_default NAMA_CONTAINER_CLOUDFLARED
```

Kemudian gunakan `http://web:80` sebagai Service URL Public Hostname. Koneksi manual
ini perlu diulang jika container cloudflared dihapus dan dibuat ulang. Solusi
permanennya adalah mendeklarasikan `rumahkas_default` sebagai external network pada
Compose cloudflared.

Jangan membuka binding RumahKas ke `0.0.0.0` hanya untuk menghubungkan Tunnel;
hal itu membuat origin dapat diakses langsung dari jaringan lokal.

Gunakan HTTPS pada `APP_URL`, aktifkan **Always Use HTTPS**, dan pertahankan SSL/TLS
Cloudflare pada mode Full/Strict untuk origin lain yang menggunakannya. Tunnel ke
localhost tidak memerlukan port router atau port Docker dibuka ke LAN/internet.

Jangan pasang Cloudflare Access pada hostname aplikasi pelanggan karena PWA dan
aktivasi API harus dapat mencapainya langsung. Jika admin perlu proteksi tambahan,
buat kebijakan/path terpisah setelah menguji login dan API klien.

## 4. Verifikasi deployment pertama

```bash
curl --fail --head https://kas.domainanda.com/up
docker compose --env-file .env.production -f compose.production.yml logs --tail=100 app web database
```

Kemudian periksa:

1. login admin pada `/admin/login`;
2. buat pelanggan uji, payment lunas, dan lisensi aktif;
3. lakukan login pertama dari profil browser baru dan buat PIN offline;
4. install PWA, buka semua menu penting, lalu matikan internet dan buka ulang;
5. uji backup serta restore pada profil browser lain;
6. periksa bahwa `/service-worker.js` dan `/release.json` tidak memakai cache lama.

## 5. Deploy pembaruan

Di komputer pengembangan:

```bash
npm run test:js
php artisan test
npm run build
git add .
git commit -m "Release vX.Y.Z"
git push origin main
```

Naikkan `version` di `package.json` untuk perubahan UI/service worker/database lokal,
dan samakan `APP_VERSION` di `.env.production` server. Sebelum deploy, backup MySQL:

```bash
mkdir -p /DATA/AppData/rumahkas/backups
chmod 700 /DATA/AppData/rumahkas/backups
docker compose --env-file .env.production -f compose.production.yml exec -T database \
  sh -c 'exec mysqldump --single-transaction -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > "/DATA/AppData/rumahkas/backups/rumahkas-$(date +%F-%H%M).sql"
```

Deploy commit terbaru:

```bash
git fetch origin
git pull --ff-only origin main
docker compose --env-file .env.production -f compose.production.yml build --pull
docker compose --env-file .env.production -f compose.production.yml up -d --remove-orphans
docker compose --env-file .env.production -f compose.production.yml ps
curl --fail --head http://127.0.0.1:8080/up
```

Folder `/DATA/AppData/rumahkas/mysql` dan `/DATA/AppData/rumahkas/storage` tidak
hilang ketika container diganti. Jangan menghapus kedua folder tersebut saat update.

## 6. Rollback

Catat commit rilis yang sehat sebelum deploy:

```bash
git rev-parse HEAD
```

Jika pembaruan gagal dan migration masih kompatibel ke belakang, checkout commit
sehat lalu build ulang:

```bash
git checkout COMMIT_SEHAT
docker compose --env-file .env.production -f compose.production.yml up -d --build
```

Jika migration mengubah atau menghapus struktur/data, rollback kode saja tidak
cukup. Hentikan aplikasi dan pulihkan dump MySQL yang dibuat sebelum deploy.
Karena itu migration production harus bersifat additive sebisa mungkin.

Setelah stabil, kembali ke branch deployment:

```bash
git switch main
```

## 7. Backup dan operasi rutin

Dump MySQL harus disalin ke media lain secara terenkripsi; backup yang hanya berada
di laptop yang sama bukan backup terhadap kerusakan atau kehilangan laptop.
Jadwalkan minimal backup harian dan uji restore secara berkala.

Perintah pemeriksaan rutin:

```bash
docker compose --env-file .env.production -f compose.production.yml ps
docker compose --env-file .env.production -f compose.production.yml logs --tail=100 app web
docker system df
```

Menghapus image lama aman setelah rilis sehat:

```bash
docker image prune -f
```

Backup MySQL server tidak mencakup keuangan pengguna di IndexedDB. Pengguna tetap
perlu mengunduh backup terenkripsi melalui menu Backup & Restore PWA.
