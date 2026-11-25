'use strict';
// Gym Tracker – Rendern, Trainingsauswahl, Home und Kalender-Planung.
// Alle Dateien in js/ teilen sich den globalen Bereich; Reihenfolge siehe index.html.

/* ---------- Rendern ---------- */
const inFocus = () => V.tab === 'train' && !!S.active && !V.sub;
// info: Schlüssel aus INFO – dann steht der i-Knopf direkt hinter dem Seitentitel
function setTop(title, left = '', right = '', info = '') {
  $('#title').innerHTML = esc(title) + (info ? infoBtn(info) : '');
  $('#topleft').innerHTML = left;
  $('#topright').innerHTML = right;
  // Der große Titel scrollt immer mit (wie bei iOS). Nur eine Knopfzeile bleibt beim Scrollen oben stehen;
  // ohne Knöpfe scrollt auch sie mit, und ohne Titel und Knöpfe (Home) fällt sie ganz weg.
  const tb = $('#topbar');
  tb.classList.toggle('bare', !title && !left && !right);
  tb.classList.toggle('static', !left && !right);
}
function render() {
  // Vollbild zuerst umschalten: Ist die Tab-Leiste noch versteckt, kann die Pille nicht gemessen werden (blieb nach „Minimieren“ auf Training)
  document.body.classList.toggle('focus', inFocus());
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === V.tab));
  placePill();
  const view = $('#view');
  if (V.tab === 'home') view.innerHTML = renderHome();
  else if (V.tab === 'train') view.innerHTML = S.active ? renderWorkout() : renderDays();
  else if (V.tab === 'plan') view.innerHTML = V.sub && findDay(V.sub) ? renderDayEditor(findDay(V.sub)) : renderPlan();
  else if (V.tab === 'log') view.innerHTML = V.sub === 'weight' ? renderWeight() : V.sub === 'ex' ? renderExList() : V.sub === 'muscles' ? renderMuscles()
    : typeof V.sub === 'string' && V.sub.startsWith('ex:') ? renderExHist(V.sub.slice(3))
    : typeof V.sub === 'string' && V.sub.startsWith('month:') ? renderMonth(V.sub.slice(6))
    : typeof V.sub === 'string' && V.sub.startsWith('year:') ? renderYear(+V.sub.slice(5)) : renderLog();
  else { view.innerHTML = renderMore(); if (V.advOpen) queueMicrotask(fillAdvInfo); }
  tickElapsed();
}

