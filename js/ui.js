'use strict';
// Gym Tracker – Pausen-Timer, Sheets, eigene Dialoge, Toast, Bilder vorladen.
// Alle Dateien in js/ teilen sich den globalen Bereich; Reihenfolge siehe index.html.

/* ---------- Pausen-Timer ---------- */
const T = { end: 0, total: 0, iv: null, endedAt: 0, noteSec: null };
function startRest(sec) {
  if (!sec) return;
  T.total = sec; T.end = Date.now() + sec * 1000; T.endedAt = 0; T.noteSec = null;
  clearInterval(T.iv); T.iv = setInterval(tickRest, 250);
  tickRest();
}
function tickRest() {
  const el = $('#timer');
  const left = Math.ceil((T.end - Date.now()) / 1000);
  el.hidden = false;
  if (left <= 0) {
    el.classList.add('end');
    el.dataset.mode = 'end';
    el.innerHTML = '<span class="lbl">Pause vorbei</span><b>Los!</b><button data-act="tStop">OK</button>';
    clearInterval(T.iv); T.iv = null; T.endedAt = Date.now();
    if (navigator.vibrate) navigator.vibrate([300, 120, 300]);
    if (document.hidden) restNote('end');
    setTimeout(() => { if (!T.iv) el.hidden = true; updateMini(); }, 6000);
    updateMini();
    return;
  }
  el.classList.remove('end');
  if (!el.querySelector('b') || el.dataset.mode !== 'run') {
    el.dataset.mode = 'run';
    el.innerHTML = '<span class="lbl">Pause</span><b></b><button data-act="tAdd" data-d="-15">−15 s</button><button data-act="tAdd" data-d="15">+15 s</button><button data-act="tStop" aria-label="Pause beenden">✕</button>';
  }
  el.querySelector('b').textContent = fmtDur(left * 1000);
  // App im Hintergrund: Benachrichtigung jede Sekunde still neu schreiben, damit der Timer dort runterläuft
  if (document.hidden && left !== T.noteSec) { T.noteSec = left; restNote('run'); }
  updateMini();
}
function stopRest() { clearInterval(T.iv); T.iv = null; T.endedAt = 0; const el = $('#timer'); el.hidden = true; el.dataset.mode = ''; restNote('close'); updateMini(); }

/* ----- Pausen-Timer als Benachrichtigung (Android): nur solange die App im Hintergrund ist ----- */
const notifyOn = () => CAN_NOTIFY && S.settings.restNotify && Notification.permission === 'granted';
const clock = t => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
async function restNote(kind) {
  if (!notifyOn()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    if (kind === 'close') { (await reg.getNotifications({ tag: 'rest' })).forEach(n => n.close()); return; }
    const opt = { tag: 'rest', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', lang: 'de' };
    if (kind === 'run') {
      const left = Math.max(0, Math.ceil((T.end - Date.now()) / 1000));
      T.noteSec = left;
      // Restzeit im Titel (läuft jede Sekunde runter), Endzeit im Text: stimmt auch, wenn Android die App im Hintergrund anhält
      await reg.showNotification(`Pause ${fmtDur(left * 1000)}`, { ...opt, body: `Bis ${clock(T.end)} Uhr – antippen, um zurückzukehren`, silent: true, renotify: false });
    } else {
      const A = S.active, en = A && A.entries[A.order ? A.order[A.pos] : 0];
      await reg.showNotification('Pause vorbei – los!', { ...opt, body: en ? `Weiter mit ${en.name}` : 'Zeit für den nächsten Satz', renotify: true, vibrate: [300, 120, 300] });
    }
  } catch { /* Benachrichtigungen nicht möglich – Timer in der App läuft trotzdem */ }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { if (T.iv) tickRest(); restNote('close'); }
  else { flush(); if (T.iv) restNote('run'); }
});

/* ----- Training minimiert: Leiste unten mit Pause bzw. Trainingszeit, antippen = zurück ins Training ----- */
function updateMini() {
  const m = $('#mini');
  if (!m) return; // alte index.html aus dem Offline-Speicher mit neuem Skript: einfach ohne Leiste
  const show = !!S.active && !inFocus();
  document.body.classList.toggle('mini', show);
  m.hidden = !show;
  if (!show) return;
  const run = !!T.iv, ended = !run && T.endedAt && Date.now() - T.endedAt < 6000;
  const state = run ? `Pause <b>${fmtDur(Math.max(0, Math.ceil((T.end - Date.now()) / 1000)) * 1000)}</b>`
    : ended ? '<b class="ok">Pause vorbei – los!</b>' : `läuft seit <b>${fmtDur(Date.now() - S.active.startedAt)}</b>`;
  const html = `<span class="mini-dot${run ? ' run' : ''}" aria-hidden="true"></span><span class="grow"><span class="mini-t">${esc(S.active.dayName)}</span><span class="mini-s">${state}</span></span><span class="mini-go">Zurück${ICON.chev}</span>`;
  if (m.dataset.html !== html) { m.innerHTML = html; m.dataset.html = html; }
  m.setAttribute('aria-label', `Zurück zum Training ${S.active.dayName}`);
}

