// Prüft die i-Knöpfe: Jeder öffnet seine Erklärung, „Alles klar“ schließt sie, die Seite bleibt, wo sie war.
// Screenshots (hell und dunkel) landen in PW_ARTIFACT_DIR.
const path = require('node:path');
const fs = require('node:fs');
const engine = require('playwright')[process.env.PW_ENGINE || 'chromium']; // PW_ENGINE=webkit: wie Safari auf dem iPhone
const URL = process.env.TARGET_URL || 'http://127.0.0.1:8777/';
const OUT = process.env.PW_ARTIFACT_DIR || path.join(require('node:os').tmpdir(), 'gym-info');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await engine.launch({ headless: true });
  let fail = 0;
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, colorScheme: scheme, isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'de-DE' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL); await page.locator('#view').waitFor();
    await page.evaluate(async () => {
      const mk = (id, name, mus) => ({ id, name, sets: 3, repMin: 8, repMax: 12, weight: 50, rest: 90, note: '', muscles: mus, alts: [] });
      S.plan = { days: [{ id: 'a', name: 'Push', weekdays: [0, 3], exercises: [mk('b', 'Bankdrücken', { p: ['chest'], s: ['triceps'] })] },
        { id: 'c', name: 'Beine', weekdays: [1], exercises: [mk('q', 'Kniebeuge', { p: ['quadriceps'], s: ['gluteal'] })] }] };
      const t = Date.now() - 36e5;
      S.logs = [{ id: 'l', dayId: 'a', dayName: 'Push', startedAt: t, endedAt: t + 3e6, prs: [], entries: [{ name: 'Bankdrücken', exId: 'b', sets: [1, 2, 3].map(() => ({ done: true, weight: 50, reps: 10 })) }] }];
      S.settings.seenVersion = APP_VERSION; S.settings.name = 'Test';
      await idb.set('state', S);
    });
    await page.reload(); await page.waitForTimeout(500);
    const check = async (where, open, key) => {
      await open();
      await page.waitForTimeout(250);
      const btn = page.locator(`[data-act="info"][data-k="${key}"]`).first();
      if (!(await btn.isVisible().catch(() => false))) { fail++; console.log(`FAIL [${scheme}] ${where}: i-Knopf „${key}“ fehlt`); return; }
      const before = await page.evaluate(() => [V.tab, V.sub, sheetOpen]);
      await btn.click(); await page.waitForTimeout(300);
      const dlg = page.locator('#dlg .dlg-card');
      const ok1 = await dlg.isVisible() && (await dlg.locator('p').innerText()).length > 20;
      await page.screenshot({ path: path.join(OUT, `${scheme}-${key}.png`) });
      await dlg.getByRole('button', { name: 'Alles klar' }).click(); await page.waitForTimeout(700);
      const after = await page.evaluate(() => [V.tab, V.sub, sheetOpen]);
      const ok2 = !(await page.locator('#dlg').count()) && JSON.stringify(before) === JSON.stringify(after);
      if (!ok1 || !ok2) fail++;
      console.log(`${ok1 && ok2 ? 'OK  ' : 'FAIL'} [${scheme}] ${where}: Erklärung „${key}“ ${ok1 ? 'geht auf' : 'geht NICHT auf'}, ${ok2 ? 'schließt sauber' : 'Zustand danach falsch: ' + JSON.stringify(after)}`);
    };
    await check('Verlauf, Kalender', () => page.evaluate(() => selectTab('log')), 'week');
    await check('Verlauf, Muskeln', async () => { await page.locator('[data-k="heat"]').scrollIntoViewIfNeeded(); }, 'heat');
    await check('Muskel-Statistik', () => page.locator('.heat-more').click(), 'sets');
    await check('Muskel-Statistik, fehlt', async () => {}, 'missing');
    await check('Plan', () => page.evaluate(() => selectTab('plan')), 'plan');
    await check('Übung bearbeiten, Muskeln', async () => {
      await page.locator('#view [data-act="openDay"]').first().click(); await page.waitForTimeout(300);
      await page.locator('#view [data-act="editEx"]').first().click(); await page.waitForTimeout(400);
      await page.locator('#sheet [data-k="muscleEdit"]').scrollIntoViewIfNeeded();
    }, 'muscleEdit');
    await check('Übung bearbeiten, Alternativen', async () => { await page.locator('#sheet [data-k="alts"]').scrollIntoViewIfNeeded(); }, 'alts');
    await page.evaluate(() => closeSheet()); await page.waitForTimeout(400);
    await check('Mehr, Darstellung', () => page.evaluate(() => selectTab('more')), 'theme');
    await page.evaluate(() => selectTab('log')); await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${scheme}-verlauf.png`), fullPage: true });
    if (errors.length) { fail++; console.log('FAIL JavaScript-Fehler: ' + errors.join(' | ')); }
    await ctx.close();
  }
  await browser.close();
  console.log(fail ? `${fail} Fehler` : 'Alle i-Knöpfe funktionieren');
  process.exitCode = fail ? 1 : 0;
})();
