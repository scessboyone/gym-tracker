// Screenshots der neuen Seiten für das Hallmark-Audit (mit Beispieldaten)
const path = require('node:path');
const fs = require('node:fs');
const engine = require('playwright')[process.env.PW_ENGINE || 'chromium']; // PW_ENGINE=webkit: wie Safari auf dem iPhone
const URL = 'http://127.0.0.1:8777/';
const OUT = process.env.PW_ARTIFACT_DIR || path.join(require('node:os').tmpdir(), 'gym-screens');
fs.mkdirSync(OUT, { recursive: true });

const seed = () => {
  const mk = (id, name, w, mus) => ({ id, name, sets: 3, repMin: 8, repMax: 12, weight: w, rest: 90, note: '', muscles: mus });
  S.plan = { days: [
    { id: 'a', name: 'Push', weekdays: [0, 3], exercises: [mk('bench', 'Bankdrücken', 60, { p: ['chest'], s: ['triceps', 'front_deltoids'] }), mk('ohp', 'Schulterdrücken an der Maschine', 35, { p: ['front_deltoids'], s: ['triceps'] }), mk('dips', 'Dips', 0, { p: ['triceps'], s: ['chest'] })] },
    { id: 'b', name: 'Pull', weekdays: [1, 4], exercises: [mk('row', 'Rudern am Kabel', 50, { p: ['upper_back'], s: ['biceps'] }), mk('lat', 'Latziehen', 45, { p: ['upper_back'], s: ['biceps'] }), mk('curl', 'Bizepscurls', 12, { p: ['biceps'], s: ['forearm'] })] },
  ] };
  S.settings.since = new Date(2026, 9, 1).getTime(); S.settings.name = 'Test';
  const logs = []; let n = 0;
  for (let t = new Date(2026, 9, 1).getTime(); t < new Date(2026, 10, 25).getTime(); t = addDays(t, 1)) {
    const wd = new Date(t).getDay();
    const day = wd === 1 || wd === 4 ? S.plan.days[0] : wd === 2 || wd === 5 ? S.plan.days[1] : null;
    if (!day || (n++ % 5 === 3)) continue;
    const wk = Math.floor((t - S.settings.since) / 6048e5), st = t + 18 * 36e5;
    const entries = day.exercises.map(e => ({ name: e.name, exId: e.id, sets: [0, 1, 2].map(i => ({ done: true, weight: e.weight ? e.weight + wk * 2.5 : 0, reps: 10 - i })) }));
    const prs = wk > 4 && day.id === 'a' ? [{ name: 'Bankdrücken', weight: 60 + wk * 2.5, reps: 10 }] : [];
    logs.unshift({ id: 'l' + t, dayId: day.id, dayName: day.name, startedAt: st, endedAt: st + (52 + (n % 9) * 3) * 6e4, note: '', prs, entries });
  }
  S.logs = logs;
  S.body = []; for (let k = 0; k < 54; k += 2) S.body.push({ t: new Date(2026, 9, 2 + k, 7).getTime(), kg: Math.round((84 - k * 0.05) * 10) / 10 });
  clearTimeout(saveTimer); return idb.set('state', S);
};

(async () => {
  const browser = await engine.launch({ headless: true });
  for (const [scheme, vw] of [['light', 412], ['dark', 412], ['dark', 1440]]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vw > 800 ? 900 : 915 }, deviceScaleFactor: vw > 800 ? 1 : 2, colorScheme: scheme, isMobile: vw < 800, hasTouch: vw < 800, locale: 'de-DE', serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(URL); await page.locator('#view').waitFor();
    await page.evaluate(seed); await page.reload(); await page.waitForTimeout(600);
    for (let k = 0; k < 2; k++) { const b = page.locator('.dlg-card button').first(); if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(300); } }
    const tag = `${scheme}-${vw}`;
    const shot = (n, full = true) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`), fullPage: full });
    const st = ms => page.waitForTimeout(ms || 500);
    // Monatsrückblick
    await page.evaluate(() => selectTab('log')); await st();
    await page.locator('#view [data-act="openMonth"]').click(); await st();
    await shot('monat');
    await page.evaluate(() => history.back()); await st();
    // Verlauf pro Übung
    await page.locator('#view [data-act="openExList"]').click(); await st();
    await shot('uebungen');
    await page.locator('#view [data-act="openEx"]').first().click(); await st();
    await shot('uebung-detail');
    // Muskel-Karte im Verlauf und Unterseite „Muskeln“
    await page.evaluate(() => { selectTab('home'); selectTab('log'); }); await st();
    await page.locator('.heat-more').scrollIntoViewIfNeeded(); await st(300);
    await shot('muskel-karte', false);
    await page.locator('.heat-more').click(); await st();
    await shot('muskeln');
    await page.locator('#view [data-act="heatRange"][data-r="w"]').click(); await st(300);
    await shot('muskeln-woche');
    // Vollbild-Training
    await page.evaluate(() => selectTab('home')); await st();
    await page.locator('#view [data-act="start"]').first().click(); await st(700);
    await shot('training-oben', false);
    await page.locator('.ex-focus [data-act="toggleSet"]').first().click(); await st();
    await page.evaluate(() => scrollTo(0, 99999)); await st();
    await shot('training-unten', false);
    await ctx.close();
  }
  await browser.close();
  console.log('fertig', OUT);
})();
