'use strict';
// Gym Tracker – Tab-Leiste, Wischen, Hell/Dunkel und App-Start.
// Alle Dateien in js/ teilen sich den globalen Bereich; Reihenfolge siehe index.html.

/* ---------- Tab-Leiste mit verschiebbarer Auswahl-Pille ---------- */
const TAB_ORDER = ['home', 'train', 'plan', 'log', 'more'];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
function selectTab(t) {
  V.backTab = null;
  if (sheetOpen) closeSheet();
  // Nur eigene Unterseiten-Einträge zurückgehen – nie weiter, sonst verließe man die App
  if (V.sub) { V.sub = null; const n = subDepth; subDepth = 0; if (n) history.go(-n); }
  const dir = Math.sign(TAB_ORDER.indexOf(t) - TAB_ORDER.indexOf(V.tab)); // 1 = nach rechts
  V.tab = t; render(); scrollTo(0, 0);
  if (dir) slideIn(dir);
}
// Neue Seite gleitet aus der Richtung des Tabs herein (rechts liegender Tab -> von rechts)
function slideIn(dir) {
  if (reduceMotion.matches || !Element.prototype.animate) return;
  // Gleiches Tempo und gleiche Federung wie die Pille (style.css: #tabs .pill)
  const ease = 'cubic-bezier(.3, 1.35, .5, 1)';
  for (const el of [$('#view'), $('#title')]) {
    el.getAnimations().forEach(x => x.cancel());
    const an = el.animate([{ transform: `translateX(${dir * 56}px)`, opacity: 0 }, { opacity: 1, offset: 0.5 }, { transform: 'none', opacity: 1 }],
      { duration: 420, easing: ease });
    setTimeout(() => an.cancel(), 800); // Sicherheitsnetz: Seite nie unsichtbar hängen lassen
  }
}
const tabsEl = $('#tabs');
const pill = document.createElement('div');
pill.className = 'pill'; tabsEl.prepend(pill);
const tabBtns = () => [...tabsEl.querySelectorAll('button')];
function pillTo(x, w, lifted) {
  pill.style.width = w + 'px';
  pill.style.transform = `translateX(${x}px) scale(${lifted ? 1.12 : 1})`;
}
// Pille unter den aktiven Tab setzen (beim ersten Mal ohne Animation)
function placePill() {
  const b = tabBtns().find(x => x.dataset.tab === V.tab);
  if (!b || !b.offsetWidth || tabDrag) return;
  if (!pill.dataset.ready) { pill.classList.add('noanim'); requestAnimationFrame(() => requestAnimationFrame(() => pill.classList.remove('noanim'))); pill.dataset.ready = 1; }
  pillTo(b.offsetLeft, b.offsetWidth, false);
}
window.addEventListener('resize', () => placePill());
let tabDrag = null, tabHandledAt = 0;
function tabAt(clientX) {
  let best = null, dist = 1e9;
  for (const b of tabBtns()) { const r = b.getBoundingClientRect(), d = Math.abs(clientX - (r.left + r.width / 2)); if (d < dist) { dist = d; best = b; } }
  return best;
}
function tabDragStart() {
  if (!tabDrag || tabDrag.active) return;
  tabDrag.active = true; tabsEl.classList.add('drag');
  if (navigator.vibrate) navigator.vibrate(8);
  tabDragMove(tabDrag.x);
}
function tabDragMove(clientX) {
  const r = tabsEl.getBoundingClientRect(), w = tabBtns()[0].offsetWidth, pad = 6;
  const x = Math.max(pad, Math.min(r.width - pad - w, clientX - r.left - w / 2));
  pillTo(x, w, true);
  const b = tabAt(clientX);
  if (b !== tabDrag.hover) {
    if (tabDrag.hover) tabDrag.hover.classList.remove('hover');
    b.classList.add('hover'); tabDrag.hover = b;
    if (navigator.vibrate) navigator.vibrate(5);
    // Kurz über einem Bereich verweilen -> schon wechseln (Finger bleibt auf der Leiste)
    clearTimeout(tabDrag.dwell);
    if (b.dataset.tab !== V.tab) tabDrag.dwell = setTimeout(() => {
      if (tabDrag && tabDrag.hover === b) { selectTab(b.dataset.tab); if (navigator.vibrate) navigator.vibrate(10); }
    }, 350);
  }
}
tabsEl.addEventListener('pointerdown', e => {
  if (e.button > 0) return;
  tabDrag = { id: e.pointerId, x0: e.clientX, x: e.clientX, active: false, hover: null };
  tabDrag.timer = setTimeout(tabDragStart, 220); // gedrückt halten -> Pille hebt sich an
  try { tabsEl.setPointerCapture(e.pointerId); } catch { /* egal */ }
});
tabsEl.addEventListener('pointermove', e => {
  if (!tabDrag || e.pointerId !== tabDrag.id) return;
  tabDrag.x = e.clientX;
  if (!tabDrag.active && Math.abs(e.clientX - tabDrag.x0) > 8) { clearTimeout(tabDrag.timer); tabDragStart(); }
  else if (tabDrag.active) tabDragMove(e.clientX);
});
function tabDragEnd(e, cancel) {
  if (!tabDrag || e.pointerId !== tabDrag.id) return;
  const d = tabDrag; tabDrag = null;
  clearTimeout(d.timer); clearTimeout(d.dwell);
  tabsEl.classList.remove('drag');
  if (d.hover) d.hover.classList.remove('hover');
  tabHandledAt = Date.now();
  const b = cancel ? null : (d.active ? d.hover : tabAt(e.clientX));
  if (b && !(d.active && b.dataset.tab === V.tab)) selectTab(b.dataset.tab); else placePill();
}
tabsEl.addEventListener('pointerup', e => tabDragEnd(e, false));
tabsEl.addEventListener('pointercancel', e => tabDragEnd(e, true));

