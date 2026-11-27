'use strict';
// Gym Tracker – Mehr: Einstellungen, Backup, Google Drive, Plan teilen.
// Alle Dateien in js/ teilen sich den globalen Bereich; Reihenfolge siehe index.html.

/* ----- Mehr / Einstellungen ----- */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (V.tab === 'home' || V.tab === 'train' || V.tab === 'more') render(); });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const CLOUD = IS_IOS ? 'iCloud' : 'Drive';
// Pausen-Benachrichtigung: Android/PC (Web-Apps auf dem iPhone können das nur eingeschränkt)
const CAN_NOTIFY = !IS_IOS && 'Notification' in window && 'serviceWorker' in navigator;
const SHARE_IC = '<svg viewBox="0 0 24 24" style="width:16px;height:16px;vertical-align:-3px"><path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1"/></svg>';
function installBanner() {
  if (isStandalone()) return '';
  // iPhone hat keinen Installieren-Knopf -> Anleitung zeigen (nur in Safari möglich)
  if (IS_IOS) return `<div class="card"><b>Als App installieren</b>
    <div class="sub" style="margin-top:4px">Unten in Safari auf ${SHARE_IC} <b>Teilen</b> tippen → <b>„Zum Home-Bildschirm“</b>.
    Dann hat die App ein eigenes Icon, läuft im Vollbild und offline. Deine Daten bleiben nur in der Home-Bildschirm-App.</div></div>`;
  if (!installEvt) return '';
  return `<div class="card" style="display:flex;align-items:center;gap:12px">
    <div class="grow"><b>Als App installieren</b><div class="sub">Eigenes Icon, Vollbild, funktioniert offline.</div></div>
    <button class="btn primary small" data-act="install">Installieren</button></div>`;
}
// Backup-Anleitung hinter dem i-Knopf, umschaltbar zwischen iPhone und Android (z. B. um jemand anderem zu helfen)
const BACKUP_HELP = {
  ios: [
    ['Backup machen', ['Mehr → Backup → „In iCloud sichern“ antippen.', 'Im Teilen-Menü „In Dateien sichern“ wählen.',
      'iCloud Drive auswählen (am besten einen Ordner „Gym“ anlegen) → Sichern.']],
    ['Zurückholen', ['App über Safari → Teilen → „Zum Home-Bildschirm“ installieren und öffnen.',
      'Mehr → Backup → „Backup laden“ antippen.', 'In iCloud Drive die neueste gym-backup-….txt wählen → Laden.']],
    ['Gut zu wissen', ['Nach 3 Tagen ohne Backup erinnert die Startseite mit „Backup fällig“.',
      'iOS kann Daten von Web-Apps löschen, wenn die App länger nicht geöffnet wurde – das Backup in iCloud schützt davor.']],
  ],
  android: [
    ['Backup machen', ['Mehr → Backup → „In Google Drive sichern“ antippen.', 'Die Datei landet im Drive-Ordner „Gym Tracker“.',
      'Ohne Google: „Als Datei speichern“ legt sie in Downloads ab.']],
    ['Zurückholen', ['Mehr → Backup → „Aus Google Drive laden“ – nimmt automatisch das neueste Backup.',
      'Oder „Backup laden“ und die Datei aus Drive oder Downloads wählen.']],
    ['Gut zu wissen', ['Nach 7 Tagen ohne Backup erinnert die Startseite mit „Backup fällig“.']],
  ],
};
function backupHelpSheet(os) {
  const seg = `<div class="seg" style="margin-top:0">${[['ios', 'iPhone'], ['android', 'Android']].map(([v, l]) =>
    `<button class="${os === v ? 'on' : ''}" data-act="backupHelp" data-v="${v}" aria-pressed="${os === v}">${l}</button>`).join('')}</div>`;
  setSheet(`<div class="sheet-head"><h2>Backup</h2><button class="linkbtn" data-act="closeSheet">Fertig</button></div>${seg}
    ${BACKUP_HELP[os].map(([h, steps], i) => `<div class="section-title"${i ? '' : ' style="margin-top:20px"'}>${h}</div>
      <${i < 2 ? 'ol' : 'ul'} class="instr" style="color:var(--text);font-size:15px">${steps.map(s => `<li>${esc(s)}</li>`).join('')}</${i < 2 ? 'ol' : 'ul'}>`).join('')}
    <p class="sub">Das Backup enthält alles: Plan, Verlauf, Gewicht, Einstellungen und eigene Fotos. Laden ersetzt alle Daten auf dem Gerät.
      Nur den Plan weitergeben: unter Plan „Plan als Link teilen“.</p>`);
}
function renderMore() {
  setTop('Mehr');
  return `${installBanner()}
    <div class="section-title">Darstellung${infoBtn('theme')}</div>
    <div class="card setup">${themeSeg()}<div class="sub acc-label">Akzentfarbe</div>${accentPicker()}</div>
    <div class="section-title">Profil</div>
    <div class="list">
      <label class="toggle"><span>Dein Name (für die Begrüßung)</span>
        <input class="input" style="width:140px" data-field="name" value="${esc(S.settings.name || '')}" placeholder="Name" maxlength="30" autocomplete="given-name"></label>
    </div>
    <div class="section-title">Training${infoBtn('rest')}</div>
    <div class="list">
      <label class="toggle"><span>Pause zwischen den Sätzen (Sekunden)</span>
        <input class="input" style="width:90px;text-align:center" inputmode="numeric" data-field="defRest" value="${S.settings.rest}"></label>
      <label class="toggle"><span>Pausen-Timer auch zwischen den Übungen</span>
        <input type="checkbox" data-field="restBetween" ${S.settings.restBetween === false ? '' : 'checked'}></label>
      <label class="toggle"><span>Pausen-Timer hält an, wenn ich das Training pausiere</span>
        <input type="checkbox" data-field="restPause" ${S.settings.restPause === false ? '' : 'checked'}></label>
      ${CAN_NOTIFY ? `<label class="toggle"><span>Pausen-Timer als Benachrichtigung</span>
        <input type="checkbox" data-field="restNotify" ${S.settings.restNotify && Notification.permission === 'granted' ? 'checked' : ''}></label>` : ''}
    </div>
    <div class="section-title">Backup<button class="info-btn" data-act="backupHelp" aria-label="Anleitung: Backup">${ICON.info}</button></div>
    <div class="list">
      ${IS_IOS ? `<button class="row" data-act="driveBackup"><div class="grow"><div class="title">In iCloud sichern</div>
        <div class="sub">Öffnet „Teilen“ → „In Dateien sichern“ → iCloud Drive wählen → Sichern</div></div>${ICON.chev}</button>`
      : DRIVE_DIRECT ? `<button class="row" data-act="driveBackup"><div class="grow"><div class="title">In Google Drive sichern</div>
        <div class="sub">Ein Tipp – landet im Ordner „Gym Tracker“ in deinem Drive</div></div>${ICON.chev}</button>
      <button class="row" data-act="driveRestore"><div class="grow"><div class="title">Aus Google Drive laden</div>
        <div class="sub">Neuestes Backup aus dem Ordner „Gym Tracker“ – ersetzt alle Daten</div></div>${ICON.chev}</button>
      <button class="row" data-act="fileBackup"><div class="grow"><div class="title">Als Datei speichern</div>
        <div class="sub">Landet im Ordner „Downloads“</div></div>${ICON.chev}</button>`
      : `<button class="row" data-act="driveBackup"><div class="grow"><div class="title">In Google Drive sichern</div>
        <div class="sub">Öffnet „Teilen“ → „Drive“ wählen → Speichern</div></div>${ICON.chev}</button>
      <button class="row" data-act="fileBackup"><div class="grow"><div class="title">Als Datei speichern</div>
        <div class="sub">Landet im Ordner „Downloads“</div></div>${ICON.chev}</button>`}
      <label class="row"><div class="grow"><div class="title">Backup laden</div>
        <div class="sub">${IS_IOS ? 'Backup-Datei aus iCloud Drive wählen' : 'Datei aus Drive oder Downloads wählen'} – ersetzt alle Daten</div></div>${ICON.chev}
        <input type="file" accept="application/json,.json,text/plain,.txt" data-field="importFile" hidden></label>
    </div>
    <p class="sub" style="margin:0 4px">Letztes Backup: ${S.settings.lastBackup ? relDay(S.settings.lastBackup) + ' (' + fmtDate(S.settings.lastBackup) + ')' : 'noch nie'}.
      Deine Daten liegen nur auf diesem ${IS_IOS ? 'iPhone' : 'Handy'} – sichere sie regelmäßig.</p>
    <div class="section-title">Plan</div>
    <div class="list">
      <button class="row" data-act="sharePlanLink" ${S.plan.days.length ? '' : 'disabled'}><div class="grow"><div class="title">Plan als Link teilen</div>
        <div class="sub">Nur der Plan ohne Verlauf – Empfänger tippt den Link an und übernimmt ihn</div></div>${ICON.chev}</button>
      <button class="row" data-act="pastePlanLink"><div class="grow"><div class="title">Plan-Link einfügen</div>
        <div class="sub">Kopierten Plan-Link übernehmen – ersetzt nur den Plan, Verlauf bleibt</div></div>${ICON.chev}</button>
      <button class="row" data-act="sharePlan" ${S.plan.days.length ? '' : 'disabled'}><div class="grow"><div class="title">Plan als Datei teilen</div>
        <div class="sub">Zum Sichern oder Weitergeben</div></div>${ICON.chev}</button>
      <label class="row"><div class="grow"><div class="title">Plan-Datei laden</div>
        <div class="sub">Ersetzt nur den Plan, Verlauf bleibt</div></div>${ICON.chev}
        <input type="file" accept="application/json,.json,text/plain,.txt" data-field="importFile" hidden></label>
      <button class="row" data-act="wipe"><div class="grow"><div class="title" style="color:var(--red)">Alle Daten löschen</div></div></button>
    </div>
    <details class="card adv" ${V.advOpen ? 'open' : ''}><summary>Erweiterte Informationen${ICON.down}</summary><div id="advInfo" class="adv-list">${advRows()}</div></details>
    <p class="sub" style="text-align:center;margin-top:24px">Gym Tracker ${APP_VERSION}${SEP}Übungsdaten: free-exercise-db (gemeinfrei)${SEP}Muskelgrafik: react-body-highlighter (MIT)</p>`;
}
// Technische Angaben: Speicher, Schutz der Daten, Installation, Umfang der Daten
const advRow = (k, v, id) => `<div class="adv-row"><span>${k}</span><b${id ? ` id="${id}"` : ''}>${v}</b></div>`;
const mb = b => b >= 1e9 ? `${fmtNum(Math.round(b / 1e8) / 10)} GB` : `${fmtNum(Math.round(b / 1e5) / 10)} MB`;
function advRows() {
  const dev = IS_IOS ? 'iPhone / iPad' : /Android/.test(navigator.userAgent) ? 'Android' : 'Computer';
  return advRow('App-Version', APP_VERSION)
    + advRow('Gerät', dev)
    + advRow('Als App installiert', isStandalone() ? 'Ja' : 'Nein (im Browser geöffnet)')
    + advRow('Offline nutzbar', 'serviceWorker' in navigator && navigator.serviceWorker.controller ? 'Ja' : 'Noch nicht (beim nächsten Öffnen)')
    + advRow('Belegter Speicher', '…', 'adv-usage')
    + advRow('Daten dauerhaft geschützt', '…', 'adv-persist')
    + advRow('Trainings im Verlauf', fmtNum(S.logs.length))
    + advRow('Gewichtseinträge', fmtNum((S.body || []).length))
    + advRow('Übungen im Plan', fmtNum(S.plan.days.reduce((n, d) => n + d.exercises.length, 0)))
    + advRow('Letztes Backup', S.settings.lastBackup ? fmtDate(S.settings.lastBackup) : 'noch nie')
    + advRow('Dabei seit', S.settings.since ? fmtDate(S.settings.since) : '–');
}
// Werte, die der Browser nur asynchron liefert
async function fillAdvInfo() {
  const u = $('#adv-usage'), p = $('#adv-persist');
  if (!u || !p) return;
  try {
    const e = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
    u.textContent = e && e.usage != null ? `${mb(e.usage)}${e.quota ? ` von ${mb(e.quota)}` : ''}` : 'unbekannt';
  } catch { u.textContent = 'unbekannt'; }
  try {
    const ok = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null;
    p.textContent = ok == null ? 'unbekannt' : ok ? 'Ja' : 'Nein – bei wenig Speicher kann der Browser löschen';
  } catch { p.textContent = 'unbekannt'; }
}
/* Google Drive direkt (nur Android/PC): Anmeldung über Google, Datei landet im Ordner „Gym Tracker“.
   Die Client-ID ist öffentlich (kein Geheimnis); Zugriff nur auf Dateien, die die App selbst anlegt (drive.file). */
