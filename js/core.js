'use strict';
// Gym Tracker – Version, Hilfsfunktionen, Speicher (IndexedDB) und App-Zustand.
// Alle Dateien in js/ teilen sich den globalen Bereich; Reihenfolge siehe index.html.

/* =========================================================
   Gym Tracker – läuft komplett auf dem Handy.
   Daten liegen in IndexedDB (nur auf diesem Gerät).
   ========================================================= */

const APP_VERSION = '0.21.2';
// Änderungen je Version (neueste zuerst). Nach einem Update zeigt die App nur, was seit der zuletzt gesehenen Version neu ist.
// Neue Version: oben einen Eintrag { v: APP_VERSION, items: [...] } ergänzen.
const CHANGELOG = [
  { v: '0.21.2', items: [
    'Verlauf → Muskeln: „Muskel-Statistik“ ist jetzt immer erreichbar, auch wenn diese Woche noch kein Training war',
    'Die i-Knöpfe stehen jetzt überall direkt neben dem Titel, den sie erklären',
  ] },
  { v: '0.21.1', items: [
    'Muskel-Statistik: „Am meisten“ zeigt nur noch Muskeln, die wirklich trainiert wurden, der Rest steht unter „Noch nicht dran“',
    'Umschalter (z. B. Woche / 4 Wochen) im Dunkelmodus besser lesbar',
  ] },
  { v: '0.21.0', items: [
    'Erklärungen stecken jetzt hinter einem kleinen i-Knopf im jeweiligen Bereich, die Seiten sind dadurch aufgeräumter',
  ] },
  { v: '0.20.5', items: [
    'Verlauf → Muskeln: Die Details heißen jetzt „Muskel-Statistik“',
  ] },
  { v: '0.20.4', items: [
    'Wischen zwischen den Bereichen klappt jetzt überall, auch auf der Plan-Seite unterhalb der Liste',
    'Verlauf → Muskeln: Die Karte zeigt nur noch die Grafik, „Am meisten“ und „Noch nicht dran“ stehen auf einer eigenen Seite („Muskel-Statistik“)',
  ] },
  { v: '0.20.3', items: [
    'Der Hinweis nach einem Update zeigt nur noch, was seit deiner letzten Version neu ist',
  ] },
  { v: '0.20.2', items: [
    'Unter der Haube aufgeräumt: Der Code ist jetzt in übersichtliche Teile aufgeteilt, an der Bedienung ändert sich nichts',
  ] },
  { v: '0.20.1', items: [
    'Monatsrückblick: Vergleich immer mit einem echten Zeitraum (z. B. „Vergleich mit Februar“) und mit Einheit, z. B. „+2 Trainings“',
  ] },
  { v: '0.20.0', items: [
    'Training: Übungsname steht oben, die Grafik ist etwas kleiner – alle Sätze passen ohne Scrollen auf den Bildschirm',
    'Monatsrückblick und Übungsverlauf aufgeräumt: Vergleich einmal oben, Sätze kürzer („67,5 kg mit 10, 9, 8 Wdh.“)',
  ] },
  { v: '0.19.1', items: [
    'Monatsrückblick: zeigt jetzt, wie viele geplante Trainings du geschafft hast; „Zurück“ führt wieder dorthin, wo du hergekommen bist',
  ] },
  { v: '0.19.0', items: [
    'Neu: Monatsrückblick unter Verlauf – Trainings, Zeit, kg, Rekorde, Fortschritte und Muskeln pro Monat, mit Vergleich zum Vormonat',
  ] },
  { v: '0.18.1', items: [
    'Training im Vollbild: große Muskel-Grafik, große Zahlen, Weiter/Zurück unten – wischen wechselt die Übung, „Minimieren“ bringt die Tab-Leiste zurück. Läuft ein Training, öffnet die App direkt dort',
  ] },
  { v: '0.18.0', items: [
    'Training neu: eine Übung pro Seite mit Weiter/Zurück und Fortschrittsbalken – Übung überspringen, wenn die Maschine besetzt ist (kommt am Ende nochmal)',
    'Verlauf → „Verlauf pro Übung“: alle Sätze, Bestwert und Kurve je Übung auf einer eigenen Seite',
  ] },
  { v: '0.17.0', items: [
    'Der Bildschirm bleibt im Training nicht mehr extra an',
  ] },
  { v: '0.16.3', items: [
    'Feinschliff: Fenster wie „Neue Übung“ sind nicht mehr durchsichtig, Gewichts-Kopfzeile sauber ausgerichtet, „1 Satz“ statt „1 Sätze“',
  ] },
  { v: '0.16.2', items: [
    'Gewicht eintragen: Die Uhrzeit wird nicht mehr abgeschnitten, „Eintragen“ steht jetzt breit darunter',
  ] },
  { v: '0.16.0', items: [
    'Neues Design: Hell und Dunkel (Mehr → Darstellung), sportlicher Apple-Stil mit blauem Akzent und Wochenring auf Home',
  ] },
  { v: '0.15.0', items: [
    'Neuer Bereich „Home“ ganz links: Begrüßung, was heute ansteht, Woche, Gewicht und letztes Training auf einen Blick',
    'Rekorde und „Letzte Trainings“ zeigen nur noch die neuesten 3 – „Alle anzeigen“ klappt den Rest auf',
    'Gewicht: Die aktuelle Uhrzeit wird automatisch eingetragen und lässt sich ändern',
  ] },
  { v: '0.14.0', items: [
    'Plan als Link teilen (Mehr → Plan): Empfänger tippt den Link an und kann den Plan übernehmen',
    'Zwischen den Bereichen wischen: auf der Seite nach links/rechts wischen',
    'Gelöscht? Kurz „Rückgängig“ tippen – Trainings, Gewichtseinträge, Übungen und Tage',
    'Verlauf: Muskel-Übersicht – welche Muskeln du diese Woche (oder in 4 Wochen) wie oft trainiert hast',
    'Fehler behoben: Tab-Leiste verschwand beim Seitenwechsel kurz und die Seite sprang manchmal zurück',
    'Seitenwechsel läuft jetzt synchron mit der Pille (gleiches Tempo, gleiche Federung)',
    'Bereichswechsel mit sanfter Animation: die neue Seite gleitet von links bzw. rechts herein',
    'Tab-Leiste: Pille kurz über einem Bereich halten wechselt schon, ohne loszulassen',
    'Tab-Leiste: Finger auf der Leiste lassen und die Auswahl-Pille zum gewünschten Bereich schieben – loslassen wechselt',
    'Plan teilen (Mehr → Plan): nur den Plan ohne Verlauf als Datei weitergeben – beim Laden wird nur der Plan ersetzt, der Verlauf bleibt',
    'Der eingebaute Beispielplan wurde entfernt – die App startet leer',
    'iPhone-Unterstützung: eigenes Icon, Vollbild, Backup über iCloud („In Dateien sichern“)',
    'Neue Installationen starten mit leerem Plan – Beispielplan lässt sich unter Plan bzw. Mehr laden',
    'Gewicht: Uhrzeit der Messung eintragbar (optional)',
    'Neue Übung: Beim Tippen des Namens wird direkt die Übungsdatenbank durchsucht – als Letztes immer „Eigene Übung“',
    'Gewichtsverlauf: Verlauf → Körpergewicht antippen – Diagramm mit Zeitraum, 7-Tage-Schnitt, Zielgewicht, Statistik und allen Einträgen (bearbeiten, nachtragen)',
    'Kalender bearbeiten (Verlauf → Tag antippen): Training verschieben, anderes Training, ausfallen lassen oder Extra-Training einplanen',
    'Kalender zeigt jetzt auch die nächste Woche mit Kürzel (OK/UK)',
    'Eigene Dialoge im App-Design statt der Android-Popups (Notiz, Löschen, Erhöhen …)',
    'Notizen jetzt grau mit Stift davor – Notiz antippen zum Bearbeiten',
    'Nur noch das Muskelmodell als Bild – keine Fotos mehr',
    'Übung wechseln mit dem kleinen blauen Knopf rechts oben in der Übung',
    'Muskel-Anzeige: Jede Übung zeigt Vorder- und Rückseite mit Haupt- (kräftig rot) und Hilfsmuskeln (hell)',
    'Übung antippen im Training → große Muskelgrafik mit Namen der Muskeln',
    'Muskeln selbst anpassen: Plan → Übung → „Muskeln“',
    'Krank: Tippe im Kalender (Verlauf) auf einen Tag – Krank-Tage zählen nicht gegen deine Serie',
    'Alternativen (z. B. Kurzhanteln ↔ Bizepsmaschine) haben eigenes Gewicht, eigenen Verlauf und eigene Rekorde',
    'Alternativen bearbeiten: Plan → Übung antippen → „+ Alternative hinzufügen“',
  ] },
];
const verCmp = (x, y) => { const a = String(x).split('.').map(Number), b = String(y).split('.').map(Number);
  for (let k = 0; k < 3; k++) if ((a[k] || 0) !== (b[k] || 0)) return (a[k] || 0) - (b[k] || 0); return 0; };
