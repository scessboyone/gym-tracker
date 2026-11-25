'use strict';
// Gym Tracker – Mehr: Einstellungen, Backup, Google Drive, Plan teilen.
// Alle Dateien in js/ teilen sich den globalen Bereich; Reihenfolge siehe index.html.

/* ----- Mehr / Einstellungen ----- */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (V.tab === 'home' || V.tab === 'train' || V.tab === 'more') render(); });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const CLOUD = IS_IOS ? 'iCloud' : 'Drive';
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
function renderMore() {
  setTop('Mehr');
  return `${installBanner()}
    <div class="section-title">Darstellung${infoBtn('theme')}</div>
    <div class="card"><div class="seg" style="margin-top:0">${[['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([v, l]) =>
      `<button class="${(S.settings.theme || 'auto') === v ? 'on' : ''}" data-act="setTheme" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="section-title">Profil</div>
    <div class="list">
      <label class="toggle"><span>Dein Name (für die Begrüßung)</span>
        <input class="input" style="width:140px" data-field="name" value="${esc(S.settings.name || '')}" placeholder="Name" maxlength="30" autocomplete="given-name"></label>
    </div>
    <div class="section-title">Training</div>
    <div class="list">
      <label class="toggle"><span>Standard-Pause für neue Übungen (Sekunden)</span>
        <input class="input" style="width:90px;text-align:center" inputmode="numeric" data-field="defRest" value="${S.settings.rest}"></label>
    </div>
    <div class="section-title">Backup</div>
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
    <p class="sub" style="text-align:center;margin-top:24px">Gym Tracker ${APP_VERSION}${SEP}Übungsdaten: free-exercise-db (gemeinfrei)${SEP}Muskelgrafik: react-body-highlighter (MIT)</p>`;
}
/* Google Drive direkt (nur Android/PC): Anmeldung über Google, Datei landet im Ordner „Gym Tracker“.
   Die Client-ID ist öffentlich (kein Geheimnis); Zugriff nur auf Dateien, die die App selbst anlegt (drive.file). */
const GDRIVE_CLIENT_ID = '';
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
  S.settings.lastBackup = Date.now();
  const data = await backupData();
  const name = `gym-backup-${new Date().toISOString().slice(0, 10)}.txt`;
  const res = await shareFile(data, name, 'Gym-Backup', mode);
  if (res === 'abort') { S.settings.lastBackup = null; save(); return; }
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
  if (e.sets) o.s = e.sets; if (e.rest) o.p = e.rest; if (e.note) o.t = e.note; if (e.dbId) o.d = e.dbId;
  if (e.muscles && !e.dbId && !MUSCLES_BY_NAME[e.name]) o.m = e.muscles;
  if ((e.alts || []).length) o.a = e.alts.map(slimEx);
  return o;
}
function fatEx(o, isAlt) {
  const e = { id: uid(), name: o.n || 'Übung', repMin: o.r[0], repMax: o.r[1], reps: o.r[0], weight: o.w || 0, note: o.t || '', dbId: o.d || null,
    image: o.d ? { type: 'db', value: o.d + '/0.jpg' } : null };
  if (!isAlt) { e.sets = o.s || 3; e.rest = o.p || 90; }
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
// Plan übernehmen (aus Link oder Datei) – ersetzt nur den Plan, Verlauf bleibt
async function adoptPlan(plan) {
  const n = plan.days.length;
  const names = plan.days.map(d => d.name).join(', ');
  if (!await ask('Plan übernehmen?', `${n} Trainingstag${n === 1 ? '' : 'e'}: ${names}. ${S.plan.days.length ? 'Dein aktueller Plan wird ersetzt. ' : ''}Dein Verlauf bleibt erhalten.`, 'Übernehmen', !!S.plan.days.length)) return;
  const old = JSON.stringify(S.plan);
  S.plan = plan; S.active = null; save(); V.tab = 'plan'; V.sub = null; render(); warmAll(); fillMuscles();
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
  if (!S.logs.length || (lb && Date.now() - lb < 7 * 86400000)) return '';
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
    for (const [k, v] of Object.entries(data.images || {})) { await idb.set(k, v); localImgs[k.slice(4)] = v; }
    S = Object.assign({ settings: { rest: 90 }, logs: [], active: null }, data.state);
    delete S.settings.wakeLock; delete S.settings.notify;
    await flush(); render(); toast('Backup geladen');
  } catch (e) { toast('Import fehlgeschlagen: ' + e.message); }
}
