'use strict';
// Gym Tracker – Trainingsplan und Übung bearbeiten.
// Alle Dateien in js/ teilen sich den globalen Bereich; Reihenfolge siehe index.html.

/* ----- Plan ----- */
function renderPlan() {
  setTop('Plan', '', '<button class="linkbtn" data-act="addDay">+ Tag</button>', S.plan.days.length ? 'plan' : '');
  if (!S.plan.days.length) {
    return `<div class="empty"><b>Noch keine Trainingstage</b>Leg z. B. „Push“, „Pull“ und „Beine“ an.</div>
      <button class="btn primary block" data-act="addDay">Trainingstag anlegen</button>
      <label class="btn block">Plan-Datei laden<input type="file" accept="application/json,.json,text/plain,.txt" data-field="importFile" hidden></label>`;
  }
  return `<div class="list">${S.plan.days.map((d, k) => `<div class="row">
      <button class="grow" style="text-align:left" data-act="openDay" data-id="${d.id}">
        <div class="title">${esc(d.name)}</div><div class="sub">${(d.weekdays || []).map(i => WD[i]).join(', ') || 'Kein fester Tag'}${SEP}${pl(d.exercises.length, 'Übung', 'Übungen')}</div></button>
      <button class="iconbtn" data-act="moveDay" data-id="${d.id}" data-d="-1" ${k === 0 ? 'disabled' : ''} aria-label="Nach oben">${ICON.up}</button>
      <button class="iconbtn" data-act="moveDay" data-id="${d.id}" data-d="1" ${k === S.plan.days.length - 1 ? 'disabled' : ''} aria-label="Nach unten">${ICON.down}</button>
    </div>`).join('')}</div>`;
}
function renderDayEditor(d) {
  setTop(d.name || 'Trainingstag', `<button class="linkbtn" data-act="back">${ICON.back}Plan</button>`);
  return `<label class="field"><span>Name des Trainingstags</span>
      <input class="input" data-field="dayName" value="${esc(d.name)}" placeholder="z. B. Push"></label>
    <div class="field"><span>Wochentage</span><div class="chips">${WD.map((w, i) =>
      `<button class="chip ${(d.weekdays || []).includes(i) ? 'on' : ''}" data-act="toggleWd" data-wd="${i}">${w}</button>`).join('')}</div></div>
    <div class="section-title">Übungen</div>
    ${d.exercises.length ? `<div class="list">${d.exercises.map((e, k) => `<div class="row">
      <button class="grow" style="display:flex;gap:12px;align-items:center;text-align:left" data-act="editEx" data-id="${e.id}">
        ${exThumb(e)}
        <div style="min-width:0"><div class="title">${esc(e.name)}</div>
        <div class="sub">${e.sets} × ${repTxt(e)} Wdh.${SEP}${kgTxt(e.weight)}${SEP}<span class="nw">${e.rest != null ? `${e.rest} s Pause` : 'Standard-Pause'}</span></div>
        ${(e.alts || []).length ? `<div class="sub">Alternativen: ${e.alts.map(a => esc(a.name)).join(', ')}</div>` : ''}</div></button>
      <button class="iconbtn" data-act="moveEx" data-id="${e.id}" data-d="-1" ${k === 0 ? 'disabled' : ''} aria-label="Nach oben">${ICON.up}</button>
      <button class="iconbtn" data-act="moveEx" data-id="${e.id}" data-d="1" ${k === d.exercises.length - 1 ? 'disabled' : ''} aria-label="Nach unten">${ICON.down}</button>
    </div>`).join('')}</div>` : '<p class="sub" style="margin:0 4px 12px">Noch keine Übungen.</p>'}
    <button class="btn primary block" data-act="newEx">+ Übung hinzufügen</button>
    <button class="btn danger block" data-act="deleteDay">Trainingstag löschen</button>`;
}

