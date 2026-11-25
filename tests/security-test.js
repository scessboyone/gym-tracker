// Sicherheit: Eine präparierte Backup-Datei darf nichts ausführen, und das Bereinigen beim Laden darf
// bei normalen Daten nichts verändern.
const engine = require('playwright')[process.env.PW_ENGINE || 'chromium']; // PW_ENGINE=webkit: wie Safari auf dem iPhone
const URL = process.env.TARGET_URL || 'http://127.0.0.1:8777/';
const X = '"><img src=x onerror="window.__pwned=(window.__pwned||0)+1">';

(async () => {
  const browser = await engine.launch({ headless: true });
  let fail = 0;
  const t = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`); };
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block', locale: 'de-DE' });
  const page = await ctx.newPage();
  const errors = [], alerts = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => { alerts.push(d.message()); d.dismiss(); });
  await page.goto(URL); await page.locator('#view').waitFor(); await page.waitForTimeout(300);

  // 1) Normale Daten bleiben beim Bereinigen gleich
  const same = await page.evaluate(() => {
    const mk = (id, name, w, alts = []) => ({ id, name, sets: 3, repMin: 8, repMax: 12, reps: 10, weight: w, rest: 0, note: 'Sitz 5', dbId: null, image: null,
      muscles: { p: ['chest'], s: ['triceps'] }, alts });
    const t0 = new Date(2026, 9, 6, 18).getTime();
    const st = {
      v: 1, plan: { days: [{ id: 'a1', name: 'Push (OK)', weekdays: [0, 3], exercises: [mk('b1', 'Bankdrücken', 62.5, [{ id: 'b2', name: 'Brustpresse', repMin: 8, repMax: 12, reps: 10, weight: 40, note: '', dbId: null, image: null }])] }] },
      logs: [{ id: 'l1', dayId: 'a1', dayName: 'Push (OK)', startedAt: t0, endedAt: t0 + 3.6e6, note: 'gut', prs: [{ name: 'Bankdrücken', weight: 62.5, reps: 10, prevWeight: 60, prevReps: 10 }],
        entries: [{ exId: 'b1', baseId: 'b1', name: 'Bankdrücken', sets: [{ weight: 62.5, reps: 10, done: true }, { weight: 62.5, reps: 8, done: false }] }] }],
      body: [{ t: t0, kg: 82.4, time: '07:15' }], active: null,
      settings: { rest: 120, theme: 'dark', accent: 'teal', name: 'Flo', since: t0, lastBackup: t0, seenVersion: '0.25.2', setupDone: true, goalKg: 80 },
      cal: { [new Date(2026, 9, 8).getTime()]: { d: 'a1', x: true } }, sick: [new Date(2026, 9, 9).getTime()],
    };
    const c = cleanState(JSON.parse(JSON.stringify(st)));
    // Vergleich unabhängig von der Reihenfolge der Felder
    const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
    const diff = [];
    for (const k of Object.keys(st)) if (JSON.stringify(canon(c[k])) !== JSON.stringify(canon(st[k]))) diff.push(k);
    return diff;
  });
  t(!same.length, `Normale Daten bleiben beim Bereinigen unverändert${same.length ? ' – anders: ' + same.join(', ') : ''}`);

  // 2) Präpariertes Backup laden
  await page.evaluate(X => {
    const t0 = Date.now() - 864e5;
    const st = {
      plan: { days: [{ id: X, name: X, weekdays: [0, X], exercises: [{ id: X, name: X, repMin: X, repMax: X, sets: X, rest: X, weight: X, note: X, muscles: { p: [X], s: [X] } }] }] },
      logs: [{ id: X, dayId: X, dayName: X, startedAt: t0, endedAt: X, note: X, prs: [{ name: X, weight: X, reps: X }],
        entries: [{ exId: X, name: X, sets: [{ weight: X, reps: X, done: X }] }] }],
      body: [{ t: t0, kg: 80, time: X }, { t: X, kg: X }],
      active: { id: X, dayId: X, dayName: X, startedAt: t0, order: [X], pos: X, entries: [{ exId: X, varId: X, name: X, rest: X, image: { type: 'url', value: 'javascript:' + X }, sets: [{ weight: X, reps: X, done: X }] }] },
      settings: { name: X, accent: X, theme: X, rest: X, seenVersion: X, since: X, lastBackup: X },
      cal: { [X]: { d: X }, 123: { d: X, x: X } }, sick: [X],
    };
    importData({ text: async () => JSON.stringify({ state: st, images: { ['img:' + X]: X, 'img:ok': 'javascript:alert(1)' } }) });
  }, X);
  await page.locator('#dlg [data-dlg="1"]').click(); await page.waitForTimeout(800);
  // Alle Ansichten durchgehen, in denen die Daten landen
  const visit = async fn => { await page.evaluate(fn); await page.waitForTimeout(350); };
  await visit(() => { if (S.active) { V.tab = 'train'; render(); } });
  await visit(() => { selectTab('home'); });
  await visit(() => { selectTab('log'); });
  await visit(() => { openLog(S.logs[0].id); });
  await visit(() => { const b = document.querySelector('#sheet [data-act="logEdit"]'); if (b) b.click(); });
  await visit(() => { closeSheet(); });
  await visit(() => { selectTab('plan'); });
  await visit(() => { const d = S.plan.days[0]; if (d) openSub(d.id); });
  await visit(() => { const d = S.plan.days[0]; if (d && d.exercises[0]) editExSheet(d.id, d.exercises[0].id); });
  await visit(() => { closeSheet(); selectTab('more'); });
  await visit(() => { const d = document.querySelector('details.adv'); if (d) d.open = true; });
  await visit(() => { selectTab('log'); openSub('month:' + monthKey(Date.now())); });
  const res = await page.evaluate(() => ({
    pwned: window.__pwned || 0,
    imgs: document.querySelectorAll('img[src="x"]').length,
    accent: document.documentElement.dataset.accent || '',
    types: [typeof S.logs[0].entries[0].sets[0].reps, typeof S.logs[0].entries[0].sets[0].done, typeof S.plan.days[0].exercises[0].sets],
    ids: [S.logs[0].id, S.plan.days[0].id].every(id => /^[A-Za-z0-9_-]+$/.test(id)),
    images: Object.keys(localImgs).length,
  }));
  t(!res.pwned && !res.imgs && !alerts.length, `Präpariertes Backup führt nichts aus (Skript: ${res.pwned}, Bilder: ${res.imgs}, Dialoge: ${alerts.length})`);
  t(res.types.join() === 'number,boolean,number' && res.ids, `Werte haben die richtigen Typen, IDs nur erlaubte Zeichen (${res.types.join(', ')})`);
  t(!res.accent || /^[a-z]+$/.test(res.accent), `Ungültige Akzentfarbe wird verworfen („${res.accent}“)`);
  t(res.images === 0, 'Unechte Bilder aus dem Backup werden nicht übernommen');

  // 3) Auch beim App-Start wird geprüft (falls früher ein ungeprüftes Backup gespeichert wurde)
  await page.evaluate(async X => { const st = JSON.parse(JSON.stringify(S)); st.logs[0].id = X; st.logs[0].entries[0].sets[0].reps = X; await idb.set('state', st); }, X);
  await page.reload(); await page.waitForTimeout(500);
  await visit(() => { selectTab('log'); openLog(S.logs[0].id); });
  t(await page.evaluate(() => !window.__pwned && /^[A-Za-z0-9_-]+$/.test(S.logs[0].id) && typeof S.logs[0].entries[0].sets[0].reps === 'number'), 'Gespeicherte Altdaten werden beim Start bereinigt');
  t(!errors.length, 'keine JavaScript-Fehler' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  process.exitCode = fail ? 1 : 0;
})();
