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
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', italic: '\x1b[3m',
  underline: '\x1b[4m', blink: '\x1b[5m',
  black: '\x1b[30m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m',
  gray: '\x1b[90m', brightRed: '\x1b[91m', brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m', brightBlue: '\x1b[94m', brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m', brightWhite: '\x1b[97m',
  bgMagenta: '\x1b[45m', bgCyan: '\x1b[46m', bgBlack: '\x1b[40m',
};

const color = (c, t) => `${C[c]}${t}${C.reset}`;
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const MIN_WIDTH = 46;

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

function createSpinner(text, colorName = 'brightCyan') {
  let i = 0, timer = null;
  return {
    start() {
      process.stdout.write('\x1b[?25l');
      timer = setInterval(() => {
        const frame = SPINNER_FRAMES[i++ % SPINNER_FRAMES.length];
        process.stdout.write(`\r  ${color(colorName, frame)} ${color('gray', text)}`);
      }, 80);
    },
    stop(finalText = null) {
      if (timer) clearInterval(timer);
      process.stdout.write('\r\x1b[K\x1b[?25h');
      if (finalText) console.log(finalText);
    },
  };
}

function progressBar(percent, width = 26) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar =
    color('brightGreen', '█'.repeat(filled)) +
    color('gray', '░'.repeat(empty));
  return `${bar} ${color('brightCyan', Math.round(percent) + '%')}`;
}

function animateProgress(label, duration = 900) {
  return new Promise((resolve) => {
    let progress = 0;
    const steps = 30;
    const interval = duration / steps;
    process.stdout.write('\x1b[?25l');
    const timer = setInterval(() => {
      progress += 100 / steps;
      if (progress >= 100) {
        progress = 100;
        process.stdout.write(`\r\x1b[K  ${color('brightCyan', '⠿')} ${color('gray', label)}  ${progressBar(progress)}\x1b[?25h\n`);
        clearInterval(timer);
        resolve();
      } else {
        process.stdout.write(`\r\x1b[K  ${color('brightCyan', '⠿')} ${color('gray', label)}  ${progressBar(progress)}`);
      }
    }, interval);
  });
}

function padCenter(text, width) {
  const len = stripAnsi(text).length;
  const totalPad = Math.max(0, width - len);
  const left = Math.floor(totalPad / 2);
  const right = totalPad - left;
  return ' '.repeat(left) + text + ' '.repeat(right);
}

function box(lines, colorName = 'brightMagenta', opts = {}) {
  const { title = null, titleColor = 'brightMagenta' } = opts;
  const contentWidth = Math.max(
    ...lines.map((l) => stripAnsi(l).length),
    title ? stripAnsi(title).length + 4 : 0,
    MIN_WIDTH - 4
  );
  const innerWidth = contentWidth + 2;

  let top;
  if (title) {
    const titleLen = stripAnsi(title).length;
    const leftDashes = 2;
    const rightDashes = innerWidth - leftDashes - titleLen - 2;
    top =
      color(colorName, '╭' + '─'.repeat(leftDashes)) +
      ' ' +
      color(titleColor, title) +
      ' ' +
      color(colorName, '─'.repeat(Math.max(0, rightDashes)) + '╮');
  } else {
    top = color(colorName, '╭' + '─'.repeat(innerWidth) + '╮');
  }

  const bottom = color(colorName, '╰' + '─'.repeat(innerWidth) + '╯');

  console.log(top);
  for (const line of lines) {
    const pad = ' '.repeat(contentWidth - stripAnsi(line).length + 1);
    console.log(color(colorName, '│') + ' ' + line + pad + color(colorName, '│'));
  }
  console.log(bottom);
}

