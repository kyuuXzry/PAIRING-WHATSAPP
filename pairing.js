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
  phone: null,
};

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  gray: '\x1b[90m',
  brightRed: '\x1b[91m', brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m', brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m', brightCyan: '\x1b[96m', brightWhite: '\x1b[97m',
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

function createInlineSpinner(getText) {
  let i = 0, timer = null, stopped = false;
  return {
    start() {
      process.stdout.write('\x1b[?25l');
      timer = setInterval(() => {
        if (stopped) return;
        const f = SPINNER_FRAMES[i++ % SPINNER_FRAMES.length];
        process.stdout.write(`\r\x1b[K  ${color('brightCyan', f)} ${color('gray', getText())}`);
      }, 80);
    },
    update() {},
    stop(finalText = null) {
      stopped = true;
      if (timer) clearInterval(timer);
      process.stdout.write('\r\x1b[K\x1b[?25h');
      if (finalText) console.log(finalText);
    },
  };
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
  return code?.match(/.{1,4}/g)?.join(' ') || code;
}

function counterBar(used, max, width = 20) {
  const filled = Math.min(width, Math.round((used / max) * width));
  const empty = width - filled;
  const barColor = used >= max ? 'brightGreen' : 'brightMagenta';
  return (
    color(barColor, '▰'.repeat(filled)) +
    color('gray', '▱'.repeat(empty)) +
    ' ' +
    color('brightCyan', `${used}/${max}`)
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const logger = P({ level: 'silent' });

function renderHeader(cfg) {
  console.clear();
  const W = 50;
  const line = (l, r) => color('brightCyan', '║') + ' ' + l + ' '.repeat(Math.max(0, W - 2 - stripAnsi(l).length - stripAnsi(r).length)) + r + ' ' + color('brightCyan', '║');
  const empty = color('brightCyan', '║') + ' '.repeat(W) + color('brightCyan', '║');

  const top    = color('brightCyan', '╔' + '═'.repeat(W) + '╗');
  const mid    = color('brightCyan', '╠' + '═'.repeat(W) + '╣');
  const bottom = color('brightCyan', '╚' + '═'.repeat(W) + '╝');

  const title1 = color('bold', color('brightMagenta', 'K Y U U   S P A M'));
  const title2 = color('gray', `WhatsApp Pairing • by ${AUTHOR}`);

  console.log();
  console.log(top);
  console.log(empty);
  console.log(line('', title1));
  console.log(line('', title2));
  console.log(empty);
  console.log(mid);
  console.log(
    color('brightCyan', '║') +
      ' ' +
      color('gray', 'Nomor ') +
      color('brightWhite', (cfg.phone || '-').padEnd(W - 10)) +
      ' ' +
      color('brightCyan', '║')
  );
  console.log(
    color('brightCyan', '║') +
      ' ' +
      color('gray', 'Target ') +
      color('brightYellow', `${cfg.maxPairing}x`.padEnd(6)) +
      color('gray', ' Delay ') +
      color('brightYellow', `${cfg.delayBetween / 1000}s`.padEnd(6)) +
      color('gray', ' Mode ') +
      color('brightGreen', 'SPAM'.padEnd(Math.max(0, W - 36))) +
      ' ' +
      color('brightCyan', '║')
  );
  console.log(bottom);
  console.log();
}

function renderCodeLine(code, index, total) {
  const left = color('gray', `  [${String(index).padStart(2, '0')}/${total}]`);
  const codeBox =
    color('brightGreen', '┌──────────────────┐') +
    '  ' +
    color('dim', color('gray', 'pairing code'));
  const codeLine =
    color('brightGreen', '│') +
    '  ' +
    color('bold', color('brightYellow', code.padEnd(16))) +
    color('brightGreen', '│');
  const codeBottom = color('brightGreen', '└──────────────────┘');
  console.log(left + ' ' + codeBox);
  console.log('       ' + codeLine);
  console.log('       ' + codeBottom);
}

async function singlePairing(cfg, phoneNumber, index, total) {
  clearSession();

  const spinner = createInlineSpinner(() => `[${index}/${total}] Menyiapkan session...`);
  spinner.start();

  let sock;
  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version, logger, printQRInTerminal: false,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      browser: ['Ubuntu', 'Chrome', '22.04.4'],
      generateHighQualityLinkPreview: true,
    });
    sock.ev.on('creds.update', saveCreds);

    spinner.stop();

    const codeSpinner = createInlineSpinner(() => `[${index}/${total}] Meminta kode...`);
    codeSpinner.start();

    await new Promise((r) => setTimeout(r, 2200));

    const code = await sock.requestPairingCode(phoneNumber);
    const formatted = formatPairingCode(code);

    codeSpinner.stop();

    renderCodeLine(formatted, index, total);

    try { sock.end(undefined); } catch (_) {}

    console.log(
      '  ' +
        color('brightGreen', '✔') +
        ' ' +
        color('gray', 'Kode terkirim ke ') +
        color('brightWhite', phoneNumber)
    );
    console.log();

    return { result: 'sent', code: formatted };
  } catch (err) {
    spinner.stop();
    try { sock?.end(undefined); } catch (_) {}

    console.log(
      '  ' +
        color('brightRed', '✖') +
        ' ' +
        color('gray', `[${index}/${total}] Gagal: `) +
        color('brightRed', err.message)
    );
    console.log();

    return { result: 'error', error: err.message };
  }
}