const GDRIVE_CLIENT_ID = '731930896025-tt1tn1db3ga4p6v5q88tr659l9nmj3n1.apps.googleusercontent.com';
const DRIVE_DIRECT = !!GDRIVE_CLIENT_ID && !IS_IOS;
let gToken = null, gTokenExp = 0;
function loadGis() {
  return new Promise((res, rej) => {
    if (window.google && google.accounts && google.accounts.oauth2) return res();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('Google ist nicht erreichbar'));
    document.head.appendChild(s);
  });
}
async function driveToken() {
  if (gToken && Date.now() < gTokenExp - 60000) return gToken;
  await loadGis();
  return new Promise((res, rej) => {
    const c = google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CLIENT_ID, scope: 'https://www.googleapis.com/auth/drive.file',
      callback: r => { if (r.error) return rej(new Error(r.error)); gToken = r.access_token; gTokenExp = Date.now() + r.expires_in * 1000; res(gToken); },
      error_callback: e => rej(new Error(e && e.type === 'popup_closed' ? 'Anmeldung abgebrochen' : 'Anmeldung fehlgeschlagen')),
    });
    c.requestAccessToken({ prompt: S.settings.driveOk ? '' : 'consent' });
  });
}
async function gapi(url, opt = {}) {
  const t = await driveToken();
  const r = await fetch(url, { ...opt, headers: { ...(opt.headers || {}), Authorization: 'Bearer ' + t } });
  if (r.status === 401) gToken = null;
  if (!r.ok) throw new Error('Google Drive antwortet nicht (' + r.status + ')');
  return r;
}
async function driveFolder() {
  const q = encodeURIComponent("name='Gym Tracker' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const found = await (await gapi(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`)).json();
  if (found.files.length) return found.files[0].id;
  const made = await (await gapi('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Gym Tracker', mimeType: 'application/vnd.google-apps.folder' }),
  })).json();
  return made.id;
}
async function backupData() {
  await flush();
  const images = {};
  for (const k of await idb.keys()) if (String(k).startsWith('img:')) images[k] = await idb.get(k);
  return { app: 'gym-tracker', version: APP_VERSION, exportedAt: new Date().toISOString(), state: S, images };
}
async function driveUpload() {
  const prev = S.settings.lastBackup;
  try {
    await driveToken(); // zuerst, solange der Tipp noch als Nutzeraktion zählt
    toast('Sichere in Google Drive …');
    S.settings.lastBackup = Date.now();
    const data = await backupData();
    const folder = await driveFolder();
    const body = new FormData();
    body.append('metadata', new Blob([JSON.stringify({ name: `gym-backup-${new Date().toISOString().slice(0, 10)}.txt`, parents: [folder], mimeType: 'text/plain' })], { type: 'application/json' }));
    body.append('file', new Blob([JSON.stringify(data)], { type: 'text/plain' }));
    await gapi('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', body });
    S.settings.driveOk = true; save(); render();
    toast('Backup in Google Drive gesichert');
  } catch (e) {
    S.settings.lastBackup = prev; save();
    toast('Drive-Backup fehlgeschlagen: ' + e.message);
  }
}
async function driveRestore() {
  try {
    await driveToken();
    const folder = await driveFolder();
    const q = encodeURIComponent(`'${folder}' in parents and trashed=false`);
    const list = await (await gapi(`https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime desc&pageSize=1&fields=files(id,createdTime)`)).json();
    if (!list.files.length) { toast('Kein Backup in Google Drive gefunden'); return; }
    const txt = await (await gapi(`https://www.googleapis.com/drive/v3/files/${list.files[0].id}?alt=media`)).text();
    S.settings.driveOk = true;
    await importData({ text: async () => txt });
  } catch (e) { toast('Laden aus Drive fehlgeschlagen: ' + e.message); }
}
// Backup: mode 'share' = Teilen-Menü (Android: Google Drive, iPhone: „In Dateien sichern“ → iCloud), 'file' = Download.
// Chrome erlaubt beim Teilen keine .json-Dateien, daher .txt (Inhalt ist JSON).
async function exportData(mode) {
  const prev = S.settings.lastBackup;
  S.settings.lastBackup = Date.now();
  const data = await backupData();
  const name = `gym-backup-${new Date().toISOString().slice(0, 10)}.txt`;
  const res = await shareFile(data, name, 'Gym-Backup', mode);
  if (res === 'abort') { S.settings.lastBackup = prev || null; save(); return; } // altes Datum behalten
  if (res === 'file') toast(IS_IOS ? 'Backup gespeichert (Dateien-App)' : 'Backup gespeichert (Downloads)');
  render();
}
/* Plan per Link: Der Plan wird ohne Verlauf kompakt gemacht, komprimiert (deflate) und als Text
   hinter das # der App-Adresse gehängt. Der Teil nach # wird nie an einen Server geschickt –
   die App liest ihn beim Öffnen selbst aus und fragt, ob der Plan übernommen werden soll. */
