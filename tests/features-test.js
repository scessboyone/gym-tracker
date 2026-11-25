// Neue Funktionen aus 0.25.0: Pause beim ersten Start, Wochenziel in der Feier, Jahresrückblick (mit gefälschtem
// Datum 21.12.), Training bearbeiten, Erweiterte Informationen. Screenshots in PW_ARTIFACT_DIR.
const path = require('node:path');
const fs = require('node:fs');
const engine = require('playwright')[process.env.PW_ENGINE || 'chromium']; // PW_ENGINE=webkit: wie Safari auf dem iPhone
const URL = process.env.TARGET_URL || 'http://127.0.0.1:8777/';
const OUT = process.env.PW_ARTIFACT_DIR || path.join(require('node:os').tmpdir(), 'gym-features');
fs.mkdirSync(OUT, { recursive: true });
const fakeDate = (y, m, d) => `{ const RD = Date, off = new RD(${y}, ${m}, ${d}, 18).getTime() - RD.now();
  Date = class extends RD { constructor(...a) { a.length ? super(...a) : super(RD.now() + off); } static now() { return RD.now() + off; } }; }`;

(async () => {
  const browser = await engine.launch({ headless: true });
  let fail = 0;
  const t = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`); };
  const errors = [];
  const ctxFor = async (date, scheme = 'dark') => {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, colorScheme: scheme, serviceWorkers: 'block', locale: 'de-DE' });
    if (date) await ctx.addInitScript(fakeDate(...date));
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL); await page.locator('#view').waitFor(); await page.waitForTimeout(300);
    return { ctx, page };
  };
  const seed = page => page.evaluate(async () => {
    const mk = (id, name, w, mus) => ({ id, name, sets: 3, repMin: 8, repMax: 12, reps: 10, weight: w, rest: 90, note: '', muscles: mus, alts: [] });
    S.plan = { days: [{ id: 'a', name: 'Push', weekdays: [0, 3], exercises: [mk('b', 'Bankdrücken', 60, { p: ['chest'], s: ['triceps'] })] },
      { id: 'c', name: 'Pull', weekdays: [1, 4], exercises: [mk('r', 'Rudern', 50, { p: ['upper_back'], s: ['biceps'] })] }] };
    const y = new Date().getFullYear(), logs = [];
    for (let k = 0; k < 60; k++) {
      const t = new Date(y, 0, 3 + k * 5, 18).getTime(); if (t > Date.now()) break;
      const day = k % 2 ? S.plan.days[1] : S.plan.days[0], e = day.exercises[0];
      logs.unshift({ id: 'l' + k, dayId: day.id, dayName: day.name, startedAt: t, endedAt: t + 3e6, note: '', prs: k > 30 ? [{ name: e.name, weight: e.weight + k, reps: 10 }] : [],
        entries: [{ name: e.name, exId: e.id, sets: [0, 1, 2].map(i => ({ done: true, weight: e.weight + Math.floor(k / 2), reps: 10 - i })) }] });
    }
    S.logs = logs; S.settings.since = new Date(y, 0, 1).getTime(); S.settings.seenVersion = APP_VERSION; S.settings.name = 'Test';
    S.body = [{ t: new Date(y, 0, 5, 7).getTime(), kg: 84 }, { t: new Date(y, 10, 20, 7).getTime(), kg: 80.5 }];
    await idb.set('state', S);
  });

  // 1) Erster Start: Pause wählen
  {
    const { ctx, page } = await ctxFor(null, 'light');
    t(await page.locator('.card.setup [data-act="setRest"]').count() === 4, 'Willkommens-Karte: 4 Pausen-Vorgaben');
    await page.locator('#name-in').fill('Anna');
    await page.locator('.card.setup [data-act="setRest"][data-v="120"]').click(); await page.waitForTimeout(200);
    t(await page.evaluate(() => S.settings.rest) === 120 && await page.locator('#name-in').inputValue() === 'Anna', 'Pause 2 min gewählt, Name bleibt stehen');
    await page.screenshot({ path: path.join(OUT, 'light-willkommen.png'), fullPage: true });
    await ctx.close();
  }

  // 2) Jahresrückblick am 21.12.: Home-Widget, Verlauf-Eintrag, Seite
  {
    const { ctx, page } = await ctxFor([2026, 11, 21]);
    await seed(page); await page.reload(); await page.waitForTimeout(500);
    t(await page.locator('#view .year-card').isVisible(), '21.12.: Jahresrückblick-Widget auf Home');
    await page.locator('#view .year-card').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, 'dark-home-widget.png') });
    await page.locator('#view .year-card').click(); await page.waitForTimeout(500);
    t(await page.evaluate(() => V.sub === 'year:2026'), 'Widget öffnet den Jahresrückblick 2026');
    t(await page.locator('.y-bar').count() === 12 && await page.locator('.m-stats .big').count() === 4, 'Jahresseite: Kennzahlen und 12 Monatsbalken');
    await page.screenshot({ path: path.join(OUT, 'dark-jahr.png'), fullPage: true });
    await page.evaluate(() => history.back()); await page.waitForTimeout(400);
    t(await page.evaluate(() => V.tab === 'home'), 'Zurück führt wieder auf Home');
    await page.evaluate(() => selectTab('log')); await page.waitForTimeout(300);
    t(await page.locator('#view [data-act="openYear"]').count() === 1, 'Verlauf: Eintrag „Jahresrückblick“');
    await ctx.close();
  }
  // 3) Vor dem 20.12. kein Widget und kein Eintrag (nur dieses Jahr), danach im Januar weiter im Verlauf
  {
    const { ctx, page } = await ctxFor([2026, 11, 19]);
    await seed(page); await page.reload(); await page.waitForTimeout(400);
    t(!(await page.locator('#view .year-card').count()), '19.12.: noch kein Widget');
    await page.evaluate(() => selectTab('log')); await page.waitForTimeout(300);
    t(!(await page.locator('#view [data-act="openYear"]').count()), '19.12.: noch kein Jahresrückblick im Verlauf');
    await ctx.close();
  }
  {
    const { ctx, page } = await ctxFor([2027, 0, 2]);
    await page.evaluate(async () => { const t = new Date(2026, 5, 1, 18).getTime();
      S.logs = [{ id: 'x', dayId: 'a', dayName: 'Push', startedAt: t, endedAt: t + 3e6, prs: [], entries: [{ name: 'Bank', sets: [{ done: true, weight: 50, reps: 10 }] }] }];
      S.settings.seenVersion = APP_VERSION; S.settings.name = 'Test'; await idb.set('state', S); });
    await page.reload(); await page.waitForTimeout(400);
    t(!(await page.locator('#view .year-card').count()), '2.1.: Widget wieder weg');
    await page.evaluate(() => selectTab('log')); await page.waitForTimeout(300);
    t(await page.locator('#view [data-act="openYear"][data-y="2026"]').count() === 1, '2.1.: Jahresrückblick 2026 weiter im Verlauf');
    await ctx.close();
  }

  // 4) Training bearbeiten + Feier mit Wochenziel
  {
    const { ctx, page } = await ctxFor(null, 'light');
    await seed(page); await page.reload(); await page.waitForTimeout(400);
    const id = await page.evaluate(() => S.logs[0].id);
    await page.evaluate(id => { selectTab('log'); openLog(id); }, id); await page.waitForTimeout(400);
    await page.locator('#sheet [data-act="logEdit"]').click(); await page.waitForTimeout(300);
    await page.locator('#sheet input[data-le="weight"]').first().fill('150');
    await page.locator('#sheet [data-act="leAddSet"]').first().click(); await page.waitForTimeout(200);
    t(await page.locator('#sheet input[data-le="weight"]').first().inputValue() === '150', 'Bearbeiten: Eingabe bleibt beim Satz-Hinzufügen erhalten');
    await page.screenshot({ path: path.join(OUT, 'light-bearbeiten.png') });
    await page.locator('#sheet .sheet-bar [data-act="logEditSave"]').click(); await page.waitForTimeout(500);
    const r = await page.evaluate(id => { const l = S.logs.find(x => x.id === id); return { w: l.entries[0].sets[0].weight, n: l.entries[0].sets.length, pr: (l.prs || []).length }; }, id);
    t(r.w === 150 && r.n === 4, `Bearbeiten: gespeichert (150 kg, ${r.n} Sätze)`);
    t(r.pr === 1, 'Bearbeiten: Rekord wird neu berechnet');
    await page.evaluate(() => closeSheet()); await page.waitForTimeout(300);
    await page.evaluate(() => { startWorkout('a'); }); await page.waitForTimeout(300);
    await page.locator('.ex-focus [data-act="toggleSet"]').first().click(); await page.waitForTimeout(200);
    await page.evaluate(() => finishSheet()); await page.waitForTimeout(300);
    await page.locator('#sheet [data-act="finishSave"]').click(); await page.waitForTimeout(800);
    t(await page.locator('#celebrate .cel-week').count() === 1, 'Feier zeigt Wochenziel/Serie');
    await page.screenshot({ path: path.join(OUT, 'light-feier.png') });
    await page.locator('#celDone').click(); await page.waitForTimeout(500);
    // 5) Erweiterte Informationen
    await page.evaluate(() => selectTab('more')); await page.waitForTimeout(300);
    await page.locator('details.adv summary').click(); await page.waitForTimeout(600);
    const usage = await page.locator('#adv-usage').innerText();
    t(await page.locator('.adv-row').count() >= 10 && usage !== '…', `Erweiterte Informationen: aufgeklappt, Speicher „${usage}“`);
    await page.locator('details.adv').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, 'light-erweitert.png'), fullPage: true });
    await ctx.close();
  }
  t(!errors.length, 'keine JavaScript-Fehler' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  process.exitCode = fail ? 1 : 0;
})();
