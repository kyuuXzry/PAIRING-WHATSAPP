const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const P = require('pino');
const readline = require('readline');
const fs = require('fs');

const SESSION_DIR = './session';
const CONFIG_FILE = './config.json';
const BRAND = 'KYUU SPAM';
const AUTHOR = 'KyuuXzry';

const DEFAULT_CONFIG = {
  maxPairing: 10,
  delayBetween: 5000,
  timeoutPerCode: 5000,
  phone: null,
};

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m',
  white: '\x1b[37m', gray: '\x1b[90m',
};

const color = (c, t) => `${C[c]}${t}${C.reset}`;
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...raw };
    } catch (_) {
      return { ...DEFAULT_CONFIG };
    }
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}

function createSpinner(text) {
  let i = 0, timer = null;
  return {
    start() {
      process.stdout.write('\x1b[?25l');
      timer = setInterval(() => {
        const frame = SPINNER_FRAMES[i++ % SPINNER_FRAMES.length];
        process.stdout.write(`\r${color('cyan', frame)} ${text}`);
      }, 80);
    },
    stop(finalText = null) {
      if (timer) clearInterval(timer);
      process.stdout.write('\r\x1b[K\x1b[?25h');
      if (finalText) console.log(finalText);
    },
  };
}

function progressBar(percent, width = 30) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `${color('green', '█'.repeat(filled))}${color('gray', '░'.repeat(empty))} ${color('cyan', Math.round(percent) + '%')}`;
}

function animateProgress(label, duration = 1000) {
  return new Promise((resolve) => {
    let progress = 0;
    const steps = 40;
    const interval = duration / steps;
    process.stdout.write('\x1b[?25l');
    const timer = setInterval(() => {
      progress += 100 / steps;
      if (progress >= 100) {
        progress = 100;
        process.stdout.write(`\r\x1b[K  ${label} ${progressBar(progress)}\x1b[?25h\n`);
        clearInterval(timer);
        resolve();
      } else {
        process.stdout.write(`\r\x1b[K  ${label} ${progressBar(progress)}`);
      }
    }, interval);
  });
}

function box(lines, colorName = 'cyan') {
  const width = Math.max(...lines.map((l) => stripAnsi(l).length)) + 4;
  const top = '┌' + '─'.repeat(width - 2) + '┐';
  const bottom = '└' + '─'.repeat(width - 2) + '┘';
  console.log(color(colorName, top));
  for (const line of lines) {
    const pad = ' '.repeat(width - 2 - stripAnsi(line).length - 1);
    console.log(color(colorName, '│') + ' ' + line + pad + color(colorName, '│'));
  }
  console.log(color(colorName, bottom));
}

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (a) => { rl.close(); resolve(a.trim()); });
  });
}

function clearSession() {
  if (fs.existsSync(SESSION_DIR)) fs.rmSync(SESSION_DIR, { recursive: true, force: true });
}

function validateNumber(num) {
  if (!num) return null;
  const clean = num.replace(/[^0-9]/g, '');
  return clean.length < 10 ? null : clean;
}

function formatPairingCode(code) {
  return code?.match(/.{1,4}/g)?.join('-') || code;
}

