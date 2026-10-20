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
        codeSpinner.stop(color('green', '  [OK] Pairing code terkirim'));
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

        finish('sent');
      } catch (err) {
        codeSpinner.stop(color('red', '  [X] Gagal request pairing code'));
        console.log(color('red', `  ${err.message}`));
        finish('error');
      }
    }, 2500);
  });
}