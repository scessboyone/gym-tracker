'use strict';
// Gym Tracker – Laufendes Training (Vollbild) und Info-Sheet zu einer Übung.
// Alle Dateien in js/ teilen sich den globalen Bereich; Reihenfolge siehe index.html.

/* ----- Training: läuft ----- */
function lastSetsOf(exId, name) {
  for (const l of S.logs) {
    const en = l.entries.find(e => e.exId === exId) || l.entries.find(e => e.name === name);
    if (en && en.sets.some(s => s.done)) return en.sets.filter(s => s.done);
  }
  return null;
}
function summarize(sets) {
  if (!sets || !sets.length) return '';
  const same = sets.every(s => s.weight === sets[0].weight && s.reps === sets[0].reps);
  if (same) return `${kgTxt(sets[0].weight)} mit ${sets.length} × ${sets[0].reps} Wdh.`;
  // Gleiche Gewichte zusammenfassen: „67,5 kg mit 10, 9, 8 Wdh.“
  const g = [];
  for (const x of sets) { const l = g[g.length - 1]; if (l && l.w === x.weight) l.r.push(x.reps); else g.push({ w: x.weight, r: [x.reps] }); }
  return g.map(x => `${kgTxt(x.w)} mit ${x.r.join(', ')} Wdh.`).join('; ');
}
function workoutCounts() {
  let done = 0, total = 0;
  // Ausgelassene Übungen (z. B. Maschine kaputt) zählen nur mit ihren schon gemachten Sätzen
  for (const en of S.active.entries) for (const s of en.sets) { if (s.done) { done++; total++; } else if (!en.out) total++; }
  return { done, total };
}
// Reihenfolge der Übungen im laufenden Training (Überspringen schiebt eine Übung ans Ende)
function ensureOrder(A) {
  if (!Array.isArray(A.order) || A.order.length !== A.entries.length) A.order = A.entries.map((_, i) => i);
  A.pos = Math.min(Math.max(0, A.pos || 0), A.order.length - 1);
}
// Trainingszeit ohne Pausen: pausedAt friert die Uhr ein, beim Fortsetzen rückt startedAt nach
const workoutMs = A => (A.pausedAt || Date.now()) - A.startedAt;
function resumeWorkout(A) { if (A.pausedAt) { A.startedAt += Date.now() - A.pausedAt; delete A.pausedAt; } }
const entryDone = en => !!en.out || (en.sets.length > 0 && en.sets.every(s => s.done));
function workoutHead() {
  const A = S.active;
  const { done, total } = workoutCounts();
  const n = A.order.length, en = A.entries[A.order[A.pos]];
  const next = A.pos < n - 1 ? A.entries[A.order[A.pos + 1]].name : '';
  return `<section class="wk-head" id="wk-head">
    <div class="wk-meta"><span class="wk-title">${esc(A.dayName)}${A.pausedAt ? ' · pausiert' : ''}</span><span>${done} / ${total} Sätze<b id="elapsed"${A.pausedAt ? ' class="paused"' : ''}>${fmtDur(workoutMs(A))}</b></span></div>
    <div class="steps" role="tablist" aria-label="Übungen">${A.order.map((idx, k) => {
      const e = A.entries[idx], d = e.sets.filter(x => x.done).length, pct = e.out ? 100 : e.sets.length ? (d / e.sets.length) * 100 : 0;
      return `<button class="step${k === A.pos ? ' on' : ''}${entryDone(e) ? ' done' : ''}${e.out ? ' out' : ''}" data-act="exGo" data-k="${k}" role="tab" aria-selected="${k === A.pos}" aria-label="${esc(e.name)}"><i style="width:${pct}%"></i></button>`;
    }).join('')}</div>
    <div class="wk-step">Übung ${A.pos + 1} von ${n}${en.out ? '<span class="sep" aria-hidden="true"></span>ausgelassen' : en.skipped && !entryDone(en) ? '<span class="sep" aria-hidden="true"></span>übersprungen, jetzt nachholen' : next ? `<span class="sep" aria-hidden="true"></span>danach ${esc(next)}` : ''}</div>
  </section>`;
}
function renderWorkout() {
  const A = S.active;
  ensureOrder(A);
  if (!A.order.length) { // Training ohne Übungen (ältere Version): nicht abstürzen, nur verwerfen anbieten
    setTop('Training');
    return '<div class="empty"><b>Keine Übungen</b>Dieses Training hat keine Übungen.</div><button class="btn block" data-act="cancelWorkout">Training verwerfen</button>';
  }
  setTop('', `<button class="linkbtn" data-act="minimize" aria-label="Training minimieren">${ICON.down}Minimieren</button>`, '<button class="linkbtn" data-act="finish">Beenden</button>');
  const i = A.order[A.pos], last = A.pos === A.order.length - 1, out = !!A.entries[i].out;
  return `${workoutHead()}
    ${renderEntry(A.entries[i], i)}
    <div class="list wk-more">
      <button class="row" data-act="exPause">${A.pausedAt ? 'Training fortsetzen' : 'Training pausieren'}</button>
      ${last || out ? '' : '<button class="row" data-act="exSkip">Übung überspringen und später machen</button>'}
      ${out ? '' : `<button class="row" data-act="exOut" data-i="${i}">Übung auslassen</button>`}
      <button class="row danger" data-act="cancelWorkout">Training verwerfen</button>
    </div>
    <div class="wk-nav glass">
      <button class="btn" data-act="exPrev" ${A.pos === 0 ? 'disabled' : ''}>${ICON.back}Zurück</button>
      <button class="btn primary" data-act="exNext">${last ? 'Training beenden' : `Weiter${ICON.chev}`}</button>
    </div>`;
}
function goEx(k) {
  const A = S.active; if (!A) return;
  const dir = Math.sign(k - A.pos);
  A.pos = k; save(); render(); scrollTo(0, 0);
  if (dir) slideIn(dir);
}
function renderEntry(en, i) {
  const base = findEx(en.exId);            // Hauptübung (Sätze, Pause)
  const pe = findEx(effId(en)) || base;    // gewählte Variante (Gewicht, Wdh., Bild, Notiz)
  const lastSets = lastSetsOf(effId(en), en.name);
  const last = summarize(lastSets);
  const allDone = en.sets.length && en.sets.every(s => s.done);
  const sets = base ? base.sets : en.sets.length;
  const target = pe ? `Ziel: ${sets} × ${repTxt(pe)} Wdh.` : '';
  const levelUp = pe && pe.repMax && lastSets && lastSets.length >= sets && lastSets.every(s => s.reps >= pe.repMax);
  const variants = base && (base.alts || []).length ? [base, ...base.alts] : null;
  // Ausgelassen (z. B. Maschine kaputt): Grund zeigen, Sätze ausblenden, „Doch machen“ holt sie zurück
  if (en.out) return `<article class="card ex ex-focus ex-out" id="en-${i}">
    <div class="ex-title"><h2 class="ex-name">${esc(en.name)}</h2></div>
    <div class="out-box"><b>Ausgelassen</b><span>${esc(en.out)}</span>
      ${en.sets.some(s => s.done) ? `<span class="sub">${pl(en.sets.filter(s => s.done).length, 'Satz', 'Sätze')} davor gemacht – bleiben gespeichert</span>` : ''}</div>
    ${variants ? '<p class="sub">Tipp: Statt auslassen kannst du nach „Doch machen“ mit dem Pfeil-Knopf zur Alternative wechseln.</p>' : ''}
    <button class="btn block" data-act="exIn" data-i="${i}">Doch machen</button>
  </article>`;
  return `<article class="card ex ex-focus ${allDone ? 'done' : ''}" id="en-${i}">
    <div class="ex-title">
      <h2 class="ex-name">${esc(en.name)}</h2>
      ${variants ? `<button class="iconbtn sw" data-act="switchVar" data-i="${i}" aria-label="Übung wechseln" title="Wechseln zu: ${esc(variants.filter(o => o.id !== effId(en)).map(o => o.name).join(', '))}">${ICON.swap}</button>` : ''}
    </div>
    <button class="ex-fig" data-act="exInfo" data-i="${i}" aria-label="Muskeln und Anleitung zu ${esc(en.name)}">
      ${exThumb(pe || en, 'musbig')}
      <span class="ex-fig-hint">Anleitung${ICON.chev}</span>
    </button>
    ${target ? `<div class="sub">${target}</div>` : ''}
    ${last ? `<div class="sub">Letztes Mal: ${esc(last)}</div>` : ''}
    ${pe ? `<button class="note ${pe.note ? '' : 'blank'}" data-act="editNote" data-i="${i}" aria-label="Notiz bearbeiten">${ICON.edit}<span>${pe.note ? esc(pe.note) : 'Notiz hinzufügen'}</span></button>` : ''}
    ${levelUp && !en.bumped ? `<div class="bump">
      <div class="sub" style="color:var(--green);margin-bottom:8px">Ziel letztes Mal geschafft! Um wie viel erhöhen?</div>
      <div class="btnrow">${[1, 2.5, 5].map(v => `<button class="btn small" data-act="bump" data-i="${i}" data-v="${v}">+${fmtNum(v)} kg</button>`).join('')}
        <button class="btn small" data-act="bumpCustom" data-i="${i}">Andere</button>
        <button class="btn small ghost" data-act="bump" data-i="${i}" data-v="0">Nein</button></div>
    </div>` : ''}
    <div class="sets">
      <div class="set-row hdr"><span>Satz</span><span>kg</span><span>Wdh.</span><span></span></div>
      ${en.sets.map((s, j) => `<div class="set-row ${s.done ? 'done' : ''}">
        <span class="set-no">${j + 1}</span>
        <input inputmode="decimal" enterkeyhint="next" data-field="weight" data-i="${i}" data-j="${j}" value="${fmtIn(s.weight)}" aria-label="Gewicht in kg">
        <input inputmode="numeric" enterkeyhint="done" data-field="reps" data-i="${i}" data-j="${j}" value="${int(s.reps, 0)}" aria-label="Wiederholungen">
        <button class="check" data-act="toggleSet" data-i="${i}" data-j="${j}" aria-label="Satz abhaken">${ICON.check}</button>
      </div>`).join('')}
    </div>
    <div class="ex-actions">
      <button class="btn small" data-act="addSet" data-i="${i}">+ Satz</button>
      <button class="btn small" data-act="removeSet" data-i="${i}" ${en.sets.length ? '' : 'disabled'}>− Satz</button>
    </div>
  </article>`;
}
function bumpEntry(i, kg) {
  const en = S.active.entries[i];
  const pe = findEx(effId(en));
  en.bumped = true;
  if (kg > 0) {
    for (const s of en.sets) if (!s.done) { s.weight = Math.round((s.weight + kg) * 100) / 100; if (pe && pe.repMin) s.reps = pe.repMin; }
    toast(`${en.name}: +${fmtNum(kg)} kg – auf geht's!`);
  }
  save(); rerenderEntry(i);
}
// Bester Satz einer Übung im Verlauf (höchstes Gewicht, bei Gleichstand mehr Wdh.)
function bestSet(exId, name, excludeId) {
  let best = null;
  for (const l of S.logs) {
    if (l.id === excludeId) continue;
    for (const e of l.entries) {
      if (!(exId && e.exId === exId) && e.name !== name) continue;
      for (const s of e.sets) {
        if (s.done && (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps))) best = { weight: s.weight, reps: s.reps, t: l.startedAt };
      }
    }
  }
  return best;
}
// Erstes Mal zählt nicht als Rekord (nur Ausgangswert)
const isPR = (s, best) => !!best && (s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps));
function rerenderEntry(i) {
  const el = $('#en-' + i);
  if (el) el.outerHTML = renderEntry(S.active.entries[i], i);
  const h = $('#wk-head');
  if (h) { ensureOrder(S.active); h.outerHTML = workoutHead(); }
}
function tickElapsed() {
  const el = $('#elapsed');
  if (el && S.active) el.textContent = fmtDur(workoutMs(S.active));
  if (S.active && !T.iv) updateMini(); // Trainingszeit in der Leiste (während der Pause zählt tickRest)
}
setInterval(tickElapsed, 1000);

