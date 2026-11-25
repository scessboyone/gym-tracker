// Stellt die Fehler aus dem Code-Review vom 25.11.2026 nach und prüft, dass sie behoben sind.
const engine = require('playwright')[process.env.PW_ENGINE || 'chromium']; // PW_ENGINE=webkit: wie Safari auf dem iPhone
const URL = process.env.TARGET_URL || 'http://127.0.0.1:8777/';

(async () => {
  const browser = await engine.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block', locale: 'de-DE' });
  const page = await ctx.newPage();
  const errors = [], dialogs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
  await page.goto(URL); await page.locator('#view').waitFor();
  let fail = 0;
  const t = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`); };
  const w = ms => page.waitForTimeout(ms);
  const okDialog = async () => { const b = page.locator('#dlg [data-dlg="1"]'); await b.waitFor({ timeout: 3000 }); await b.click(); await w(700); };
  await page.evaluate(async () => {
    S.plan = { days: [
      { id: 'leer', name: 'Leer', weekdays: [], exercises: [] },
      { id: 'a', name: 'Push', weekdays: [0, 1, 2, 3, 4, 5, 6], exercises: [
        { id: 'b', name: 'Bankdrücken', sets: 2, repMin: 8, repMax: 12, reps: 8, weight: 1000, rest: 0, note: '',
          alts: [{ id: 'b2', name: 'Brustpresse', repMin: 8, repMax: 12, reps: 8, weight: 50, note: '' }] }] }] };
    S.settings.seenVersion = APP_VERSION; await idb.set('state', S);
  });
  await page.reload(); await w(500);

  // 1: leerer Tag lässt sich nicht starten
  await page.evaluate(() => startWorkout('leer')); await w(300);
  t(await page.evaluate(() => !S.active), 'Tag ohne Übungen startet kein Training (kein Absturz)');
  // 1b: altes kaputtes Training ohne Übungen wird beim Start aufgeräumt
  await page.evaluate(async () => { S.active = { id: 'x', dayId: 'leer', dayName: 'Leer', startedAt: Date.now(), entries: [] }; await idb.set('state', S); });
  await page.reload(); await w(500);
  t(await page.evaluate(() => !S.active && V.tab !== 'train'), 'Altes Training ohne Übungen wird beim Start entfernt');

  // 7 + 11 + 9: Training mit Pause 0 s und 1000 kg, Alternative nach erstem Satz gesperrt
  await page.evaluate(() => startWorkout('a')); await w(400);
  t(await page.evaluate(() => S.active.entries[0].rest === 0), 'Pause 0 s bleibt 0 s');
  t(await page.locator('.ex-focus input[data-field="weight"]').first().inputValue() === '1000', 'Gewicht 1000 kg steht ohne Tausenderpunkt im Feld');
  await page.locator('.ex-focus [data-act="toggleSet"]').first().click(); await w(200);
  t(await page.evaluate(() => S.active.entries[0].sets[0].weight === 1000), 'Abhaken liest 1000 kg korrekt ein');
  await page.locator('.ex-focus [data-act="switchVar"]').click(); await w(200);
  t(await page.evaluate(() => S.active.entries[0].varId == null), 'Wechsel zur Alternative nach abgehaktem Satz gesperrt');

  // 3: Plan übernehmen lässt das laufende Training in Ruhe; 2: gefährlicher Plan wird entschärft
  const bad = { days: [{ id: '"><img src=x onerror=alert(1)>', name: 'Böse', weekdays: [0, 9, 'x'], exercises: [{
    id: 'e"1', name: 'X', repMin: '<img src=x onerror=alert(2)>', repMax: 12, sets: '<b>3</b>', rest: '<i>', weight: 'abc',
    muscles: { p: ['chest', '<script>alert(3)</script>'], s: [] } }] }] };
  page.evaluate(p => adoptPlan(p), bad);
  await okDialog();
  const st = await page.evaluate(() => ({ active: !!S.active, d: S.plan.days[0], e: S.plan.days[0].exercises[0] }));
  t(st.active, 'Plan übernehmen: laufendes Training bleibt');
  t(/^[A-Za-z0-9_-]+$/.test(st.d.id) && /^[A-Za-z0-9_-]+$/.test(st.e.id), 'Plan übernehmen: IDs sind bereinigt');
  t(typeof st.e.repMin === 'number' && typeof st.e.sets === 'number' && typeof st.e.rest === 'number' && st.e.weight === 0, 'Plan übernehmen: Zahlen sind echte Zahlen');
  t(JSON.stringify(st.e.muscles.p) === '["chest"]' && JSON.stringify(st.d.weekdays) === '[0]', 'Plan übernehmen: nur bekannte Muskeln und Wochentage');
  await page.evaluate(() => { selectTab('plan'); openSub(S.plan.days[0].id); }); await w(300);
  await page.evaluate(() => editExSheet(S.plan.days[0].id, S.plan.days[0].exercises[0].id)); await w(400);
  t(!dialogs.length && !(await page.locator('#view img[src="x"], #sheet img[src="x"]').count()), 'Kein eingeschleuster Code ausgeführt');
  await page.evaluate(() => closeSheet()); await w(300);

  // 5: alter Kalender-Eintrag auf einen gelöschten Tag versteckt kein Training
  const cal = await page.evaluate(() => {
    const day = dayStart(Date.now()); S.cal = { [day]: { d: 'gibtsnicht', x: false } };
    return { got: planOn(day).d, want: regularOn(day) };
  });
  t(cal.got === cal.want, 'Kalender-Eintrag auf gelöschten Tag wird ignoriert');

  // 8: Uhrzeit beim Gewicht leeren
  await page.evaluate(() => { S.active = null; selectTab('log'); }); await w(400);
  await page.evaluate(() => openSub('weight')); await w(400);
  await page.locator('.time-clear').first().click(); await w(100);
  const auto = await page.locator('#bw-time').evaluate(el => el.dataset.auto);
  t(auto === undefined, 'Uhrzeit-× entfernt auch die automatische Uhrzeit');

  // 6: abgebrochenes Backup behält das alte Datum
  const lb = await page.evaluate(async () => {
    const old = Date.now() - 2 * 864e5; S.settings.lastBackup = old;
    const orig = shareFile; shareFile = async () => 'abort';
    try { await exportData('share'); } finally { shareFile = orig; }
    return S.settings.lastBackup === old;
  });
  t(lb, 'Abgebrochenes Backup behält das letzte Backup-Datum');

  // 10: Rückgängig verfällt, sobald etwas anderes gespeichert wird
  const undo = await page.evaluate(async () => {
    S.body = [{ t: Date.now() - 864e5, kg: 80 }, { t: Date.now(), kg: 81 }];
    withUndo('Gewichtseintrag gelöscht', () => { S.body = S.body.slice(1); save(); });
    const pendingAfterDelete = !!undoPending;
    S.settings.name = 'Neu'; save();
    return { pendingAfterDelete, droppedOnSave: !undoPending, toastHidden: $('#toast').hidden };
  });
  t(undo.pendingAfterDelete && undo.droppedOnSave && undo.toastHidden, 'Rückgängig verfällt bei einer weiteren Änderung (und verschwindet)');

  // 4: IndexedDB meldet Abbruch statt ewig zu warten
  const abort = await page.evaluate(() => new Promise(res => {
    idb.req('readwrite', s => { s.put(1, 'probe'); s.transaction.abort(); }).then(() => res('ok'), () => res('rejected'));
    setTimeout(() => res('hängt'), 2000);
  }));
  t(abort === 'rejected', `IndexedDB-Abbruch wird gemeldet (${abort})`);

  t(!errors.length, 'keine JavaScript-Fehler' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  process.exitCode = fail ? 1 : 0;
})();
