// Prüft das Wischen zwischen den Bereichen mit echten Touch-Gesten (Chrome DevTools-Protokoll),
// je einmal mitten im Inhalt und einmal ganz unten im leeren Bereich über der Tab-Leiste.
const { chromium } = require('playwright');
const URL = process.env.TARGET_URL || 'http://127.0.0.1:8777/';
const ORDER = ['home', 'train', 'plan', 'log', 'more'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'de-DE' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL); await page.locator('#view').waitFor();
  // Kurzer Plan, damit die Plan-Seite viel leeren Platz hat
  await page.evaluate(async () => {
    S.plan = { days: [{ id: 'a', name: 'Push', weekdays: [0], exercises: [{ id: 'x', name: 'Bankdrücken', sets: 3, repMin: 8, repMax: 12, weight: 60, rest: 90, note: '' }] }] };
    await idb.set('state', S);
  });
  await page.reload(); await page.waitForTimeout(500);
  for (let k = 0; k < 2; k++) { const b = page.locator('.dlg-card button, #sheet [data-act="closeSheet"]').first(); if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(300); } }

  const swipe = async (y, dir) => {
    const x0 = 300, x1 = dir < 0 ? 300 - 200 : 300 + 200; // nach links wischen = nächster Bereich
    const [xa, xb] = dir < 0 ? [x0, x1] : [112, 312];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: xa, y }] });
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: xa + (xb - xa) * i / 8, y }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(450);
  };
  let fail = 0;
  for (const [y, where] of [[400, 'Mitte'], [760, 'unten im leeren Bereich']]) {
    await page.evaluate(() => selectTab('home')); await page.waitForTimeout(300);
    for (let k = 1; k < ORDER.length; k++) {
      await swipe(y, -1);
      const tab = await page.evaluate(() => V.tab);
      const ok = tab === ORDER[k];
      if (!ok) fail++;
      console.log(`${ok ? 'OK  ' : 'FAIL'} nach links (${where}) → ${ORDER[k]}${ok ? '' : ', ist aber ' + tab}`);
    }
    for (let k = ORDER.length - 2; k >= 0; k--) {
      await swipe(y, 1);
      const tab = await page.evaluate(() => V.tab);
      const ok = tab === ORDER[k];
      if (!ok) fail++;
      console.log(`${ok ? 'OK  ' : 'FAIL'} nach rechts (${where}) → ${ORDER[k]}${ok ? '' : ', ist aber ' + tab}`);
    }
  }
  if (errors.length) { fail++; console.log('FAIL JavaScript-Fehler: ' + errors.join(' | ')); }
  console.log(fail ? `${fail} Fehler` : 'Alle Wisch-Gesten funktionieren');
  await browser.close();
  process.exitCode = fail ? 1 : 0;
})();