/* ----- Training: Übersicht ----- */
function lastLogOfDay(dayId) { return S.logs.find(l => l.dayId === dayId); } // logs: neueste zuerst
function nextDayId() {
  const days = S.plan.days;
  if (!days.length) return null;
  const last = S.logs.find(l => days.some(d => d.id === l.dayId));
  if (!last) return days[0].id;
  const i = days.findIndex(d => d.id === last.dayId);
  return days[(i + 1) % days.length].id;
}
function renderDays() {
  setTop('Training');
  if (!S.plan.days.length) {
    return `${installBanner()}<div class="empty"><b>Willkommen!</b>Leg im Tab „Plan“ deine Trainingstage und Übungen an – danach kannst du hier loslegen.</div>
      <button class="btn primary block" data-act="goPlan">Plan erstellen</button>`;
  }
  const pick = scheduledPick();
  let h = installBanner() + backupBanner();
  if (pick.doneToday) h += `<div class="card" style="display:flex;gap:10px;align-items:center"><span style="color:var(--green)">${ICON.check}</span><div><b>Heute schon trainiert</b><div class="sub">Stark! Gönn dir die Pause.</div></div></div>`;
  const days = [...S.plan.days].sort((a, b) => (b.id === pick.id) - (a.id === pick.id));
  for (const d of days) {
    const last = lastLogOfDay(d.id);
    const hi = d.id === pick.id;
    const wds = (d.weekdays || []).map(i => WD[i]).join(', ');
    h += `<article class="card day">
      <div class="day-head">
        <div><div class="day-name">${esc(d.name)}</div>
        <div class="sub">${wds ? wds + SEP : ''}${pl(d.exercises.length, 'Übung', 'Übungen')}${last ? SEP + 'zuletzt ' + relDay(last.startedAt) : ''}</div></div>
        ${hi ? `<span class="badge">${esc(pick.label)}</span>` : ''}
      </div>
      <div class="day-ex">${d.exercises.map(e => esc(e.name)).join(', ') || 'Keine Übungen'}</div>
      <button class="btn ${hi && pick.label === 'Heute' ? 'primary' : ''}" data-act="start" data-id="${d.id}">Training starten</button>
    </article>`;
  }
  return h;
}
/* ----- Home: Begrüßung und das Wichtigste auf einen Blick ----- */
const minTxt = ms => { const m = Math.max(1, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`; };
// Übungen eines Tages, bei denen letztes Mal alle Sätze das obere Wdh.-Ziel erreicht haben
function levelUps(d) {
  return d.exercises.filter(e => {
    const s = lastSetsOf(e.id, e.name);
    return e.repMax && s && s.length >= e.sets && s.every(x => x.reps >= e.repMax);
  }).map(e => e.name);
}
function dayCard(d, label, primary) {
  const last = lastLogOfDay(d.id);
  const sets = d.exercises.reduce((n, e) => n + (e.sets || 0), 0);
  const dur = last ? last.endedAt - last.startedAt : sets * 150000;
  const ups = levelUps(d);
  return `<article class="card day">
    <div class="day-head"><div><div class="day-name">${esc(d.name)}</div>
      <div class="sub">${pl(d.exercises.length, 'Übung', 'Übungen')}${SEP}${pl(sets, 'Satz', 'Sätze')}${SEP}ca. ${minTxt(dur)}</div></div>
      <span class="badge">${esc(label)}</span></div>
    <div class="day-ex">${d.exercises.map(e => esc(e.name)).join(', ') || 'Keine Übungen'}</div>
    ${ups.length ? `<p class="sub home-up">${ICON.up}Bereit zum Steigern: ${ups.map(esc).join(', ')}</p>` : ''}
    <button class="btn ${primary ? 'primary' : ''}" data-act="start" data-id="${d.id}">Training starten</button>
  </article>`;
}
// Wochenring wie bei Apple Fitness: füllt sich mit jedem Training, grün wenn das Wochenziel steht
function weekRing(c, req) {
  const r = 40, len = 2 * Math.PI * r, f = req ? Math.min(1, c / req) : (c ? 1 : 0);
  return `<svg class="ring${f >= 1 ? ' full' : ''}" viewBox="0 0 100 100" aria-label="${c} von ${req} Trainings">
    <circle class="ring-bg" cx="50" cy="50" r="${r}"/>
    ${f > 0 ? `<circle class="ring-fg" cx="50" cy="50" r="${r}" stroke-dasharray="${(len * f).toFixed(1)} ${len.toFixed(1)}"/>` : ''}</svg>`;
}
function renderHome() {
  setTop('');
  const name = (S.settings.name || '').trim();
  const hr = new Date().getHours();
  const days = S.plan.days;
  const pick = days.length ? scheduledPick() : null;
  const todayD = pick && pick.label === 'Heute' ? findDay(pick.id) : null;
  let line;
  if (S.active) line = 'Dein Training läuft gerade – weiter geht’s!';
  else if (!days.length) line = 'Schön, dass du da bist. Leg los mit deinem Trainingsplan.';
  else if (pick.doneToday) line = 'Heute schon trainiert – stark!';
  else if (todayD) line = `Heute steht <b>${esc(todayD.name)}</b> an. ${hr < 11 ? 'Guten Start in den Tag!' : 'Auf geht’s!'}`;
  else line = 'Heute ist Ruhetag – Erholung gehört zum Training dazu.';
  let h = `<section class="hello">
    <div class="sub">${esc(dateLabel(Date.now(), true))}</div>
    <h2>Hallo${name ? ', ' + esc(name) : ''}</h2>
    <p>${line}</p></section>`;
  // Beim ersten Start: Name, Hell/Dunkel und Akzentfarbe (alles später unter Mehr änderbar)
  if (!name && !S.settings.setupDone) h += `<div class="card setup"><b>Willkommen!</b>
    <div class="sub" style="margin-top:2px">Kurz einrichten – alles lässt sich später unter Mehr ändern.</div>
    <label class="field"><span>Dein Name</span><input class="input" id="name-in" placeholder="Dein Name" maxlength="30" autocomplete="given-name" value="${esc(V.nameDraft || '')}"></label>
    <div class="field"><span>Darstellung</span>${themeSeg()}</div>
    <div class="field"><span>Akzentfarbe</span>${accentPicker()}</div>
    <div class="field"><span>Pause zwischen den Sätzen</span>${restSeg()}</div>
    <button class="btn primary block" style="margin-top:16px" data-act="saveName">Los geht’s</button></div>`;
  h += installBanner() + backupBanner();
  // 20. bis 31. Dezember: eigenes Widget für den Jahresrückblick
  if (yearWidgetDue()) {
    const y = new Date().getFullYear(), Y = yearStats(y);
    h += `<button class="card year-card" data-act="openYear" data-y="${y}">
      <div class="year-ic">${TROPHY}</div>
      <div class="grow"><div class="sub">Jahresrückblick</div><div class="year-t">Dein Jahr ${y}</div>
      <div class="sub">${pl(Y.logs.length, 'Training', 'Trainings')}${SEP}${tons(Y.vol)} bewegt</div></div>${ICON.chev}</button>`;
  }
  if (!days.length) {
    return h + `<div class="card"><b>Noch kein Trainingsplan</b><div class="sub" style="margin:2px 0 12px">Leg deine Trainingstage und Übungen an – oder lass dir einen Plan-Link schicken (Mehr → Plan).</div>
      <button class="btn primary block" data-act="goPlan">Plan erstellen</button></div>`;
  }
  // Heute
  if (S.active) {
    const { done, total } = workoutCounts();
    h += `<div class="section-title">Läuft gerade</div><article class="card">
      <div class="day-head"><div><div class="day-name">${esc(S.active.dayName)}</div>
        <div class="sub">seit <b id="elapsed">0:00</b>${SEP}${done} / ${total} Sätze</div></div></div>
      <div class="progress"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div>
      <button class="btn primary" style="margin-top:12px" data-act="goTab" data-tab="train">Weiter trainieren</button></article>`;
  } else {
    const todayLogs = S.logs.filter(l => dayStart(l.startedAt) === dayStart(Date.now()));
    h += '<div class="section-title">Heute</div>';
    if (todayLogs.length) {
      h += todayLogs.map(l => { const { sets, vol } = logStats(l); const pr = (l.prs || []).length;
        return `<button class="card home-done" data-act="openLog" data-id="${l.id}"><span style="color:var(--green)">${ICON.check}</span>
          <div class="grow"><b>${esc(l.dayName)} erledigt</b><div class="sub">${minTxt(l.endedAt - l.startedAt)}${SEP}${pl(sets, 'Satz', 'Sätze')}${SEP}${fmtNum(Math.round(vol))} kg bewegt${pr ? `<span class="pr">${pr} PR</span>` : ''}</div></div>${ICON.chev}</button>`; }).join('');
    } else if (todayD) {
      h += dayCard(todayD, 'Heute', true);
    } else {
      h += `<div class="card"><b>Ruhetag</b><div class="sub">Kein Training geplant – Muskeln wachsen in der Pause.</div></div>`;
    }
    if (!todayD && pick.id && findDay(pick.id)) h += `<div class="section-title">Als Nächstes</div>` + dayCard(findDay(pick.id), pick.label.replace('Als Nächstes: ', ''), false);
  }
  // Woche
  const w = weekStats();
  const tdy = dayStart(Date.now());
  const dots = WD.map((wd, k) => {
    const t = addDays(w.thisWs, k), p = planOn(t);
    let cls = 'wdot';
    if (w.trained.has(t)) cls += ' done'; else if (w.sick.has(t)) cls += ' sick';
    else if (p.d) cls += t >= tdy ? ' plan' : (!p.x ? ' miss' : '');
    if (t === tdy) cls += ' today';
    return `<div class="${cls}"><i></i><span>${wd}</span></div>`;
  }).join('');
  const prWeek = S.logs.filter(l => l.startedAt >= w.thisWs).reduce((n, l) => n + (l.prs || []).length, 0);
  const pm = planMuscles(), cnt = muscleCounts(w.thisWs);
  const missing = S.logs.some(l => l.startedAt >= w.thisWs) ? [...pm].filter(k => !cnt[k] && MUSCLE_DE[k]).map(k => MUSCLE_DE[k]) : [];
  h += `<div class="section-title">Diese Woche</div>
    <button class="card home-week" data-act="goTab" data-tab="log">
      <div class="ring-row">${weekRing(w.c, w.req)}
        <div class="ring-txt"><div><div class="sub">Trainings</div><div class="big">${w.c}<small> / ${w.req}</small></div></div>
        <div><div class="sub">Serie</div><div class="big" style="font-size:22px">${w.streak} ${w.streak === 1 ? 'Woche' : 'Wochen'}</div></div></div>
      </div>
      <div class="wdots">${dots}</div>
      ${prWeek ? `<div class="sub">${prWeek} ${prWeek === 1 ? 'neuer Rekord' : 'neue Rekorde'} diese Woche</div>` : ''}
      ${missing.length ? `<div class="sub">Noch nicht dran: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' …' : ''}</div>` : ''}
    </button>`;
  // Erste Woche im Monat: Rückblick auf den Vormonat
  if (new Date().getDate() <= 7) {
    const pk = monthKey(monthStart(monthKey(Date.now()), -1)), pm = monthStats(pk);
    if (pm.logs.length) h += `<div class="list"><button class="row" data-act="openMonth" data-k="${pk}"><div class="grow"><div class="title">Dein ${monthOnly(pk)} im Rückblick</div>
      <div class="sub">${pl(pm.logs.length, 'Training', 'Trainings')}${pm.prs.length ? `${SEP}${pl(pm.prs.length, 'Rekord', 'Rekorde')}` : ''}${SEP}${kgShort(pm.vol)} bewegt</div></div>${ICON.chev}</button></div>`;
  }
  // Körpergewicht (mit Schnell-Eintrag)
  const b = bodySorted(), lastB = b[b.length - 1];
  const bwToday = lastB && dayStart(lastB.t) === tdy;
  h += `<div class="section-title">Gewicht${bwToday ? '' : '<span class="sec-note">heute noch offen</span>'}</div>` + renderBody();
  // Letztes Training (falls nicht heute)
  const lastL = S.logs.find(l => dayStart(l.startedAt) !== tdy);
  if (lastL) {
    const { sets, vol } = logStats(lastL);
    h += `<div class="section-title">Letztes Training</div><div class="list"><button class="row" data-act="openLog" data-id="${lastL.id}"><div class="grow">
      <div class="title">${esc(lastL.dayName)} <span class="muted" style="font-weight:400">· ${relDay(lastL.startedAt)}</span></div>
      <div class="sub">${minTxt(lastL.endedAt - lastL.startedAt)}${SEP}${pl(sets, 'Satz', 'Sätze')}${SEP}${fmtNum(Math.round(vol))} kg bewegt</div></div>${ICON.chev}</button></div>`;
  }
  return h;
}

/* ----- Kalender-Planung -----
   Grundlage sind die Wochentage im Plan. Einzelne Tage lassen sich überschreiben:
   S.cal[Tagesbeginn] = { d: Tag-ID oder null (fällt aus), x: true = Extra-Training (zählt nicht zum Wochenziel) } */
function addDays(t, n) { const d = new Date(t); d.setDate(d.getDate() + n); return dayStart(d.getTime()); }
function wdOf(t) { return (new Date(t).getDay() + 6) % 7; }
function hasSchedule() { return S.plan.days.some(d => (d.weekdays || []).length) || Object.keys(S.cal || {}).length > 0; }
function regularOn(t) { const wd = wdOf(t); const d = S.plan.days.find(x => (x.weekdays || []).includes(wd)); return d ? d.id : null; }
function planOn(t) {
  const o = (S.cal || {})[t];
  // Eintrag zeigt auf einen Tag, den es nicht mehr gibt (gelöscht, neuer Plan): normal planen statt „fällt aus“
  if (o && !(o.d && !findDay(o.d))) { const d = o.d || null; return { d, x: !!(o.x && d), changed: true }; }
  return { d: regularOn(t), x: false, changed: false };
}
function setPlan(t, d, x = false) {
  S.cal = S.cal || {};
  if (d === regularOn(t) && !x) delete S.cal[t]; else S.cal[t] = { d, x };
}
function shortName(id) {
  const d = findDay(id);
  if (!d) return '';
  const m = d.name.match(/\(([^)]{1,4})\)/);
  return m ? m[1] : d.name.slice(0, 2);
}
function dateLabel(t, long) {
  return new Date(t).toLocaleDateString('de-DE', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'numeric' });
}
// Welcher Tag ist heute dran bzw. als Nächstes (nach Kalender, sonst reihum)?
function scheduledPick() {
  const today = dayStart(Date.now());
  const doneToday = S.logs.some(l => dayStart(l.startedAt) === today);
  if (!hasSchedule()) return { id: nextDayId(), label: 'Als Nächstes', doneToday };
  const p = planOn(today);
  if (p.d && !doneToday) return { id: p.d, label: 'Heute', doneToday };
  for (let k = 1; k <= 21; k++) {
    const t = addDays(today, k), q = planOn(t);
    if (q.d) return { id: q.d, label: k === 1 ? 'Morgen' : 'Als Nächstes: ' + WD[wdOf(t)], doneToday };
  }
  return { id: null, label: '', doneToday };
}
