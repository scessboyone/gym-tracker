// Kopfzeile beim Scrollen: Home ohne leere Leiste, Seiten ohne Knöpfe scrollen mit,
// Seiten mit Knöpfen behalten nur die Knopfzeile (der große Titel scrollt weg). Screenshots in PW_ARTIFACT_DIR.
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const URL = process.env.TARGET_URL || 'http://127.0.0.1:8777/';
const OUT = process.env.PW_ARTIFACT_DIR || path.join(require('node:os').tmpdir(), 'gym-topbar');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, colorScheme: 'dark', isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'de-DE' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL); await page.locator('#view').waitFor();
  await page.evaluate(async () => {
    const mk = (id, name, mus) => ({ id, name, sets: 3, repMin: 8, repMax: 12, weight: 50, rest: 90, note: '', muscles: mus, alts: [] });
    S.plan = { days: [{ id: 'a', name: 'Push', weekdays: [0, 1, 2, 3, 4, 5, 6], exercises: [mk('b', 'Bankdrücken', { p: ['chest'], s: ['triceps'] }), mk('s', 'Schulterdrücken', { p: ['front_deltoids'], s: ['triceps'] })] }] };
    const t = Date.now() - 864e5;
    S.logs = Array.from({ length: 8 }, (_, k) => ({ id: 'l' + k, dayId: 'a', dayName: 'Push', startedAt: t - k * 2 * 864e5, endedAt: t - k * 2 * 864e5 + 3e6, prs: [],
      entries: [{ name: 'Bankdrücken', exId: 'b', sets: [1, 2, 3].map(() => ({ done: true, weight: 50 + k, reps: 10 })) }] }));
    S.settings.seenVersion = APP_VERSION; S.settings.name = 'Test';
    await idb.set('state', S);
  });
  await page.reload(); await page.waitForTimeout(600);
  let fail = 0;
  const t = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`); };
  const scroll = async () => { await page.evaluate(() => scrollTo(0, 400)); await page.waitForTimeout(250); };
  const bar = () => page.evaluate(() => { const r = $('#topbar').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; });

  // Home: keine leere Kopfzeile
  await scroll();
  let b = await bar();
  t(b.bottom <= 1, `Home: keine Kopfzeile über dem Inhalt (unterer Rand ${b.bottom}px)`);
  await page.screenshot({ path: path.join(OUT, 'home-gescrollt.png') });

  // Verlauf: Titel ohne Knöpfe scrollt mit weg
  await page.evaluate(() => { scrollTo(0, 0); selectTab('log'); }); await page.waitForTimeout(400);
  await scroll();
  b = await bar();
  t(b.bottom <= 1, `Verlauf: Kopfzeile scrollt mit weg (unterer Rand ${b.bottom}px)`);
  await page.screenshot({ path: path.join(OUT, 'verlauf-gescrollt.png') });

  // Unterseite mit Zurück-Knopf: Knopf bleibt, großer Titel ist weg
  await page.evaluate(() => { scrollTo(0, 0); openSub('ex'); }); await page.waitForTimeout(300);
  await page.evaluate(() => openSub('ex:Bankdrücken')); await page.waitForTimeout(400);
  await scroll();
  const sub = await page.evaluate(() => {
    const back = $('#topleft .linkbtn').getBoundingClientRect(), title = $('#title').getBoundingClientRect();
    return { backTop: Math.round(back.top), titleBottom: Math.round(title.bottom), barBottom: Math.round($('#topbar').getBoundingClientRect().bottom) };
  });
  t(sub.backTop >= 0 && sub.backTop < 40, `Unterseite: Zurück-Knopf bleibt oben sichtbar (oben bei ${sub.backTop}px)`);
  t(sub.titleBottom <= sub.barBottom - 30 || sub.titleBottom <= 0, `Unterseite: großer Titel scrollt weg (Titel endet bei ${sub.titleBottom}px, Leiste bei ${sub.barBottom}px)`);
  t(sub.barBottom < 70, `Unterseite: stehende Leiste ist schmal (${sub.barBottom}px)`);
  await page.screenshot({ path: path.join(OUT, 'unterseite-gescrollt.png') });

  // Ganz oben ist der Titel normal zu sehen
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(250);
  const vis = await page.evaluate(() => $('#title').getBoundingClientRect().top >= 0);
  t(vis, 'Unterseite ganz oben: Titel sichtbar');
  t(!errors.length, 'keine JavaScript-Fehler' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  process.exitCode = fail ? 1 : 0;
})();
