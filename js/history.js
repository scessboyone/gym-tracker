'use strict';
// Gym Tracker – Verlauf, Monatsrückblick, Verlauf pro Übung, Woche, Muskeln, Rekorde.
// Alle Dateien in js/ teilen sich den globalen Bereich; Reihenfolge siehe index.html.

/* ----- Verlauf ----- */
function exerciseNames() {
  const names = new Set();
  for (const e of allExercises()) names.add(e.name);
  for (const l of S.logs) for (const e of l.entries) names.add(e.name);
  return [...names];
}
const ddmm = t => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
function renderLog() {
  setTop('Verlauf');
  let h = renderWeek() + renderHeat() + renderBody();
  if (!S.logs.length) return h + '<div class="empty"><b>Noch keine Trainings</b>Sobald du ein Training beendest, erscheint es hier.</div>';
  const mk = monthKey(Date.now()), mc = monthStats(mk).logs.length;
  h += `<div class="list"><button class="row" data-act="openMonth" data-k="${mk}"><div class="grow"><div class="title">Monatsrückblick</div>
    <div class="sub">${MONTHS[new Date().getMonth()]}: ${pl(mc, 'Training', 'Trainings')}${SEP}Rekorde, Fortschritte, Muskeln</div></div>${ICON.chev}</button>
    <button class="row" data-act="openExList"><div class="grow"><div class="title">Verlauf pro Übung</div>
    <div class="sub">Alle Sätze, Bestwert und Kurve für jede Übung</div></div>${ICON.chev}</button></div>`;
  h += renderRecords();
  h += '<div class="section-title">Letzte Trainings</div><div class="list">';
  for (const l of V.allLogs ? S.logs : S.logs.slice(0, 3)) {
    const { sets, vol } = logStats(l);
    const pr = (l.prs || []).length;
    h += `<button class="row" data-act="openLog" data-id="${l.id}"><div class="grow">
      <div class="title">${esc(l.dayName)} <span class="muted" style="font-weight:400;margin-left:4px">${fmtDate(l.startedAt)}</span>${pr ? `<span class="pr" title="Rekorde">${pr} PR</span>` : ''}</div>
      <div class="sub">${fmtDur(l.endedAt - l.startedAt)} Dauer${SEP}${pl(sets, 'Satz', 'Sätze')}${SEP}${fmtNum(Math.round(vol))} kg bewegt</div>
      ${l.note ? `<div class="sub" style="font-style:italic">„${esc(l.note)}“</div>` : ''}</div>${ICON.chev}</button>`;
  }
  return h + moreRow('allLogs', S.logs.length) + '</div>';
}
/* ----- Monatsrückblick ----- */
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const monthKey = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthParts = k => k.split('-').map(Number);
const monthStart = (k, n = 0) => { const [y, m] = monthParts(k); return new Date(y, m - 1 + n, 1).getTime(); };
const monthLabel = k => { const [y, m] = monthParts(k); return `${MONTHS[m - 1]} ${y}`; };
const monthOnly = k => MONTHS[monthParts(k)[1] - 1];
function monthStats(k, upTo = 31) { // upTo: nur bis zu diesem Tag im Monat zählen
  const a = monthStart(k), b = Math.min(monthStart(k, 1), addDays(a, upTo));
  const logs = S.logs.filter(l => l.startedAt >= a && l.startedAt < b);
  let sets = 0, vol = 0, dur = 0;
  for (const l of logs) { const x = logStats(l); sets += x.sets; vol += x.vol; dur += l.endedAt - l.startedAt; }
  // Rekorde: je Übung nur der neueste (logs sind neueste zuerst)
  const seen = new Set(), prs = logs.flatMap(l => (l.prs || []).map(p => ({ ...p, t: l.startedAt }))).filter(r => !seen.has(r.name) && seen.add(r.name));
  return { a, b, logs, sets, vol, dur, prs };
}
// Geplante Trainingstage im Monat (bis heute, ohne Extra- und Krank-Tage) und wie viele davon trainiert wurden
function monthPlanned(a, b, trained) {
  if (!hasSchedule()) return { planned: 0, hit: 0 };
  const sick = new Set(S.sick || []), since = dayStart(S.settings.since || Date.now());
  const end = Math.min(b, addDays(dayStart(Date.now()), 1));
  let planned = 0, hit = 0;
  for (let t = a; t < end; t = addDays(t, 1)) {
    const q = planOn(t);
    if (q.d && !q.x && t >= since && !sick.has(t)) { planned++; if (trained.has(t)) hit++; }
  }
  return { planned, hit };
}
// Schwerster Satz je Übung in einem Zeitraum
function heaviest(logs) {
  const m = new Map();
  for (const l of logs) for (const e of l.entries) for (const x of e.sets) if (x.done && x.weight > 0) m.set(e.name, Math.max(m.get(e.name) || 0, x.weight));
  return m;
}
const kgShort = v => v >= 10000 ? `${fmtNum(Math.round(v / 100) / 10)} t` : `${fmtNum(Math.round(v))} kg`;
const diffTxt = (d, unit = '') => d > 0 ? `+${fmtNum(d)}${unit}` : d < 0 ? `−${fmtNum(-d)}${unit}` : `±0${unit}`;
function renderMonth(k) {
  setTop('Monatsrückblick', `<button class="linkbtn" data-act="back">${ICON.back}${V.backTab === 'home' ? 'Home' : 'Verlauf'}</button>`);
  const cur = monthKey(Date.now());
  const first = monthKey(Math.min(Date.now(), S.settings.since || Date.now(), ...S.logs.map(l => l.startedAt)));
  // Laufender Monat: mit demselben Zeitraum im Vormonat vergleichen (1. bis heute)
  const dNow = new Date().getDate(), running = k === cur;
  const M = monthStats(k), P = monthStats(monthKey(monthStart(k, -1)), running ? dNow : 31);
  const pk = monthKey(monthStart(k, -1)), pDays = new Date(monthStart(k) - DAY / 2).getDate(), pEnd = Math.min(dNow, pDays);
  const prevName = !running || pEnd === pDays ? monthOnly(pk) : pEnd === 1 ? `dem 1. ${monthOnly(pk)}` : `1. bis ${pEnd}. ${monthOnly(pk)}`;
  const nav = `<div class="card m-nav">
    <button class="iconbtn" data-act="monthGo" data-k="${monthKey(monthStart(k, -1))}" ${k <= first ? 'disabled' : ''} aria-label="Voriger Monat">${ICON.back}</button>
    <h2>${monthLabel(k)}</h2>
    <button class="iconbtn" data-act="monthGo" data-k="${monthKey(monthStart(k, 1))}" ${k >= cur ? 'disabled' : ''} aria-label="Nächster Monat">${ICON.chev}</button></div>`;
  if (!M.logs.length) return nav + `<div class="empty"><b>Kein Training im ${monthOnly(k)}</b>${k === cur ? 'Sobald du diesen Monat trainierst, erscheint hier dein Rückblick.' : 'In diesem Monat hast du nichts eingetragen.'}</div>`;

  // Kennzahlen mit Vergleich zum Vormonat
  const days = new Set(M.logs.map(l => dayStart(l.startedAt)));
  const { planned, hit } = monthPlanned(M.a, M.b, days);
  const dDur = M.dur - P.dur;
  const cmpBox = (up, txt) => P.logs.length ? `<div class="m-cmp ${up ? 'up' : ''}">${txt}</div>` : '';
  const cmp = (now, before, one, many) => cmpBox(now > before, `${diffTxt(now - before)} ${Math.abs(now - before) === 1 ? one : many}`);
  const inT = M.vol >= 10000 || P.vol >= 10000;
  const dVol = inT ? Math.round((M.vol - P.vol) / 100) / 10 : Math.round(M.vol - P.vol);
  const volDiff = diffTxt(dVol, inT ? ' t' : ' kg');
  const stats = `<div class="card m-stats">
    ${P.logs.length ? `<div class="m-vs sub">Vergleich mit ${prevName}</div>` : ''}
    <div><div class="big">${M.logs.length}</div><div class="sub">${M.logs.length === 1 ? 'Training' : 'Trainings'}${planned ? `, ${hit} von ${planned} geplanten geschafft` : ''}</div>${cmp(M.logs.length, P.logs.length, 'Training', 'Trainings')}</div>
    <div><div class="big">${minTxt(M.dur).replace(' min', '<small> min</small>').replace(' h', '<small> h</small>')}</div><div class="sub">Trainingszeit</div>${cmpBox(dDur >= 6e4, Math.abs(dDur) < 6e4 ? '±0 min' : (dDur > 0 ? '+' : '−') + minTxt(Math.abs(dDur)))}</div>
    <div><div class="big">${M.sets}</div><div class="sub">${M.sets === 1 ? 'Satz' : 'Sätze'}</div>${cmp(M.sets, P.sets, 'Satz', 'Sätze')}</div>
    <div><div class="big">${(inT ? `${fmtNum(Math.round(M.vol / 100) / 10)} t` : `${fmtNum(Math.round(M.vol))} kg`).replace(/ (kg|t)$/, '<small> $1</small>')}</div><div class="sub">bewegt</div>${cmpBox(dVol > 0, volDiff)}</div>
  </div>`;

  // Kalender des Monats
  const sick = new Set(S.sick || []), today = dayStart(Date.now());
  let cells = WD.map(w => `<div class="cal-h">${w}</div>`).join('');
  for (let k2 = 0; k2 < (new Date(M.a).getDay() + 6) % 7; k2++) cells += '<div></div>';
  for (let t = M.a; t < M.b; t = addDays(t, 1)) {
    let cls = 'cal-d';
    if (days.has(t)) cls += ' done'; else if (sick.has(t)) cls += ' sick';
    if (t === today) cls += ' today';
    if (t > today) cls += ' future';
    cells += days.has(t) ? `<button class="${cls}" data-act="calDay" data-t="${t}" aria-label="${fmtDate(t)}, trainiert"><span>${new Date(t).getDate()}</span></button>`
      : `<div class="${cls}"><span>${new Date(t).getDate()}</span></div>`;
  }
  const wdCnt = [0, 0, 0, 0, 0, 0, 0];
  for (const t of days) wdCnt[(new Date(t).getDay() + 6) % 7]++;
  const favWd = wdCnt.indexOf(Math.max(...wdCnt));
  const WDL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const cal = `<div class="card"><div class="cal" style="margin-top:0">${cells}</div>
    ${days.size > 2 && wdCnt[favWd] > 1 ? `<p class="sub" style="margin:10px 0 0">Am liebsten trainierst du ${WDL[favWd].toLowerCase()}s (${wdCnt[favWd]}×).</p>` : ''}</div>`;

  // Fortschritte: schwerster Satz im Monat gegen alles davor
  const nowB = heaviest(M.logs), beforeB = heaviest(S.logs.filter(l => l.startedAt < M.a));
  const gains = [...nowB].filter(([n, v]) => beforeB.has(n) && v > beforeB.get(n))
    .map(([n, v]) => ({ n, from: beforeB.get(n), to: v })).sort((x, y) => (y.to - y.from) - (x.to - x.from));
  const prog = gains.length ? `<div class="section-title">Fortschritte</div><div class="list">${gains.slice(0, 5).map(g => `<button class="row" data-act="openEx" data-name="${esc(g.n)}"><div class="grow"><div class="title">${esc(g.n)}</div>
      <div class="sub">${fmtNum(g.from)} kg auf ${fmtNum(g.to)} kg</div></div><span class="m-gain">${diffTxt(g.to - g.from, ' kg')}</span>${ICON.chev}</button>`).join('')}</div>` : '';

  // Neue Rekorde (je Übung der neueste)
  const recs = M.prs;
  const recHtml = recs.length ? `<div class="section-title">${recs.length === 1 ? 'Neuer Rekord' : `${recs.length} neue Rekorde`}</div><div class="list">${recs.map(r => `<div class="row"><div class="grow"><div class="title">${esc(r.name)}</div>
      <div class="sub">${kgTxt(r.weight)} × ${r.reps} Wdh.${SEP}${fmtDate(r.t)}</div></div><span class="pr">PR</span></div>`).join('')}</div>` : '';

  // Muskeln
  const mc = Object.entries(muscleCounts(M.a, M.b)).filter(([m]) => MUSCLE_DE[m]).sort((x, y) => y[1] - x[1]);
  const mMax = mc.length ? mc[0][1] : 1;
  const mus = mc.length ? `<div class="section-title">Muskeln</div><div class="card m-bars">${mc.slice(0, 6).map(([m, v]) => `<div class="m-bar">
      <span>${MUSCLE_DE[m]}</span><div class="m-track"><i style="width:${Math.max(4, (v / mMax) * 100).toFixed(0)}%"></i></div><b>${fmtNum(Math.round(v * 2) / 2)}</b></div>`).join('')}
      <p class="sub m-note">Sätze pro Muskel, Hilfsmuskel zählt halb.</p></div>` : '';

  // Höhepunkte
  const exCnt = new Map();
  for (const l of M.logs) for (const e of l.entries) if (e.sets.some(x => x.done)) exCnt.set(e.name, (exCnt.get(e.name) || 0) + 1);
  const favEx = [...exCnt].sort((x, y) => y[1] - x[1])[0];
  const longest = M.logs.reduce((x, l) => !x || l.endedAt - l.startedAt > x.endedAt - x.startedAt ? l : x, null);
  const bigVol = M.logs.reduce((x, l) => !x || logStats(l).vol > logStats(x).vol ? l : x, null);
  const hi = [];
  if (favEx && favEx[1] > 1) hi.push(`<div class="row"><div class="grow"><div class="sub">Häufigste Übung</div><div class="title">${esc(favEx[0])}</div></div><span class="muted">${favEx[1]}×</span></div>`);
  if (longest) hi.push(`<button class="row" data-act="openLog" data-id="${longest.id}"><div class="grow"><div class="sub">Längstes Training</div><div class="title">${esc(longest.dayName)}, ${ddmm(longest.startedAt)}</div></div><span class="muted">${minTxt(longest.endedAt - longest.startedAt)}</span>${ICON.chev}</button>`);
  if (bigVol && M.logs.length > 1) hi.push(`<button class="row" data-act="openLog" data-id="${bigVol.id}"><div class="grow"><div class="sub">Meiste kg bewegt</div><div class="title">${esc(bigVol.dayName)}, ${ddmm(bigVol.startedAt)}</div></div><span class="muted">${kgShort(logStats(bigVol).vol)}</span>${ICON.chev}</button>`);
  const hiHtml = hi.length ? `<div class="section-title">Höhepunkte</div><div class="list">${hi.join('')}</div>` : '';

  // Körpergewicht
  const bw = bodySorted().filter(q => q.t >= M.a && q.t < M.b);
  const bwHtml = bw.length > 1 ? `<div class="section-title">Gewicht</div><button class="card m-bw" data-act="openWeight">
      <div class="grow"><div class="big">${signKg(bw[bw.length - 1].kg - bw[0].kg).replace(/ kg$/, '<small> kg</small>')}</div>
      <div class="sub">${fmtKg(bw[0].kg)} am ${ddmm(bw[0].t)} auf ${fmtKg(bw[bw.length - 1].kg)} am ${ddmm(bw[bw.length - 1].t)}</div></div>${ICON.chev}</button>` : '';

  return nav + stats + cal + recHtml + prog + mus + hiHtml + bwHtml;
}

