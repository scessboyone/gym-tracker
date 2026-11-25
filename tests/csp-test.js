// Content-Security-Policy: normale Nutzung löst keine Verstöße aus, eingeschleuster Code wird blockiert,
// Googles Anmeldeskript (Drive) und die Übungsdatenbank dürfen laden.
const engine = require('playwright')[process.env.PW_ENGINE || 'chromium']; // PW_ENGINE=webkit: wie Safari auf dem iPhone
const URL = process.env.TARGET_URL || 'http://127.0.0.1:8777/';

(async () => {
  const browser = await engine.launch({ headless: true });
  let fail = 0;
  const t = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`); };
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block', locale: 'de-DE' });
  await ctx.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL); await page.locator('#view').waitFor(); await page.waitForTimeout(400);

  const hasCsp = await page.evaluate(() => !!document.querySelector('meta[http-equiv="Content-Security-Policy"]') && !document.querySelector('script:not([src])'));
  t(hasCsp, 'Schutzregel ist gesetzt, keine Inline-Skripte mehr');
  t(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent-fill').trim() !== ''), 'Farben werden geladen (boot.js und CSS laufen)');

  // Normale Nutzung: alle Bereiche, Training, Feier, Sheets
  await page.evaluate(async () => {
    const mk = (id, name) => ({ id, name, sets: 2, repMin: 8, repMax: 12, reps: 10, weight: 50, rest: 0, note: '', muscles: { p: ['chest'], s: [] }, alts: [] });
    S.plan = { days: [{ id: 'a', name: 'Push', weekdays: [0, 1, 2, 3, 4, 5, 6], exercises: [mk('b', 'Bankdrücken')] }] };
    S.settings.seenVersion = APP_VERSION; S.settings.name = 'Test'; await idb.set('state', S);
  });
  await page.reload(); await page.waitForTimeout(400);
  for (const fn of [
    () => selectTab('plan'), () => selectTab('log'), () => selectTab('more'), () => selectTab('home'),
    () => startWorkout('a'), () => document.querySelector('.ex-focus [data-act="toggleSet"]').click(), () => exInfo(0), () => closeSheet(),
    () => finishSheet(), () => document.querySelector('#sheet [data-act="finishSave"]').click(),
  ]) { await page.evaluate(fn); await page.waitForTimeout(400); }
  await page.waitForTimeout(800);
  const v1 = await page.evaluate(() => window.__csp.slice());
  t(!v1.length, `Normale Nutzung: keine Verstöße${v1.length ? ' – ' + v1.join(' | ') : ''}`);

  // Eingeschleuster Code wird blockiert
  const blocked = await page.evaluate(async () => {
    document.body.insertAdjacentHTML('beforeend', '<img src="x" onerror="window.__hit=1"><div id="dummy" onclick="window.__hit=2"></div>');
    const s = document.createElement('script'); s.textContent = 'window.__hit = 3'; document.body.appendChild(s);
    document.getElementById('dummy').click();
    await new Promise(r => setTimeout(r, 400));
    return { hit: window.__hit || 0, violations: window.__csp.length };
  });
  t(!blocked.hit && blocked.violations > 0, `Eingeschleuster Code läuft nicht (blockiert: ${blocked.violations} Versuche)`);

  // Erlaubte fremde Quellen: Googles Anmeldeskript (für Drive) und die Übungsdatenbank
  const ext = await page.evaluate(async () => {
    const before = window.__csp.length;
    let gis = false, db = false;
    try { await loadGis(); gis = !!(window.google && google.accounts && google.accounts.oauth2); } catch { /* offline? */ }
    try { db = (await loadExDb()).length > 0; } catch { /* offline? */ }
    return { gis, db, newViolations: window.__csp.slice(before) };
  });
  t(ext.gis, 'Googles Anmeldeskript (Drive) darf laden');
  t(ext.db, 'Übungsdatenbank darf laden');
  t(!ext.newViolations.length, `Dabei keine Verstöße${ext.newViolations.length ? ' – ' + ext.newViolations.join(' | ') : ''}`);
  t(!errors.length, 'keine JavaScript-Fehler' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  process.exitCode = fail ? 1 : 0;
})();