function divider(char = '─', colorName = 'gray', width = 44) {
  return color(colorName, char.repeat(width));
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

function counterBar(used, max) {
  const width = 18;
  const filled = Math.min(width, Math.round((used / max) * width));
  const empty = width - filled;
  const barColor = used >= max ? 'brightRed' : 'brightMagenta';
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

async function countdown(seconds, label) {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r  ${color('brightYellow', '◷')} ${color('gray', label)} ${color('brightCyan', String(i) + 's')}   `);
    await sleep(1000);
  }
  process.stdout.write('\r\x1b[K');
}

const logger = P({ level: 'silent' });

function renderHeader() {
  const lines = [
    color('brightMagenta', '  ██╗  ██╗██╗   ██╗██╗   ██╗██╗   ██╗'),
    color('brightMagenta', '  ██║ ██╔╝╚██╗ ██╔╝██║   ██║██║   ██║'),
    color('brightMagenta', '  █████╔╝  ╚████╔╝ ██║   ██║██║   ██║'),
    color('brightMagenta', '  ██╔═██╗   ╚██╔╝  ██║   ██║██║   ██║'),
    color('brightMagenta', '  ██║  ██╗   ██║   ╚██████╔╝╚██████╔╝'),
    color('brightMagenta', '  ╚═╝  ╚═╝   ╚═╝    ╚═════╝  ╚═════╝ '),
    '',
    '  ' + color('brightCyan', '╭─────────────────────────────────────╮'),
    '  ' + color('brightCyan', '│') + '  ' + color('brightWhite', 'W H A T S A P P   P A I R I N G') + '      ' + color('brightCyan', '│'),
    '  ' + color('brightCyan', '│') + '  ' + color('gray', `by ${AUTHOR}`.padEnd(35)) + color('brightCyan', '│'),
    '  ' + color('brightCyan', '╰─────────────────────────────────────╯'),
  ];
  for (const l of lines) console.log(l);
}

async function printBanner(cfg, usedCount) {
  console.clear();
  renderHeader();
  console.log();
  const rows = [
    `${color('gray', 'Nomor  ')} ${color('brightWhite', cfg.phone || color('gray', 'belum diatur'))}`,
    `${color('gray', 'Target ')} ${color('brightYellow', cfg.maxPairing + 'x')}   ${color('gray', 'Delay')} ${color('brightYellow', cfg.delayBetween / 1000 + 's')}`,
    `${color('gray', 'Mode   ')} ${color('brightGreen', '⚡ SPAM MODE')} ${color('gray', '(tanpa nunggu kode)')}`,
    `${color('gray', 'Progress')} ${counterBar(usedCount, cfg.maxPairing)}`,
  ];
  box(rows, 'brightCyan');
  console.log();
}

function renderPairingCode(formatted, index, total, phone) {
  const lines = [
    '',
    color('brightGreen', '   ┌───────────────────────────────┐'),
    color('brightGreen', '   │') + color('dim', color('gray', '      PAIRING CODE             ')) + color('brightGreen', '│'),
    color('brightGreen', '   ├───────────────────────────────┤'),
    color('brightGreen', '   │') + '  ' + color('bold', color('brightYellow', formatted.padStart(14).padEnd(29))) + color('brightGreen', '│'),
    color('brightGreen', '   └───────────────────────────────┘'),
    '',
    color('gray', `   ${'─'.repeat(43)}`),
    '',
    color('brightCyan', '   Cara pakai:'),
    color('gray', '   1. Buka WhatsApp di HP'),
    color('gray', '   2. Menu → Perangkat Tertaut → Tautkan Perangkat'),
    color('gray', '   3. Pilih "Tautkan dengan nomor telepon"'),
    color('gray', `   4. Masukkan kode: ${color('brightYellow', formatted)}`),
    '',
  ];
  for (const l of lines) console.log(l);
}

async function singlePairing(cfg, phoneNumber, index, total) {
  clearSession();

  const spinner = createSpinner('Memuat session auth...');
  spinner.start();
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();
  spinner.stop(`  ${color('brightGreen', '✔')} ${color('gray', 'Session auth dimuat')}`);

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

    const codeSpinner = createSpinner('Meminta pairing code...', 'brightYellow');
    codeSpinner.start();

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        const formatted = formatPairingCode(code);
        codeSpinner.stop(`  ${color('brightGreen', '✔')} ${color('gray', 'Pairing code terkirim')}`);
        console.log();

        renderPairingCode(formatted, index, total, phoneNumber);

        finish('sent');
      } catch (err) {
        codeSpinner.stop(`  ${color('brightRed', '✖')} ${color('gray', 'Gagal request pairing code')}`);
        console.log(color('brightRed', `  ${err.message}`));
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
      console.log(color('brightCyan', '  ╭─ Input Nomor ──────────────────────╮'));
      const input = await prompt(color('brightCyan', '  │ ') + color('gray', 'Nomor target: '));
      console.log(color('brightCyan', '  ╰────────────────────────────────────╯'));
      cleanNumber = validateNumber(input);
      if (!cleanNumber) console.log(color('brightRed', '  ⚠ Nomor tidak valid, coba lagi\n'));
    }
    cfg.phone = cleanNumber;
    saveConfig(cfg);
    console.log();
  }

  const totalToRun = cfg.maxPairing - state.used;
  if (totalToRun <= 0) {
    box(
      [
        color('brightRed', 'BATAS PAIRING TERCAPAI'),
        '',
        color('gray', 'Nomor  : ') + color('brightWhite', cfg.phone),
        color('gray', 'Sudah  : ') + color('brightYellow', cfg.maxPairing + 'x'),
        '',
        color('dim', 'Ubah target lewat menu [3] atau reset lewat [6]'),
      ],
      'brightRed',
      { title: 'LIMIT', titleColor: 'brightRed' }
    );
    console.log();
    return;
  }

  console.log();
  box(
    [
      color('gray', 'Nomor     ') + color('brightWhite', cfg.phone),
      color('gray', 'Pairing   ') + color('brightYellow', `${totalToRun}x lagi`) + color('gray', ` (total ${cfg.maxPairing}x)`),
      color('gray', 'Delay     ') + color('brightYellow', `${cfg.delayBetween / 1000}s antar pairing`),
      color('gray', 'Mode      ') + color('brightGreen', '⚡ SPAM (langsung lanjut)'),
    ],
    'brightCyan',
    { title: 'KONFIRMASI', titleColor: 'brightCyan' }
  );
  console.log();

  const confirm = await prompt('  ' + color('brightYellow', '❯') + color('gray', ' Lanjutkan? (y/n): '));
  if (confirm.toLowerCase() !== 'y') {
    console.log('\n  ' + color('gray', 'Dibatalkan'));
    console.log();
    return;
  }
  console.log();

  const results = [];

  for (let i = state.used + 1; i <= cfg.maxPairing; i++) {
    await printBanner(cfg, state.used);

    const headerLeft = color('brightMagenta', `◆ PAIRING ${i}/${cfg.maxPairing}`);
    const headerRight = color('gray', new Date().toLocaleTimeString('id-ID'));
    const gap = Math.max(1, 42 - stripAnsi(headerLeft).length - stripAnsi(headerRight).length);
    console.log(`  ${headerLeft}${' '.repeat(gap)}${headerRight}`);
    console.log('  ' + divider('─', 'gray', 44));
    console.log();

    const result = await singlePairing(cfg, cfg.phone, i, cfg.maxPairing);
    results.push({ index: i, result });
    state.used++;

    if (result === 'sent') {
      console.log(`  ${color('brightGreen', '✔')} ${color('gray', 'Kode terkirim ke')} ${color('brightWhite', cfg.phone)}`);
    } else {
      console.log(`  ${color('brightRed', '✖')} ${color('gray', 'Gagal:')} ${color('brightRed', result)}`);
    }
    console.log();

    if (i < cfg.maxPairing && cfg.delayBetween > 0) {
      await countdown(Math.round(cfg.delayBetween / 1000), 'Pairing berikutnya dalam');
      console.log();
    }
  }

  await printBanner(cfg, state.used);
  const successCount = results.filter((r) => r.result === 'sent').length;
  const failedCount = results.length - successCount;

  const summaryLines = [
    '',
    color('gray', 'Nomor     ') + color('brightWhite', cfg.phone),
    color('gray', 'Total     ') + color('brightYellow', `${results.length}x`),
    color('gray', 'Terkirim  ') + color('brightGreen', `${successCount}x`) + color('gray', '  Gagal  ') + color('brightRed', `${failedCount}x`),
    '',
    color('gray', divider('─', 'gray', 44)),
    '',
    ...results.map(
      (r) =>
        color('gray', `[${String(r.index).padStart(2, '0')}] `) +
        (r.result === 'sent'
          ? color('brightGreen', '✔ SENT')
          : color('brightRed', '✖ ' + r.result.toUpperCase()))
    ),
  ];

  box(summaryLines, 'brightGreen', { title: 'SESI SELESAI', titleColor: 'brightGreen' });
  console.log();
}

async function settingsMenu(state) {
  const cfg = state.cfg;

  while (true) {
    await printBanner(cfg, state.used);

    console.log('  ' + color('bold', color('brightCyan', 'PENGATURAN')));
    console.log('  ' + divider('─', 'gray', 44));
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
      const input = await prompt(`\n  ${color('gray', `Delay baru dalam detik (5-600, sekarang ${cfg.delayBetween / 1000}):`)} `);
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
      const confirm = await prompt(`\n  ${color('brightYellow', '⚠')} ${color('gray', 'Reset semua ke default? (y/n):')} `);
      if (confirm.toLowerCase() === 'y') {
        state.cfg = { ...DEFAULT_CONFIG, phone: cfg.phone };
        saveConfig(state.cfg);
        console.log('  ' + color('brightGreen', '✔ Setting direset (nomor tetap)'));
      } else {
        console.log('  ' + color('gray', 'Dibatalkan'));
      }
    } else if (choice === '0') {
      return;
    } else {
      console.log('  ' + color('brightRed', '✖ Pilihan tidak valid'));
    }

    await prompt('\n  ' + color('gray', 'Tekan Enter...'));
    console.log();
  }
}

async function mainMenu() {
  const state = { used: 0, cfg: loadConfig() };

  while (true) {
    const cfg = state.cfg;
    await printBanner(cfg, state.used);

    const limitReached = state.used >= cfg.maxPairing;

    console.log('  ' + color('bold', color('brightCyan', 'MENU')));
    console.log('  ' + divider('─', 'gray', 44));
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
        const result = await singlePairing(cfg, cfg.phone, state.used, cfg.maxPairing);
        console.log();
        console.log(
          '  ' +
            (result === 'sent'
              ? color('brightGreen', '✔ Kode terkirim')
              : color('brightRed', `✖ Gagal: ${result}`))
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
      console.log('  ' + divider('─', 'gray', 44));
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