/* ----- Verlauf pro Übung: Liste und Detailseite ----- */
function exHistory(name) {
  const out = [];
  for (const l of S.logs) { // neueste zuerst
    const en = l.entries.find(e => e.name === name);
    const done = en ? en.sets.filter(s => s.done) : [];
    if (done.length) out.push({ l, sets: done });
  }
  return out;
}
function renderExList() {
  setTop('Übungen', `<button class="linkbtn" data-act="back">${ICON.back}Verlauf</button>`);
  const seen = new Map();
  for (const l of S.logs) for (const e of l.entries) {
    if (!e.sets.some(s => s.done)) continue;
    const r = seen.get(e.name) || { name: e.name, n: 0, last: l.startedAt };
    r.n++; seen.set(e.name, r);
  }
  const rows = [...seen.values()];
  if (!rows.length) return '<div class="empty"><b>Noch keine Übungen trainiert</b>Sobald du ein Training beendest, erscheinen die Übungen hier.</div>';
  return `<div class="list">${rows.map(r => {
    const pe = allExercises().find(e => e.name === r.name);
    const b = bestSet(pe && pe.id, r.name);
    return `<button class="row" data-act="openEx" data-name="${esc(r.name)}"><div class="grow"><div class="title">${esc(r.name)}</div>
      <div class="sub">${pl(r.n, 'Training', 'Trainings')}${SEP}zuletzt ${relDay(r.last)}</div>
      ${b ? `<div class="sub">Bestwert <span class="nw">${kgTxt(b.weight)} × ${b.reps}</span></div>` : ''}</div>${ICON.chev}</button>`;
  }).join('')}</div>`;
}
function renderExHist(name) {
  setTop(name, `<button class="linkbtn" data-act="back">${ICON.back}Übungen</button>`);
  const hist = exHistory(name);
  if (!hist.length) return '<div class="empty"><b>Noch keine Sätze</b>Für diese Übung gibt es noch keine erledigten Sätze.</div>';
  const pe = allExercises().find(e => e.name === name);
  const b = bestSet(pe && pe.id, name);
  const prLogs = new Set(S.logs.filter(l => (l.prs || []).some(p => p.name === name)).map(l => l.id));
  return `<div class="card ex-stats">
      <div><div class="big">${b ? `${fmtNum(b.weight)}<small> kg × ${b.reps}</small>` : '–'}</div><div class="sub">Bestwert${b ? ', ' + fmtDate(b.t) : ''}</div></div>
      <div><div class="big">${hist.length}</div><div class="sub">${hist.length === 1 ? 'Training' : 'Trainings'}</div></div>
    </div>
    <div class="card chart"><div class="sub" style="margin-bottom:8px">Schwerster Satz pro Training (kg)</div>${exerciseChart(name)}</div>
    <div class="section-title">Alle Trainings</div>
    <div class="list">${hist.map(({ l, sets }) => `<button class="row" data-act="openLog" data-id="${l.id}"><div class="grow">
      <div class="title">${fmtDate(l.startedAt)} <span class="muted" style="font-weight:400;margin-left:4px">${esc(l.dayName)}</span>${prLogs.has(l.id) ? '<span class="pr">PR</span>' : ''}</div>
      <div class="sub">${esc(summarize(sets))}</div></div>${ICON.chev}</button>`).join('')}</div>`;
}
function logStats(l) {
  let sets = 0, vol = 0;
  for (const e of l.entries) for (const s of e.sets) if (s.done) { sets++; vol += s.weight * s.reps; }
  return { sets, vol };
}
// Letzte Zeile einer gekürzten Liste: „Alle X anzeigen“ / „Weniger anzeigen“
const moreRow = (key, n) => n > 3 ? `<button class="row more-row" data-act="toggleList" data-k="${key}">${V[key] ? 'Weniger anzeigen' : `Alle ${n} anzeigen`}</button>` : '';

