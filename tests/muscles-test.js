// Muskel-Statistik: Übungen ohne erledigten Satz zählen nicht, „Am meisten“ zeigt nur Muskeln über 0,
// der Rest steht unter „Noch nicht dran“. Dazu ein Screenshot im Dunkelmodus (Umschalter-Kontrast).
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const URL = process.env.TARGET_URL || 'http://127.0.0.1:8777/';
const OUT = process.env.PW_ARTIFACT_DIR || path.join(require('node:os').tmpdir(), 'gym-muscles');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, colorScheme: 'dark', serviceWorkers: 'block', locale: 'de-DE' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL); await page.locator('#view').waitFor();
  await page.evaluate(async () => {
    const mk = (id, name, mus) => ({ id, name, sets: 3, repMin: 8, repMax: 12, weight: 50, rest: 90, note: '', muscles: mus, alts: [] });
    S.plan = { days: [{ id: 'a', name: 'Ganzkörper', weekdays: [0], exercises: [mk('b', 'Bankdrücken', { p: ['chest'], s: ['triceps'] }), mk('r', 'Rudern', { p: ['upper_back'], s: ['biceps'] })] }] };
    const t = Date.now() - 36e5;
    S.logs = [{ id: 'l', dayId: 'a', dayName: 'Ganzkörper', startedAt: t, endedAt: t + 3e6, prs: [], entries: [
      { name: 'Bankdrücken', exId: 'b', sets: [1, 2, 3].map(() => ({ done: true, weight: 50, reps: 10 })) },
      { name: 'Rudern', exId: 'r', sets: [1, 2, 3].map(() => ({ done: false, weight: 40, reps: 10 })) }, // nicht gemacht
    ] }];
    S.settings.seenVersion = APP_VERSION; await idb.set('state', S);
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { selectTab('log'); openSub('muscles'); }); await page.waitForTimeout(400);
  const res = await page.evaluate(() => ({
    top: [...document.querySelectorAll('.m-bar')].map(b => b.innerText.replace(/\s+/g, ' ').trim()),
    missing: [...document.querySelectorAll('.section-title + .list .title')].map(e => e.innerText),
  }));
  await page.screenshot({ path: path.join(OUT, 'dark-muskeln.png') });
  let fail = 0;
  const t = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`); };
  t(res.top.length === 2 && res.top.every(x => !/ 0$/.test(x)), `Am meisten nur trainierte Muskeln: ${res.top.join(', ')}`);
  t(res.missing.includes('Oberer Rücken') && res.missing.includes('Bizeps'), `Noch nicht dran: ${res.missing.join(', ')}`);
  // Ohne Training in dieser Woche: Link zur Muskel-Statistik trotzdem da
  await page.evaluate(async () => { S.logs = []; await idb.set('state', S); history.back(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { V.sub = null; selectTab('home'); selectTab('log'); }); await page.waitForTimeout(400);
  t(await page.locator('.heat-more').isVisible(), 'Muskel-Statistik-Link auch ohne Training sichtbar');
  await page.locator('.heat-more').click(); await page.waitForTimeout(400);
  t(await page.evaluate(() => V.sub === 'muscles'), 'Link öffnet die Muskel-Statistik');
  t(!errors.length, 'keine JavaScript-Fehler' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  process.exitCode = fail ? 1 : 0;
})();
