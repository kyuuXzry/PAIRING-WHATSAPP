const { execSync } = require('child_process');

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

const color = (c, t) => `${C[c]}${t}${C.reset}`;

const REQUIRED = [
  '@whiskeysockets/baileys',
  '@hapi/boom',
  'pino',
  'qrcode-terminal',
];

function isInstalled(pkg) {
  try {
    require.resolve(pkg);
    return true;
  } catch (_) {
    return false;
  }
}

function runInstall() {
  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let timer = null;

  process.stdout.write('\x1b[?25l');
  timer = setInterval(() => {
    const f = spinnerFrames[i++ % spinnerFrames.length];
    process.stdout.write(
      `\r${color('cyan', f)} ${color('gray', 'Menginstall dependency...')}`
    );
  }, 80);

  try {
    execSync('npm install --no-audit --no-fund --loglevel=error', {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: __dirname,
    });
    clearInterval(timer);
    process.stdout.write('\r\x1b[K\x1b[?25h');
    console.log(color('green', '  [OK] Dependency berhasil diinstall'));
    return true;
  } catch (err) {
    clearInterval(timer);
    process.stdout.write('\r\x1b[K\x1b[?25h');
    console.log(color('red', '  [X] Gagal install dependency'));
    if (err.stdout) process.stdout.write(err.stdout.toString());
    if (err.stderr) process.stderr.write(err.stderr.toString());
    return false;
  }
}

function checkNodeVersion() {
  const major = parseInt(process.versions.node.split('.')[0], 10);
  if (major < 18) {
    console.log(
      color('red', `  [X] Node.js versi ${process.versions.node} terlalu lama`)
    );
    console.log(color('gray', '  Minimal Node.js 18. Disarankan LTS: pkg install nodejs-lts'));
    process.exit(1);
  }
  if (major >= 23) {
    console.log(
      color('yellow', `  [!] Node.js ${process.versions.node} mungkin belum stabil untuk Baileys`)
    );
    console.log(color('gray', '  Kalau error, downgrade: pkg install nodejs-lts\n'));
  }
}

function main() {
  console.log();
  console.log(color('cyan', '╔══════════════════════════════════════════╗'));
  console.log(
    color('cyan', '║') +
      color('bold', color('cyan', '     PRESTART CHECK                       ')) +
      color('cyan', '║')
  );
  console.log(color('cyan', '╚══════════════════════════════════════════╝'));
  console.log();

  checkNodeVersion();

  const missing = REQUIRED.filter((p) => !isInstalled(p));

  if (missing.length === 0) {
    console.log(color('green', '  [OK] Semua dependency sudah terinstall'));
    console.log();
    process.exit(0);
  }

  console.log(color('yellow', `  [!] ${missing.length} dependency belum ada:`));
  for (const m of missing) console.log(color('gray', `      - ${m}`));
  console.log();

  const ok = runInstall();

  if (!ok) {
    console.log();
    console.log(color('red', '  Install gagal. Coba manual:'));
    console.log(color('gray', '    npm install'));
    console.log();
    process.exit(1);
  }

  const stillMissing = REQUIRED.filter((p) => !isInstalled(p));
  if (stillMissing.length > 0) {
    console.log(color('red', '  [X] Masih ada dependency yang belum terinstall:'));
    for (const m of stillMissing) console.log(color('gray', `      - ${m}`));
    process.exit(1);
  }

  console.log(color('green', '  [OK] Semua dependency siap'));
  console.log();
}

main();