/* Muskel-Übersicht: wie viele Sätze je Muskel (Hauptmuskel = 1, Hilfsmuskel = ½ Satz) */
function musclesForEntry(e) {
  const o = allExercises().find(x => x.id === e.exId) || allExercises().find(x => x.id === e.baseId) || allExercises().find(x => x.name === e.name);
  if (o && hasMuscles(o)) return o.muscles;
  const t = MUSCLES_BY_NAME[e.name];
  return t ? { p: t[0], s: t[1] } : null;
}
function muscleCounts(from, to = Infinity) {
  const cnt = {};
  for (const l of S.logs) {
    if (l.startedAt < from || l.startedAt >= to) continue;
    for (const e of l.entries) {
      const m = musclesForEntry(e); if (!m) continue;
      const n = e.sets.filter(s => s.done).length;
      for (const k of m.p) cnt[k] = (cnt[k] || 0) + n;
      for (const k of m.s) cnt[k] = (cnt[k] || 0) + n / 2;
    }
  }
  return cnt;
}
const planMuscles = () => new Set(allExercises().flatMap(o => hasMuscles(o) ? [...o.muscles.p, ...o.muscles.s] : []));
function renderHeat() {
  const range = V.heat || 'w';
  const from = range === 'w' ? weekStart(Date.now()) : dayStart(Date.now()) - 27 * DAY;
  const planMus = planMuscles();
  if (!planMus.size) return '';
  const cnt = muscleCounts(from);
  // Stufen pro Woche: 1–5 wenig, 6–11 mittel, ab 12 viel (bei 4 Wochen das Vierfache)
  const f = range === 'w' ? 1 : 4;
  const lvl = v => !v ? 0 : v < 6 * f ? 1 : v < 12 * f ? 2 : 3;
  const levels = {}; for (const [k, v] of Object.entries(cnt)) levels[k] = lvl(v);
  if (levels.calves) levels.left_soleus = levels.right_soleus = levels.calves;
  const fig = side => `<svg viewBox="0 0 1000 2200" aria-hidden="true">${Object.entries(BODY[side]).map(([k, list]) =>
    list.map(pts => `<polygon class="${k === 'head' || k === 'knees' ? 'mh' : levels[k] ? 'h' + levels[k] : 'mb'}" points="${pts}"/>`).join('')).join('')}</svg>`;
  const fmt = v => fmtNum(Math.round(v * 2) / 2);
  const top = Object.entries(cnt).filter(([k]) => MUSCLE_DE[k]).sort((x, y) => y[1] - x[1]).slice(0, 4);
  const missing = [...planMus].filter(k => !cnt[k] && MUSCLE_DE[k]).map(k => MUSCLE_DE[k]);
  return `<div class="card">
    <div class="heat-head"><div><div class="sub">Muskeln</div><b>${range === 'w' ? 'Diese Woche' : 'Letzte 4 Wochen'}</b></div>
      <div class="seg heat-seg"><button class="${range === 'w' ? 'on' : ''}" data-act="heatRange" data-r="w">Woche</button><button class="${range === 'm' ? 'on' : ''}" data-act="heatRange" data-r="m">4 Wochen</button></div></div>
    <div class="heat">${fig('front')}${fig('back')}</div>
    <div class="heat-legend"><span><i class="h1"></i>wenig</span><span><i class="h2"></i>mittel</span><span><i class="h3"></i>viel</span><span class="sub">Sätze pro Muskel</span></div>
    ${top.length ? `<p class="sub" style="margin:10px 0 0">Am meisten: ${top.map(([k, v]) => `${MUSCLE_DE[k]} <b style="color:var(--text)">${fmt(v)}</b>`).join(', ')}</p>`
      : `<p class="sub" style="margin:10px 0 0">${range === 'w' ? 'Diese Woche' : 'In den letzten 4 Wochen'} noch kein Training.</p>`}
    ${top.length && missing.length ? `<p class="sub" style="margin:4px 0 0">Noch nicht dran: ${missing.join(', ')}</p>` : ''}
  </div>`;
}

