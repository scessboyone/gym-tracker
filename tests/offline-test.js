// Prüft den Service Worker: installiert sich, legt alle App-Dateien in den Cache, App startet danach offline
const engine = require('playwright')[process.env.PW_ENGINE || 'chromium']; // PW_ENGINE=webkit: wie Safari auf dem iPhone
const URL = process.env.TARGET_URL || 'http://127.0.0.1:8777/';
(async () => {
  const browser = await engine.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, locale: 'de-DE' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let ok = true;
  try {
    await page.goto(URL);
    await page.evaluate(() => navigator.serviceWorker.ready);
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      const shell = keys.find(k => k.startsWith('shell-'));
      return shell ? (await (await caches.open(shell)).keys()).map(r => new URL(r.url).pathname) : [];
    });
    const need = ['/js/core.js', '/js/main.js', '/style.css', '/index.html'];
    const miss = need.filter(n => !cached.some(c => c.endsWith(n)));
    console.log(miss.length ? `FAIL Cache fehlt: ${miss.join(', ')}` : `OK   ${cached.length} Dateien im Cache`);
    ok = ok && !miss.length;
    if ((process.env.PW_ENGINE || 'chromium') === 'webkit' && process.platform === 'win32') {
      // Playwrights WebKit unter Windows kann offline nicht neu laden („internal error“) – das echte iPhone schon
      console.log('SKIP App-Start offline: mit WebKit unter Windows nicht prüfbar (Cache oben ist geprüft)');
    } else {
      await ctx.setOffline(true);
      await page.reload();
      await page.locator('#tabs').waitFor({ timeout: 8000 });
      const shown = await page.evaluate(() => !!document.querySelector('#view').children.length);
      console.log(shown ? 'OK   App startet offline' : 'FAIL App startet offline nicht');
      ok = ok && shown;
    }
  } catch (e) { console.log('FAIL', e.message.split('\n')[0]); ok = false; }
  console.log(errors.length ? 'FAIL JavaScript-Fehler: ' + errors.join(' | ') : 'OK   keine JavaScript-Fehler');
  await browser.close();
  process.exitCode = ok && !errors.length ? 0 : 1;
})();