// Neuerungen seit der zuletzt gesehenen Version (ohne gesehene Version: nur die aktuelle)
const changesSince = seen => CHANGELOG.filter(c => verCmp(c.v, APP_VERSION) <= 0 && (seen ? verCmp(c.v, seen) > 0 : c.v === APP_VERSION)).flatMap(c => c.items);
const EXDB_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const EXDB_IMG = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

/* ---------- Helfer ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const fmtNum = n => (Math.round(n * 100) / 100).toLocaleString('de-DE');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
function relDay(t) {
  const d = Math.round((dayStart(Date.now()) - dayStart(t)) / 86400000);
  if (d <= 0) return 'heute';
  if (d === 1) return 'gestern';
  return `vor ${d} Tagen`;
}
const fmtDate = t => new Date(t).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' });
function fmtDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
const ICON = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  img: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 16l5-5 4 4 3-3 6 6"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
};

// Kurze Erklärungen hinter dem i-Knopf (statt Text direkt auf der Seite)
const INFO = {
  week: { t: 'Kalender und Serie', x: 'Tippe auf einen Tag, um ein Training zu verschieben, ausfallen zu lassen, ein Extra-Training einzuplanen oder dich krank zu melden.\nSerie: Wochen am Stück, in denen du alle geplanten Trainings geschafft hast. Krank-Tage zählen nicht dagegen.' },
  heat: { t: 'Muskeln', x: 'Die Farbe zeigt, wie viele Sätze ein Muskel bekommen hat. Hauptmuskel zählt ganz, Hilfsmuskel halb.\nPro Woche: unter 6 Sätze wenig, 6 bis unter 12 mittel, ab 12 viel. Bei 4 Wochen gilt das Vierfache.' },
  sets: { t: 'Sätze pro Muskel', x: 'Jeder erledigte Satz zählt für den Hauptmuskel der Übung ganz und für jeden Hilfsmuskel halb.' },
  missing: { t: 'Noch nicht dran', x: 'Muskeln aus deinem Plan, die im gewählten Zeitraum noch keinen Satz bekommen haben, mit einer passenden Übung aus deinem Plan.' },
  plan: { t: 'Plan', x: 'Tippe auf einen Tag, um Übungen, Sätze, Wiederholungen und Gewichte zu bearbeiten. Mit den Pfeilen änderst du die Reihenfolge.' },
  muscleEdit: { t: 'Muskeln festlegen', x: 'Muskel antippen: 1× Hauptmuskel (kräftig), 2× Hilfsmuskel (hell), 3× aus.' },
  alts: { t: 'Alternativen', x: 'Zum Beispiel Maschine statt Kurzhanteln, falls etwas besetzt ist. Im Training schaltest du mit dem Pfeil-Knopf neben dem Übungsnamen um.\nSätze und Pause gelten wie bei der Hauptübung, Gewicht, Verlauf und Rekorde werden getrennt geführt.' },
  theme: { t: 'Darstellung', x: 'Automatisch folgt der Hell- oder Dunkel-Einstellung deines Handys.' },
};
const infoBtn = k => `<button class="info-btn" data-act="info" data-k="${k}" aria-label="Erklärung: ${INFO[k].t}">${ICON.info}</button>`;
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const SEP = '<span class="sep" aria-hidden="true"></span>';

/* ---------- Speicher (IndexedDB) ---------- */
const idb = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('gym-tracker', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { this._db = r.result; res(r.result); };
      r.onerror = () => rej(r.error);
    });
  },
  async req(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('kv', mode);
      const r = fn(t.objectStore('kv'));
      t.oncomplete = () => res(r && r.result);
      t.onerror = () => rej(t.error);
    });
  },
  get: k => idb.req('readonly', s => s.get(k)),
  set: (k, v) => idb.req('readwrite', s => s.put(v, k)),
  del: k => idb.req('readwrite', s => s.delete(k)),
  keys: () => idb.req('readonly', s => s.getAllKeys()),
};

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const repTxt = e => (e.repMin && e.repMax && e.repMin !== e.repMax) ? `${e.repMin}–${e.repMax}` : String(e.repMin || e.reps);
const kgTxt = w => w ? `${fmtNum(w)} kg` : 'Körpergewicht';

/* ---------- Zustand ---------- */
let S = { v: 1, plan: { days: [] }, logs: [], body: [], active: null, settings: { rest: 90 } };
const V = { tab: 'home', sub: null }; // sub = geöffneter Trainingstag im Plan-Editor
const localImgs = {}; // id -> dataURL
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 250); }
function flush() { clearTimeout(saveTimer); return idb.set('state', S).catch(err => toast('Speichern fehlgeschlagen: ' + err)); }

const findDay = id => S.plan.days.find(d => d.id === id);
// Findet eine Übung oder eine ihrer Alternativen per id
function findEx(id) {
  if (!id) return null;
  for (const d of S.plan.days) for (const e of d.exercises) {
    if (e.id === id) return e;
    for (const a of e.alts || []) if (a.id === id) return a;
  }
  return null;
}
const allExercises = () => S.plan.days.flatMap(d => d.exercises.flatMap(e => [e, ...(e.alts || [])]));
const effId = en => en.varId || en.exId; // gerade gewählte Variante im Training

