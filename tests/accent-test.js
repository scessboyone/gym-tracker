// Erster Start mit Willkommens-Karte (Name, Hell/Dunkel, Akzentfarbe), Akzentfarbe wirkt und bleibt nach dem Neuladen,
// heutiger Tag im Kalender in der Akzentfarbe. Screenshots in PW_ARTIFACT_DIR.
const path = require('node:path');
const fs = require('node:fs');
const engine = require('playwright')[process.env.PW_ENGINE || 'chromium']; // PW_ENGINE=webkit: wie Safari auf dem iPhone
const URL = process.env.TARGET_URL || 'http://127.0.0.1:8777/';
const OUT = process.env.PW_ARTIFACT_DIR || path.join(require('node:os').tmpdir(), 'gym-accent');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await engine.launch({ headless: true });
  let fail = 0;
  const t = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`); };
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, colorScheme: scheme, serviceWorkers: 'block', locale: 'de-DE' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const w = ms => page.waitForTimeout(ms);
    const css = v => page.evaluate(v => getComputedStyle(document.documentElement).getPropertyValue(v).trim(), v);
    await page.goto(URL); await page.locator('#view').waitFor(); await w(400);

    // Willkommens-Karte beim ersten Start
    const card = page.locator('.card.setup');
    t(await card.isVisible(), `[${scheme}] Willkommens-Karte beim ersten Start`);
    t(await card.locator('#name-in').count() === 1 && await card.locator('.seg button').count() === 3 && await card.locator('.acc').count() === 7,
      `[${scheme}] Karte hat Name, Hell/Dunkel und 7 Akzentfarben`);
    await page.screenshot({ path: path.join(OUT, `${scheme}-willkommen.png`) });
    await page.locator('#name-in').fill('Test');
    await card.locator('.acc[data-v="pink"]').click(); await w(300);
    t(await page.evaluate(() => document.documentElement.dataset.accent) === 'pink', `[${scheme}] Pink gewählt: Farbe wird übernommen`);
    t((await css('--accent-fill')).toLowerCase() === (scheme === 'light' ? '#d0185e' : '#d0185e'), `[${scheme}] Akzent-Fläche ist Pink (${await css('--accent-fill')})`);
    t(await page.locator('#name-in').inputValue() === 'Test', `[${scheme}] Getippter Name bleibt beim Farbwechsel erhalten`);
    await page.screenshot({ path: path.join(OUT, `${scheme}-willkommen-pink.png`) });
    await page.locator('.card.setup [data-act="saveName"]').click(); await w(400);
    t(!(await page.locator('.card.setup').count()) && await page.getByRole('heading', { name: 'Hallo, Test' }).isVisible(), `[${scheme}] „Los geht’s“ speichert und blendet die Karte aus`);

    // Bleibt nach dem Neuladen, schon vor dem ersten Rendern
    await page.waitForTimeout(400);
    await page.reload(); await page.locator('#view').waitFor(); await w(300);
    t(await page.evaluate(() => document.documentElement.dataset.accent === 'pink' && localStorage.getItem('gym-accent') === 'pink'), `[${scheme}] Akzentfarbe bleibt nach dem Neuladen`);

    // Kalender: heute in der Akzentfarbe
    await page.evaluate(() => selectTab('log')); await w(400);
    const today = await page.locator('.cal-d.today').first().evaluate(el => getComputedStyle(el).backgroundColor);
    t(today === 'rgb(208, 24, 94)', `[${scheme}] Heute im Kalender in Pink gefüllt (${today})`);
    await page.locator('.cal').first().screenshot({ path: path.join(OUT, `${scheme}-kalender.png`) });

    // Mehr → Darstellung: Auswahl da, Pink markiert, zurück auf Blau
    await page.evaluate(() => selectTab('more')); await w(400);
    t(await page.locator('#view .acc.on').getAttribute('data-v') === 'pink', `[${scheme}] Mehr: Pink ist ausgewählt`);
    await page.screenshot({ path: path.join(OUT, `${scheme}-mehr.png`) });
    await page.locator('#view .acc[data-v="blue"]').click(); await w(300);
    t(await page.evaluate(() => !document.documentElement.dataset.accent && !localStorage.getItem('gym-accent')), `[${scheme}] Zurück auf Blau`);
    t(!errors.length, `[${scheme}] keine JavaScript-Fehler` + (errors.length ? ': ' + errors.join(' | ') : ''));
    await ctx.close();
  }
  await browser.close();
  process.exitCode = fail ? 1 : 0;
})();