function startWorkout(dayId) {
  const d = findDay(dayId);
  if (!d) return;
  if (!d.exercises.length) { toast(`„${d.name}“ hat noch keine Übungen – leg sie unter Plan an`); return; }
  S.active = {
    id: uid(), dayId: d.id, dayName: d.name, startedAt: Date.now(),
    entries: d.exercises.map(e => {
      // zuletzt benutzte Variante wieder vorauswählen
      let varId = null;
      for (const l of S.logs) {
        const le = l.entries.find(x => x.baseId === e.id);
        if (le) { if ((e.alts || []).some(a => a.id === le.exId)) varId = le.exId; break; }
      }
      const v = (varId && findEx(varId)) || e;
      return {
        exId: e.id, varId, name: v.name, rest: e.rest ?? null, image: v.image, // null = allgemeine Pause (restFor)
        sets: Array.from({ length: Math.max(1, e.sets) }, () => ({ weight: v.weight, reps: v.reps || v.repMin, done: false })),
      };
    }),
  };
  V.tab = 'train';
  save(); render(); scrollTo(0, 0);
}
function finishSheet() {
  const { done, total } = workoutCounts();
  openSheet(`<div class="sheet-head"><h2>Training beenden</h2></div>
    <p class="sub">${done} von ${total} Sätzen erledigt${SEP}Dauer ${fmtDur(workoutMs(S.active))}</p>
    <label class="field"><span>Notiz zum Training (optional)</span>
      <textarea class="input" id="finishNote" placeholder="z. B. Schulter gezwickt, schlecht geschlafen …"></textarea></label>
    <div class="list"><label class="toggle"><span>Gewichte und Wiederholungen als neuen Standard in den Plan übernehmen</span>
      <input type="checkbox" id="applyPlan" checked></label></div>
    <button class="btn primary block" data-act="finishSave">Speichern</button>
    <button class="btn ghost block" data-act="closeSheet">Weiter trainieren</button>`);
}
function finishWorkout(apply, note) {
  const A = S.active;
  resumeWorkout(A); // endedAt = jetzt; die Pausenzeit steckt schon in startedAt
  const prs = [];
  for (const e of A.entries) {
    const done = e.sets.filter(s => s.done);
    if (!done.length) continue;
    const top = done.reduce((b, s) => (s.weight > b.weight || (s.weight === b.weight && s.reps > b.reps)) ? s : b);
    const prev = bestSet(effId(e), e.name);
    if (isPR(top, prev)) prs.push({ name: e.name, weight: top.weight, reps: top.reps, prevWeight: prev.weight, prevReps: prev.reps });
  }
  // exId = tatsächlich gemachte Variante, baseId = Hauptübung im Plan
  const log = { id: A.id, dayId: A.dayId, dayName: A.dayName, startedAt: A.startedAt, endedAt: Date.now(), note: note || '', prs,
    entries: A.entries.map(e => ({ exId: effId(e), baseId: e.exId, name: e.name, sets: e.sets.map(s => ({ weight: s.weight, reps: s.reps, done: s.done })),
      ...(e.out ? { out: e.out } : {}) })) };
  S.logs.unshift(log);
  if (apply) {
    for (const en of A.entries) {
      const pe = findEx(effId(en));
      const doneSets = en.sets.filter(s => s.done);
      if (!pe || !doneSets.length) continue;
      const ref = doneSets[doneSets.length - 1];
      pe.weight = ref.weight; pe.reps = ref.reps;
      if (!en.varId) pe.sets = en.sets.length;
    }
  }
  S.active = null;
  stopRest(); flush();
  // Das Beenden-Fenster wird zur Feier (gleicher Verlaufseintrag, damit „Zurück“ sie schließt)
  if (sheetOpen) { hideSheet(); history.replaceState({ cel: true }, ''); } else history.pushState({ cel: true }, '');
  render(); scrollTo(0, 0);
  celebrate(log);
}