// Auf der Seite nach links/rechts wischen -> Nachbarbereich (Seite folgt leicht dem Finger).
// Im Training-Vollbild: nächste bzw. vorige Übung.
function swipeTarget(dx) {
  if (inFocus()) {
    const k = S.active.pos + (dx < 0 ? 1 : -1);
    return k >= 0 && k < S.active.order.length ? k : null;
  }
  return TAB_ORDER[TAB_ORDER.indexOf(V.tab) + (dx < 0 ? 1 : -1)] || null;
}
let sw = null;
document.addEventListener('touchstart', e => {
  sw = null;
  if (e.touches.length !== 1 || sheetOpen || $('#dlg') || $('#celebrate')) return;
  const t = e.touches[0];
  if (t.clientX < 24 || t.clientX > innerWidth - 24) return; // Rand frei lassen für die Zurück-Geste des Handys
  // Überall wischen, auch unter kurzem Inhalt (z. B. Plan) – nur nicht auf Leisten, Fenstern und Eingaben
  if (e.target.closest('#tabs, #sheet, #backdrop, #timer, #toast, #update, .wk-nav, input, textarea, select, .bwsvg, .chart svg, .no-swipe')) return;
  sw = { x0: t.clientX, y0: t.clientY, t0: Date.now(), dir: null, dx: 0 };
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!sw) return;
  const t = e.touches[0], dx = t.clientX - sw.x0, dy = t.clientY - sw.y0;
  if (!sw.dir && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) sw.dir = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'h' : 'v';
  if (sw.dir !== 'h') return;
  sw.dx = dx;
  const next = swipeTarget(dx);
  const v = $('#view');
  v.getAnimations().forEach(x => x.cancel());
  v.style.transform = `translateX(${dx * (next != null ? 0.3 : 0.08)}px)`;
  v.style.opacity = next != null ? Math.max(0.4, 1 - Math.abs(dx) / 600) : 1;
}, { passive: true });
document.addEventListener('touchend', () => {
  const s = sw; sw = null;
  if (!s || s.dir !== 'h') return;
  const v = $('#view'), cur = v.style.transform;
  v.style.transform = ''; v.style.opacity = '';
  const next = swipeTarget(s.dx);
  const fast = Math.abs(s.dx) / (Date.now() - s.t0) > 0.4;
  if (next != null && (Math.abs(s.dx) > 80 || (fast && Math.abs(s.dx) > 35))) {
    if (inFocus()) { goEx(next); return; }
    tabHandledAt = Date.now(); selectTab(next); return;
  }
  if (cur && Element.prototype.animate) v.animate([{ transform: cur }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.3, 1.35, .5, 1)' });
});
document.addEventListener('touchcancel', () => { if (sw) { sw = null; const v = $('#view'); v.style.transform = ''; v.style.opacity = ''; } });

document.addEventListener('click', e => {
  const tab = e.target.closest('#tabs button') || (e.target === tabsEl ? tabsEl : null);
  if (tab) {
    // Antippen/Ziehen wird schon über pointerup erledigt; Klick nur noch für Tastatur
    if (Date.now() - tabHandledAt < 600 || tab === tabsEl) return;
    selectTab(tab.dataset.tab);
    return;
  }
  if (e.target.id === 'backdrop') { closeSheet(); return; }
  const a = e.target.closest('[data-act]');
  if (a && actions[a.dataset.act]) { e.preventDefault(); actions[a.dataset.act](a, e); }
});
document.addEventListener('input', e => {
  const f = e.target.dataset && e.target.dataset.field;
  if (!f) return;
  if (f === 'weight' || f === 'reps') {
    const s = S.active.entries[+e.target.dataset.i].sets[+e.target.dataset.j];
    s[f] = f === 'reps' ? Math.max(0, Math.round(num(e.target.value))) : Math.max(0, num(e.target.value));
    save();
  } else if (f === 'dayName') {
    const d = findDay(V.sub); if (d) { d.name = e.target.value; $('#title').textContent = d.name || 'Trainingstag'; save(); }
  } else if (f === 'name') {
    S.settings.name = e.target.value.trim().slice(0, 30); save();
  } else if (f === 'defRest') {
    S.settings.rest = Math.max(0, Math.round(num(e.target.value))); save();
  }
});
document.addEventListener('change', e => {
  const f = e.target.dataset && e.target.dataset.field;
  if (f === 'importFile' && e.target.files[0]) { importData(e.target.files[0]); e.target.value = ''; }
});
// „Erweiterte Informationen“: auf/zu merken und Werte nachladen
document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('details.adv')) { V.advOpen = e.target.open; if (e.target.open) fillAdvInfo(); } }, true);
document.addEventListener('focusin', e => { if (e.target.matches('.set-row input')) setTimeout(() => e.target.select(), 0); });

