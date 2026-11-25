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
  for (const en of S.active.entries) for (const s of en.sets) { total++; if (s.done) done++; }
  return { done, total };
}
// Reihenfolge der Übungen im laufenden Training (Überspringen schiebt eine Übung ans Ende)
function ensureOrder(A) {
  if (!Array.isArray(A.order) || A.order.length !== A.entries.length) A.order = A.entries.map((_, i) => i);
  A.pos = Math.min(Math.max(0, A.pos || 0), A.order.length - 1);
}
const entryDone = en => en.sets.length > 0 && en.sets.every(s => s.done);
function workoutHead() {
  const A = S.active;
  const { done, total } = workoutCounts();
  const n = A.order.length, en = A.entries[A.order[A.pos]];
  const next = A.pos < n - 1 ? A.entries[A.order[A.pos + 1]].name : '';
  return `<section class="wk-head" id="wk-head">
    <div class="wk-meta"><span class="wk-title">${esc(A.dayName)}</span><span>${done} / ${total} Sätze<b id="elapsed">${fmtDur(Date.now() - A.startedAt)}</b></span></div>
    <div class="steps" role="tablist" aria-label="Übungen">${A.order.map((idx, k) => {
      const e = A.entries[idx], d = e.sets.filter(x => x.done).length, pct = e.sets.length ? (d / e.sets.length) * 100 : 0;
      return `<button class="step${k === A.pos ? ' on' : ''}${entryDone(e) ? ' done' : ''}" data-act="exGo" data-k="${k}" role="tab" aria-selected="${k === A.pos}" aria-label="${esc(e.name)}"><i style="width:${pct}%"></i></button>`;
    }).join('')}</div>
    <div class="wk-step">Übung ${A.pos + 1} von ${n}${en.skipped && !entryDone(en) ? '<span class="sep" aria-hidden="true"></span>übersprungen, jetzt nachholen' : next ? `<span class="sep" aria-hidden="true"></span>danach ${esc(next)}` : ''}</div>
  </section>`;
}
function renderWorkout() {
  const A = S.active;
  ensureOrder(A);
  setTop('', `<button class="linkbtn" data-act="minimize" aria-label="Training minimieren">${ICON.down}Minimieren</button>`, '<button class="linkbtn" data-act="finish">Beenden</button>');
  const i = A.order[A.pos], last = A.pos === A.order.length - 1;
  return `${workoutHead()}
    ${renderEntry(A.entries[i], i)}
    ${last ? '' : '<button class="btn ghost block" data-act="exSkip">Übung überspringen und später machen</button>'}
    <button class="btn ghost block" data-act="cancelWorkout">Training verwerfen</button>
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
  return `<article class="card ex ex-focus ${allDone ? 'done' : ''}" id="en-${i}">
    <div class="ex-title">
      <h2 class="ex-name">${esc(en.name)}</h2>
      ${variants ? `<button class="iconbtn sw" data-act="switchVar" data-i="${i}" aria-label="Übung wechseln" title="Wechseln zu: ${esc(variants.filter(o => o.id !== effId(en)).map(o => o.name).join(', '))}">${ICON.swap}</button>` : ''}
    </div>
    <button class="ex-fig" data-act="exInfo" data-i="${i}" aria-label="Muskeln und Anleitung zu ${esc(en.name)}">
      ${exThumb(pe || en, 'musbig')}
      <span class="ex-fig-hint">Anleitung${ICON.chev}</span>
    </button>
    ${muscleLegend(pe || en)}
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
        <input inputmode="decimal" enterkeyhint="next" data-field="weight" data-i="${i}" data-j="${j}" value="${fmtNum(s.weight)}" aria-label="Gewicht in kg">
        <input inputmode="numeric" enterkeyhint="done" data-field="reps" data-i="${i}" data-j="${j}" value="${s.reps}" aria-label="Wiederholungen">
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
  if (el && S.active) el.textContent = fmtDur(Date.now() - S.active.startedAt);
}
setInterval(tickElapsed, 1000);

function startWorkout(dayId) {
  const d = findDay(dayId);
  if (!d) return;
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
        exId: e.id, varId, name: v.name, rest: e.rest || S.settings.rest, image: v.image,
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
    <p class="sub">${done} von ${total} Sätzen erledigt${SEP}Dauer ${fmtDur(Date.now() - S.active.startedAt)}</p>
    <label class="field"><span>Notiz zum Training (optional)</span>
      <textarea class="input" id="finishNote" placeholder="z. B. Schulter gezwickt, schlecht geschlafen …">${esc(S.active.note || '')}</textarea></label>
    <div class="list"><label class="toggle"><span>Gewichte und Wiederholungen als neuen Standard in den Plan übernehmen</span>
      <input type="checkbox" id="applyPlan" checked></label></div>
    <button class="btn primary block" data-act="finishSave">Speichern</button>
    <button class="btn ghost block" data-act="closeSheet">Weiter trainieren</button>`);
}
function finishWorkout(apply, note) {
  const A = S.active;
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
    entries: A.entries.map(e => ({ exId: effId(e), baseId: e.exId, name: e.name, sets: e.sets.map(s => ({ weight: s.weight, reps: s.reps, done: s.done })) })) };
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
  render(); scrollTo(0, 0);
  if (!prs.length) { closeSheet(); toast('Training gespeichert'); return; }
  setSheet(`<div class="sheet-head"><h2>Neue Rekorde</h2></div>
    <div class="list">${prs.map(p => `<div class="row"><div class="grow"><div class="title">${esc(p.name)}</div>
      <div class="sub">${kgTxt(p.weight)} × ${p.reps} Wdh. <span class="muted">(vorher ${kgTxt(p.prevWeight)} × ${p.prevReps})</span></div></div></div>`).join('')}</div>
    <button class="btn primary block" data-act="closeSheet">Stark</button>`);
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
    try {
      const db = await loadExDb();
      const e = db.find(x => x.id === dbId);
      const box = $('#instr');
      if (box && e) box.innerHTML = `<div class="section-title">Anleitung (Englisch)</div><ol class="instr">${e.instructions.map(t => `<li>${esc(t)}</li>`).join('')}</ol>`;
    } catch { const box = $('#instr'); if (box) box.textContent = 'Anleitung offline nicht verfügbar.'; }
  }
}