/* Wochenübersicht: Trainings diese Woche, Serie, Kalender der letzten 6 Wochen */
function weekStart(t) { const d = new Date(dayStart(t)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
function prevWeek(ws) { const d = new Date(ws); d.setDate(d.getDate() - 7); return d.getTime(); }
function weekStats() {
  const sch = hasSchedule();
  const perWeek = new Map(); // weekStart -> Set(dayStart)
  const trained = new Set();
  for (const l of S.logs) {
    const ds = dayStart(l.startedAt), ws = weekStart(l.startedAt);
    trained.add(ds);
    if (!perWeek.has(ws)) perWeek.set(ws, new Set());
    perWeek.get(ws).add(ds);
  }
  const cnt = ws => (perWeek.get(ws) || new Set()).size;
  const sick = new Set(S.sick || []);
  const daysOf = ws => Array.from({ length: 7 }, (_, k) => addDays(ws, k));
  // Wochenziel = geplante Tage dieser Woche (ohne Extra-Trainings); Krank-Tage an geplanten Tagen senken es
  const counts = t => { const p = planOn(t); return p.d && !p.x; };
  const planned = ws => sch ? daysOf(ws).filter(counts).length : 3;
  const required = ws => {
    const sickDays = daysOf(ws).filter(t => sick.has(t) && !trained.has(t) && (!sch || counts(t))).length;
    return Math.max(0, planned(ws) - sickDays);
  };
  const thisWs = weekStart(Date.now());
  // Serie: Wochen mit Ziel 0 (komplett krank) zählen weder mit noch brechen sie die Serie
  let streak = 0;
  { const r = required(thisWs); if (r > 0 && cnt(thisWs) >= r) streak++; }
  for (let ws = prevWeek(thisWs), guard = 0; guard < 520; ws = prevWeek(ws), guard++) {
    if (ws < weekStart(S.settings.since || Date.now())) break;
    const r = required(ws);
    if (r === 0) continue;
    if (cnt(ws) >= r) streak++; else break;
  }
  return { trained, sick, thisWs, streak, c: cnt(thisWs), req: required(thisWs), planned: planned(thisWs) };
}
function renderWeek() {
  const { trained, sick, thisWs, streak, c, req, planned } = weekStats();
  // Kalender: 5 Wochen zurück, diese und nächste Woche – jeder Tag antippbar
  let start = thisWs;
  for (let k = 0; k < 5; k++) start = prevWeek(start);
  const today = dayStart(Date.now()), since = dayStart(S.settings.since || Date.now());
  let cells = WD.map(w => `<div class="cal-h">${w}</div>`).join('');
  for (let k = 0; k < 49; k++) {
    const t = addDays(start, k), p = planOn(t);
    let cls = 'cal-d';
    if (trained.has(t)) cls += ' done';
    else if (sick.has(t)) cls += ' sick';
    else if (p.d) cls += t >= today ? ' plan' : (!p.x && t >= since ? ' miss' : '');
    if (p.x) cls += ' extra';
    if (p.changed) cls += ' changed';
    if (t === today) cls += ' today';
    if (t > today) cls += ' future';
    const lbl = p.d && !trained.has(t) && !sick.has(t) && t >= today ? `<small>${esc(shortName(p.d))}</small>` : '';
    cells += `<button class="${cls}" data-act="calDay" data-t="${t}" aria-label="${fmtDate(t)}"><span>${new Date(t).getDate()}</span>${lbl}</button>`;
  }
  const sickThisWeek = planned - req;
  return `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:baseline">
      <div><div class="sub">Diese Woche</div><div class="big">${c} / ${req} <span class="sub">Trainings${sickThisWeek ? ` (${sickThisWeek}× krank)` : ''}</span></div></div>
      <div style="text-align:right"><div class="sub">Serie</div><div class="big">${streak} ${streak === 1 ? 'Woche' : 'Wochen'}</div></div>
    </div>
    <div class="progress"><i style="width:${req ? Math.min(100, (c / req) * 100) : 100}%"></i></div>
    <div class="cal">${cells}</div>
    <div class="cal-legend sub"><span><i class="lg done"></i>trainiert</span><span><i class="lg plan"></i>geplant</span><span><i class="lg extra"></i>extra</span><span><i class="lg miss"></i>verpasst</span><span><i class="lg sick"></i>krank</span></div>
    <p class="sub" style="margin:8px 0 0">Tippe auf einen Tag, um ein Training zu verschieben, ausfallen zu lassen, ein Extra-Training einzuplanen oder dich krank zu melden. Serie = Wochen am Stück, in denen du alle geplanten Trainings geschafft hast.</p>
  </div>`;
}
// mode: null = Übersicht, 'move' = Zieldatum wählen, 'pick' = Training wählen (ändern/extra)
function calDaySheet(t, mode = null) {
  const today = dayStart(Date.now());
  const isSick = (S.sick || []).includes(t);
  const logs = S.logs.filter(l => dayStart(l.startedAt) === t);
  const p = planOn(t), reg = regularOn(t);
  const head = (title, back) => `<div class="sheet-head"><h2>${title}</h2>
      ${back ? `<button class="linkbtn" data-act="calDay" data-t="${t}">${ICON.back}Zurück</button>` : '<button class="linkbtn" data-act="closeSheet">Fertig</button>'}</div>`;

  if (mode === 'move') {
    const from = Math.min(today, t);
    const opts = [];
    for (let k = 0; k <= 21; k++) { const u = addDays(from, k); if (u !== t) opts.push(u); }
    setSheet(`${head('Verschieben auf …', true)}
      <p class="sub" style="margin-top:0">${esc(findDay(p.d).name)} von ${esc(dateLabel(t))} auf:</p>
      <div class="list">${opts.map(u => { const q = planOn(u); return `<button class="row" data-act="calMoveTo" data-t="${t}" data-to="${u}">
        <div class="grow"><div class="title">${esc(dateLabel(u, true))}${u === today ? ', heute' : ''}</div>
        <div class="sub">${q.d ? 'Geplant: ' + esc(findDay(q.d).name) + ' – wird ersetzt' : 'frei'}</div></div>${ICON.chev}</button>`; }).join('')}</div>`);
    return;
  }
  if (mode === 'pick') {
    const extra = !p.d;
    setSheet(`${head(extra ? 'Extra-Training' : 'Anderes Training', true)}
      <p class="sub" style="margin-top:0">${extra ? 'Welches Training willst du' : 'Statt ' + esc(findDay(p.d).name) + ' – welches Training'} am ${esc(dateLabel(t, true))} machen?</p>
      <div class="list">${S.plan.days.filter(d => d.id !== p.d).map(d => `<button class="row" data-act="calSetDay" data-t="${t}" data-id="${d.id}" data-x="${extra ? 1 : 0}">
        <div class="grow"><div class="title">${esc(d.name)}</div><div class="sub">${pl(d.exercises.length, 'Übung', 'Übungen')}</div></div>${ICON.chev}</button>`).join('')}</div>
      ${extra ? '<p class="sub">Extra-Trainings zählen nicht zum Wochenziel – sie sind ein Bonus.</p>' : ''}`);
    return;
  }

  let planTxt;
  if (p.d) planTxt = `<b>${esc(findDay(p.d).name)}</b>${p.x ? ' <span class="tag">Extra</span>' : (p.changed ? ' <span class="tag">geändert</span>' : '')}`;
  else planTxt = p.changed && reg ? `Kein Training <span class="tag">${esc(findDay(reg).name)} fällt aus</span>` : 'Kein Training geplant';
  const btns = [];
  if (p.d) {
    btns.push(`<button class="btn" data-act="calMove" data-t="${t}">Verschieben</button>`);
    if (S.plan.days.length > 1) btns.push(`<button class="btn" data-act="calPick" data-t="${t}">Anderes Training</button>`);
    btns.push(`<button class="btn" data-act="calOff" data-t="${t}">Ausfallen lassen</button>`);
  } else if (S.plan.days.length) {
    btns.push(`<button class="btn" data-act="calPick" data-t="${t}">+ Extra-Training einplanen</button>`);
  }
  if (p.changed) btns.push(`<button class="btn ghost" data-act="calReset" data-t="${t}">Wie im Wochenplan${reg ? ' (' + esc(findDay(reg).name) + ')' : ' (frei)'}</button>`);
  setSheet(`${head(esc(dateLabel(t, true)))}
    ${logs.length ? `<div class="section-title" style="margin-top:0">Trainiert</div><div class="list">${logs.map(l => `<button class="row" data-act="openLogFromCal" data-id="${l.id}"><div class="grow"><div class="title">${esc(l.dayName)}</div>
      <div class="sub">${fmtDur(l.endedAt - l.startedAt)} Dauer</div></div>${ICON.chev}</button>`).join('')}</div>` : ''}
    <div class="section-title"${logs.length ? '' : ' style="margin-top:0"'}>Geplant</div>
    <div class="card cal-plan">${planTxt}</div>
    <div class="cal-btns">${btns.join('')}</div>
    ${t <= today ? `<button class="btn block ${isSick ? '' : 'ghost'}" data-act="toggleSick" data-t="${t}">${isSick ? 'Krank-Markierung entfernen' : 'Als krank markieren'}</button>` : ''}
    ${t === today && p.d && !logs.length && !S.active ? `<button class="btn primary block" data-act="calStart" data-id="${p.d}">${esc(findDay(p.d).name)} jetzt starten</button>` : ''}`);
}

/* Körpergewicht */
function renderBody() {
  const b = bodySorted();
  const last = b[b.length - 1];
  const cut = Date.now() - 90 * DAY;
  const recent = b.filter(p => p.t >= cut);
  const pts = (recent.length >= 2 ? recent : b.slice(-10)).map(p => ({ t: p.t, v: p.kg }));
  const prev = b.length > 1 ? b[b.length - 2] : null;
  return `<div class="card chart bwcard">
    <button class="bw-head" data-act="openWeight">
      <div class="grow"><div class="sub">Körpergewicht</div>
        <div class="big">${last ? fmtKg(last.kg) : '–'} ${prev ? `<span class="sub">${signKg(last.kg - prev.kg)} zum letzten Mal</span>` : ''}</div></div>
      <span class="linkbtn" style="font-size:15px">Verlauf${ICON.chev}</span>
    </button>
    ${pts.length > 1 ? `<div data-act="openWeight">${bwChart(pts, { h: 120, goal: S.settings.goalKg, mini: true })}</div>` : '<p class="sub" style="margin:6px 0 0">Trag regelmäßig dein Gewicht ein – ab zwei Einträgen siehst du hier die Kurve.</p>'}
    <div class="bw-quick">
      <div class="unit-wrap"><input class="input" id="bw" inputmode="decimal" placeholder="Gewicht"><span>kg</span></div>
      <input class="input bw-qtime" type="time" id="bw-qtime" value="${hhmm()}" data-auto="1" aria-label="Uhrzeit">
      <button class="btn primary" data-act="addBw">Eintragen</button>
    </div>
  </div>`;
}

/* Rekorde: bester Satz pro Übung */
function renderRecords() {
  const recs = [];
  for (const name of exerciseNames()) {
    const pe = allExercises().find(e => e.name === name);
    const b = bestSet(pe && pe.id, name);
    if (b) recs.push({ name, b });
  }
  recs.sort((x, y) => y.b.t - x.b.t); // neueste Rekorde zuerst
  const rows = (V.allRec ? recs : recs.slice(0, 3)).map(({ name, b }) => `<div class="row"><div class="grow"><div class="title">${esc(name)}</div>
      <div class="sub">${kgTxt(b.weight)} × ${b.reps} Wdh.${SEP}${fmtDate(b.t)}</div></div><span class="pr">PR</span></div>`);
  return rows.length ? `<div class="section-title">Rekorde</div><div class="list">${rows.join('')}${moreRow('allRec', recs.length)}</div>` : '';
}

function exerciseChart(name) {
  const pts = [];
  for (const l of [...S.logs].reverse()) {
    const en = l.entries.find(e => e.name === name);
    const done = en ? en.sets.filter(s => s.done) : [];
    if (done.length) pts.push({ t: l.startedAt, v: Math.max(...done.map(s => s.weight)) });
  }
  if (!pts.length) return '<p class="sub">Für diese Übung gibt es noch keine erledigten Sätze.</p>';
  const vs = pts.map(p => p.v);
  return lineChart(pts) + `<p class="sub" style="margin:6px 0 0">Aktuell ${fmtNum(vs[vs.length - 1])} kg</p>`;
}
function lineChart(pts) {
  const W = 320, H = 140, P = 34;
  const vs = pts.map(p => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (lo === hi) { lo -= 5; hi += 5; }
  const x = k => pts.length === 1 ? W / 2 : P + (k / (pts.length - 1)) * (W - P - 10);
  const y = v => 10 + (1 - (v - lo) / (hi - lo)) * (H - 34);
  const line = pts.map((p, k) => `${x(k).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}">
    <line class="axis" x1="${P}" y1="${H - 24}" x2="${W - 10}" y2="${H - 24}"/>
    <text x="0" y="${y(hi) + 4}">${fmtNum(hi)}</text><text x="0" y="${y(lo) + 4}">${fmtNum(lo)}</text>
    <polyline class="line" points="${line}"/>
    ${pts.map((p, k) => `<circle class="dot" cx="${x(k).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3.5"/>`).join('')}
    <text x="${P}" y="${H - 6}">${ddmm(pts[0].t)}</text>
    <text x="${W - 10}" y="${H - 6}" text-anchor="end">${ddmm(pts[pts.length - 1].t)}</text>
  </svg>`;
}
function openLog(id) {
  const l = S.logs.find(x => x.id === id);
  if (!l) return;
  setSheet(`<div class="sheet-head"><h2>${esc(l.dayName)}</h2><button class="linkbtn" data-act="closeSheet">Fertig</button></div>
    <p class="sub">${fmtDate(l.startedAt)}${SEP}${fmtDur(l.endedAt - l.startedAt)} Dauer</p>
    ${l.note ? `<div class="card" style="font-style:italic">„${esc(l.note)}“</div>` : ''}
    ${(l.prs || []).length ? `<div class="card"><b>Rekorde</b>${l.prs.map(p => `<div class="sub">${esc(p.name)}: ${kgTxt(p.weight)} × ${p.reps}</div>`).join('')}</div>` : ''}
    <div class="list">${l.entries.map(e => {
      const d = e.sets.filter(s => s.done);
      return `<div class="row"><div class="grow"><div class="title">${esc(e.name)}</div>
        <div class="sub">${d.length ? esc(summarize(d)) : 'nicht gemacht'}</div></div></div>`;
    }).join('')}</div>
    <button class="btn danger block" data-act="deleteLog" data-id="${l.id}">Training aus Verlauf löschen</button>`);
}