/* ----- Abschluss-Feier: Pokal, Konfetti, Spruch und die Zahlen des Trainings ----- */
const CHEERS = [
  'Stark! Jedes Training zählt.',
  'Heute besser als gestern.',
  'Dranbleiben lohnt sich – du bist der Beweis.',
  'Das war Arbeit. Jetzt ist Erholung dran.',
  'Kleine Schritte, große Wirkung.',
  'Gewicht bewegt, Kopf frei.',
  'Disziplin schlägt Motivation – und du hattest beides.',
  'Wieder ein Baustein mehr. Weiter so!',
];
const TROPHY = '<svg viewBox="0 0 64 64" aria-hidden="true"><path class="cup" d="M20 8h24v14c0 9-5.4 15-12 15s-12-6-12-15V8z"/>'
  + '<path d="M20 13h-7v4c0 6 4 10 9 10M44 13h7v4c0 6-4 10-9 10M32 37v9M23 54h18M26 46h12v8H26z"/></svg>';
function celebrate(log) {
  const { sets, vol } = logStats(log);
  const prs = log.prs || [];
  const el = document.createElement('div');
  el.id = 'celebrate';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Training geschafft');
  el.innerHTML = `<canvas id="confetti" aria-hidden="true"></canvas>
    <div class="cel-card">
      <div class="cel-trophy">${TROPHY}</div>
      <h2>Training geschafft!</h2>
      <p class="cel-quote">${esc(CHEERS[Math.floor(Math.random() * CHEERS.length)])}</p>
      <div class="cel-stats">
        <div><b>${minTxt(log.endedAt - log.startedAt)}</b><span>Dauer</span></div>
        <div><b>${sets}</b><span>${sets === 1 ? 'Satz' : 'Sätze'}</span></div>
        <div><b>${kgShort(vol)}</b><span>bewegt</span></div>
      </div>
      ${celebrateWeek()}
      ${prs.length ? `<div class="cel-prs"><div class="sub">${prs.length === 1 ? 'Neuer Rekord' : `${prs.length} neue Rekorde`}</div>
        ${prs.map(p => `<div class="cel-pr"><span>${esc(p.name)}</span><b>${kgTxt(p.weight)} × ${int(p.reps, 0)}</b></div>`).join('')}</div>` : ''}
      <button class="btn primary block" id="celDone">Fertig</button>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  $('#celDone').addEventListener('click', () => history.back()); // schließt über popstate
  $('#celDone').focus({ preventScroll: true });
  if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  if (!reduceMotion.matches) confetti($('#confetti'));
}
// Wochenziel und Serie nach dem Training (das gerade gespeicherte Training zählt schon mit)
function celebrateWeek() {
  const w = weekStats();
  if (!w.req && !w.streak) return '';
  const goal = w.req ? (w.c >= w.req ? `Wochenziel geschafft: ${w.c} von ${w.req} Trainings` : `Diese Woche: ${w.c} von ${w.req} Trainings`) : '';
  return `<div class="cel-week">
    ${goal ? `<div class="cel-goal${w.c >= w.req ? ' full' : ''}"><span>${goal}</span><div class="progress"><i style="width:${Math.min(100, (w.c / w.req) * 100)}%"></i></div></div>` : ''}
    ${w.streak ? `<div class="cel-streak"><b>${w.streak}</b> ${w.streak === 1 ? 'Woche' : 'Wochen'} in Folge alle Trainings geschafft</div>` : ''}
  </div>`;
}
function closeCelebrate() {
  const el = $('#celebrate'); if (!el) return;
  el.classList.remove('show'); el.dataset.closed = '1';
  setTimeout(() => el.remove(), 250);
}
// Konfetti in den App-Farben: fällt drei Sekunden, dann ist Ruhe
function confetti(cv) {
  const ctx = cv.getContext('2d'), dpr = devicePixelRatio || 1;
  const W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
  const css = getComputedStyle(document.documentElement);
  const cols = ['--accent-fill', '--green-fill', '--heat', '--sw-teal', '--sw-purple', '--sw-pink'].map(v => css.getPropertyValue(v).trim()).filter(Boolean);
  const parts = Array.from({ length: 140 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 14 * dpr, vy: (-6 - Math.random() * 10) * dpr,
    w: (5 + Math.random() * 6) * dpr, h: (8 + Math.random() * 8) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
    c: cols[Math.floor(Math.random() * cols.length)],
  }));
  const t0 = performance.now();
  const step = now => {
    if (!cv.isConnected) return;
    const age = now - t0;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = age > 2600 ? Math.max(0, 1 - (age - 2600) / 900) : 1;
    for (const p of parts) {
      p.vy += 0.35 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); ctx.restore();
    }
    if (age < 3500) requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(step);
}

/* ----- Info-Sheet zu einer Übung ----- */
async function exInfo(i) {
  const en = S.active.entries[i];
  const pe = findEx(effId(en)) || en;
  const dbId = pe.dbId;
  openSheet(`<div class="sheet-head"><h2>${esc(en.name)}</h2><button class="linkbtn" data-act="closeSheet">Fertig</button></div>
    <div class="card" style="padding:12px">${exThumb(pe, 'musbig')}${muscleLegend(pe)}</div>
    <div class="card"><div class="sub">Notiz / Einstellungen</div>
      <div style="margin-top:4px">${pe.note ? esc(pe.note) : '<span class="muted">Noch keine – tippe im Training auf ✎</span>'}</div></div>
    <div id="instr" class="sub">${dbId ? 'Anleitung wird geladen …' : ''}</div>`);
  if (dbId) {
    // Erst die deutsche Übersetzung (liegt in der App, auch offline), sonst das englische Original
    const de = await loadInstrDe().then(m => m[dbId]).catch(() => null);
    let steps = Array.isArray(de) && de.some(Boolean) ? de.filter(Boolean) : null, isEn = false, offline = false;
    if (!steps) {
      try { const e = (await loadExDb()).find(x => x.id === dbId); if (e) { steps = e.instructions; isEn = true; } } catch { offline = true; }
    }
    const box = $('#instr');
    if (!box) return;
    if (steps && steps.length) box.innerHTML = `<div class="section-title">Anleitung${isEn ? ' (Englisch)' : ''}</div><ol class="instr">${steps.map(t => `<li>${esc(t)}</li>`).join('')}</ol>`;
    else box.textContent = offline ? 'Anleitung offline nicht verfügbar.' : 'Für diese Übung gibt es keine Anleitung.';
  }
}
// Deutsche Übungsanleitungen (übersetzt aus free-exercise-db): { id: [Schritt, …] }
let INSTR_DE = null;
async function loadInstrDe() {
  if (INSTR_DE) return INSTR_DE;
  const r = await fetch('data/anleitung-de.json');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const o = await r.json();
  INSTR_DE = o && typeof o === 'object' ? o : {};
  return INSTR_DE;
}