function counterBar(used, max) {
  const width = 20;
  const filled = Math.min(width, Math.round((used / max) * width));
  const empty = width - filled;
  return (
    color(used >= max ? 'red' : 'magenta', '█'.repeat(filled)) +
    color('gray', '░'.repeat(empty)) +
    ` ${color('cyan', `${used}/${max}`)}`
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function countdown(seconds, label) {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r${color('yellow', '  ' + label)} ${color('cyan', String(i) + 's')}   `);
    await sleep(1000);
  }
  process.stdout.write('\r\x1b[K');
}

const logger = P({ level: 'silent' });

async function printBanner(cfg, usedCount) {
  console.clear();
  const lines = [
    color('magenta', '╔══════════════════════════════════════════╗'),
    color('magenta', '║') + color('bold', color('magenta', `     ${BRAND.padEnd(32)}`)) + color('magenta', '║'),
    color('magenta', '║') + color('gray', '     WhatsApp Pairing CLI                ') + color('magenta', '║'),
    color('magenta', '║') + color('gray', `     by ${AUTHOR.padEnd(31)}`) + color('magenta', '║'),
    color('magenta', '╚══════════════════════════════════════════╝'),
    '',
    `  ${color('gray', 'Nomor target :')} ${color('white', cfg.phone || '-')}`,
    `  ${color('gray', 'Target       :')} ${color('white', cfg.maxPairing + 'x')}`,
    `  ${color('gray', 'Delay        :')} ${color('white', cfg.delayBetween / 1000 + 's')}`,
    `  ${color('gray', 'Timeout kode :')} ${color('white', cfg.timeoutPerCode / 1000 + 's')}`,
    `  ${color('gray', 'Counter      :')} ${counterBar(usedCount, cfg.maxPairing)}`,
  ];
  for (const l of lines) {
    console.log(l);
    await sleep(25);
  }
  console.log();
}

async function singlePairing(cfg, phoneNumber, index, total) {
  clearSession();

  const spinner = createSpinner('Memuat session auth...');
  spinner.start();
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();
  spinner.stop(color('green', '  [OK] Session auth dimuat'));

  const sock = makeWASocket({
    version, logger, printQRInTerminal: false,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    browser: ['Ubuntu', 'Chrome', '22.04.4'],
    generateHighQualityLinkPreview: true,
  });
  sock.ev.on('creds.update', saveCreds);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      try { sock.end(undefined); } catch (_) {}
      resolve(result);
    };

    const codeSpinner = createSpinner('Meminta pairing code...');
    codeSpinner.start();

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        const formatted = formatPairingCode(code);
        codeSpinner.stop(color('green', '  [OK] Pairing code diterima'));
        console.log();

        box(
          [
            color('bold', color('magenta', `       ${BRAND} — PAIRING ${index}/${total}`)),
            color('dim', color('gray', `       by ${AUTHOR}`)),
            '',
            color('gray', '  ─────────────────────────────'),
            '',
            color('bold', color('green', `       ${formatted}`)),
            '',
            color('gray', '  ─────────────────────────────'),
          ],
          'magenta'
        );
        console.log();

        const waitSpinner = createSpinner('Menunggu konfirmasi dari HP...');
        waitSpinner.start();

        const timeout = setTimeout(() => {
          waitSpinner.stop(color('yellow', `  [TIMEOUT] Pairing ${index}/${total} expired`));
          finish('timeout');
        }, cfg.timeoutPerCode);

        sock.ev.on('connection.update', (update) => {
          const { connection, lastDisconnect } = update;

          if (connection === 'open') {
            clearTimeout(timeout);
            waitSpinner.stop(color('green', `  [OK] Pairing ${index}/${total} BERHASIL terhubung`));
            console.log();
            finish('success');
          }

          if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            clearTimeout(timeout);
            waitSpinner.stop(color('red', `  [X] Pairing ${index}/${total} gagal (code: ${code})`));
            console.log();
            finish('closed');
          }
        });
      } catch (err) {
        codeSpinner.stop(color('red', '  [X] Gagal request pairing code'));
        console.log(color('red', `  ${err.message}`));
        finish('error');
      }
    }, 2500);
  });
}

async function runContinuousPairing(state) {
  const cfg = state.cfg;
  await printBanner(cfg, state.used);

  if (!cfg.phone) {
    let cleanNumber = null;
    while (!cleanNumber) {
      const input = await prompt(color('cyan', '  Masukkan nomor HP target (contoh: 6281234567890): '));
      cleanNumber = validateNumber(input);
      if (!cleanNumber) console.log(color('red', '  Nomor tidak valid, coba lagi.\n'));
    }
    cfg.phone = cleanNumber;
    saveConfig(cfg);
  }

  const totalToRun = cfg.maxPairing - state.used;
  if (totalToRun <= 0) {
    box(
      [
        color('bold', color('red', '     BATAS PAIRING TERCAPAI')),
        '',
        color('gray', `  Nomor target: ${color('white', cfg.phone)}`),
        color('gray', `  Sudah pairing ${color('yellow', cfg.maxPairing + 'x')} dalam sesi ini`),
        '',
        color('dim', '  Ubah target lewat menu [3] atau reset counter lewat [6].'),
      ],
      'red'
    );
    console.log();
    return;
  }

  console.log();
  box(
    [
      color('bold', color('cyan', '     KONFIRMASI PAIRING BERUNTUN')),
      '',
      color('gray', '  Nomor target : ') + color('white', cfg.phone),
      color('gray', '  Akan pairing : ') + color('yellow', `${totalToRun}x lagi`),
      color('gray', '  Target total : ') + color('yellow', `${cfg.maxPairing}x`),
      color('gray', '  Delay antar  : ') + color('yellow', `${cfg.delayBetween / 1000} detik`),
      color('gray', '  Timeout kode : ') + color('yellow', `${cfg.timeoutPerCode / 1000} detik`),
    ],
    'cyan'
  );
  console.log();

  const confirm = await prompt(color('yellow', '  Lanjutkan? (y/n): '));
  if (confirm.toLowerCase() !== 'y') {
    console.log(color('gray', '  Dibatalkan\n'));
    return;
  }
  console.log();

  const results = [];

  for (let i = state.used + 1; i <= cfg.maxPairing; i++) {
    await printBanner(cfg, state.used);
    console.log(color('magenta', `  ═══ PAIRING ${i}/${cfg.maxPairing} ═══`));
    console.log();

    const result = await singlePairing(cfg, cfg.phone, i, cfg.maxPairing);
    results.push({ index: i, result });
    state.used++;

    if (result === 'success') {
      console.log(color('green', `  Pairing ${i} berhasil. Nomor ${cfg.phone} sudah tertaut.`));
      console.log(color('gray', '  Lanjut ke pairing berikutnya...\n'));
    } else {
      console.log(color('yellow', `  Pairing ${i} selesai dengan status: ${result}\n`));
    }

    if (i < cfg.maxPairing && cfg.delayBetween > 0) {
      console.log(color('gray', `  Delay ${cfg.delayBetween / 1000} detik sebelum pairing berikutnya...`));
      await countdown(Math.round(cfg.delayBetween / 1000), 'Pairing berikutnya dalam');
      console.log();
    }
  }

  await printBanner(cfg, state.used);
  box(
    [
      color('bold', color('green', '     SESI PAIRING SELESAI')),
      '',
      color('gray', '  Nomor target : ') + color('white', cfg.phone),
      color('gray', '  Total        : ') + color('white', String(results.length) + 'x'),
      color('gray', '  Berhasil     : ') + color('green', String(results.filter((r) => r.result === 'success').length)),
      color('gray', '  Gagal/Timeout: ') + color('red', String(results.filter((r) => r.result !== 'success').length)),
      '',
      ...results.map(
        (r) =>
          color('gray', `  [${String(r.index).padStart(2, '0')}] `) +
          (r.result === 'success' ? color('green', 'SUCCESS') : color('red', r.result.toUpperCase()))
      ),
    ],
    'green'
  );
  console.log();
}

async function settingsMenu(state) {
  const cfg = state.cfg;

  while (true) {
    await printBanner(cfg, state.used);

    console.log(color('bold', '  PENGATURAN'));
    console.log(color('gray', '  ─────────────────────────────'));
    console.log(`  ${color('magenta', '[1]')} Target pairing  : ${color('white', cfg.maxPairing + 'x')}`);
    console.log(`  ${color('magenta', '[2]')} Delay antar     : ${color('white', cfg.delayBetween / 1000 + 's')}`);
    console.log(`  ${color('magenta', '[3]')} Timeout kode    : ${color('white', cfg.timeoutPerCode / 1000 + 's')}`);
    console.log(`  ${color('magenta', '[4]')} Nomor target    : ${color('white', cfg.phone || '-')}`);
    console.log(`  ${color('magenta', '[5]')} Reset ke default`);
    console.log(`  ${color('magenta', '[0]')} Kembali`);
    console.log(color('gray', '  ─────────────────────────────'));
    console.log();

    const choice = await prompt(color('cyan', '  Pilih: '));
    console.log();

    if (choice === '1') {
      const input = await prompt(color('cyan', `  Target pairing baru (1-1000, sekarang ${cfg.maxPairing}): `));
      const val = parseInt(input, 10);
      if (isNaN(val) || val < 1 || val > 1000) {
        console.log(color('red', '  Angka tidak valid (1-1000)\n'));
      } else {
        cfg.maxPairing = val;
        if (state.used > val) state.used = val;
        saveConfig(cfg);
        console.log(color('green', `  [OK] Target pairing diubah jadi ${val}x\n`));
      }
    } else if (choice === '2') {
      const input = await prompt(color('cyan', `  Delay antar pairing dalam detik (5-600, sekarang ${cfg.delayBetween / 1000}): `));
      const val = parseInt(input, 10);
      if (isNaN(val) || val < 5 || val > 600) {
        console.log(color('red', '  Angka tidak valid (5-600)\n'));
      } else {
        cfg.delayBetween = val * 1000;
        saveConfig(cfg);
        console.log(color('green', `  [OK] Delay diubah jadi ${val} detik\n`));
      }
    } else if (choice === '3') {
      const input = await prompt(color('cyan', `  Timeout kode dalam detik (5-600, sekarang ${cfg.timeoutPerCode / 1000}): `));
      const val = parseInt(input, 10);
      if (isNaN(val) || val < 5 || val > 600) {
        console.log(color('red', '  Angka tidak valid (5-600)\n'));
      } else {
        cfg.timeoutPerCode = val * 1000;
        saveConfig(cfg);
        console.log(color('green', `  [OK] Timeout diubah jadi ${val} detik\n`));
      }
    } else if (choice === '4') {
      const input = await prompt(color('cyan', '  Nomor target baru (kosongkan untuk hapus): '));
      if (input === '') {
        cfg.phone = null;
        saveConfig(cfg);
        console.log(color('green', '  [OK] Nomor target dihapus\n'));
      } else {
        const validated = validateNumber(input);
        if (validated) {
          cfg.phone = validated;
          saveConfig(cfg);
          console.log(color('green', `  [OK] Nomor target: ${validated}\n`));
        } else {
          console.log(color('red', '  Nomor tidak valid\n'));
        }
      }
    } else if (choice === '5') {
      const confirm = await prompt(color('yellow', '  Reset semua setting ke default? (y/n): '));
      if (confirm.toLowerCase() === 'y') {
        state.cfg = { ...DEFAULT_CONFIG, phone: cfg.phone };
        saveConfig(state.cfg);
        console.log(color('green', '  [OK] Setting direset (nomor target tetap)\n'));
      } else {
        console.log(color('gray', '  Dibatalkan\n'));
      }
    } else if (choice === '0') {
      return;
    } else {
      console.log(color('red', '  Pilihan tidak valid\n'));
      await sleep(500);
    }

    await prompt(color('gray', '  Tekan Enter...'));
  }
}

async function mainMenu() {
  const state = { used: 0, cfg: loadConfig() };

  while (true) {
    const cfg = state.cfg;
    await printBanner(cfg, state.used);

    const limitReached = state.used >= cfg.maxPairing;

    console.log(color('bold', '  MENU'));
    console.log(color('gray', '  ─────────────────────────────'));
    if (limitReached) {
      console.log(`  ${color('gray', '[1]')} ${color('gray', 'Pairing beruntun (LIMIT)')}`);
    } else {
      console.log(`  ${color('magenta', '[1]')} Pairing beruntun ${color('gray', `(sisa ${cfg.maxPairing - state.used}x)`)}`);
    }
    console.log(`  ${color('magenta', '[2]')} Pairing sekali jalan`);
    console.log(`  ${color('magenta', '[3]')} Pengaturan ${color('gray', '(target, delay, timeout, nomor)')}`);
    console.log(`  ${color('magenta', '[4]')} Reset session (hapus kredensial)`);
    console.log(`  ${color('magenta', '[5]')} Cek status session`);
    console.log(`  ${color('magenta', '[6]')} Reset counter pairing`);
    console.log(`  ${color('magenta', '[0]')} Keluar`);
    console.log(color('gray', '  ─────────────────────────────'));
    console.log(color('dim', color('gray', `  ${BRAND} | by ${AUTHOR}`)));
    console.log();

    const choice = await prompt(color('cyan', '  Pilih menu: '));
    console.log();

    if (choice === '1') {
      await runContinuousPairing(state);
      await prompt(color('gray', '  Tekan Enter untuk kembali ke menu...'));
    } else if (choice === '2') {
      if (state.used >= cfg.maxPairing) {
        console.log(color('red', '  Limit tercapai, reset counter atau ubah target dulu.\n'));
      } else {
        if (!cfg.phone) {
          let phone = null;
          while (!phone) {
            const input = await prompt(color('cyan', '  Nomor HP target: '));
            phone = validateNumber(input);
            if (!phone) console.log(color('red', '  Nomor tidak valid\n'));
          }
          cfg.phone = phone;
          saveConfig(cfg);
        }
        state.used++;
        const result = await singlePairing(cfg, cfg.phone, state.used, cfg.maxPairing);
        console.log(color('gray', `  Status: ${result}\n`));
      }
      await prompt(color('gray', '  Tekan Enter untuk kembali ke menu...'));
    } else if (choice === '3') {
      await settingsMenu(state);
    } else if (choice === '4') {
      const confirm = await prompt(color('yellow', '  Yakin hapus session? (y/n): '));
      if (confirm.toLowerCase() === 'y') {
        clearSession();
        console.log(color('green', '  [OK] Session dihapus\n'));
      } else {
        console.log(color('gray', '  Dibatalkan\n'));
      }
      await prompt(color('gray', '  Tekan Enter untuk kembali ke menu...'));
    } else if (choice === '5') {
      const exists = fs.existsSync(`${SESSION_DIR}/creds.json`);
      if (exists) {
        console.log(color('green', '  [OK] Session ditemukan'));
        try {
          const creds = JSON.parse(fs.readFileSync(`${SESSION_DIR}/creds.json`, 'utf-8'));
          const me = creds?.me;
          if (me) {
            console.log(color('gray', '  Nomor : ') + color('white', me.id?.split(':')[0] || '-'));
            console.log(color('gray', '  Nama  : ') + color('white', me.name || '-'));
          } else {
            console.log(color('gray', '  Session belum terpasang'));
          }
        } catch (_) {
          console.log(color('yellow', '  Creds tidak bisa diparse'));
        }
      } else {
        console.log(color('yellow', '  Session belum ada'));
      }
      console.log(color('gray', '  Counter      : ') + color('white', `${state.used}/${cfg.maxPairing}`));
      console.log();
      await prompt(color('gray', '  Tekan Enter untuk kembali ke menu...'));
    } else if (choice === '6') {
      state.used = 0;
      console.log(color('green', '  [OK] Counter pairing direset\n'));
      await prompt(color('gray', '  Tekan Enter untuk kembali ke menu...'));
    } else if (choice === '0') {
      console.log(color('yellow', `  Keluar... ${BRAND} by ${AUTHOR}`));
      process.exit(0);
    } else {
      console.log(color('red', '  Pilihan tidak valid\n'));
      await sleep(500);
    }
  }
}

process.on('SIGINT', () => {
  process.stdout.write('\x1b[?25h');
  console.log();
  console.log(color('yellow', '  Keluar...'));
  process.exit(0);
});

mainMenu().catch((err) => {
  process.stdout.write('\x1b[?25h');
  console.error(color('red', `  ERROR: ${err.message}`));
  process.exit(1);
});