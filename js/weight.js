'use strict';
// Gym Tracker – Körpergewicht.
// Alle Dateien in js/ teilen sich den globalen Bereich; Reihenfolge siehe index.html.

/* ----- Gewichtsverlauf (eigene Ansicht) ----- */
const DAY = 864e5;
let bwRange = '3m';
const BW_RANGES = [['1m', '1 M', 31], ['3m', '3 M', 92], ['6m', '6 M', 183], ['1y', '1 J', 366], ['all', 'Alle', 0]];
const fmtKg = v => fmtNum(Math.round(v * 10) / 10) + ' kg';
const signKg = d => (d > 0 ? '+' : d < 0 ? '−' : '±') + fmtNum(Math.round(Math.abs(d) * 10) / 10) + ' kg';
function bodySorted() { return [...(S.body || [])].sort((a, b) => a.t - b.t); }
function toIsoDate(t) { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function fromIsoDate(v) { const [y, m, d] = String(v).split('-').map(Number); return y ? new Date(y, m - 1, d, 12).getTime() : null; }
// Zeitpunkt aus Datum (+ optionaler Uhrzeit „HH:MM“); ohne Uhrzeit: heute = jetzt, sonst Mittag
function bwWhen(dateVal, timeVal, keepT) {
  const d = fromIsoDate(dateVal);
  if (!d) return null;
  if (timeVal) { const [h, m] = timeVal.split(':').map(Number); const x = new Date(d); x.setHours(h, m, 0, 0); return x.getTime(); }
  if (keepT && dayStart(keepT) === dayStart(d)) return keepT;
  return dayStart(d) === dayStart(Date.now()) ? Date.now() : d;
}
const hhmm = (t = Date.now()) => new Date(t).toTimeString().slice(0, 5);
const bwWhenTxt = p => fmtDate(p.t) + (p.time ? `, ${p.time} Uhr` : '');
// auto = Feld zeigt „jetzt“ und läuft mit, bis man es selbst ändert
const timeField = (id, val, auto) => `<label class="field"><span>Uhrzeit</span><div class="time-wrap">
  <input class="input" type="time" id="${id}" value="${val || ''}"${auto ? ' data-auto="1"' : ''}><button type="button" class="time-clear" data-act="clearTime" data-for="${id}" aria-label="Uhrzeit leeren"${val ? '' : ' hidden'}>×</button></div></label>`;
function addBodyEntry(t, kg, time = null) {
  S.body = (S.body || []).filter(p => dayStart(p.t) !== dayStart(t)); // ein Eintrag pro Tag
  S.body.push(time ? { t, kg, time } : { t, kg });
  S.body.sort((a, b) => a.t - b.t);
}
function niceStep(raw) {
  const e = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
}
// Zeitachsen-Diagramm mit Fläche, 7-Tage-Schnitt, Ziel-Linie und (optional) Antipp-Anzeige
function bwChart(pts, { h = 190, goal = null, mini = false } = {}) {
  const W = 340, H = h, L = 34, Rr = 8, T = 10, B = mini ? 20 : 24;
  const vals = pts.map(p => p.v);
  if (goal) vals.push(goal);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max(0.6, (hi - lo) * 0.12);
  lo -= pad; hi += pad;
  const step = niceStep((hi - lo) / (mini ? 2 : 3));
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t, span = Math.max(DAY, t1 - t0);
  const x = t => L + ((t - t0) / span) * (W - L - Rr);
  const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const base = H - B;
  let g = '';
  for (let v = lo; v <= hi + step / 2; v += step) {
    g += `<line class="grid" x1="${L}" y1="${y(v).toFixed(1)}" x2="${W - Rr}" y2="${y(v).toFixed(1)}"/><text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${fmtNum(Math.round(v * 10) / 10)}</text>`;
  }
  const P = pts.map(p => [x(p.t), y(p.v)]);
  const line = P.map((q, k) => `${k ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('');
  const area = `${line}L${P[P.length - 1][0].toFixed(1)},${base}L${P[0][0].toFixed(1)},${base}Z`;
  let avg = '';
  if (pts.length >= 5) {
    const a = pts.map(p => { const w = pts.filter(q => q.t <= p.t && q.t > p.t - 7 * DAY); return [x(p.t), y(w.reduce((n, q) => n + q.v, 0) / w.length)]; });
    avg = `<path class="avg" d="${a.map((q, k) => `${k ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('')}"/>`;
  }
  const goalLine = goal && goal >= lo && goal <= hi
    ? `<line class="goal" x1="${L}" y1="${y(goal).toFixed(1)}" x2="${W - Rr}" y2="${y(goal).toFixed(1)}"/><text class="goal-t" x="${W - Rr}" y="${(y(goal) - 4).toFixed(1)}" text-anchor="end">Ziel ${fmtNum(goal)}</text>` : '';
  const dots = pts.length <= 45 ? P.map(q => `<circle class="dot" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${mini ? 2.5 : 3}"/>`).join('') : '';
  const lastP = P[P.length - 1];
  const mid = pts.length > 2 && !mini ? `<text x="${((L + W - Rr) / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${ddmm(t0 + span / 2)}</text>` : '';
  const data = mini ? '' : ` data-pts="${pts.map((p, k) => `${P[k][0].toFixed(1)},${P[k][1].toFixed(1)},${p.t},${p.v},${p.time || ''}`).join(';')}"`;
  return `<svg class="bwsvg${mini ? ' mini' : ''}" viewBox="0 0 ${W} ${H}"${data}>
    <defs><linearGradient id="bwg${mini ? 'm' : ''}" x1="0" y1="0" x2="0" y2="1"><stop class="bwg-stop" offset="0" stop-opacity=".35"/><stop class="bwg-stop" offset="1" stop-opacity="0"/></linearGradient></defs>
    ${g}${goalLine}
    <path class="area" d="${area}" fill="url(#bwg${mini ? 'm' : ''})"/>
    ${avg}<path class="line" d="${line}"/>${dots}
    <circle class="dot-last" cx="${lastP[0].toFixed(1)}" cy="${lastP[1].toFixed(1)}" r="${mini ? 4 : 5}"/>
    <text x="${L}" y="${H - 6}">${ddmm(t0)}</text>${mid}<text x="${W - Rr}" y="${H - 6}" text-anchor="end">${ddmm(t1)}</text>
    ${mini ? '' : `<g class="cursor" visibility="hidden"><line x1="0" y1="${T}" x2="0" y2="${base}"/><circle r="6"/></g>`}
  </svg>`;
}
function renderWeight() {
  setTop('Gewicht', `<button class="linkbtn" data-act="back">${ICON.back}Verlauf</button>`);
  const all = bodySorted();
  const goal = S.settings.goalKg || null;
  const days = BW_RANGES.find(r => r[0] === bwRange)[2];
  const inRange = days ? all.filter(p => p.t >= Date.now() - days * DAY) : all;
  const last = all[all.length - 1];
  let h = `<div class="card">
    <div class="sub">Aktuell${last ? ', ' + fmtDate(last.t) : ''}</div>
    <div class="huge">${last ? fmtKg(last.kg) : '–'}</div>
    ${goal && last ? `<div class="sub">Ziel ${fmtKg(goal)}${SEP}${Math.abs(last.kg - goal) < 0.05 ? 'erreicht' : 'noch ' + fmtKg(Math.abs(last.kg - goal))}</div>` : ''}
  </div>`;
  h += `<div class="bwseg">${BW_RANGES.map(r => `<button class="${r[0] === bwRange ? 'on' : ''}" data-act="bwRange" data-r="${r[0]}">${r[1]}</button>`).join('')}</div>`;
  if (inRange.length >= 2) {
    const first = inRange[0], end = inRange[inRange.length - 1];
    const vs = inRange.map(p => p.kg);
    const avg = vs.reduce((a, b) => a + b, 0) / vs.length;
    const weeks = (end.t - first.t) / (7 * DAY);
    h += `<div class="card chart bwchart">
      <div class="bw-read sub" data-default="${esc(`${ddmm(first.t)} – ${ddmm(end.t)}, ${signKg(end.kg - first.kg)}`)}">${ddmm(first.t)} – ${ddmm(end.t)}, ${signKg(end.kg - first.kg)}</div>
      ${bwChart(inRange.map(p => ({ t: p.t, v: p.kg, time: p.time })), { goal })}
      <div class="bw-legend sub"><span><i class="lg-line"></i>Gewicht</span>${inRange.length >= 5 ? '<span><i class="lg-line avg"></i>7-Tage-Schnitt</span>' : ''}${goal ? '<span><i class="lg-line goal"></i>Ziel</span>' : ''}</div>
    </div>
    <div class="stats">
      <div><div class="sub">Veränderung</div><b>${signKg(end.kg - first.kg)}</b></div>
      <div><div class="sub">Pro Woche</div><b>${weeks >= 1 ? signKg((end.kg - first.kg) / weeks) : '–'}</b></div>
      <div><div class="sub">Durchschnitt</div><b>${fmtKg(avg)}</b></div>
      <div><div class="sub">Niedrigster</div><b>${fmtKg(Math.min(...vs))}</b></div>
      <div><div class="sub">Höchster</div><b>${fmtKg(Math.max(...vs))}</b></div>
      <div><div class="sub">Einträge</div><b>${inRange.length}</b></div>
    </div>`;
  } else {
    h += `<div class="card"><p class="sub" style="margin:0">${all.length >= 2 ? 'In diesem Zeitraum gibt es zu wenige Einträge – wähl einen längeren Zeitraum.' : 'Ab zwei Einträgen erscheint hier die Kurve.'}</p></div>`;
  }
  h += `<div class="section-title">Eintragen</div>
    <div class="card">
      <div class="grid2">
        <label class="field"><span>Datum</span><input class="input" type="date" id="bw-date" value="${toIsoDate(Date.now())}" max="${toIsoDate(Date.now())}"></label>
        ${timeField('bw-time', hhmm(), true)}
      </div>
      <label class="field"><span>Gewicht</span><div class="unit-wrap"><input class="input" id="bw-kg" inputmode="decimal" placeholder="${last ? fmtNum(last.kg) : '80'}"><span>kg</span></div></label>
      <button class="btn primary block" data-act="bwAddDated">Eintragen</button>
      <button class="btn block" data-act="bwGoal">${goal ? 'Zielgewicht ändern (' + fmtKg(goal) + ')' : 'Zielgewicht festlegen'}</button>
    </div>`;
  if (all.length) {
    const rows = [...all].reverse().map((p, k, arr) => {
      const prev = arr[k + 1];
      const d = prev ? p.kg - prev.kg : null;
      const cls = d == null || Math.abs(d) < 0.05 ? '' : (goal ? ((goal < prev.kg) === (d < 0) ? 'good' : 'bad') : '');
      return `<button class="row" data-act="bwEdit" data-t="${p.t}"><div class="grow"><div class="title">${fmtKg(p.kg)}</div><div class="sub">${bwWhenTxt(p)}</div></div>
        ${d != null ? `<span class="bw-diff ${cls}">${signKg(d)}</span>` : ''}${ICON.chev}</button>`;
    }).join('');
    h += `<div class="section-title">Alle Einträge</div><div class="list">${rows}</div>`;
  }
  return h;
}
function bwEditSheet(t) {
  const e = (S.body || []).find(p => p.t === t);
  if (!e) return;
  setSheet(`<div class="sheet-head"><h2>Eintrag bearbeiten</h2><button class="linkbtn" data-act="closeSheet">Abbrechen</button></div>
    <div class="grid2">
      <label class="field"><span>Datum</span><input class="input" type="date" id="bwe-date" value="${toIsoDate(t)}" max="${toIsoDate(Date.now())}"></label>
      ${timeField('bwe-time', e.time)}
    </div>
    <label class="field"><span>Gewicht</span><div class="unit-wrap"><input class="input" id="bwe-kg" inputmode="decimal" value="${fmtIn(e.kg)}"><span>kg</span></div></label>
    <button class="btn primary block" data-act="bwSave" data-t="${t}">Speichern</button>
    <button class="btn danger block" data-act="bwDel" data-t="${t}">Eintrag löschen</button>`);
}
// Antippen/Ziehen im großen Diagramm zeigt Datum und Gewicht des nächsten Punkts
function bwPointer(e) {
  const svg = e.target.closest && e.target.closest('svg.bwsvg[data-pts]');
  if (!svg) return;
  const pts = svg.dataset.pts.split(';').map(s => { const a = s.split(','); return [+a[0], +a[1], +a[2], +a[3], a[4]]; });
  const r = svg.getBoundingClientRect();
  const vx = ((e.clientX - r.left) / r.width) * svg.viewBox.baseVal.width;
  let best = pts[0];
  for (const q of pts) if (Math.abs(q[0] - vx) < Math.abs(best[0] - vx)) best = q;
  const cur = svg.querySelector('.cursor');
  cur.setAttribute('visibility', 'visible');
  cur.querySelector('line').setAttribute('x1', best[0]); cur.querySelector('line').setAttribute('x2', best[0]);
  cur.querySelector('circle').setAttribute('cx', best[0]); cur.querySelector('circle').setAttribute('cy', best[1]);
  const rd = svg.closest('.bwchart').querySelector('.bw-read');
  rd.textContent = `${dateLabel(best[2], true)}${best[4] ? ', ' + best[4] + ' Uhr' : ''}: ${fmtKg(best[3])}`;
  rd.classList.add('on');
}
function bwPointerEnd(e) {
  const svg = e.target.closest && e.target.closest('svg.bwsvg[data-pts]');
  if (!svg) return;
  svg.querySelector('.cursor').setAttribute('visibility', 'hidden');
  const rd = svg.closest('.bwchart').querySelector('.bw-read');
  rd.textContent = rd.dataset.default; rd.classList.remove('on');
}
document.addEventListener('pointerdown', bwPointer);
document.addEventListener('input', e => {
  if (e.target.type === 'time') { delete e.target.dataset.auto; const b = e.target.parentElement.querySelector('.time-clear'); if (b) b.hidden = !e.target.value; }
});
document.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) bwPointer(e); });
document.addEventListener("pointerleave", e => { if (e.target.matches && e.target.matches("svg.bwsvg")) bwPointerEnd(e); }, true);
document.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') setTimeout(() => bwPointerEnd(e), 1800); });
