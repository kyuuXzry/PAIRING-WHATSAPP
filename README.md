# WA Pairing CLI — KYUU SPAM

WhatsApp Pairing CLI interaktif by **KyuuXzry**. Request pairing code via terminal, support pairing beruntun ke nomor yang sama dengan counter, delay, dan timeout yang bisa diatur.

## Fitur

- Pairing via pairing code (tanpa scan QR)
- Pairing beruntun otomatis (default 10x, bisa diubah sampai 1000x)
- Counter progress bar visual
- Delay & timeout bisa diatur mulai **5 detik**
- Config tersimpan di `config.json` (persisten)
- Animasi terminal: spinner, progress bar, box border, typewriter
- Menu interaktif — pairing bisa diulang tanpa restart
- Auto-install dependency saat `npm start` (via `prestart.js`)

## Instalasi

### Prasyarat

- **Node.js 18+** (disarankan LTS v20/v22)
- **npm** (ikut terinstall bareng Node.js)
- **Termux** (Android) atau terminal Linux/macOS/Windows

### Langkah

```bash
git clone https://github.com/USERNAME/wa-pairing.git
cd PAIRING-WHATSAPP
npm start
```

Atau tanpa clone, dari folder project:

```bash
cd ~/PAIRING
npm start
```

`npm start` otomatis menjalankan `prestart.js` yang akan install dependency kalau belum ada.

### Install Node.js di Termux

```bash
pkg update -y && pkg upgrade -y
pkg install nodejs-lts -y
node -v
```

Pastikan versi `v18` ke atas. Kalau masih `v24` dan error, downgrade:

```bash
pkg uninstall nodejs -y
pkg install nodejs-lts -y
```

## Cara Pakai

Setelah `npm start`, muncul menu:

```
[1] Pairing beruntun
[2] Pairing sekali jalan
[3] Pengaturan (target, delay, timeout, nomor)
[4] Reset session (hapus kredensial)
[5] Cek status session
[6] Reset counter pairing
[0] Keluar
```

### Alur pairing beruntun

1. Pilih menu `[1]`
2. Masukkan nomor HP target (format internasional tanpa `+`, contoh `6281234567890`)
3. Konfirmasi jumlah & delay
4. Script request kode pairing → tampilkan
5. Masukkan kode di WhatsApp HP: **Perangkat Tertaut → Tautkan Perangkat → Tautkan dengan nomor telepon**
6. Tunggu konfirmasi atau timeout
7. Delay → lanjut pairing berikutnya otomatis

### Format nomor

| Benar | Salah |
|---|---|
| `6281234567890` | `+6281234567890` |
| `6281234567890` | `081234567890` |
| `6281234567890` | `628 1234 5678 90` |

## Konfigurasi

Setting tersimpan di `config.json`:

```json
{
  "maxPairing": 10,
  "delayBetween": 5000,
  "timeoutPerCode": 5000,
  "phone": "6281234567890"
}
```

| Field | Default | Range | Keterangan |
|---|---|---|---|
| `maxPairing` | `10` | 1–1000 | Jumlah pairing beruntun |
| `delayBetween` | `5000` | **5**–600 detik | Jeda antar pairing |
| `timeoutPerCode` | `5000` | **5**–600 detik | Batas waktu nunggu kode dimasukkan |
| `phone` | `null` | nomor valid | Nomor target (disimpan otomatis) |

Ubah lewat menu `[3] Pengaturan` atau edit `config.json` langsung.

## Struktur Project

```
wa-pairing/
├── package.json
├── prestart.js      # Auto-install dependency
├── pairing.js       # Main script
├── config.json      # Setting (auto-generated)
├── session/         # Kredensial WhatsApp (auto-generated)
└── node_modules/    # Dependency (auto-generated)
```

## Peringatan

- **Kode pairing tidak bisa di-custom.** Kode 8 digit di-generate oleh server WhatsApp, bukan oleh script.
- **Pairing berulang ke nomor sama bisa memicu rate-limit.** Server WhatsApp punya sistem anti-abuse. Delay minimal 5 detik, disarankan 15–30 detik.
- **Nomor bisa kena flag** kalau terlalu sering request pairing dalam waktu singkat.
- **Jangan share folder `session/`** — berisi kredensial WhatsApp.
- **Jangan share `config.json`** — berisi nomor HP target.

## License

ISC © KyuuXzry