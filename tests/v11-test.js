// Neue Funktionen aus 1.1.0: allgemeine Pause zuerst, Pausen aus Plan-Import ignoriert, Timer zwischen Übungen aus,
// Leiste im minimierten Training, Übung auslassen, Training nachtragen, deutsche Anleitung, Pausen-Benachrichtigung,
// Kalender-Tag ziehen und Fenster wegziehen (die beiden Gesten nur in Chrome: echte Touch-Eingaben per CDP).
const engineName = process.env.PW_ENGINE || 'chromium';
const engine = require('playwright')[engineName];
const URL = process.env.TARGET_URL || 'http://127.0.0.1:8777/';

(async () => {
  const browser = await engine.launch({ headless: true });
  let fail = 0;
  const t = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`); };
  const errors = [];
  const touch = engineName === 'chromium';
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: touch, hasTouch: touch, colorScheme: 'dark', serviceWorkers: 'block', locale: 'de-DE' });
  // Übungsbilder/-datenbank nicht echt von GitHub laden (bei vielen Testläufen blockt GitHub sonst)
  await ctx.route('https://raw.githubusercontent.com/**', r => r.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' }, body: '' }));
  const page = await ctx.newPage();
  // WebKit meldet abgewiesene Bild-Abrufe von GitHub als Seitenfehler, obwohl die App sie abfängt (Netz, kein App-Fehler)
  page.on('pageerror', e => { if (!/raw\.githubusercontent\.com.*access control/.test(e.message)) errors.push(e.message); });
  const cdp = touch ? await ctx.newCDPSession(page) : null;
  const okDialog = async () => { await page.locator('#dlg.show [data-dlg="1"]').waitFor(); await page.waitForTimeout(250); await page.locator('#dlg [data-dlg="1"]').click(); await page.waitForTimeout(600); };
  const closeAll = async () => { await page.evaluate(() => { if (sheetOpen) closeSheet(); }); await page.waitForTimeout(250); };

  await page.goto(URL); await page.locator('#view').waitFor();
  // Alter Stand (vor 1.1.0): Pausen pro Übung aus einem importierten Plan, allgemeine Pause 3 min
  await page.evaluate(async () => {
    const mk = (id, name, sets, rest, dbId) => ({ id, name, sets, repMin: 8, repMax: 12, reps: 10, weight: 40, rest, note: '', dbId: dbId || null,
      image: dbId ? { type: 'db', value: dbId + '/0.jpg' } : null, muscles: { p: ['chest'], s: [] }, alts: [] });
    const wd = (new Date().getDay() + 6) % 7, tomorrow = (wd + 1) % 7;
    S.plan = { days: [{ id: 'ok', name: 'Oberkörper (OK)', weekdays: [tomorrow], exercises: [mk('e1', 'Bankdrücken Kurzhantel', 2, 120, 'Dumbbell_Bench_Press'), mk('e2', 'Rudern', 1, 60), mk('e3', 'Latzug', 1, 90)] },
      { id: 'uk', name: 'Unterkörper (UK)', weekdays: [], exercises: [mk('u1', 'Beinpresse', 3, 120, 'Leg_Press')] }] };
    S.settings.rest = 180; S.settings.seenVersion = '1.0.1'; S.settings.setupDone = true; S.settings.name = 'Test';
    delete S.settings.restFix;
    await idb.set('state', S);
  });
  await page.reload(); await page.locator('#view').waitFor(); await page.waitForTimeout(500);
  await closeAll();

  // 1) Pausen aus dem alten Plan sind weg, es gilt die allgemeine Pause
  const r1 = await page.evaluate(() => ({ rests: S.plan.days.flatMap(d => d.exercises.map(e => e.rest)), fix: S.settings.restFix }));
  t(r1.rests.every(r => r === null) && r1.fix === true, `Einmalig: Pausen pro Übung zurückgesetzt (${r1.rests.join(', ')})`);
  await page.evaluate(() => startWorkout('ok')); await page.waitForTimeout(300);
  await page.locator('[data-act="toggleSet"][data-i="0"][data-j="0"]').click(); await page.waitForTimeout(200);
  t(await page.evaluate(() => T.total) === 180, 'Training: Timer nimmt die allgemeine Pause (180 s)');
  t(/3:00|2:59/.test(await page.locator('#timer b').textContent()), 'Timer zeigt 3:00');

  // 2) Eigene Pause pro Übung (im Plan eingetragen) gilt sofort, auch im laufenden Training; leer = wieder Standard
  await page.evaluate(() => { const e = findEx('e1'); e.rest = 75; });
  await page.locator('[data-act="toggleSet"][data-i="0"][data-j="0"]').click(); await page.waitForTimeout(100); // abwählen
  await page.locator('[data-act="toggleSet"][data-i="0"][data-j="0"]').click(); await page.waitForTimeout(200);
  t(await page.evaluate(() => T.total) === 75, 'Eigene Pause der Übung (75 s) gilt');
  await page.evaluate(() => { stopRest(); selectTab('plan'); openSub('ok'); }); await page.waitForTimeout(300);
  await page.locator('[data-act="editEx"][data-id="e1"]').click(); await page.waitForTimeout(300);
  t(await page.locator('#f-rest').inputValue() === '75' && /Standard: 180/.test(await page.locator('#f-rest').getAttribute('placeholder')), 'Übung bearbeiten: eigene Pause 75, Hinweis „Standard: 180 s“');
  await page.locator('#f-rest').fill(''); await page.locator('#sheet [data-act="saveEx"]').click(); await page.waitForTimeout(300);
  t(await page.evaluate(() => findEx('e1').rest) === null, 'Feld leeren = allgemeine Pause');
  t(/Standard-Pause/.test(await page.locator('#view').textContent()), 'Plan-Liste zeigt „Standard-Pause“');
  await page.evaluate(() => history.back()); await page.waitForTimeout(300);

  // 3) Plan-Link und Plan-Datei bringen keine fremden Pausen mit
  const linkRest = await page.evaluate(async () => {
    const p = await linkToPlan(await planToLink({ days: [{ name: 'X', weekdays: [], exercises: [{ name: 'A', repMin: 8, repMax: 10, weight: 0, sets: 3, rest: 45, alts: [] }] }] }));
    return p.days[0].exercises[0].rest;
  });
  t(linkRest === null, 'Plan-Link: Pause wird nicht übernommen');

  // 4) Mehr → Training: Schalter da, „zwischen den Übungen“ aus = nach dem letzten Satz einer Übung kein Timer
  await page.evaluate(() => selectTab('more')); await page.waitForTimeout(300);
  t(await page.locator('input[data-field="restBetween"]').isChecked(), 'Mehr: Schalter „Pausen-Timer auch zwischen den Übungen“ (an)');
  t(await page.locator('[data-act="info"][data-k="rest"]').count() === 1, 'Mehr → Training: i-Knopf mit Erklärung');
  await page.locator('input[data-field="restBetween"]').uncheck(); await page.waitForTimeout(200);
  t(await page.evaluate(() => S.settings.restBetween) === false, 'Schalter speichert „aus“');
  await page.evaluate(() => { selectTab('train'); goEx(1); }); await page.waitForTimeout(300); // Rudern: 1 Satz
  await page.locator('[data-act="toggleSet"][data-i="1"][data-j="0"]').click(); await page.waitForTimeout(200);
  t(await page.evaluate(() => !T.iv), 'Letzter Satz einer Übung: kein Timer (Schalter aus)');
  await page.evaluate(() => { S.settings.restBetween = true; const s = S.active.entries[1].sets[0]; s.done = false; render(); });
  await page.locator('[data-act="toggleSet"][data-i="1"][data-j="0"]').click(); await page.waitForTimeout(200);
  t(await page.evaluate(() => !!T.iv), 'Schalter an: Timer startet auch nach dem letzten Satz');

  // 5) Minimieren: Leiste unten mit Pause, antippen = zurück ins Training
  await page.locator('[data-act="minimize"]').click(); await page.waitForTimeout(500);
  t(await page.locator('#mini').isVisible() && !(await page.locator('#timer').isVisible()), 'Minimiert: Leiste sichtbar, großer Timer ausgeblendet');
  t(/Pause/.test(await page.locator('#mini').textContent()) && /Oberkörper/.test(await page.locator('#mini').textContent()), 'Leiste zeigt Training und Pause');
  await page.locator('#mini').click(); await page.waitForTimeout(500);
  t(await page.evaluate(() => V.tab === 'train' && document.body.classList.contains('focus')), 'Leiste antippen: zurück im Training (Vollbild)');
  t(!(await page.locator('#mini').isVisible()) && await page.locator('#timer').isVisible(), 'Im Training: Leiste weg, Timer wieder da');
  await page.evaluate(() => stopRest());
  await page.locator('[data-act="minimize"]').click(); await page.waitForTimeout(400);
  t(/läuft seit/.test(await page.locator('#mini').textContent()), 'Ohne Pause: Leiste zeigt die Trainingszeit');
  await page.locator('#mini').click(); await page.waitForTimeout(400);

  // 6) Deutsche Anleitung
  await page.evaluate(() => goEx(0)); await page.waitForTimeout(200);
  await page.locator('[data-act="exInfo"]').click(); await page.waitForTimeout(1200);
  const instr = await page.locator('#instr').textContent();
  t(/Anleitung/.test(instr) && !/Englisch/.test(instr) && /Kurzhantel/.test(instr), 'Anleitung auf Deutsch: ' + instr.slice(0, 70));
  await closeAll();

  // 7) Übung auslassen (Maschine kaputt) → im Training eingetragen
  await page.evaluate(() => goEx(2)); await page.waitForTimeout(300);
  await page.locator('[data-act="exOut"]').click(); await page.waitForTimeout(300);
  t(await page.locator('#dlg-in').inputValue() === 'Maschine kaputt', 'Auslassen: Grund „Maschine kaputt“ vorgeschlagen');
  await okDialog();
  const out = await page.evaluate(() => ({ out: S.active.entries[2].out, c: workoutCounts() }));
  t(out.out === 'Maschine kaputt', 'Übung als ausgelassen markiert');
  t(out.c.total === 3, `Ausgelassene Sätze zählen nicht mehr zur Gesamtzahl (${out.c.done}/${out.c.total})`);
  await page.evaluate(() => goEx(2)); await page.waitForTimeout(200);
  t(await page.locator('.out-box').isVisible() && await page.locator('[data-act="exIn"]').isVisible(), 'Ausgelassen-Hinweis mit „Doch machen“');
  await page.locator('[data-act="exIn"]').click(); await page.waitForTimeout(200);
  t(await page.evaluate(() => !S.active.entries[2].out), '„Doch machen“ hebt das Auslassen auf');
  await page.locator('[data-act="exOut"]').click(); await page.waitForTimeout(300); await okDialog();
  await page.evaluate(() => finishWorkout(false, '')); await page.waitForTimeout(500);
  await page.evaluate(() => closeCelebrate()); await page.waitForTimeout(300);
  await page.reload(); await page.locator('#view').waitFor(); await page.waitForTimeout(400); await closeAll();
  const logOut = await page.evaluate(() => S.logs[0].entries[2].out);
  t(logOut === 'Maschine kaputt', 'Nach Speichern + Neuladen steht „Maschine kaputt“ im Training');
  await page.evaluate(() => openLog(S.logs[0].id)); await page.waitForTimeout(300);
  t(/ausgelassen: Maschine kaputt/.test(await page.locator('#sheet').textContent()), 'Verlauf → Training zeigt „ausgelassen: Maschine kaputt“');
  await closeAll();

  // 8) Training nachtragen (Verlauf): Datum vorgestern, Uhrzeit und Dauer ändern
  await page.evaluate(() => selectTab('log')); await page.waitForTimeout(300);
  await page.locator('[data-act="backfillPick"]').click(); await page.waitForTimeout(300);
  const day2 = await page.evaluate(() => toIsoDate(addDays(dayStart(Date.now()), -2)));
  await page.locator('#bf-date').fill(day2);
  await page.locator('#sheet [data-act="backfill"][data-id="uk"]').click(); await page.waitForTimeout(300);
  t(/nachtragen/.test(await page.locator('#sheet h2').textContent()), 'Nachtragen: Bearbeiten-Fenster für das neue Training');
  await page.locator('#le-time').fill('07:30'); await page.locator('#le-dur').fill('45');
  const nBefore = await page.evaluate(() => S.logs.length);
  await page.locator('#sheet .sheet-bar [data-act="logEditSave"]').click(); await page.waitForTimeout(400);
  const bf = await page.evaluate(d => { const l = S.logs.find(x => x.added); const s = new Date(l.startedAt);
    return { n: S.logs.length, name: l.dayName, iso: toIsoDate(l.startedAt), hm: s.getHours() + ':' + s.getMinutes(), min: (l.endedAt - l.startedAt) / 60000,
      sets: l.entries[0].sets.filter(x => x.done).length, sorted: S.logs.every((x, i) => !i || S.logs[i - 1].startedAt >= x.startedAt) }; }, day2);
  t(bf.n === nBefore + 1 && bf.name === 'Unterkörper (UK)' && bf.iso === day2, `Nachgetragen: UK am ${bf.iso}`);
  t(bf.hm === '7:30' && bf.min === 45 && bf.sets === 3, `Uhrzeit 7:30, 45 min, 3 Sätze (${bf.hm}, ${bf.min}, ${bf.sets})`);
  t(bf.sorted, 'Verlauf bleibt nach Datum sortiert');
  t(/nachgetragen/.test(await page.locator('#sheet').textContent()), 'Training zeigt „nachgetragen“');
  await closeAll();
  // Abbrechen fügt nichts hinzu; Kalender bietet „Training nachtragen“ an vergangenen Tagen
  const yest = await page.evaluate(() => addDays(dayStart(Date.now()), -1));
  await page.evaluate(t => calDaySheet(t), yest); await page.waitForTimeout(300);
  await page.locator('#sheet [data-act="calBackfill"]').click(); await page.waitForTimeout(300);
  await page.locator('#sheet [data-act="backfill"]').first().click(); await page.waitForTimeout(300);
  await page.locator('#sheet [data-act="logEditCancel"]').click(); await page.waitForTimeout(300);
  t(await page.evaluate(n => S.logs.length === n && !sheetOpen, nBefore + 1), 'Kalender → Nachtragen → Abbrechen: nichts gespeichert');
  t(await page.evaluate(() => { calDaySheet(addDays(dayStart(Date.now()), 3)); const has = !!$('#sheet [data-act="calBackfill"]'); closeSheet(); return !has; }), 'Zukünftige Tage: kein „Nachtragen“');

  // Review-Fälle: altes Backup (vor 1.1.0) bringt keine Pausen mit; Nachtragen für heute während ein Training läuft
  await page.evaluate(() => {
    const st = clone(S); st.plan.days[0].exercises[0].rest = 120; delete st.settings.restFix;
    importData({ text: async () => JSON.stringify({ state: st }) });
  });
  await okDialog(); await page.waitForTimeout(400);
  t(await page.evaluate(() => S.plan.days[0].exercises[0].rest === null && S.settings.restFix === true), 'Altes Backup laden: Pausen pro Übung zurückgesetzt');
  await page.evaluate(() => startWorkout('ok')); await page.waitForTimeout(200);
  const nAct = await page.evaluate(() => S.logs.length);
  await page.evaluate(() => { backfillSheet(); $('#bf-date').value = toIsoDate(Date.now()); }); await page.waitForTimeout(200);
  await page.locator('#sheet [data-act="backfill"]').first().click(); await page.waitForTimeout(300);
  t(await page.evaluate(n => S.logs.length === n && !V.logEditNew, nAct), 'Nachtragen für heute während eines laufenden Trainings wird abgelehnt');
  await closeAll();
  await page.evaluate(() => { S.active = null; stopRest(); save(); render(); });

  // 9) Pausen-Benachrichtigung (Schreib-Attrappe statt echter Benachrichtigung)
  const notes = await page.evaluate(async () => {
    const shown = [];
    const reg = { showNotification: (title, o) => { shown.push(title); return Promise.resolve(); }, getNotifications: async () => [] };
    navigator.serviceWorker.getRegistration = async () => reg;
    Object.defineProperty(Notification, 'permission', { get: () => 'granted', configurable: true });
    S.settings.restNotify = true;
    if (!CAN_NOTIFY) return { skip: true };
    startRest(60);
    Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
    Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(r => setTimeout(r, 100));
    T.end -= 5000; tickRest(); // 5 s später: Benachrichtigung wird neu geschrieben
    await new Promise(r => setTimeout(r, 100));
    T.end = Date.now() - 1; tickRest();
    await new Promise(r => setTimeout(r, 100));
    delete document.hidden; delete document.visibilityState;
    return { shown };
  });
  if (notes.skip) console.log('SKIP Benachrichtigung (in diesem Browser nicht verfügbar)');
  else {
    const run = notes.shown.filter(s => /^Pause \d+:\d\d$/.test(s));
    t(run.length >= 2 && run[0] !== run[run.length - 1], 'Benachrichtigung: Timer läuft runter (' + run.join(' → ') + ')');
    t(notes.shown.includes('Pause vorbei – los!'), 'Benachrichtigung: „Pause vorbei – los!“ am Ende');
  }
  await page.evaluate(() => { S.settings.restNotify = false; stopRest(); });

  // 10) Gesten (nur Chrome): Fenster am Strich wegziehen, Kalendertag ziehen
  if (touch) {
    const drag = async (x0, y0, x1, y1, hold = 0) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
      if (hold) await page.waitForTimeout(hold);
      for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 10, y: y0 + (y1 - y0) * i / 10 }] }); await page.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(450);
    };
    await page.evaluate(() => backfillSheet()); await page.waitForTimeout(400);
    let g = await page.locator('#sheet .grabber').boundingBox();
    await drag(g.x + g.width / 2, g.y + 2, g.x + g.width / 2, g.y + 32);
    t(await page.evaluate(() => sheetOpen), 'Fenster: kurz ziehen (30 px) federt zurück');
    g = await page.locator('#sheet .grabber').boundingBox();
    await drag(g.x + g.width / 2, g.y + 2, g.x + g.width / 2, g.y + 320);
    t(await page.evaluate(() => !sheetOpen && $('#sheet').hidden), 'Fenster: am Strich nach unten ziehen schließt es');
    // Kalender: morgen geplanter Tag → übermorgen ziehen
    await page.evaluate(() => { selectTab('log'); scrollTo(0, 0); }); await page.waitForTimeout(400);
    const ts = await page.evaluate(() => [addDays(dayStart(Date.now()), 1), addDays(dayStart(Date.now()), 2)]);
    const src = page.locator(`.cal-d[data-t="${ts[0]}"]`), dst = page.locator(`.cal-d[data-t="${ts[1]}"]`);
    t(await src.getAttribute('data-drag') === '1', 'Kalender: geplanter Tag ist ziehbar');
    await src.scrollIntoViewIfNeeded();
    const a = await src.boundingBox(), b = await dst.boundingBox();
    await drag(a.x + a.width / 2, a.y + a.height / 2, b.x + b.width / 2, b.y + b.height / 2, 650);
    const moved = await page.evaluate(ts => ({ from: planOn(ts[0]).d, to: planOn(ts[1]).d, sheet: sheetOpen }), ts);
    t(moved.from === null && moved.to === 'ok' && !moved.sheet, `Kalender: Tag gedrückt halten und ziehen verschiebt das Training (${JSON.stringify(moved)})`);
    t(/Rückgängig/.test(await page.locator('#toast').textContent()), 'Verschieben bietet „Rückgängig“');
    // Kurz tippen öffnet weiterhin das Tagesfenster (nach dem Ziehen sind Tipps 0,6 s gesperrt)
    await page.waitForTimeout(700);
    const c = await dst.boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x + c.width / 2, y: c.y + c.height / 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(500);
    t(await page.evaluate(() => sheetOpen), 'Kalender: kurz tippen öffnet den Tag wie bisher');
    await closeAll();
    // Extra-Training bleibt beim Ziehen Extra (zählt nicht zum Wochenziel)
    const ex = await page.evaluate(() => { const a = addDays(dayStart(Date.now()), 3), b = addDays(dayStart(Date.now()), 5);
      S.cal = S.cal || {}; delete S.cal[b]; setPlan(a, 'uk', true); render(); return [a, b]; });
    await page.waitForTimeout(700);
    const ea = await page.locator(`.cal-d[data-t="${ex[0]}"]`).boundingBox(), eb = await page.locator(`.cal-d[data-t="${ex[1]}"]`).boundingBox();
    await drag(ea.x + ea.width / 2, ea.y + ea.height / 2, eb.x + eb.width / 2, eb.y + eb.height / 2, 650);
    const exm = await page.evaluate(ex => [planOn(ex[0]).d, planOn(ex[1]).d, planOn(ex[1]).x], ex);
    t(exm[0] === null && exm[1] === 'uk' && exm[2] === true, `Extra-Training bleibt beim Verschieben Extra (${JSON.stringify(exm)})`);
  }

  t(!errors.length, 'keine JavaScript-Fehler' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  process.exitCode = fail ? 1 : 0;
})();
