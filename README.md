<div align="center">

<br/>

<img src="assets/whatsapp.svg" width="120" height="120" alt="WhatsApp"/>

# KYUU PAIR

**WhatsApp Pairing CLI interaktif**

Request pairing code lewat terminal, dengan pairing beruntun ke nomor yang sama.<br/>
Counter, delay, dan timeout bisa diatur sendiri.

<br/>

<a href="https://github.com/kyuuXzry/PAIRING-WHATSAPP/stargazers"><img src="https://img.shields.io/github/stars/kyuuXzry/PAIRING-WHATSAPP?style=flat-square&logo=github&logoColor=16A34A&labelColor=F0FDF4&color=25D366" alt="Stars"/></a>
<a href="https://github.com/kyuuXzry/PAIRING-WHATSAPP/network/members"><img src="https://img.shields.io/github/forks/kyuuXzry/PAIRING-WHATSAPP?style=flat-square&logo=github&logoColor=16A34A&labelColor=F0FDF4&color=25D366" alt="Forks"/></a>
<img src="https://img.shields.io/badge/Node.js-18%2B-25D366?style=flat-square&logo=nodedotjs&logoColor=16A34A&labelColor=F0FDF4" alt="Node.js"/>
<img src="https://img.shields.io/badge/Pairing-Code%20%7C%20No%20QR-25D366?style=flat-square&logo=whatsapp&logoColor=16A34A&labelColor=F0FDF4" alt="Pairing Code"/>
<img src="https://img.shields.io/badge/Termux-Ready-25D366?style=flat-square&logo=android&logoColor=16A34A&labelColor=F0FDF4" alt="Termux"/>
<img src="https://img.shields.io/badge/License-ISC-25D366?style=flat-square&logo=opensourceinitiative&logoColor=16A34A&labelColor=F0FDF4" alt="License"/>

<br/><br/>

<a href="#fitur">Fitur</a> ·
<a href="#instalasi">Instalasi</a> ·
<a href="#cara-pakai">Cara Pakai</a> ·
<a href="#konfigurasi">Konfigurasi</a> ·
<a href="#peringatan">Peringatan</a>

<br/><br/>

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:DCFCE7,50:25D366,100:DCFCE7&height=3" width="100%"/>

</div>

<br/>

## Fitur

<table width="100%">
<tr>
<td width="33%" valign="top" align="center">
<img src="https://cdn.simpleicons.org/whatsapp/25D366" width="34" height="34" alt="Pairing via Code"/><br/>
<b>Pairing via Code</b><br/>
<sub>Tanpa scan QR</sub>
</td>
<td width="33%" valign="top" align="center">
<img src="https://cdn.simpleicons.org/githubactions/16A34A" width="34" height="34" alt="Pairing Beruntun"/><br/>
<b>Pairing Beruntun</b><br/>
<sub>Default 10x, bisa sampai 1000x</sub>
</td>
<td width="33%" valign="top" align="center">
<img src="https://cdn.simpleicons.org/clockify/16A34A" width="34" height="34" alt="Delay dan Timeout"/><br/>
<b>Delay & Timeout</b><br/>
<sub>Bisa diatur mulai 5 detik</sub>
</td>
</tr>
<tr>
<td width="33%" valign="top" align="center">
<img src="https://cdn.simpleicons.org/chartdotjs/16A34A" width="34" height="34" alt="Counter Visual"/><br/>
<b>Counter Visual</b><br/>
<sub>Progress bar tiap pairing</sub>
</td>
<td width="33%" valign="top" align="center">
<img src="https://cdn.simpleicons.org/json/16A34A" width="34" height="34" alt="Config Persisten"/><br/>
<b>Config Persisten</b><br/>
<sub>Tersimpan di <code>config.json</code></sub>
</td>
<td width="33%" valign="top" align="center">
<img src="https://cdn.simpleicons.org/gnubash/16A34A" width="34" height="34" alt="Menu Interaktif"/><br/>
<b>Menu Interaktif</b><br/>
<sub>Ulangi pairing tanpa restart</sub>
</td>
</tr>
</table>

Ada juga animasi terminal (spinner, progress bar, box border, typewriter) dan auto-install dependency saat `npm start` lewat `prestart.js`.

## Instalasi

**Prasyarat**

| Kebutuhan | Keterangan |
| :-- | :-- |
| **Node.js 18+** | Disarankan LTS v20 atau v22 |
| **npm** | Ikut terinstall bareng Node.js |
| **Termux** (Android) | Atau terminal Linux / macOS / Windows |

**Langkah**

**1. Siapkan Termux** (lewati kalau pakai Linux / macOS / Windows yang sudah ada Git dan Node.js)

```bash
pkg update -y && pkg upgrade -y && pkg install git nodejs-lts -y && termux-setup-storage
```

Perintah ini meng-update paket, meng-install Git dan Node.js LTS, lalu meminta izin akses penyimpanan. Izinkan saat muncul popup.

**2. Clone repository**

```bash
git clone https://github.com/kyuuXzry/PAIRING-WHATSAPP.git
```

**3. Masuk ke folder project**

```bash
cd PAIRING-WHATSAPP
```

**4. Jalankan**

```bash
npm start
```

`npm start` otomatis menjalankan `prestart.js`, yang meng-install dependency kalau belum ada.

<details>
<summary><b>Node.js error di Termux</b></summary>
<br/>

Cek dulu versinya:

```bash
node -v
```

Pastikan versinya `v18` ke atas. Kalau masih `v24` dan error, downgrade:

```bash
pkg uninstall nodejs -y
pkg install nodejs-lts -y
```

</details>

## Cara Pakai

Setelah `npm start`, muncul menu:

```text
[1] Pairing beruntun
[2] Pairing sekali jalan
[3] Pengaturan (target, delay, timeout, nomor)
[4] Reset session (hapus kredensial)
[5] Cek status session
[6] Reset counter pairing
[0] Keluar
```

**Alur pairing beruntun**

| Langkah | Keterangan |
| :-: | :-- |
| 1 | Pilih menu `[1]` |
| 2 | Masukkan nomor HP target (format internasional tanpa `+`, contoh `6281234567890`) |
| 3 | Konfirmasi jumlah dan delay |
| 4 | Script request kode pairing, lalu menampilkannya |
| 5 | Masukkan kode di WhatsApp HP: **Perangkat Tertaut → Tautkan Perangkat → Tautkan dengan nomor telepon** |
| 6 | Tunggu konfirmasi atau timeout |
| 7 | Setelah delay, pairing berikutnya jalan otomatis |

**Format nomor**

| Format | Status |
| :-- | :-- |
| `6281234567890` | Benar |
| `+6281234567890` | Salah |
| `081234567890` | Salah |
| `628 1234 5678 90` | Salah |

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
| :-- | :-- | :-- | :-- |
| `maxPairing` | `10` | 1 - 1000 | Jumlah pairing beruntun |
| `delayBetween` | `5000` | 5 - 600 detik | Jeda antar pairing (`5000` = 5 detik) |
| `timeoutPerCode` | `5000` | 5 - 600 detik | Batas waktu menunggu kode dimasukkan |
| `phone` | `null` | nomor valid | Nomor target, disimpan otomatis |

Ubah lewat menu `[3] Pengaturan` atau edit `config.json` langsung.

## Struktur Project

```text
PAIRING-WHATSAPP
├── assets/
│   └── whatsapp.svg
├── package.json
├── prestart.js      # Auto-install dependency
├── pairing.js       # Main script
├── config.json      # Setting (auto-generated)
├── session/         # Kredensial WhatsApp (auto-generated)
└── node_modules/    # Dependency (auto-generated)
```

## Peringatan

> [!WARNING]
> Pairing berulang ke nomor yang sama bisa memicu rate-limit. Server WhatsApp punya sistem anti-abuse. Delay minimal 5 detik, disarankan 15 sampai 30 detik. Nomor juga bisa kena flag kalau terlalu sering request pairing dalam waktu singkat.

> [!IMPORTANT]
> Gunakan hanya untuk nomor milik sendiri. Setiap request pairing code ke sebuah nomor memunculkan notifikasi di WhatsApp pemilik nomor itu.

- **Kode pairing tidak bisa di-custom.** Kode 8 digit di-generate oleh server WhatsApp, bukan oleh script.
- **Jangan share folder `session/`**, karena berisi kredensial WhatsApp.
- **Jangan share `config.json`**, karena berisi nomor HP target.

## Tech Stack

<div align="center">

<img src="https://cdn.simpleicons.org/nodedotjs/5FA04E" width="44" height="44" alt="Node.js" title="Node.js"/>&nbsp;&nbsp;&nbsp;<img src="https://cdn.simpleicons.org/npm/CB3837" width="44" height="44" alt="npm" title="npm"/>&nbsp;&nbsp;&nbsp;<img src="https://cdn.simpleicons.org/whatsapp/25D366" width="44" height="44" alt="WhatsApp" title="WhatsApp"/>&nbsp;&nbsp;&nbsp;<img src="https://cdn.simpleicons.org/gnubash/4EAA25" width="44" height="44" alt="Terminal" title="Terminal"/>

<sub>Node.js · npm · WhatsApp · Terminal</sub>

<br/><br/>

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:DCFCE7,50:25D366,100:DCFCE7&height=3" width="100%"/>

<br/>

**Hubungi Saya** · KyuuXzry

<a href="https://kyuudev.my.id"><img src="https://img.shields.io/badge/Website-kyuudev.my.id-25D366?style=flat-square&logo=googlechrome&logoColor=16A34A&labelColor=F0FDF4" alt="Website"/></a>
<a href="https://wa.me/628567126744"><img src="https://img.shields.io/badge/WhatsApp-Hubungi-25D366?style=flat-square&logo=whatsapp&logoColor=16A34A&labelColor=F0FDF4" alt="WhatsApp"/></a>
<a href="https://instagram.com/rissxzry_"><img src="https://img.shields.io/badge/Instagram-Follow-25D366?style=flat-square&logo=instagram&logoColor=16A34A&labelColor=F0FDF4" alt="Instagram"/></a>
<a href="https://www.linkedin.com/in/rizki-handayani-22068538b"><img src="https://img.shields.io/badge/LinkedIn-Connect-25D366?style=flat-square&logo=linkedin&logoColor=16A34A&labelColor=F0FDF4" alt="LinkedIn"/></a>
<a href="mailto:rzkhandayni.id@gmail.com"><img src="https://img.shields.io/badge/Email-Kirim%20Email-25D366?style=flat-square&logo=gmail&logoColor=16A34A&labelColor=F0FDF4" alt="Email"/></a>
<a href="https://github.com/kyuuXzry"><img src="https://img.shields.io/badge/GitHub-kyuuXzry-25D366?style=flat-square&logo=github&logoColor=16A34A&labelColor=F0FDF4" alt="GitHub"/></a>

<br/>

<sub>ISC License © KyuuXzry</sub>

</div>