/* ----- Übung bearbeiten (Sheet) ----- */
// D = { dayId, isNew, ex, alt } – alt = Index der gerade bearbeiteten Alternative (null = Hauptübung)
let D = null;
const cur = () => (D.alt == null ? D.ex : D.ex.alts[D.alt]);
function editExSheet(dayId, exId) {
  const day = findDay(dayId);
  const src = exId ? day.exercises.find(e => e.id === exId) : null;
  D = { dayId, isNew: !src, alt: null, ex: src ? clone(src) : { id: uid(), name: '', sets: 3, repMin: 10, repMax: 12, reps: 10, weight: 0, rest: null, note: '', dbId: null, image: null } };
  if (D.ex.repMin == null) { D.ex.repMin = D.ex.reps; D.ex.repMax = D.ex.reps; }
  D.ex.alts = D.ex.alts || [];
  drawExSheet();
}
function drawExSheet() {
  const e = cur(), main = D.alt == null;
  const title = main ? (D.isNew ? 'Neue Übung' : 'Übung bearbeiten') : 'Alternative';
  const html = `<div class="sheet-head"><h2>${title}</h2>
      ${main ? '<button class="linkbtn" data-act="closeSheet">Abbrechen</button>' : `<button class="linkbtn" data-act="altDone">${ICON.back}Zurück</button>`}</div>
    ${main ? '' : `<p class="sub info-line" style="margin-top:0">Alternative zu „${esc(D.ex.name || 'Übung')}“${infoBtn('alts')}</p>`}
    <label class="field" style="margin-bottom:${D.isNew || !main ? 4 : 12}px"><span>Name – tippen, um in der Übungsdatenbank zu suchen</span><input class="input" id="f-name" value="${esc(e.name)}" autocomplete="off" placeholder="${main ? 'z. B. Bankdrücken' : 'z. B. Bizepsmaschine'}"></label>
    <div id="sug"></div>
    <div class="grid2">
      <label class="field"><span>Wdh. von</span><input class="input" id="f-rmin" inputmode="numeric" value="${e.repMin}"></label>
      <label class="field"><span>Wdh. bis</span><input class="input" id="f-rmax" inputmode="numeric" value="${e.repMax}"></label>
      ${main ? `<label class="field"><span>Sätze</span><input class="input" id="f-sets" inputmode="numeric" value="${e.sets}"></label>` : ''}
      <label class="field"><span>Gewicht (kg, 0 = ohne)</span><input class="input" id="f-weight" inputmode="decimal" value="${fmtIn(e.weight)}"></label>
      ${main ? `<label class="field"><span>Eigene Pause (Sek., leer = Standard)</span><input class="input" id="f-rest" inputmode="numeric" value="${e.rest ?? ''}" placeholder="Standard: ${int(S.settings.rest, 90)} s"></label>` : ''}
    </div>
    <label class="field"><span>Notiz / Einstellungen (z. B. Sitzhöhe, Stufe, Griff)</span><textarea class="input" id="f-note" placeholder="z. B. Sitz Stufe 5, Polster auf 3">${esc(e.note)}</textarea></label>
    <div class="section-title">Muskeln${infoBtn('muscleEdit')}</div>
    <div class="card" style="padding:12px">${exThumb(e, 'musbig')}</div>
    <div class="mchips">${Object.entries(MUSCLE_DE).map(([k, l]) => {
      const st = e.muscles && e.muscles.p.includes(k) ? 'mp' : e.muscles && e.muscles.s.includes(k) ? 'ms' : '';
      return `<button class="mchip ${st}" data-act="cycleMuscle" data-m="${k}">${l}</button>`;
    }).join('')}</div>
    <button class="btn small" style="margin-top:8px" data-act="imgDb">Muskeln automatisch aus Übungsdatenbank</button>
    <div id="dbsearch"></div>
    ${main ? `<div class="section-title">Alternativen${infoBtn('alts')}</div>
      ${e.alts.length ? `<div class="list">${e.alts.map((a, k) => `<button class="row" data-act="editAlt" data-k="${k}">
        ${exThumb(a)}
        <div class="grow"><div class="title">${esc(a.name || 'Ohne Namen')}</div><div class="sub">${repTxt(a)} Wdh.${SEP}${kgTxt(a.weight)}</div></div>${ICON.chev}</button>`).join('')}</div>`
        : ''}
      <button class="btn small" data-act="addAlt">+ Alternative hinzufügen</button>
      <button class="btn primary block" data-act="saveEx">Speichern</button>
      ${D.isNew ? '' : '<button class="btn danger block" data-act="deleteEx">Übung löschen</button>'}`
    : `<button class="btn primary block" data-act="altDone">Fertig</button>
      <button class="btn danger block" data-act="deleteAlt">Alternative löschen</button>`}`;
  if ($('#sheet').hidden) openSheet(html); else $('#sheet').innerHTML = '<div class="grabber"></div>' + html;
  const nm = $('#f-name');
  nm.addEventListener('input', () => { clearTimeout(sugT); sugT = setTimeout(showSuggest, 120); });
  loadExDb().catch(() => { /* offline */ });
  if (!e.name && (D.isNew || !main)) setTimeout(() => nm.focus(), 250);
}
/* Vorschläge unter dem Namensfeld: Treffer aus der Übungsdatenbank, als Letztes immer „Eigene Übung“ */
let sugT = null;
const EQUIP_DE = {
  barbell: 'Langhantel', dumbbell: 'Kurzhantel', machine: 'Maschine', cable: 'Kabelzug', 'body only': 'Körpergewicht',
  kettlebells: 'Kettlebell', bands: 'Band', 'e-z curl bar': 'SZ-Stange', 'medicine ball': 'Medizinball',
  'exercise ball': 'Gymnastikball', 'foam roll': 'Faszienrolle', other: 'Sonstiges',
};
async function showSuggest() {
  const box = $('#sug'), nm = $('#f-name');
  if (!box || !nm) return;
  const q = nm.value.trim();
  if (!q) { box.innerHTML = ''; return; }
  let res = [], off = false;
  try { await loadExDb(); res = searchExDb(q).slice(0, 6); } catch { off = true; }
  if (!$('#f-name') || $('#f-name').value.trim() !== q) return; // inzwischen weitergetippt
  const info = e => {
    const m = musclesFromDb(e);
    const mus = (m && m.p.length ? m.p : []).map(k => MUSCLE_DE[k] || k).slice(0, 3).join(', ');
    return [mus, EQUIP_DE[e.equipment] || e.equipment].filter(Boolean).join(', ');
  };
  box.innerHTML = `<div class="list sug">${res.map(e => `<button class="row" data-act="pickSuggest" data-id="${esc(e.id)}">
      ${exThumb({ muscles: musclesFromDb(e) || { p: [], s: [] } })}
      <div class="grow"><div class="title">${esc(e.name)}</div><div class="sub">${esc(info(e))}</div></div></button>`).join('')}
    <button class="row own" data-act="pickOwn"><span class="own-ic">+</span>
      <div class="grow"><div class="title">Eigene Übung: „${esc(q)}“</div>
      <div class="sub">${res.length ? 'Diesen Namen behalten und selbst anpassen' : (off ? 'Datenbank offline' : 'Nichts in der Datenbank gefunden') + ' – selbst benennen und anpassen'}</div></div></button></div>`;
}
function readDraftFields() {
  const e = cur(), main = D.alt == null;
  e.name = $('#f-name').value.trim();
  e.repMin = Math.max(1, Math.round(num($('#f-rmin').value)) || 1);
  e.repMax = Math.max(e.repMin, Math.round(num($('#f-rmax').value)) || e.repMin);
  if (!(e.reps >= e.repMin && e.reps <= e.repMax)) e.reps = e.repMin;
  e.weight = Math.max(0, num($('#f-weight').value));
  e.note = $('#f-note').value.trim();
  if (main) {
    e.sets = Math.max(1, Math.round(num($('#f-sets').value)) || 1);
    const r = $('#f-rest').value.trim();
    e.rest = r === '' ? null : Math.max(0, Math.round(num(r))); // leer = allgemeine Pause aus den Einstellungen
  }
}
async function openDbSearch() {
  readDraftFields();
  const box = $('#dbsearch');
  box.innerHTML = `<label class="field" style="margin-top:12px"><span>Suchen (Deutsch oder Englisch, z. B. „Bankdrücken“)</span>
    <input class="input" id="dbq" placeholder="Übung suchen …" value="${esc(cur().name)}"></label><div class="results" id="dbres"><p class="sub">Datenbank wird geladen …</p></div>`;
  const q = $('#dbq');
  try { await loadExDb(); } catch { $('#dbres').innerHTML = '<p class="sub">Datenbank nicht erreichbar (offline?).</p>'; return; }
  const run = () => {
    const res = searchExDb(q.value);
    $('#dbres').innerHTML = res.length ? `<div class="list">${res.map(e => `<button class="row" data-act="pickDb" data-id="${esc(e.id)}">
        <img class="thumb" src="${EXDB_IMG}${esc(e.images[0] || '')}" crossorigin="anonymous" loading="lazy" alt="">
        <div class="grow"><div class="title">${esc(e.name)}</div><div class="sub">${esc([(e.primaryMuscles || []).join(', '), e.equipment].filter(Boolean).join(', '))}</div></div>
      </button>`).join('')}</div>` : `<p class="sub">${q.value.trim() ? 'Nichts gefunden – versuch einen anderen Begriff.' : ''}</p>`;
  };
  q.addEventListener('input', run);
  run();
  q.focus();
}
async function saveEx() {
  if (D.alt != null) { readDraftFields(); D.alt = null; } else readDraftFields();
  const e = D.ex;
  if (!e.name) { toast('Bitte einen Namen eingeben'); return; }
  e.alts = e.alts.filter(a => a.name);
  const day = findDay(D.dayId);
  const old = day.exercises.find(x => x.id === e.id);
  if (old && old.image && old.image.type === 'local' && (!e.image || e.image.value !== old.image.value)) {
    idb.del('img:' + old.image.value); delete localImgs[old.image.value];
  }
  if (old) Object.assign(old, e); else day.exercises.push(e);
  save(); closeSheet(); render();
  for (const o of [e, ...e.alts]) warmImage(o.image);
}