const b64u = bytes => { let s = ''; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = str => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function pipeBytes(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
function slimEx(e) {
  const o = { n: e.name, r: [e.repMin, e.repMax], w: e.weight };
  // Pausen werden nicht mitgeteilt: beim Empfänger gilt dessen eigene Pause-Einstellung
  if (e.sets) o.s = e.sets; if (e.note) o.t = e.note; if (e.dbId) o.d = e.dbId;
  if (e.muscles && !e.dbId && !MUSCLES_BY_NAME[e.name]) o.m = e.muscles;
  if ((e.alts || []).length) o.a = e.alts.map(slimEx);
  return o;
}
function fatEx(o, isAlt) {
  const e = { id: uid(), name: o.n || 'Übung', repMin: o.r[0], repMax: o.r[1], reps: o.r[0], weight: o.w || 0, note: o.t || '', dbId: o.d || null,
    image: o.d ? { type: 'db', value: o.d + '/0.jpg' } : null };
  if (!isAlt) { e.sets = o.s || 3; e.rest = null; } // Pause aus fremden Plänen ignorieren (ältere Links haben sie noch)
  if (o.m) e.muscles = o.m;
  if (o.a) e.alts = o.a.map(x => fatEx(x, true));
  return e;
}
async function planToLink(plan) {
  const json = JSON.stringify({ v: 1, d: plan.days.map(d => ({ n: d.name, w: d.weekdays || [], x: d.exercises.map(e => slimEx(e)) })) });
  let code = '0.' + b64u(new TextEncoder().encode(json));
  if (window.CompressionStream) {
    try { code = '1.' + b64u(await pipeBytes(new TextEncoder().encode(json), new CompressionStream('deflate-raw'))); } catch { /* unkomprimiert */ }
  }
  return location.origin + location.pathname + '#plan=' + code;
}
async function linkToPlan(text) {
  const m = String(text).match(/#?plan=([01])\.([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('Kein Plan-Link');
  let bytes = unb64u(m[2]);
  if (m[1] === '1') bytes = await pipeBytes(bytes, new DecompressionStream('deflate-raw'));
  const o = JSON.parse(new TextDecoder().decode(bytes));
  return { days: o.d.map(d => ({ id: uid(), name: d.n, weekdays: d.w || [], exercises: d.x.map(x => fatEx(x)) })) };
}
async function sharePlanLink() {
  const url = await planToLink(S.plan);
  const data = { title: 'Gym-Trainingsplan', text: 'Mein Trainingsplan – Link antippen und in der Gym-App übernehmen:', url };
  if (navigator.share) {
    try { await navigator.share(data); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); toast('Link kopiert'); } catch { toast('Teilen nicht möglich'); }
}
// Plan aus fremder Quelle (Link, Datei, Backup) prüfen: nur erwartete Felder und Typen übernehmen,
// damit nichts Fremdes ins HTML gelangt
const safeId = x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(x) ? x : uid();
const int = (v, d, min = 0) => { const n = Math.round(num(v)); return Number.isFinite(n) && n >= min ? n : d; };
const muscleList = l => Array.isArray(l) ? l.filter(m => typeof m === 'string' && MUSCLE_DE[m]) : [];
function cleanEx(e, isAlt) {
  const dbId = typeof e.dbId === 'string' && /^[A-Za-z0-9_-]+$/.test(e.dbId) ? e.dbId : null;
  const img = e.image && typeof e.image.value === 'string' ? e.image : null;
  const repMin = int(e.repMin, 8, 1), repMax = Math.max(repMin, int(e.repMax, repMin, 1));
  const o = { id: safeId(e.id), name: String(e.name || 'Übung').slice(0, 80), repMin, repMax, reps: int(e.reps, repMin, 1),
    weight: Math.max(0, num(e.weight)), note: String(e.note || '').slice(0, 500), dbId,
    image: img && img.type === 'db' && dbId ? { type: 'db', value: img.value.replace(/[^A-Za-z0-9_./-]/g, '') }
      : img && img.type === 'url' && /^https?:\/\//.test(img.value) ? { type: 'url', value: img.value }
      : img && img.type === 'local' ? { type: 'local', value: safeId(img.value) } : null };
  if (e.muscles) o.muscles = { p: muscleList(e.muscles.p), s: muscleList(e.muscles.s) };
  // rest = null: allgemeine Pause aus den Einstellungen; Zahl = eigene Pause nur für diese Übung
  if (!isAlt) { o.sets = int(e.sets, 3, 1); o.rest = e.rest == null || e.rest === '' ? null : int(e.rest, null); o.alts = (Array.isArray(e.alts) ? e.alts : []).map(a => cleanEx(a, true)); }
  return o;
}
function cleanPlan(p) {
  return { days: (Array.isArray(p && p.days) ? p.days : []).map(d => ({
    id: safeId(d.id), name: String(d.name || 'Tag').slice(0, 60),
    weekdays: (Array.isArray(d.weekdays) ? d.weekdays : []).filter(w => Number.isInteger(w) && w >= 0 && w <= 6),
    exercises: (Array.isArray(d.exercises) ? d.exercises : []).map(e => cleanEx(e)),
  })) };
}
// Gesamten Zustand prüfen (Backup laden, App-Start): nur erwartete Felder mit dem richtigen Typ,
// damit aus einer fremden Backup-Datei nichts als HTML oder Skript in die Seite gelangt
const optId = x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(x) ? x : undefined;
const finite = (v, d = 0) => { const n = typeof v === 'number' ? v : num(v); return Number.isFinite(n) ? n : d; };
const str = (v, max) => String(v == null ? '' : v).slice(0, max);
const cleanSet = s => ({ weight: Math.max(0, finite(s && s.weight)), reps: int(s && s.reps, 0), done: !!(s && s.done === true) });
const cleanSets = l => (Array.isArray(l) ? l : []).slice(0, 50).map(cleanSet);
const cleanPr = p => ({ name: str(p && p.name, 80), weight: Math.max(0, finite(p && p.weight)), reps: int(p && p.reps, 0),
  prevWeight: Math.max(0, finite(p && p.prevWeight)), prevReps: int(p && p.prevReps, 0) });
function cleanLog(l) {
  const startedAt = finite(l && l.startedAt, Date.now());
  return { id: safeId(l && l.id), dayId: optId(l && l.dayId), dayName: str(l && l.dayName, 60), startedAt,
    endedAt: Math.max(startedAt, finite(l && l.endedAt, startedAt)), note: str(l && l.note, 1000),
    prs: (Array.isArray(l && l.prs) ? l.prs : []).map(cleanPr),
    ...(l && l.added === true ? { added: true } : {}), // nachgetragen
    entries: (Array.isArray(l && l.entries) ? l.entries : []).map(e => ({ exId: optId(e && e.exId), baseId: optId(e && e.baseId), name: str(e && e.name, 80), sets: cleanSets(e && e.sets),
      ...(e && typeof e.out === 'string' && e.out ? { out: str(e.out, 80) } : {}) })) }; // out = ausgelassen (Grund)
}
function cleanActive(a) {
  if (!a || typeof a !== 'object' || !Array.isArray(a.entries) || !a.entries.length) return null;
  const entries = a.entries.map(e => {
    const x = cleanEx({ name: e.name, image: e.image, dbId: e.image && e.image.type === 'db' ? String(e.image.value || '').split('/')[0] : null }, true);
    return { exId: optId(e.exId), varId: optId(e.varId) || null, name: x.name, rest: e.rest == null ? null : int(e.rest, null), image: x.image,
      sets: cleanSets(e.sets), bumped: e.bumped === true, prShown: e.prShown === true, skipped: e.skipped === true,
      ...(typeof e.out === 'string' && e.out ? { out: str(e.out, 80) } : {}) };
  });
  const order = Array.isArray(a.order) && a.order.length === entries.length && a.order.every(i => Number.isInteger(i) && i >= 0 && i < entries.length) ? a.order : entries.map((_, i) => i);
  return { id: safeId(a.id), dayId: optId(a.dayId), dayName: str(a.dayName, 60), startedAt: finite(a.startedAt, Date.now()), entries, order, pos: int(a.pos, 0),
    ...(a.pausedAt ? { pausedAt: finite(a.pausedAt, Date.now()) } : {}) };
}
function cleanSettings(s) {
  s = s && typeof s === 'object' ? s : {};
  const o = { rest: int(s.rest, 90) };
  if (['auto', 'light', 'dark'].includes(s.theme)) o.theme = s.theme;
  if (ACCENTS.some(([k]) => k === s.accent)) o.accent = s.accent;
  if (s.name != null) o.name = str(s.name, 30);
  for (const k of ['since', 'lastBackup', 'goalKg']) if (s[k] != null && Number.isFinite(finite(s[k], NaN))) o[k] = finite(s[k]);
  if (typeof s.seenVersion === 'string' && /^\d+(\.\d+){0,3}$/.test(s.seenVersion)) o.seenVersion = s.seenVersion;
  for (const k of ['setupDone', 'driveOk', 'restNotify', 'restFix']) if (s[k] === true) o[k] = true;
  if (s.restBetween === false) o.restBetween = false; // Standard: Timer auch zwischen den Übungen
  if (s.restPause === false) o.restPause = false; // Standard: Rest-Timer pausiert mit dem Training
  return o;
}
function cleanState(st) {
  st = st && typeof st === 'object' ? st : {};
  const cal = {};
  for (const [k, v] of Object.entries(st.cal && typeof st.cal === 'object' ? st.cal : {})) {
    if (/^\d{1,15}$/.test(k) && v && typeof v === 'object') cal[k] = { d: optId(v.d) || null, x: v.x === true };
  }
  return {
    v: 1, plan: cleanPlan(st.plan),
    logs: (Array.isArray(st.logs) ? st.logs : []).map(cleanLog).sort((a, b) => b.startedAt - a.startedAt),
    body: (Array.isArray(st.body) ? st.body : []).map(p => {
      const o = { t: finite(p && p.t), kg: Math.max(0, finite(p && p.kg)) };
      if (p && typeof p.time === 'string' && /^\d{1,2}:\d{2}$/.test(p.time)) o.time = p.time;
      return o;
    }).filter(p => p.t > 0 && p.kg > 0).sort((a, b) => a.t - b.t),
    active: cleanActive(st.active),
    settings: cleanSettings(st.settings),
    cal, sick: (Array.isArray(st.sick) ? st.sick : []).filter(t => Number.isFinite(t)),
  };
}
// Einmalig (1.1.0, auch nach dem Laden eines älteren Backups): Pausen pro Übung stammten aus importierten Plänen
// bzw. alten Vorgaben – ab jetzt gilt die allgemeine Pause, eigene Pausen trägt man bei Bedarf selbst ein
function migrateRest() {
  if (S.settings.restFix) return;
  for (const d of S.plan.days) for (const e of d.exercises) e.rest = null;
  if (S.active) for (const en of S.active.entries) en.rest = null;
  S.settings.restFix = true;
}
// Bilder aus einem Backup: nur echte Bilddaten
const safeImg = v => typeof v === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v);
// Plan übernehmen (aus Link oder Datei) – ersetzt nur den Plan, Verlauf und laufendes Training bleiben
async function adoptPlan(plan) {
  plan = cleanPlan(plan);
  // Pausen aus fremden Plänen nicht übernehmen – es gilt die eigene Einstellung unter Mehr → Training
  for (const d of plan.days) for (const e of d.exercises) e.rest = null;
  const n = plan.days.length;
  const names = plan.days.map(d => d.name).join(', ');
  if (!await ask('Plan übernehmen?', `${n} Trainingstag${n === 1 ? '' : 'e'}: ${names}. ${S.plan.days.length ? 'Dein aktueller Plan wird ersetzt. ' : ''}Dein Verlauf bleibt erhalten.`, 'Übernehmen', !!S.plan.days.length)) return;
  const old = JSON.stringify(S.plan);
  S.plan = plan; save(); selectTab('plan'); warmAll(); fillMuscles(); // selectTab räumt auch offene Unterseiten auf
  if (old !== '{"days":[]}') toast('Plan übernommen', { label: 'Rückgängig', fn: () => { S.plan = JSON.parse(old); save(); render(); toast('Alter Plan wiederhergestellt'); } });
  else toast('Plan übernommen');
}
// Beim Öffnen über einen Plan-Link
async function checkPlanLink() {
  if (!location.hash.startsWith('#plan=')) return;
  const href = location.href;
  history.replaceState(history.state, '', location.pathname + location.search);
  let plan;
  try { plan = await linkToPlan(href); } catch { toast('Plan-Link ist beschädigt'); return; }
  // iPhone: Links öffnen immer Safari, nicht die Home-Bildschirm-App (getrennter Speicher)
  if (IS_IOS && !isStandalone()) {
    if (await dialog({ title: 'Plan-Link erkannt', text: 'Auf dem iPhone muss der Plan in der Gym-App vom Home-Bildschirm landen: Link kopieren, die App öffnen und unter Mehr → Plan → „Plan-Link einfügen“ einfügen.', ok: 'Link kopieren', cancel: 'Schließen' })) {
      try { await navigator.clipboard.writeText(href); toast('Link kopiert – jetzt die Gym-App öffnen'); } catch { toast('Kopieren nicht möglich'); }
    }
    return;
  }
  adoptPlan(plan);
}
window.addEventListener('hashchange', checkPlanLink);
async function pastePlanLink() {
  let pre = '';
  try { const c = await navigator.clipboard.readText(); if (/plan=/.test(c)) pre = c; } catch { /* kein Zugriff */ }
  const txt = await askText('Plan-Link einfügen', { value: pre, placeholder: 'Link hier einfügen', multiline: true, ok: 'Weiter' });
  if (!txt) return;
  try { adoptPlan(await linkToPlan(txt.trim())); } catch { toast('Das ist kein gültiger Plan-Link'); }
}

// Nur den Plan (ohne Verlauf) als Datei teilen
async function exportPlan() {
  const data = { app: 'gym-tracker', kind: 'plan', version: APP_VERSION, exportedAt: new Date().toISOString(), plan: S.plan };
  const res = await shareFile(data, `gym-plan-${new Date().toISOString().slice(0, 10)}.txt`, 'Gym-Plan', 'share');
  if (res === 'file') toast('Plan gespeichert');
}
// Teilen-Menü öffnen (oder als Download speichern). Ergebnis: 'shared' | 'abort' | 'file'
async function shareFile(data, name, title, mode) {
  const file = new File([JSON.stringify(data)], name, { type: 'text/plain' });
  if (mode === 'share') {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share(IS_IOS ? { files: [file] } : { files: [file], title }); return 'shared'; }
      catch (e) { if (e.name === 'AbortError') return 'abort'; }
    } else toast('Teilen geht hier nicht – Datei wird stattdessen gespeichert');
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'file';
}
function backupBanner() {
  const lb = S.settings.lastBackup;
  // iPhone früher erinnern: iOS kann Daten von Web-Apps löschen, wenn der Speicher knapp wird
  if (!S.logs.length || (lb && Date.now() - lb < (IS_IOS ? 3 : 7) * DAY)) return '';
  return `<div class="card" style="display:flex;align-items:center;gap:12px">
    <div class="grow"><b>Backup fällig</b><div class="sub">${lb ? 'Letztes Backup ' + relDay(lb) : 'Noch kein Backup gemacht'}.</div></div>
    <button class="btn primary small" data-act="driveBackup">In ${CLOUD} sichern</button></div>`;
}
async function importData(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.kind === 'plan' && data.plan && Array.isArray(data.plan.days)) { adoptPlan(data.plan); return; }
    if (!data.state || !data.state.plan) throw new Error('Keine Gym-Backup-Datei');
    if (!await ask('Backup laden?', 'Alle aktuellen Daten auf diesem Gerät werden durch das Backup ersetzt.', 'Laden', true)) return;
    for (const k of await idb.keys()) if (String(k).startsWith('img:')) await idb.del(k);
    for (const k of Object.keys(localImgs)) delete localImgs[k];
    for (const [k, v] of Object.entries(data.images || {})) {
      if (!/^img:[A-Za-z0-9_-]{1,40}$/.test(k) || !safeImg(v)) continue; // nur echte Bilder übernehmen
      await idb.set(k, v); localImgs[k.slice(4)] = v;
    }
    S = cleanState(data.state);
    migrateRest(); // Backup aus einer Version vor 1.1.0
    await flush(); applyTheme(); render(); toast('Backup geladen');
  } catch (e) { toast('Import fehlgeschlagen: ' + e.message); }
}