/* ---------- Sheet + Zurück-Taste ---------- */
let sheetOpen = false, ignorePop = false;
/* ----- Eigene Dialoge (statt der Android-Popups prompt/confirm) ----- */
// dialog() liefert true/false (Bestaetigung) bzw. Text/null (Eingabe)
let dlgCancel = null, dlgAfterPop = null;
function dialog({ title, text = '', input = null, ok = 'OK', cancel = 'Abbrechen', danger = false }) {
  return new Promise(resolve => {
    if (dlgCancel) dlgCancel();
    const no = input ? null : false;
    const wrap = document.createElement('div');
    wrap.id = 'dlg';
    let field = '';
    if (input) {
      const ph = esc(input.placeholder || '');
      field = input.multiline
        ? `<textarea class="input" id="dlg-in" rows="3" placeholder="${ph}">${esc(input.value || '')}</textarea>`
        : `<div class="dlg-in-wrap"><input class="input" id="dlg-in" inputmode="${input.inputmode || 'text'}" placeholder="${ph}" value="${esc(input.value || '')}">${input.unit ? `<span>${esc(input.unit)}</span>` : ''}</div>`;
    }
    wrap.innerHTML = `<div class="dlg-card" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${field}
      <div class="dlg-btns${cancel == null ? ' one' : ''}">${cancel == null ? '' : `<button class="btn" data-dlg="0">${esc(cancel)}</button>`}<button class="btn ${danger ? 'danger solid' : 'primary'}" data-dlg="1">${esc(ok)}</button></div></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    history.pushState({ dlg: true }, '');
    const inp = wrap.querySelector('#dlg-in');
    let done = false;
    const finish = (val, fromPop) => {
      if (done) return;
      done = true; dlgCancel = null;
      wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 200);
      if (fromPop) { resolve(val); return; }
      // erst den Verlaufseintrag des Dialogs entfernen, dann weitermachen (sonst stolpert die Zurueck-Logik)
      let fired = false;
      const go = () => { if (fired) return; fired = true; dlgAfterPop = null; resolve(val); };
      dlgAfterPop = go; history.back(); setTimeout(go, 500);
    };
    dlgCancel = () => finish(no, true);
    const yes = () => finish(input ? inp.value : true);
    wrap.addEventListener('click', e => {
      e.stopPropagation();
      const b = e.target.closest('[data-dlg]');
      if (b) { if (b.dataset.dlg === '1') yes(); else finish(no); }
      else if (e.target === wrap) finish(no);
    });
    wrap.addEventListener('keydown', e => {
      if (e.key === 'Escape') finish(no);
      else if (e.key === 'Enter' && !(input && input.multiline)) { e.preventDefault(); yes(); }
    });
    setTimeout(() => {
      if (inp) { inp.focus(); const n = inp.value.length; try { inp.setSelectionRange(n, n); } catch { /* egal */ } }
    }, 80);
  });
}
const ask = (title, text, ok = 'OK', danger = false) => dialog({ title, text, ok, danger });
const askText = (title, opts = {}) => dialog({ title, text: opts.text, ok: opts.ok || 'Speichern', input: opts });
function openSheet(html) {
  $('#sheet').innerHTML = '<div class="grabber"></div>' + html;
  $('#sheet').hidden = false; $('#backdrop').hidden = false;
  if (!sheetOpen) { sheetOpen = true; history.pushState({ sheet: true }, ''); }
}
function setSheet(html) {
  if (sheetOpen) $('#sheet').innerHTML = '<div class="grabber"></div>' + html; else openSheet(html);
}
function hideSheet() {
  const sh = $('#sheet'), bd = $('#backdrop');
  sh.hidden = true; bd.hidden = true; sheetOpen = false; D = null;
  sh.style.transform = sh.style.transition = sh.style.animation = ''; bd.style.opacity = bd.style.transition = '';
  updateMini();
}
/* Fenster nach unten wegziehen: am Strich/Kopf jederzeit, im Inhalt nur, wenn er ganz oben steht */
(function sheetDrag() {
  const sh = $('#sheet'), bd = $('#backdrop');
  let d = null;
  const spring = 'transform .28s cubic-bezier(.3, 1.2, .5, 1)';
  sh.addEventListener('touchstart', e => {
    d = null;
    if (e.touches.length !== 1 || e.target.closest('input, textarea, select, .results, .bwsvg, .chart svg')) return;
    const handle = !!e.target.closest('.grabber, .sheet-head, .sheet-bar');
    if (!handle && sh.scrollTop > 0) return;
    d = { y0: e.touches[0].clientY, x0: e.touches[0].clientX, t0: Date.now(), dy: 0, on: false };
  }, { passive: true });
  sh.addEventListener('touchmove', e => {
    if (!d) return;
    const p = e.touches[0], dy = p.clientY - d.y0, dx = p.clientX - d.x0;
    if (!d.on) {
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || sh.scrollTop > 0) { d = null; return; } // normal scrollen
      d.on = true; d.y0 = p.clientY; sh.style.animation = 'none'; sh.style.transition = 'none';
    }
    e.preventDefault();
    d.dy = Math.max(0, p.clientY - d.y0);
    sh.style.transform = `translateY(${d.dy}px)`;
    bd.style.opacity = String(Math.max(0.2, 1 - d.dy / (sh.offsetHeight || 1)));
  }, { passive: false });
  const end = () => {
    const x = d; d = null;
    if (!x || !x.on) return;
    const fast = x.dy / Math.max(1, Date.now() - x.t0) > 0.6;
    if (x.dy > Math.min(140, sh.offsetHeight * 0.3) || (fast && x.dy > 40)) {
      sh.style.transition = 'transform .2s ease-in'; sh.style.transform = 'translateY(100%)';
      bd.style.transition = 'opacity .2s'; bd.style.opacity = '0';
      setTimeout(() => { if (sheetOpen) closeSheet(); else hideSheet(); }, 190);
    } else {
      sh.style.transition = spring; sh.style.transform = ''; bd.style.transition = 'opacity .2s'; bd.style.opacity = '';
    }
  };
  sh.addEventListener('touchend', end);
  sh.addEventListener('touchcancel', end);
})();
function closeSheet() { if (!sheetOpen) return; hideSheet(); ignorePop = true; history.back(); }
window.addEventListener('popstate', () => {
  if (dlgAfterPop) { dlgAfterPop(); return; }
  if (dlgCancel) { dlgCancel(); return; }
  if (ignorePop) { ignorePop = false; return; }
  if ($('#celebrate') && !$('#celebrate').dataset.closed) { closeCelebrate(); return; }
  if (sheetOpen) { hideSheet(); return; }
  if (V.sub) {
    // Nur eigene Einträge aus diesem Laden zählen – ältere (vor einem Neuladen) führen zurück zur Hauptseite
    subDepth = Math.max(0, subDepth - 1);
    V.sub = subDepth ? (history.state && history.state.sub) || null : null;
    if (!V.sub && V.backTab) { V.tab = V.backTab; V.backTab = null; }
    render(); scrollTo(0, 0);
  }
});
let subDepth = 0;
function openSub(id) { V.sub = id; subDepth++; history.pushState({ sub: id }, ''); render(); scrollTo(0, 0); }

let toastT = null;
function toast(msg, action) {
  const t = $('#toast');
  if (undoPending) finishUndo(); // ein offenes Rückgängig verfällt, sobald etwas Neues kommt
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button id="toastBtn">${esc(action.label)}</button>` : ''}`;
  t.classList.toggle('act', !!action); t.hidden = false;
  if (action) $('#toastBtn').onclick = () => { clearTimeout(toastT); t.hidden = true; action.fn(); };
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; if (action && action.expire) action.expire(); }, action ? 5000 : 2600);
}
// Löschen mit „Rückgängig“: vorher Zustand merken, 5 s lang wiederherstellbar.
// cleanup läuft erst, wenn nicht rückgängig gemacht wurde (z. B. Bild endgültig löschen).
let undoPending = null;
function finishUndo() { const u = undoPending; undoPending = null; if (u && u.cleanup) u.cleanup(); }
// Rückgängig verfällt (z. B. weil etwas anderes gespeichert wurde): Hinweis mit dem Knopf ausblenden
function dropUndo() { finishUndo(); const t = $('#toast'); if (t.classList.contains('act')) { clearTimeout(toastT); t.hidden = true; } }
function withUndo(msg, change, cleanup) {
  if (undoPending) finishUndo();
  const snap = JSON.stringify(S);
  undoBusy = true;
  try { change(); } finally { undoBusy = false; }
  const u = { cleanup };
  toast(msg, {
    label: 'Rückgängig',
    fn: () => {
      if (undoPending !== u) return;
      undoPending = null;
      const keep = { active: S.active }; // laufendes Training nicht zurückdrehen
      S = JSON.parse(snap); if (keep.active) S.active = keep.active;
      save(); if (sheetOpen) closeSheet(); render(); toast('Wiederhergestellt');
    },
    expire: () => { if (undoPending === u) finishUndo(); },
  });
  undoPending = u;
}

/* ---------- Bilder vorab für offline laden ---------- */
function warmImage(image) {
  if (image && image.type === 'db') fetch(EXDB_IMG + image.value, { mode: 'cors' }).catch(() => {});
  if (image && image.type === 'url') new Image().src = image.value; // landet über den Service Worker im Offline-Cache
}
function warmAll() { for (const e of allExercises()) warmImage(e.image); }
