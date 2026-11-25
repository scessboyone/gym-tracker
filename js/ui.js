'use strict';
// Gym Tracker – Pausen-Timer, Sheets, eigene Dialoge, Toast, Bilder vorladen.
// Alle Dateien in js/ teilen sich den globalen Bereich; Reihenfolge siehe index.html.

/* ---------- Pausen-Timer ---------- */
const T = { end: 0, total: 0, iv: null };
function startRest(sec) {
  if (!sec) return;
  T.total = sec; T.end = Date.now() + sec * 1000;
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
    clearInterval(T.iv); T.iv = null;
    if (navigator.vibrate) navigator.vibrate([300, 120, 300]);
    setTimeout(() => { if (!T.iv) el.hidden = true; }, 6000);
    return;
  }
  el.classList.remove('end');
  if (!el.querySelector('b') || el.dataset.mode !== 'run') {
    el.dataset.mode = 'run';
    el.innerHTML = '<span class="lbl">Pause</span><b></b><button data-act="tAdd" data-d="-15">−15 s</button><button data-act="tAdd" data-d="15">+15 s</button><button data-act="tStop" aria-label="Pause beenden">✕</button>';
  }
  el.querySelector('b').textContent = fmtDur(left * 1000);
}
function stopRest() { clearInterval(T.iv); T.iv = null; const el = $('#timer'); el.hidden = true; el.dataset.mode = ''; }

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { if (T.iv) tickRest(); }
  else flush();
});

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
function hideSheet() { $('#sheet').hidden = true; $('#backdrop').hidden = true; sheetOpen = false; D = null; }
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
