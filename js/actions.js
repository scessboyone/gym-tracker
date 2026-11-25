'use strict';
// Gym Tracker – Alle Aktionen (data-act) und Eingabe-Ereignisse.
// Alle Dateien in js/ teilen sich den globalen Bereich; Reihenfolge siehe index.html.

/* ---------- Aktionen ---------- */
// Beim Umschalten von Farbe/Darstellung den schon getippten Namen behalten (die Seite wird neu aufgebaut)
function keepNameDraft() { const i = $('#name-in'); if (i) V.nameDraft = i.value; }
const actions = {
  goPlan() { V.tab = 'plan'; render(); },
  async start(el) {
    if (S.active && !await ask('Neues Training starten?', 'Es läuft schon ein Training. Es wird verworfen.', 'Neu starten', true)) return;
    startWorkout(el.dataset.id);
  },
  toggleSet(el) {
    const i = +el.dataset.i, j = +el.dataset.j;
    const en = S.active.entries[i], s = en.sets[j];
    s.done = !s.done;
    save(); rerenderEntry(i);
    if (!s.done) return;
    if (navigator.vibrate) navigator.vibrate(15);
    // Kein Timer, wenn das ganze Training fertig ist – oder nach dem letzten Satz einer Übung, wenn das so eingestellt ist
    const exDone = en.sets.every(x => x.done), allDone = S.active.entries.every(entryDone);
    if (!allDone && !(exDone && S.settings.restBetween === false)) startRest(restFor(en)); else stopRest();
    // Rekord schon während des Trainings melden (einmal pro Übung)
    if (!en.prShown && isPR(s, bestSet(effId(en), en.name))) {
      en.prShown = true; save();
      toast(`Neuer Rekord: ${en.name} – ${kgTxt(s.weight)} × ${s.reps}`);
    }
    // Alle Sätze erledigt -> zur nächsten Übung scrollen
    if (en.sets.every(x => x.done)) {
      const next = $('#en-' + (i + 1));
      if (next) setTimeout(() => next.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    }
  },
  bump(el) { bumpEntry(+el.dataset.i, num(el.dataset.v)); },
  async bumpCustom(el) {
    const v = await askText('Um wie viel erhöhen?', { value: '2,5', inputmode: 'decimal', unit: 'kg', ok: 'Erhöhen' });
    if (v === null) return;
    const n = num(v);
    if (n <= 0) { toast('Bitte eine Zahl größer 0 eingeben'); return; }
    bumpEntry(+el.dataset.i, n);
  },
  addSet(el) {
    const i = +el.dataset.i, en = S.active.entries[i];
    const last = en.sets[en.sets.length - 1] || findEx(en.exId) || { weight: 0, reps: 10 };
    en.sets.push({ weight: last.weight, reps: last.reps, done: false });
    save(); rerenderEntry(i);
  },
  removeSet(el) {
    const i = +el.dataset.i, en = S.active.entries[i];
    en.sets.pop(); save(); rerenderEntry(i);
  },
  exInfo(el) { exInfo(+el.dataset.i); },
  finish() { finishSheet(); },
  exPrev() { if (S.active && S.active.pos > 0) goEx(S.active.pos - 1); },
  exNext() {
    const A = S.active; if (!A) return;
    if (A.pos >= A.order.length - 1) { finishSheet(); return; }
    goEx(A.pos + 1);
  },
  exGo(el) { goEx(+el.dataset.k); },
  minimize() { selectTab('home'); },
  resume() { if (S.active) selectTab('train'); },
  // Übung auslassen (z. B. Maschine kaputt): mit Grund im Training eintragen, weiter zur nächsten Übung
  async exOut(el) {
    const A = S.active, i = +el.dataset.i, en = A && A.entries[i];
    if (!en) return;
    const why = await askText('Übung auslassen?', { text: `${en.name} wird im Training als ausgelassen eingetragen. Grund (optional):`, value: 'Maschine kaputt', placeholder: 'z. B. Maschine kaputt', ok: 'Auslassen' });
    if (why === null || S.active !== A) return;
    en.out = why.trim().slice(0, 80) || 'Ausgelassen';
    save(); // eine laufende Pause von der Übung davor läuft weiter
    // weiter zur nächsten noch offenen Übung (sonst bleiben)
    const k = A.order.findIndex((idx, k) => k > A.pos && !entryDone(A.entries[idx]));
    if (k >= 0) goEx(k); else { render(); scrollTo(0, 0); }
    toast(`${en.name}: ausgelassen`);
  },
  exIn(el) {
    const en = S.active && S.active.entries[+el.dataset.i];
    if (!en) return;
    delete en.out; save(); render();
  },
  exSkip() {
    const A = S.active; if (!A || A.pos >= A.order.length - 1) return;
    const [idx] = A.order.splice(A.pos, 1);
    A.order.push(idx);
    A.entries[idx].skipped = true;
    save(); render(); scrollTo(0, 0); slideIn(1);
    toast(`${A.entries[idx].name} kommt am Ende nochmal`);
  },
  finishSave() { finishWorkout($('#applyPlan').checked, $('#finishNote').value.trim()); },
  async cancelWorkout() {
    if (!await ask('Training verwerfen?', 'Die Sätze dieses Trainings werden nicht gespeichert.', 'Verwerfen', true)) return;
    S.active = null; stopRest(); save(); render();
  },
  closeSheet() { closeSheet(); },
  tAdd(el) { T.end += (+el.dataset.d) * 1000; if (T.end < Date.now()) T.end = Date.now(); tickRest(); },
  tStop() { stopRest(); },

  addDay() {
    const d = { id: uid(), name: 'Neuer Tag', weekdays: [], exercises: [] };
    S.plan.days.push(d); save(); openSub(d.id);
    setTimeout(() => { const f = $('[data-field="dayName"]'); if (f) { f.focus(); f.select(); } }, 50);
  },
  openDay(el) { openSub(el.dataset.id); },
  back() { history.back(); },
  moveDay(el) { move(S.plan.days, el.dataset.id, +el.dataset.d); save(); render(); },
  async deleteDay() {
    const d = findDay(V.sub);
    if (!d || !await ask(`„${d.name}“ löschen?`, 'Der Tag wird mit allen Übungen gelöscht. Der Verlauf bleibt erhalten.', 'Löschen', true)) return;
    withUndo(`„${d.name || 'Tag'}“ gelöscht`, () => { S.plan.days = S.plan.days.filter(x => x.id !== d.id); save(); });
    history.back();
  },
  newEx() { editExSheet(V.sub, null); },
  editEx(el) { editExSheet(V.sub, el.dataset.id); },
  moveEx(el) { move(findDay(V.sub).exercises, el.dataset.id, +el.dataset.d); save(); render(); },
  saveEx() { saveEx(); },
  deleteEx() {
    const day = findDay(D.dayId);
    const e = day.exercises.find(x => x.id === D.ex.id);
    const img = e && e.image && e.image.type === 'local' ? e.image.value : null;
    withUndo(`„${D.ex.name || 'Übung'}“ gelöscht`, () => {
      day.exercises = day.exercises.filter(x => x.id !== D.ex.id); save();
    }, img ? () => { idb.del('img:' + img); delete localImgs[img]; } : null);
    closeSheet(); render();
  },
  imgDb() { openDbSearch(); },
  pickSuggest(el) {
    const e = EXDB && EXDB.find(x => x.id === el.dataset.id);
    if (!e) return;
    readDraftFields();
    const c = cur();
    c.name = e.name; c.dbId = e.id; c.image = { type: 'db', value: e.images[0] };
    c.muscles = musclesFromDb(e) || c.muscles;
    drawExSheet();
    toast('Übernommen – Name kannst du noch anpassen');
  },
  pickOwn() {
    readDraftFields();
    const c = cur();
    c.dbId = null; c.image = null;
    $('#sug').innerHTML = '';
    $('#f-name').blur();
    toast('Eigene Übung – Muskeln unten antippen');
  },
  pickDb(el) {
    const e = EXDB.find(x => x.id === el.dataset.id);
    if (!e) return;
    readDraftFields();
    const c = cur();
    c.dbId = e.id; c.image = { type: 'db', value: e.images[0] };
    if (!c.name) c.name = e.name;
    c.muscles = musclesFromDb(e);
    toast('Muskeln übernommen: ' + (e.name));
    drawExSheet();
  },
  cycleMuscle(el) {
    readDraftFields();
    const c = cur(), k = el.dataset.m;
    c.muscles = c.muscles || { p: [], s: [] };
    const { p, s } = c.muscles;
    if (p.includes(k)) { c.muscles.p = p.filter(x => x !== k); c.muscles.s = [...s, k]; }
    else if (s.includes(k)) c.muscles.s = s.filter(x => x !== k);
    else c.muscles.p = [...p, k];
    const top = $('#sheet').scrollTop; drawExSheet(); $('#sheet').scrollTop = top;
  },
  async editNote(el) {
    const i = +el.dataset.i, en = S.active.entries[i];
    const pe = findEx(effId(en));
    if (!pe) { toast('Übung ist nicht mehr im Plan'); return; }
    const t = await askText('Notiz', { text: pe.name, value: pe.note || '', placeholder: 'z. B. Sitz Stufe 5, Griff eng', multiline: true });
    if (t === null) return;
    pe.note = t.trim(); save(); rerenderEntry(i);
    toast(pe.note ? 'Notiz gespeichert' : 'Notiz gelöscht');
  },
  addAlt() {
    readDraftFields();
    const m = D.ex;
    m.alts.push({ id: uid(), name: '', repMin: m.repMin, repMax: m.repMax, reps: m.repMin, weight: 0, note: '', dbId: null, image: null });
    D.alt = m.alts.length - 1; drawExSheet(); $('#sheet').scrollTop = 0;
    setTimeout(() => { const f = $('#f-name'); if (f) f.focus(); }, 50);
  },
  editAlt(el) { readDraftFields(); D.alt = +el.dataset.k; drawExSheet(); $('#sheet').scrollTop = 0; },
  altDone() {
    readDraftFields();
    if (!cur().name) { toast('Bitte einen Namen für die Alternative eingeben'); return; }
    D.alt = null; drawExSheet();
  },
  async deleteAlt() {
    if (!await ask('Alternative löschen?', 'Ihr bisheriger Verlauf bleibt erhalten.', 'Löschen', true)) return;
    D.ex.alts.splice(D.alt, 1); D.alt = null; drawExSheet();
  },
  // Wechselt reihum zur nächsten Variante (Hauptübung → Alternative 1 → … → Hauptübung)
  switchVar(el) {
    const i = +el.dataset.i, en = S.active.entries[i];
    const base = findEx(en.exId);
    if (!base || !(base.alts || []).length) return;
    // Sonst würden die schon gemachten Sätze der anderen Übung zugerechnet (Verlauf, Rekorde)
    if (en.sets.some(s => s.done)) { toast('Wechseln geht nur vor dem ersten abgehakten Satz'); return; }
    const ids = [base.id, ...base.alts.map(a => a.id)];
    const next = ids[(ids.indexOf(effId(en)) + 1) % ids.length];
    en.varId = next === base.id ? null : next;
    const v = findEx(next);
    en.name = v.name; en.image = v.image; en.bumped = false; en.prShown = false;
    for (const s of en.sets) if (!s.done) { s.weight = v.weight; s.reps = v.reps || v.repMin; }
    save(); rerenderEntry(i);
    toast('Gewechselt zu ' + v.name);
  },

  openLog(el) { openLog(el.dataset.id); },
  logEdit(el) { const l = S.logs.find(x => x.id === el.dataset.id); if (!l) return; V.logEdit = clone(l); V.logEditNew = false; V.logEditFrom = l.startedAt; logEditSheet(); },
  logEditCancel() {
    const id = V.logEdit && V.logEdit.id, isNew = V.logEditNew;
    V.logEdit = null; V.logEditNew = false;
    if (isNew) closeSheet(); else openLog(id);
  },
  leToggle(el) { leRead(); const s = V.logEdit.entries[+el.dataset.i].sets[+el.dataset.j]; s.done = !s.done; logEditSheet(); },
  leAddSet(el) { leRead(); const e = V.logEdit.entries[+el.dataset.i], last = e.sets[e.sets.length - 1] || { weight: 0, reps: 10 }; e.sets.push({ weight: last.weight, reps: last.reps, done: true }); logEditSheet(); },
  leRemSet(el) { leRead(); V.logEdit.entries[+el.dataset.i].sets.pop(); logEditSheet(); },
  logEditSave() {
    leRead();
    const E = V.logEdit, i = S.logs.findIndex(x => x.id === E.id), isNew = V.logEditNew;
    if (E.startedAt > Date.now()) { toast('Die Uhrzeit liegt in der Zukunft'); return; }
    if (isNew) S.logs.push(E);
    else if (i < 0) { closeSheet(); return; } else S.logs[i] = E;
    const from = isNew ? E.startedAt : Math.min(E.startedAt, V.logEditFrom || E.startedAt);
    V.logEdit = null; V.logEditNew = false;
    S.logs.sort((a, b) => b.startedAt - a.startedAt); // neueste zuerst (Uhrzeit kann sich geändert haben)
    // Das geänderte Training ist Vergleichswert für alle späteren: deren Rekorde ebenfalls neu bestimmen
    for (const l of S.logs) if (l.startedAt >= from) l.prs = recomputePrs(l);
    save(); render(); openLog(E.id); toast(isNew ? 'Training nachgetragen' : 'Training geändert');
  },
  // Training nachtragen: Tag wählen (Kalender oder Verlauf), dann wie „Bearbeiten“ anpassen und sichern
  calBackfill(el) { calDaySheet(+el.dataset.t, 'log'); },
  backfillPick() { backfillSheet(); },
  backfill(el) {
    let t = el.dataset.t ? +el.dataset.t : null;
    if (t == null) { const v = $('#bf-date') && $('#bf-date').value; t = v ? dayStart(new Date(v + 'T12:00').getTime()) : NaN; }
    if (!Number.isFinite(t) || t > dayStart(Date.now())) { toast('Bitte ein Datum bis heute wählen'); return; }
    if (S.active && t === dayStart(Date.now())) { toast('Heute läuft schon ein Training – beende es einfach normal'); return; }
    const log = backfillLog(t, el.dataset.id);
    if (!log) return;
    V.logEdit = log; V.logEditNew = true; logEditSheet();
  },
  calDay(el) { calDaySheet(+el.dataset.t); },
  calMove(el) { calDaySheet(+el.dataset.t, 'move'); },
  calPick(el) { calDaySheet(+el.dataset.t, 'pick'); },
  calMoveTo(el) {
    const t = +el.dataset.t, to = +el.dataset.to, p = planOn(t), d = p.d;
    setPlan(t, null); setPlan(to, d, p.x); // Extra-Training bleibt Extra
    save(); closeSheet(); render();
    toast(`${findDay(d).name} → ${dateLabel(to)}`);
  },
  calSetDay(el) {
    const t = +el.dataset.t;
    setPlan(t, el.dataset.id, el.dataset.x === '1');
    save(); closeSheet(); render();
    toast(el.dataset.x === '1' ? 'Extra-Training eingeplant' : 'Training geändert');
  },
  async calOff(el) {
    const t = +el.dataset.t, d = planOn(t).d;
    if (!await ask('Training ausfallen lassen?', `${findDay(d).name} am ${dateLabel(t, true)} wird gestrichen und zählt nicht zum Wochenziel.`, 'Ausfallen lassen', true)) return;
    setPlan(t, null);
    save(); closeSheet(); render();
  },
  calReset(el) {
    const t = +el.dataset.t;
    if (S.cal) delete S.cal[t];
    save(); calDaySheet(t); render();
  },
  calStart(el) { closeSheet(); startWorkout(el.dataset.id); },
  toggleSick(el) {
    const t = +el.dataset.t;
    S.sick = S.sick || [];
    S.sick = S.sick.includes(t) ? S.sick.filter(x => x !== t) : [...S.sick, t];
    save(); closeSheet(); render();
  },
  openLogFromCal(el) { openLog(el.dataset.id); },
  addBw() {
    const kg = num($('#bw').value);
    if (kg < 20 || kg > 400) { toast('Bitte ein Gewicht in kg eingeben (z. B. 82,5)'); return; }
    const ti = $('#bw-qtime');
    const time = ti && !ti.dataset.auto ? ti.value || null : hhmm();
    addBodyEntry(time ? bwWhen(toIsoDate(Date.now()), time) : Date.now(), kg, time);
    save(); render(); toast(`${fmtKg(kg)} um ${time || hhmm()} Uhr eingetragen`);
  },
  openWeight() { V.tab = 'log'; openSub('weight'); },
  openExList() { openSub('ex'); },
  openMonth(el) {
    const from = V.tab;
    if (from !== 'log') selectTab('log');
    V.backTab = from !== 'log' ? from : null; // Zurück führt wieder dorthin
    openSub('month:' + el.dataset.k);
  },
  openYear(el) {
    const from = V.tab;
    if (from !== 'log') selectTab('log');
    V.backTab = from !== 'log' ? from : null;
    openSub('year:' + el.dataset.y);
  },
  yearGo(el) { if (!el.dataset.y) return; V.sub = 'year:' + el.dataset.y; history.replaceState({ sub: V.sub }, ''); render(); },
  monthGo(el) { V.sub = 'month:' + el.dataset.k; history.replaceState({ sub: V.sub }, ''); render(); },
  openEx(el) { openSub('ex:' + el.dataset.name); },
  setTheme(el) { keepNameDraft(); S.settings.theme = el.dataset.v; save(); applyTheme(); render(); },
  setRest(el) { keepNameDraft(); S.settings.rest = +el.dataset.v; save(); render(); },
  setAccent(el) { keepNameDraft(); S.settings.accent = el.dataset.v; save(); applyTheme(); render(); },
  toggleList(el) { V[el.dataset.k] = !V[el.dataset.k]; render(); },
  goTab(el) { selectTab(el.dataset.tab); },
  saveName() {
    const v = $('#name-in').value.trim();
    S.settings.name = v.slice(0, 30); S.settings.setupDone = true; V.nameDraft = ''; save(); render();
  },
  bwRange(el) { bwRange = el.dataset.r; render(); },
  bwAddDated() {
    const ti = $('#bw-time'), today = $('#bw-date').value === toIsoDate(Date.now());
    const kg = num($('#bw-kg').value), time = ti.dataset.auto && today ? hhmm() : ti.value || null, t = bwWhen($('#bw-date').value, time);
    if (kg < 20 || kg > 400) { toast('Bitte ein Gewicht in kg eingeben (z. B. 82,5)'); return; }
    if (!t || dayStart(t) > dayStart(Date.now())) { toast('Bitte ein gültiges Datum wählen'); return; }
    addBodyEntry(t, kg, time);
    save(); render(); toast(`${fmtKg(kg)} am ${ddmm(t)}${time ? ' um ' + time + ' Uhr' : ''} eingetragen`);
  },
  clearTime(el) { const i = $('#' + el.dataset.for); i.value = ''; delete i.dataset.auto; el.hidden = true; },
  async bwGoal() {
    const v = await askText('Zielgewicht', { text: 'Wird als Linie im Diagramm angezeigt. Leer lassen = kein Ziel.', value: S.settings.goalKg ? fmtIn(S.settings.goalKg) : '', inputmode: 'decimal', unit: 'kg' });
    if (v === null) return;
    const n = num(v);
    if (v.trim() && (n < 20 || n > 400)) { toast('Bitte ein Gewicht in kg eingeben'); return; }
    S.settings.goalKg = v.trim() ? n : null;
    save(); render();
  },
  bwEdit(el) { bwEditSheet(+el.dataset.t); },
  bwSave(el) {
    const old = +el.dataset.t, kg = num($('#bwe-kg').value), time = $('#bwe-time').value || null;
    const prev = (S.body || []).find(p => p.t === old);
    const t = bwWhen($('#bwe-date').value, time, prev && !prev.time ? old : null);
    if (kg < 20 || kg > 400) { toast('Bitte ein Gewicht in kg eingeben'); return; }
    if (!t) { toast('Bitte ein gültiges Datum wählen'); return; }
    S.body = (S.body || []).filter(p => p.t !== old);
    addBodyEntry(t, kg, time);
    save(); closeSheet(); render(); toast('Eintrag gespeichert');
  },
  bwDel(el) {
    const t = +el.dataset.t;
    withUndo('Gewichtseintrag gelöscht', () => { S.body = (S.body || []).filter(p => p.t !== t); save(); });
    closeSheet(); render();
  },
  deleteLog(el) {
    withUndo('Training gelöscht', () => { S.logs = S.logs.filter(l => l.id !== el.dataset.id); save(); });
    closeSheet(); render();
  },
  async install() { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; render(); },
  driveBackup() { if (DRIVE_DIRECT) driveUpload(); else exportData('share'); },
  driveRestore() { driveRestore(); },
  fileBackup() { exportData('file'); },
  sharePlan() { exportPlan(); },
  sharePlanLink() { sharePlanLink(); },
  pastePlanLink() { pastePlanLink(); },
  heatRange(el) { V.heat = el.dataset.r; render(); },
  openMuscles() { openSub('muscles'); },
  backupHelp(el) { backupHelpSheet(el.dataset.v || (IS_IOS ? 'ios' : 'android')); },
  info(el) { const i = INFO[el.dataset.k]; if (i) dialog({ title: i.t, text: i.x, ok: 'Alles klar', cancel: null }); },
  toggleWd(el) {
    const d = findDay(V.sub), i = +el.dataset.wd;
    if (!d) return;
    d.weekdays = d.weekdays || [];
    d.weekdays = d.weekdays.includes(i) ? d.weekdays.filter(x => x !== i) : [...d.weekdays, i].sort();
    save(); el.classList.toggle('on');
  },
  async wipe() {
    if (!await ask('Alle Daten löschen?', 'Plan, Verlauf und Einstellungen auf diesem Handy werden gelöscht. Das kann nicht rückgängig gemacht werden.', 'Alles löschen', true)) return;
    for (const k of await idb.keys()) await idb.del(k);
    location.reload();
  },
};
function move(arr, id, d) {
  const i = arr.findIndex(x => x.id === id), j = i + d;
  if (i < 0 || j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