async function countdownInline(seconds, label) {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(
      `\r\x1b[K  ${color('brightYellow', '◷')} ${color('gray', label)} ${color('brightCyan', String(i) + 's')}  `
    );
    await sleep(1000);
  }
  process.stdout.write('\r\x1b[K');
}

async function runContinuousPairing(state) {
  const cfg = state.cfg;

  if (!cfg.phone) {
    console.log();
    let cleanNumber = null;
    while (!cleanNumber) {
      const input = await prompt(
        '  ' + color('brightYellow', '❯') + color('gray', ' Nomor target: ')
      );
      cleanNumber = validateNumber(input);
      if (!cleanNumber) console.log('  ' + color('brightRed', '✖ Nomor tidak valid'));
    }
    cfg.phone = cleanNumber;
    saveConfig(cfg);
    console.log();
  }

  const totalToRun = cfg.maxPairing - state.used;
  if (totalToRun <= 0) {
    console.log('  ' + color('brightRed', '✖ Batas pairing tercapai'));
    console.log();
    return;
  }

  console.log(
    '  ' +
      color('brightYellow', '⚡') +
      ' ' +
      color('brightWhite', `Mulai pairing beruntun `) +
      color('brightCyan', `${totalToRun}x`) +
      color('gray', ` ke ${cfg.phone}`)
  );
  console.log('  ' + color('gray', '─'.repeat(50)));
  console.log();

  const results = [];
  const startTime = Date.now();

  for (let i = state.used + 1; i <= cfg.maxPairing; i++) {
    const res = await singlePairing(cfg, cfg.phone, i, cfg.maxPairing);
    results.push({ index: i, ...res });
    state.used++;

    if (i < cfg.maxPairing && cfg.delayBetween > 0) {
      await countdownInline(Math.round(cfg.delayBetween / 1000), 'Pairing berikutnya dalam');
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const successCount = results.filter((r) => r.result === 'sent').length;
  const failedCount = results.length - successCount;

  console.log();
  console.log('  ' + color('brightMagenta', '═'.repeat(50)));
  console.log(
    '  ' +
      color('bold', color('brightMagenta', '  S E L E S A I  ')) +
      color('gray', ` (${elapsed}s)`)
  );
  console.log('  ' + color('brightMagenta', '═'.repeat(50)));
  console.log();
  console.log('  ' + color('gray', 'Nomor      : ') + color('brightWhite', cfg.phone));
  console.log('  ' + color('gray', 'Total      : ') + color('brightYellow', `${results.length}x`));
  console.log(
    '  ' +
      color('gray', 'Berhasil   : ') +
      color('brightGreen', `${successCount}x`) +
      color('gray', '   Gagal : ') +
      color('brightRed', `${failedCount}x`)
  );
  console.log();
  console.log('  ' + color('gray', 'Progress   : ') + counterBar(state.used, cfg.maxPairing));
  console.log();
}

async function settingsMenu(state) {
  const cfg = state.cfg;

  while (true) {
    renderHeader(cfg);

    console.log('  ' + color('bold', color('brightCyan', 'PENGATURAN')));
    console.log('  ' + color('gray', '─'.repeat(50)));
    console.log();
    console.log(`  ${color('brightMagenta', '1')}  Target pairing   ${color('brightWhite', cfg.maxPairing + 'x')}`);
    console.log(`  ${color('brightMagenta', '2')}  Delay antar      ${color('brightWhite', cfg.delayBetween / 1000 + 's')}`);
    console.log(`  ${color('brightMagenta', '3')}  Nomor target     ${color('brightWhite', cfg.phone || '-')}`);
    console.log(`  ${color('brightMagenta', '4')}  Reset ke default`);
    console.log(`  ${color('brightMagenta', '0')}  Kembali`);
    console.log();

    const choice = await prompt('  ' + color('brightYellow', '❯') + ' ');

    if (choice === '1') {
      const input = await prompt(`\n  ${color('gray', `Target baru (1-1000, sekarang ${cfg.maxPairing}):`)} `);
      const val = parseInt(input, 10);
      if (isNaN(val) || val < 1 || val > 1000) {
        console.log('  ' + color('brightRed', '✖ Angka tidak valid (1-1000)'));
      } else {
        cfg.maxPairing = val;
        if (state.used > val) state.used = val;
        saveConfig(cfg);
        console.log('  ' + color('brightGreen', `✔ Target diubah jadi ${val}x`));
      }
    } else if (choice === '2') {
      const input = await prompt(`\n  ${color('gray', `Delay baru (5-600 detik, sekarang ${cfg.delayBetween / 1000}):`)} `);
      const val = parseInt(input, 10);
      if (isNaN(val) || val < 5 || val > 600) {
        console.log('  ' + color('brightRed', '✖ Angka tidak valid (5-600)'));
      } else {
        cfg.delayBetween = val * 1000;
        saveConfig(cfg);
        console.log('  ' + color('brightGreen', `✔ Delay diubah jadi ${val} detik`));
      }
    } else if (choice === '3') {
      const input = await prompt(`\n  ${color('gray', 'Nomor baru (kosongkan untuk hapus):')} `);
      if (input === '') {
        cfg.phone = null;
        saveConfig(cfg);
        console.log('  ' + color('brightGreen', '✔ Nomor target dihapus'));
      } else {
        const validated = validateNumber(input);
        if (validated) {
          cfg.phone = validated;
          saveConfig(cfg);
          console.log('  ' + color('brightGreen', `✔ Nomor target: ${validated}`));
        } else {
          console.log('  ' + color('brightRed', '✖ Nomor tidak valid'));
        }
      }
    } else if (choice === '4') {
      const confirm = await prompt(`\n  ${color('brightYellow', '⚠')} ${color('gray', 'Reset ke default? (y/n):')} `);
      if (confirm.toLowerCase() === 'y') {
        state.cfg = { ...DEFAULT_CONFIG, phone: cfg.phone };
        saveConfig(state.cfg);
        console.log('  ' + color('brightGreen', '✔ Direset (nomor tetap)'));
      } else {
        console.log('  ' + color('gray', 'Dibatalkan'));
      }
    } else if (choice === '0') {
      return;
    } else {
      console.log('  ' + color('brightRed', '✖ Pilihan tidak valid'));
    }

    await prompt('\n  ' + color('gray', 'Tekan Enter...'));
  }
}

async function mainMenu() {
  const state = { used: 0, cfg: loadConfig() };

  while (true) {
    const cfg = state.cfg;
    renderHeader(cfg);

    const limitReached = state.used >= cfg.maxPairing;

    console.log('  ' + color('bold', color('brightCyan', 'MENU')));
    console.log('  ' + color('gray', '─'.repeat(50)));
    console.log();
    if (limitReached) {
      console.log(`  ${color('gray', '1')}  ${color('gray', 'Pairing beruntun (LIMIT)')}`);
    } else {
      console.log(`  ${color('brightMagenta', '1')}  Pairing beruntun  ${color('gray', `(sisa ${cfg.maxPairing - state.used}x)`)}`);
    }
    console.log(`  ${color('brightMagenta', '2')}  Pairing sekali`);
    console.log(`  ${color('brightMagenta', '3')}  Pengaturan`);
    console.log(`  ${color('brightMagenta', '4')}  Reset session`);
    console.log(`  ${color('brightMagenta', '5')}  Cek status session`);
    console.log(`  ${color('brightMagenta', '6')}  Reset counter`);
    console.log(`  ${color('brightMagenta', '0')}  Keluar`);
    console.log();
    console.log('  ' + color('dim', color('gray', `${BRAND} • by ${AUTHOR}`)));
    console.log();

    const choice = await prompt('  ' + color('brightYellow', '❯') + color('gray', ' Pilih menu: '));
    console.log();

    if (choice === '1') {
      await runContinuousPairing(state);
      await prompt('  ' + color('gray', 'Tekan Enter untuk kembali...'));
    } else if (choice === '2') {
      if (state.used >= cfg.maxPairing) {
        console.log('  ' + color('brightRed', '✖ Limit tercapai'));
        console.log();
      } else {
        if (!cfg.phone) {
          let phone = null;
          while (!phone) {
            const input = await prompt('  ' + color('gray', 'Nomor HP target: '));
            phone = validateNumber(input);
            if (!phone) console.log('  ' + color('brightRed', '✖ Nomor tidak valid'));
          }
          cfg.phone = phone;
          saveConfig(cfg);
        }
        state.used++;
        const res = await singlePairing(cfg, cfg.phone, state.used, cfg.maxPairing);
        console.log();
        console.log(
          '  ' +
            (res.result === 'sent'
              ? color('brightGreen', '✔ Kode terkirim')
              : color('brightRed', `✖ Gagal: ${res.error || 'unknown'}`))
        );
        console.log();
      }
      await prompt('  ' + color('gray', 'Tekan Enter untuk kembali...'));
    } else if (choice === '3') {
      await settingsMenu(state);
    } else if (choice === '4') {
      const confirm = await prompt('  ' + color('brightYellow', '⚠') + color('gray', ' Hapus session? (y/n): '));
      if (confirm.toLowerCase() === 'y') {
        clearSession();
        console.log('  ' + color('brightGreen', '✔ Session dihapus'));
      } else {
        console.log('  ' + color('gray', 'Dibatalkan'));
      }
      console.log();
      await prompt('  ' + color('gray', 'Tekan Enter untuk kembali...'));
    } else if (choice === '5') {
      console.log('  ' + color('bold', color('brightCyan', 'STATUS SESSION')));
      console.log('  ' + color('gray', '─'.repeat(50)));
      console.log();
      const exists = fs.existsSync(`${SESSION_DIR}/creds.json`);
      if (exists) {
        try {
          const creds = JSON.parse(fs.readFileSync(`${SESSION_DIR}/creds.json`, 'utf-8'));
          const me = creds?.me;
          console.log('  ' + color('brightGreen', '✔') + color('gray', ' Session ditemukan'));
          if (me) {
            console.log('  ' + color('gray', 'Nomor  ') + color('brightWhite', me.id?.split(':')[0] || '-'));
            console.log('  ' + color('gray', 'Nama   ') + color('brightWhite', me.name || '-'));
          } else {
            console.log('  ' + color('gray', 'Session belum terpasang ke nomor'));
          }
        } catch (_) {
          console.log('  ' + color('brightYellow', '⚠') + color('gray', ' Creds tidak bisa diparse'));
        }
      } else {
        console.log('  ' + color('brightYellow', '⚠') + color('gray', ' Session belum ada'));
      }
      console.log('  ' + color('gray', 'Counter ') + color('brightCyan', `${state.used}/${cfg.maxPairing}`));
      console.log();
      await prompt('  ' + color('gray', 'Tekan Enter untuk kembali...'));
    } else if (choice === '6') {
      state.used = 0;
      console.log('  ' + color('brightGreen', '✔ Counter direset'));
      console.log();
      await prompt('  ' + color('gray', 'Tekan Enter untuk kembali...'));
    } else if (choice === '0') {
      console.log('  ' + color('brightMagenta', `Keluar... ${BRAND} by ${AUTHOR}`));
      process.exit(0);
    } else {
      console.log('  ' + color('brightRed', '✖ Pilihan tidak valid'));
      await sleep(500);
    }
    console.log();
  }
}

process.on('SIGINT', () => {
  process.stdout.write('\x1b[?25h');
  console.log();
  console.log('  ' + color('brightYellow', 'Keluar...'));
  process.exit(0);
});

mainMenu().catch((err) => {
  process.stdout.write('\x1b[?25h');
  console.error('  ' + color('brightRed', `ERROR: ${err.message}`));
  process.exit(1);
});