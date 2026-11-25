// Startet einen kleinen Server für die App und lässt alle Tests laufen – erst Chrome (Pixel), dann WebKit (Safari/iPhone).
// Start aus dem App-Ordner:  node <playwright-skill>/run.js tests/run-all.js
// Nur ein Browser: RUN_ENGINES=chromium bzw. RUN_ENGINES=webkit
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const PORT = 8777;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
// Welche Tests in welchem Browser laufen (der Wisch-Test braucht Chromes Touch-Steuerung)
const TESTS = [
  ['app-test.js', ['chromium', 'webkit']],
  ['info-test.js', ['chromium', 'webkit']],
  ['muscles-test.js', ['chromium', 'webkit']],
  ['topbar-test.js', ['chromium', 'webkit']],
  ['month-text-test.js', ['chromium', 'webkit']],
  ['review-test.js', ['chromium', 'webkit']],
  ['accent-test.js', ['chromium', 'webkit']],
  ['features-test.js', ['chromium', 'webkit']],
  ['swipe-test.js', ['chromium']],
  ['offline-test.js', ['chromium', 'webkit']],
];
const ENGINES = (process.env.RUN_ENGINES || 'chromium,webkit').split(',');

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

const run = (file, engine) => new Promise(resolve => {
  const t0 = Date.now();
  const child = spawn(process.execPath, [path.join(__dirname, file)], {
    env: { ...process.env, PW_ENGINE: engine, TARGET_URL: `http://127.0.0.1:${PORT}/` }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', d => { out += d; });
  child.stderr.on('data', d => { out += d; });
  child.on('close', code => resolve({ file, engine, ok: code === 0, out, s: ((Date.now() - t0) / 1000).toFixed(0) }));
});

server.on('error', e => {
  console.log(e.code === 'EADDRINUSE' ? `Port ${PORT} ist belegt – läuft noch ein Testserver? Bitte beenden und neu starten.` : 'Server-Fehler: ' + e.message);
  process.exit(1);
});
server.listen(PORT, '127.0.0.1', async () => {
  const results = [];
  for (const engine of ENGINES) for (const [file, engines] of TESTS) {
    if (!engines.includes(engine)) continue;
    const r = await run(file, engine);
    results.push(r);
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${engine.padEnd(8)} ${file.padEnd(20)} ${r.s} s`);
    if (!r.ok) console.log(r.out.split('\n').filter(l => /FAIL|Error|Fehler/.test(l)).slice(0, 8).map(l => '       ' + l).join('\n'));
  }
  server.close();
  const bad = results.filter(r => !r.ok).length;
  console.log(bad ? `\n${bad} von ${results.length} Testläufen fehlgeschlagen` : `\nAlle ${results.length} Testläufe bestanden`);
  process.exitCode = bad ? 1 : 0;
});