/* ---------- Hell / Dunkel ---------- */
const darkMq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const t = S.settings.theme || 'auto', root = document.documentElement, a = S.settings.accent || 'blue';
  if (t === 'auto') delete root.dataset.theme; else root.dataset.theme = t;
  if (a === 'blue') delete root.dataset.accent; else root.dataset.accent = a;
  try {
    if (t === 'auto') localStorage.removeItem('gym-theme'); else localStorage.setItem('gym-theme', t);
    if (a === 'blue') localStorage.removeItem('gym-accent'); else localStorage.setItem('gym-accent', a); // schon vor dem Laden setzen (kein Aufblitzen)
  } catch { /* egal */ }
  const dark = t === 'dark' || (t === 'auto' && darkMq.matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.content = dark ? '#000000' : '#f2f2f7'; });
}
darkMq.addEventListener('change', applyTheme);

/* ---------- Start ---------- */
(async function init() {
  let saved = null;
  try {
    saved = await idb.get('state');
    if (saved) S = cleanState(Object.assign({}, saved, { settings: Object.assign({}, S.settings, saved.settings) }));
    // Erststart: leerer Plan zum selbst Eintragen (bestehende Daten bleiben unverändert)
    await flush();
    for (const k of await idb.keys()) if (String(k).startsWith('img:')) localImgs[k.slice(4)] = await idb.get(k);
  } catch (e) { toast('Speicher nicht verfügbar: ' + e.message); }
  applyTheme();
  if (S.active && !(S.active.entries || []).length) S.active = null; // Training ohne Übungen (früherer Fehler)
  if (S.active) V.tab = 'train'; // laufendes Training: direkt wieder im Vollbild
  render();
  if (DRIVE_DIRECT) loadGis().catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  // Neuerungen einmal nach einem Update zeigen (nicht beim allerersten Start)
  const news = saved && S.settings.seenVersion !== APP_VERSION ? changesSince(S.settings.seenVersion) : [];
  if (news.length) {
    openSheet(`<div class="sheet-head"><h2>Neu in Version ${APP_VERSION}</h2></div>
      <ul class="instr" style="color:var(--text);font-size:15px">${news.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      <button class="btn primary block" data-act="closeSheet">Alles klar</button>`);
  }
  S.settings.seenVersion = APP_VERSION;
  checkPlanLink();
  // Ab wann die App genutzt wird (davor gilt nichts als „verpasst“)
  if (!S.settings.since) S.settings.since = Math.min(Date.now(), ...S.logs.map(l => l.startedAt));
  save();
  if ('serviceWorker' in navigator) {
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) showUpdate(); hadController = true; });
    navigator.serviceWorker.register('sw.js').then(reg => {
      warmAll(); fillMuscles();
      // Beim Zurückkehren in die App nach Updates schauen
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  }
})();
async function showUpdate() {
  if ($('#update')) return;
  // Nur melden, wenn die Version auf dem Server wirklich neuer ist als die laufende Seite
  try {
    const txt = await (await fetch('js/core.js', { cache: 'no-store' })).text();
    const m = txt.match(/APP_VERSION = '([^']+)'/);
    if (!m || m[1] === APP_VERSION) return;
  } catch { return; }
  const el = document.createElement('div');
  el.id = 'update'; el.className = 'glass';
  el.innerHTML = '<div class="grow"><b>Neue Version verfügbar</b><div class="sub">Deine Daten bleiben erhalten.</div></div><button class="btn primary small" id="updBtn">Neu laden</button>';
  document.body.appendChild(el);
  $('#updBtn').addEventListener('click', async () => { await flush(); location.reload(); });
}
