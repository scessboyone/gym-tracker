'use strict';

/* =========================================================
   Gym Tracker – läuft komplett auf dem Handy.
   Daten liegen in IndexedDB (nur auf diesem Gerät).
   ========================================================= */

const APP_VERSION = '0.18.0';
// Wird nach einem Update einmal angezeigt
const CHANGELOG = [
  'Training neu: eine Übung pro Seite mit Weiter/Zurück und Fortschrittsbalken – Übung überspringen, wenn die Maschine besetzt ist (kommt am Ende nochmal)',
  'Verlauf → „Verlauf pro Übung“: alle Sätze, Bestwert und Kurve je Übung auf einer eigenen Seite',
  'Der Bildschirm bleibt im Training nicht mehr extra an',
  'Feinschliff: Fenster wie „Neue Übung“ sind nicht mehr durchsichtig, Gewichts-Kopfzeile sauber ausgerichtet, „1 Satz“ statt „1 Sätze“',
  'Gewicht eintragen: Die Uhrzeit wird nicht mehr abgeschnitten, „Eintragen“ steht jetzt breit darunter',
  'Neues Design: Hell und Dunkel (Mehr → Darstellung), sportlicher Apple-Stil mit blauem Akzent und Wochenring auf Home',
  'Neuer Bereich „Home“ ganz links: Begrüßung, was heute ansteht, Woche, Gewicht und letztes Training auf einen Blick',
  'Rekorde und „Letzte Trainings“ zeigen nur noch die neuesten 3 – „Alle anzeigen“ klappt den Rest auf',
  'Gewicht: Die aktuelle Uhrzeit wird automatisch eingetragen und lässt sich ändern',
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
];
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
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
};

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
const todayWd = () => (new Date().getDay() + 6) % 7; // 0 = Montag

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

function imgSrc(image) {
  if (!image) return '';
  if (image.type === 'db') return EXDB_IMG + image.value;
  if (image.type === 'url') return image.value;
  if (image.type === 'local') return localImgs[image.value] || '';
  return '';
}
function imgTag(image, cls = 'thumb') {
  const src = imgSrc(image);
  if (!src) return `<div class="${cls} ph">${ICON.img}</div>`;
  const cors = image.type === 'db' ? ' crossorigin="anonymous"' : '';
  return `<img class="${cls}" src="${esc(src)}"${cors} alt="" loading="lazy">`;
}

/* ---------- Muskel-Grafik ----------
   Körpermodell (Polygone) aus react-body-highlighter, MIT-Lizenz, (c) 2020 GV79 – siehe THIRD_PARTY.md */
const BODY = {"front":{"chest":["518 416 510 551 580 580 678 555 706 473 620 416","298 465 314 555 408 580 482 551 478 420 376 420"],"obliques":["686 633 673 571 588 596 600 641 604 833 657 788 665 698","339 784 331 718 310 633 322 571 408 592 392 633 392 837"],"abs":["563 592 580 641 584 780 584 927 563 984 551 1041 514 1078 510 845 506 673 510 571","437 588 486 571 490 673 486 845 482 1073 445 1037 408 914 408 784 412 645"],"biceps":["167 682 180 714 229 661 290 539 278 494 204 559","714 494 702 547 763 661 816 718 829 690 788 555"],"triceps":["694 555 694 616 759 727 776 702 755 673","224 694 298 555 298 608 229 731"],"neck":["555 237 506 335 506 392 616 400 706 449 694 367 633 351 584 306","290 449 302 371 363 351 412 302 445 245 490 339 486 392 380 396"],"front_deltoids":["784 531 796 478 792 412 759 380 710 363 722 429 714 473","282 473 212 531 200 478 204 408 245 371 286 371 269 433"],"head":["424 29 400 118 420 196 461 233 498 253 547 224 576 192 592 102 571 24 498 0"],"abductors":["527 1102 543 1249 600 1102 620 1000 649 943 600 927 567 1045","478 1106 449 1253 420 1159 404 1131 396 1073 380 1024 347 939 396 922 416 992 437 1053"],"quadriceps":["347 988 371 1082 371 1278 343 1371 310 1327 294 1200 282 1114 294 1008 322 947","633 1057 645 1000 669 947 702 1012 710 1118 682 1331 653 1376 624 1286 620 1114","388 1294 384 1122 412 1184 445 1294 429 1351 400 1461 363 1465 355 1400","596 1457 555 1290 608 1139 612 1302 641 1396 629 1465","327 1384 265 1457 257 1367 257 1273 269 1143 294 1335","718 1131 739 1241 739 1404 727 1457 665 1384 702 1335"],"knees":["339 1400 347 1433 355 1473 363 1510 351 1567 298 1567 273 1527 273 1473 302 1441","657 1400 722 1478 722 1522 698 1571 649 1567 629 1510"],"calves":["714 1604 735 1535 767 1612 796 1678 784 1878 796 1955 747 1955","249 1947 278 1649 282 1604 261 1543 249 1576 224 1616 208 1678 220 1882 208 1955","727 1951 698 1592 653 1584 641 1624 641 1653 657 1771","355 1584 359 1624 359 1669 351 1722 351 1767 322 1820 306 1873 269 1947 273 1878 282 1804 286 1755 290 1698 298 1641 302 1588"],"forearm":["61 886 102 751 147 702 163 743 192 735 45 976 0 1000","845 698 833 735 800 731 951 984 1000 1004 935 894 898 763","776 722 776 776 804 841 853 898 922 1012 947 996","69 1012 135 906 188 841 216 771 212 718 49 988"]},"back":{"head":["506 0 460 9 409 55 404 128 451 200 557 200 591 136 596 47 557 13"],"trapezius":["447 217 477 217 472 383 477 647 383 532 353 409 311 366 391 332 438 272","523 217 557 217 566 272 609 328 689 366 647 404 617 532 523 647 532 383"],"back_deltoids":["294 370 230 391 174 443 183 536 243 494 272 464","711 370 783 396 826 447 817 536 749 489 723 451"],"upper_back":["311 387 281 489 285 553 340 753 472 711 472 664 366 540 336 413","689 387 719 494 715 562 660 753 528 711 528 664 634 545 664 417"],"triceps":["268 498 179 557 145 723 166 817 217 638 268 557","736 502 821 557 860 732 834 821 779 630 732 557","268 583 268 685 230 753 191 774 226 655","728 583 770 647 804 774 766 753 728 689"],"lower_back":["477 728 345 770 353 834 494 1021 468 830","523 728 655 770 647 834 506 1021 532 838"],"forearm":["864 757 911 834 932 940 1000 1064 962 1043 881 894 843 838","136 757 89 838 68 936 0 1064 38 1043 123 885 157 830","813 796 774 779 791 847 911 1038 932 1089 945 1047","187 796 221 779 209 843 94 1030 68 1085 51 1047"],"gluteal":["447 996 302 1085 298 1187 315 1260 472 1213 494 1149","553 991 511 1145 523 1209 681 1260 698 1191 694 1085"],"adductor":["481 1230 447 1230 413 1255 451 1443 485 1357 489 1294","519 1226 557 1234 591 1260 549 1443 519 1362 511 1294"],"hamstring":["289 1221 311 1294 366 1260 353 1353 345 1502 294 1583 289 1468 277 1413 272 1315","715 1217 694 1289 638 1260 655 1366 664 1502 711 1583 715 1477 728 1421 736 1319","387 1255 443 1460 404 1668 362 1528 370 1353","617 1255 634 1362 643 1532 600 1668 562 1464"],"knees":["345 1532 311 1591 336 1664 374 1626","664 1536 630 1630 668 1664 694 1591"],"calves":["294 1604 285 1672 247 1796 238 1928 255 1970 285 1932 298 1800 319 1711 319 1668","374 1651 353 1677 332 1719 311 1804 302 1919 340 2000 387 1906 391 1689","630 1651 613 1685 617 1906 664 1996 706 1919 689 1796 668 1702","706 1604 723 1685 757 1791 766 1928 745 1966 723 1936 706 1796 681 1681"],"left_soleus":["285 1957 302 1957 336 2017 306 2200 285 2136 268 1983"],"right_soleus":["698 1957 719 1957 736 1983 719 2132 702 2196 672 2021"]}};
const MUSCLE_DE = {
  chest: 'Brust', abs: 'Bauch', obliques: 'Seitl. Bauch', biceps: 'Bizeps', triceps: 'Trizeps', forearm: 'Unterarme',
  front_deltoids: 'Schulter vorne', back_deltoids: 'Schulter hinten', trapezius: 'Trapez/Nacken', upper_back: 'Oberer Rücken',
  lower_back: 'Unterer Rücken', gluteal: 'Po', quadriceps: 'Oberschenkel vorne', hamstring: 'Oberschenkel hinten',
  adductor: 'Adduktoren', abductors: 'Abduktoren', calves: 'Waden', neck: 'Hals',
};
const DB2BODY = {
  chest: ['chest'], abdominals: ['abs'], biceps: ['biceps'], triceps: ['triceps'], shoulders: ['front_deltoids', 'back_deltoids'],
  lats: ['upper_back'], 'middle back': ['upper_back', 'trapezius'], 'lower back': ['lower_back'], traps: ['trapezius'],
  quadriceps: ['quadriceps'], hamstrings: ['hamstring'], glutes: ['gluteal'], calves: ['calves'], forearms: ['forearm'],
  adductors: ['adductor'], abductors: ['abductors'], neck: ['neck'],
};
// Muskeln für gängige Übungsnamen: [Hauptmuskeln, Hilfsmuskeln]
const MUSCLES_BY_NAME = {
  'Latzug an der Maschine': [['upper_back'], ['biceps', 'back_deltoids', 'forearm']],
  'Brustpresse': [['chest'], ['triceps', 'front_deltoids']],
  'Rudern an der Maschine': [['upper_back', 'trapezius'], ['biceps', 'back_deltoids', 'forearm']],
  'Seitheben an der Maschine': [['front_deltoids', 'back_deltoids'], ['trapezius']],
  'Reverse Butterfly': [['back_deltoids'], ['upper_back', 'trapezius']],
  'Bizepscurl mit Kurzhanteln': [['biceps'], ['forearm']],
  'Bizepsmaschine': [['biceps'], ['forearm']],
  'Trizepsdrücken am Kabelzug': [['triceps'], []],
  'Bauch-Crunch': [['abs'], ['obliques']],
  'Beinheben mit angewinkelten Beinen': [['abs'], ['obliques']],
  'Seitlicher Bauch': [['obliques'], ['abs']],
  'Kreuzheben': [['lower_back', 'gluteal', 'hamstring'], ['trapezius', 'quadriceps', 'forearm', 'upper_back']],
  'Beinpresse': [['quadriceps', 'gluteal'], ['hamstring', 'calves']],
  'Beinstrecker': [['quadriceps'], []],
  'Beinbeuger': [['hamstring'], ['calves']],
  'Shrugs': [['trapezius'], ['forearm']],
  'Wadenpresse': [['calves'], []],
  'Hammercurls': [['biceps', 'forearm'], []],
  'Beinheben': [['abs'], ['obliques', 'quadriceps']],
};
function musclesFromDb(e) {
  const map = list => [...new Set((list || []).flatMap(m => DB2BODY[m] || []))];
  const p = map(e.primaryMuscles);
  return { p, s: map(e.secondaryMuscles).filter(m => !p.includes(m)) };
}
function bodySvg(side, mus) {
  const p = new Set(mus.p), s = new Set(mus.s);
  if (p.has('calves')) { p.add('left_soleus'); p.add('right_soleus'); }
  if (s.has('calves')) { s.add('left_soleus'); s.add('right_soleus'); }
  let polys = '';
  for (const [k, list] of Object.entries(BODY[side])) {
    const cls = p.has(k) ? 'mp' : s.has(k) ? 'ms' : (k === 'head' || k === 'knees') ? 'mh' : 'mb';
    for (const pts of list) polys += `<polygon class="${cls}" points="${pts}"/>`;
  }
  return `<svg viewBox="0 0 1000 2200" aria-hidden="true">${polys}</svg>`;
}
const hasMuscles = o => o && o.muscles && (o.muscles.p.length || o.muscles.s.length);
function muscleFig(o, cls = 'thumb') {
  return `<div class="${cls} mus">${bodySvg('front', o.muscles)}${bodySvg('back', o.muscles)}</div>`;
}
// Vorschaubild ist immer das Muskelmodell (ohne Angabe: neutraler Körper)
function exThumb(o, cls = 'thumb') {
  return muscleFig(hasMuscles(o) ? o : { muscles: { p: [], s: [] } }, cls);
}
function muscleLegend(o) {
  if (!hasMuscles(o)) return '';
  const n = l => l.map(m => MUSCLE_DE[m] || m).join(', ');
  return `<p class="sub" style="margin:6px 0 0"><span class="dot-mp"></span>${n(o.muscles.p)}${o.muscles.s.length ? `${SEP}<span class="dot-ms"></span>${n(o.muscles.s)}` : ''}</p>`;
}
// Muskeln für Übungen ohne Angabe ergänzen (Tabelle, sonst aus der Übungsdatenbank)
async function fillMuscles() {
  let changed = false, needDb = false;
  for (const o of allExercises()) {
    if (o.muscles) continue;
    const t = MUSCLES_BY_NAME[o.name];
    if (t) { o.muscles = { p: [...t[0]], s: [...t[1]] }; changed = true; } else if (o.dbId) needDb = true;
  }
  if (needDb) {
    try {
      const db = await loadExDb();
      for (const o of allExercises()) {
        if (o.muscles || !o.dbId) continue;
        const e = db.find(x => x.id === o.dbId);
        if (e) { o.muscles = musclesFromDb(e); changed = true; }
      }
    } catch { /* offline – später nochmal */ }
  }
  if (changed) { save(); render(); }
}

/* ---------- Übungsdatenbank ---------- */
let EXDB = null;
async function loadExDb() {
  if (EXDB) return EXDB;
  const r = await fetch(EXDB_URL);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  EXDB = await r.json();
  return EXDB;
}
const DE_EN = {
  'bankdrücken': 'bench press', 'bankdruecken': 'bench press', 'schrägbank': 'incline', 'schraegbank': 'incline',
  'negativbank': 'decline', 'kurzhantel': 'dumbbell', 'langhantel': 'barbell', 'kabelzug': 'cable', 'kabel': 'cable',
  'maschine': 'machine', 'kniebeugen': 'squat', 'kniebeuge': 'squat', 'kreuzheben': 'deadlift', 'rumänisch': 'romanian',
  'schulterdrücken': 'shoulder press', 'schulterdruecken': 'shoulder press', 'rudern': 'row', 'klimmzüge': 'pullup',
  'klimmzug': 'pullup', 'latzug': 'pulldown', 'bizepscurls': 'bicep curl', 'bizepscurl': 'bicep curl', 'bizeps': 'curl',
  'hammercurls': 'hammer curl', 'trizeps': 'triceps', 'beinpresse': 'leg press', 'ausfallschritte': 'lunge',
  'ausfallschritt': 'lunge', 'seitheben': 'lateral raise', 'frontheben': 'front raise', 'wadenheben': 'calf raise',
  'beinstrecker': 'leg extension', 'beinbeuger': 'leg curl', 'butterfly': 'fly', 'fliegende': 'fly', 'bauch': 'ab',
  'unterarmstütz': 'plank', 'hüftheben': 'hip thrust', 'liegestütze': 'pushup', 'liegestütz': 'pushup',
  'schulterheben': 'shrug', 'überzüge': 'pullover', 'beinheben': 'leg raise', 'adduktoren': 'adductor',
  'abduktoren': 'abductor', 'brust': 'chest', 'rücken': 'back', 'schulter': 'shoulder', 'stehend': 'standing',
  'sitzend': 'seated', 'liegend': 'lying', 'enger griff': 'close grip', 'breit': 'wide',
};
const DE_KEYS = Object.keys(DE_EN).sort((a, b) => b.length - a.length);
const norm = s => s.toLowerCase().replace(/[^a-z0-9äöüß ]+/g, ' ').replace(/\s+/g, ' ').trim();
function searchExDb(q) {
  if (!EXDB) return [];
  let t = q.toLowerCase();
  for (const k of DE_KEYS) t = t.split(k).join(' ' + DE_EN[k] + ' ');
  const tokens = norm(t).split(' ').filter(Boolean);
  if (!tokens.length) return [];
  const out = [];
  for (const e of EXDB) {
    const compact = norm(e.name).replace(/ /g, '');
    if (tokens.every(tok => compact.includes(tok))) out.push(e);
  }
  // Gängige Übungen und solche aus dem eigenen Plan zuerst, dann ganze Wörter vor Wortteilen, dann kürzere Namen
  const mine = new Set(allExercises().map(x => x.dbId).filter(Boolean));
  const words = e => norm(e.name).split(' ');
  const score = e => (mine.has(e.id) ? 0 : POPULAR.has(e.id) ? 100 : 1000)
    - tokens.filter(tok => words(e).includes(tok)).length * 20 + e.name.length;
  // „Bizeps“ wird zu „curl“ – Beinbeuger (Leg Curl) dann nicht anzeigen
  const res = /bizeps/i.test(q) && !/bein|leg/i.test(q) ? out.filter(e => !/\bleg\b/i.test(e.name)) : out;
  res.sort((a, b) => score(a) - score(b));
  return res.slice(0, 40);
}
const POPULAR = new Set(['Barbell_Bench_Press_-_Medium_Grip', 'Barbell_Incline_Bench_Press_-_Medium_Grip', 'Dumbbell_Bench_Press',
  'Incline_Dumbbell_Press', 'Barbell_Squat', 'Barbell_Deadlift', 'Romanian_Deadlift', 'Wide-Grip_Lat_Pulldown', 'Pullups',
  'Bent_Over_Barbell_Row', 'Seated_Cable_Rows', 'Dumbbell_Bicep_Curl', 'Barbell_Curl', 'Hammer_Curls', 'Triceps_Pushdown',
  'Side_Lateral_Raise', 'Standing_Military_Press', 'Seated_Dumbbell_Press', 'Leg_Press', 'Leg_Extensions', 'Lying_Leg_Curls',
  'Standing_Calf_Raises', 'Barbell_Hip_Thrust', 'Dumbbell_Lunges', 'Crunches', 'Plank', 'Pushups', 'Dips_-_Triceps_Version',
  'Butterfly', 'Reverse_Flyes', 'Barbell_Shrug', 'Cable_Crossover', 'Face_Pull', 'Hanging_Leg_Raise', 'Goblet_Squat',
  'Seated_Leg_Curl', 'Thigh_Adductor', 'Thigh_Abductor', 'Cable_Crunch', 'Preacher_Curl', 'EZ-Bar_Curl',
  'Close-Grip_Barbell_Bench_Press', 'Dumbbell_Shoulder_Press', 'One-Arm_Dumbbell_Row', 'Machine_Shoulder_Military_Press']);

/* ---------- Rendern ---------- */
function setTop(title, left = '', right = '') {
  $('#title').textContent = title;
  $('#topleft').innerHTML = left;
  $('#topright').innerHTML = right;
}
function render() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === V.tab));
  placePill();
  const view = $('#view');
  if (V.tab === 'home') view.innerHTML = renderHome();
  else if (V.tab === 'train') view.innerHTML = S.active ? renderWorkout() : renderDays();
  else if (V.tab === 'plan') view.innerHTML = V.sub && findDay(V.sub) ? renderDayEditor(findDay(V.sub)) : renderPlan();
  else if (V.tab === 'log') view.innerHTML = V.sub === 'weight' ? renderWeight() : V.sub === 'ex' ? renderExList()
    : typeof V.sub === 'string' && V.sub.startsWith('ex:') ? renderExHist(V.sub.slice(3)) : renderLog();
  else view.innerHTML = renderMore();
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
  if (!name) h += `<div class="card"><b>Wie heißt du?</b><div class="sub" style="margin:2px 0 10px">Dann begrüßt dich die App mit deinem Namen.</div>
    <div style="display:flex;gap:8px"><input class="input" id="name-in" placeholder="Dein Name" maxlength="30" autocomplete="given-name" style="flex:1;min-width:0">
    <button class="btn primary" data-act="saveName">Speichern</button></div></div>`;
  h += installBanner() + backupBanner();
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
  if (o) { const d = o.d && findDay(o.d) ? o.d : null; return { d, x: !!(o.x && d), changed: true }; }
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

/* ----- Training: läuft ----- */
function lastSetsOf(exId, name) {
  for (const l of S.logs) {
    const en = l.entries.find(e => e.exId === exId) || l.entries.find(e => e.name === name);
    if (en && en.sets.some(s => s.done)) return en.sets.filter(s => s.done);
  }
  return null;
}
function summarize(sets) {
  if (!sets || !sets.length) return '';
  const same = sets.every(s => s.weight === sets[0].weight && s.reps === sets[0].reps);
  if (same) return `${sets.length} × ${sets[0].reps} Wdh. mit ${kgTxt(sets[0].weight)}`;
  return sets.map(s => `${fmtNum(s.weight)} kg × ${s.reps}`).join(', ');
}
function workoutCounts() {
  let done = 0, total = 0;
  for (const en of S.active.entries) for (const s of en.sets) { total++; if (s.done) done++; }
  return { done, total };
}
// Reihenfolge der Übungen im laufenden Training (Überspringen schiebt eine Übung ans Ende)
function ensureOrder(A) {
  if (!Array.isArray(A.order) || A.order.length !== A.entries.length) A.order = A.entries.map((_, i) => i);
  A.pos = Math.min(Math.max(0, A.pos || 0), A.order.length - 1);
}
const entryDone = en => en.sets.length > 0 && en.sets.every(s => s.done);
function workoutHead() {
  const A = S.active;
  const { done, total } = workoutCounts();
  const n = A.order.length, en = A.entries[A.order[A.pos]];
  const next = A.pos < n - 1 ? A.entries[A.order[A.pos + 1]].name : '';
  return `<section class="card glass wk-head" id="wk-head">
    <div class="wk-title">${esc(A.dayName)}</div>
    <div class="wk-meta"><span>Dauer <b id="elapsed">${fmtDur(Date.now() - A.startedAt)}</b></span><span>${done} / ${total} Sätze</span></div>
    <div class="steps" role="tablist" aria-label="Übungen">${A.order.map((idx, k) => {
      const e = A.entries[idx], d = e.sets.filter(x => x.done).length, pct = e.sets.length ? (d / e.sets.length) * 100 : 0;
      return `<button class="step${k === A.pos ? ' on' : ''}${entryDone(e) ? ' done' : ''}" data-act="exGo" data-k="${k}" role="tab" aria-selected="${k === A.pos}" aria-label="${esc(e.name)}"><i style="width:${pct}%"></i></button>`;
    }).join('')}</div>
    <div class="wk-step">Übung ${A.pos + 1} von ${n}${en.skipped && !entryDone(en) ? '<span class="sep" aria-hidden="true"></span>übersprungen, jetzt nachholen' : next ? `<span class="sep" aria-hidden="true"></span>danach ${esc(next)}` : ''}</div>
  </section>`;
}
function renderWorkout() {
  const A = S.active;
  ensureOrder(A);
  setTop('Training', '', '<button class="linkbtn" data-act="finish">Beenden</button>');
  const i = A.order[A.pos], last = A.pos === A.order.length - 1;
  return `${workoutHead()}
    ${renderEntry(A.entries[i], i)}
    <div class="wk-nav">
      <button class="btn" data-act="exPrev" ${A.pos === 0 ? 'disabled' : ''}>${ICON.back}Zurück</button>
      <button class="btn primary" data-act="exNext">${last ? 'Training beenden' : `Weiter${ICON.chev}`}</button>
    </div>
    ${last ? '' : '<button class="btn ghost block" data-act="exSkip">Übung überspringen und später machen</button>'}
    <button class="btn ghost block" data-act="cancelWorkout">Training verwerfen</button>`;
}
function goEx(k) {
  const A = S.active; if (!A) return;
  const dir = Math.sign(k - A.pos);
  A.pos = k; save(); render(); scrollTo(0, 0);
  if (dir) slideIn(dir);
}
function renderEntry(en, i) {
  const base = findEx(en.exId);            // Hauptübung (Sätze, Pause)
  const pe = findEx(effId(en)) || base;    // gewählte Variante (Gewicht, Wdh., Bild, Notiz)
  const lastSets = lastSetsOf(effId(en), en.name);
  const last = summarize(lastSets);
  const allDone = en.sets.length && en.sets.every(s => s.done);
  const sets = base ? base.sets : en.sets.length;
  const target = pe ? `Ziel: ${sets} × ${repTxt(pe)} Wdh.` : '';
  const levelUp = pe && pe.repMax && lastSets && lastSets.length >= sets && lastSets.every(s => s.reps >= pe.repMax);
  const variants = base && (base.alts || []).length ? [base, ...base.alts] : null;
  return `<article class="card ex ${allDone ? 'done' : ''}" id="en-${i}">
    <div class="ex-head" data-act="exInfo" data-i="${i}">
      ${exThumb(pe || en)}
      <div class="grow">
        <div class="ex-name">${esc(en.name)}</div>
        ${target ? `<div class="sub">${target}</div>` : ''}
        ${last ? `<div class="sub">Letztes Mal: ${esc(last)}</div>` : ''}
        ${pe ? `<button class="note ${pe.note ? '' : 'blank'}" data-act="editNote" data-i="${i}" aria-label="Notiz bearbeiten">${ICON.edit}<span>${pe.note ? esc(pe.note) : 'Notiz hinzufügen'}</span></button>` : ''}
      </div>
      <div class="ex-tools">
        ${variants ? `<button class="iconbtn sw" data-act="switchVar" data-i="${i}" aria-label="Übung wechseln" title="Wechseln zu: ${esc(variants.filter(o => o.id !== effId(en)).map(o => o.name).join(', '))}">${ICON.swap}</button>` : ''}
      </div>
    </div>
    ${levelUp && !en.bumped ? `<div class="bump">
      <div class="sub" style="color:var(--green);margin-bottom:8px">Ziel letztes Mal geschafft! Um wie viel erhöhen?</div>
      <div class="btnrow">${[1, 2.5, 5].map(v => `<button class="btn small" data-act="bump" data-i="${i}" data-v="${v}">+${fmtNum(v)} kg</button>`).join('')}
        <button class="btn small" data-act="bumpCustom" data-i="${i}">Andere</button>
        <button class="btn small ghost" data-act="bump" data-i="${i}" data-v="0">Nein</button></div>
    </div>` : ''}
    <div class="sets">
      <div class="set-row hdr"><span>Satz</span><span>kg</span><span>Wdh.</span><span></span></div>
      ${en.sets.map((s, j) => `<div class="set-row ${s.done ? 'done' : ''}">
        <span class="set-no">${j + 1}</span>
        <input inputmode="decimal" enterkeyhint="next" data-field="weight" data-i="${i}" data-j="${j}" value="${fmtNum(s.weight)}" aria-label="Gewicht in kg">
        <input inputmode="numeric" enterkeyhint="done" data-field="reps" data-i="${i}" data-j="${j}" value="${s.reps}" aria-label="Wiederholungen">
        <button class="check" data-act="toggleSet" data-i="${i}" data-j="${j}" aria-label="Satz abhaken">${ICON.check}</button>
      </div>`).join('')}
    </div>
    <div class="ex-actions">
      <button class="btn small" data-act="addSet" data-i="${i}">+ Satz</button>
      <button class="btn small" data-act="removeSet" data-i="${i}" ${en.sets.length ? '' : 'disabled'}>− Satz</button>
    </div>
  </article>`;
}
function bumpEntry(i, kg) {
  const en = S.active.entries[i];
  const pe = findEx(effId(en));
  en.bumped = true;
  if (kg > 0) {
    for (const s of en.sets) if (!s.done) { s.weight = Math.round((s.weight + kg) * 100) / 100; if (pe && pe.repMin) s.reps = pe.repMin; }
    toast(`${en.name}: +${fmtNum(kg)} kg – auf geht's!`);
  }
  save(); rerenderEntry(i);
}
// Bester Satz einer Übung im Verlauf (höchstes Gewicht, bei Gleichstand mehr Wdh.)
function bestSet(exId, name, excludeId) {
  let best = null;
  for (const l of S.logs) {
    if (l.id === excludeId) continue;
    for (const e of l.entries) {
      if (!(exId && e.exId === exId) && e.name !== name) continue;
      for (const s of e.sets) {
        if (s.done && (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps))) best = { weight: s.weight, reps: s.reps, t: l.startedAt };
      }
    }
  }
  return best;
}
// Erstes Mal zählt nicht als Rekord (nur Ausgangswert)
const isPR = (s, best) => !!best && (s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps));
function rerenderEntry(i) {
  const el = $('#en-' + i);
  if (el) el.outerHTML = renderEntry(S.active.entries[i], i);
  const h = $('#wk-head');
  if (h) { ensureOrder(S.active); h.outerHTML = workoutHead(); }
}
function tickElapsed() {
  const el = $('#elapsed');
  if (el && S.active) el.textContent = fmtDur(Date.now() - S.active.startedAt);
}
setInterval(tickElapsed, 1000);

function startWorkout(dayId) {
  const d = findDay(dayId);
  if (!d) return;
  S.active = {
    id: uid(), dayId: d.id, dayName: d.name, startedAt: Date.now(),
    entries: d.exercises.map(e => {
      // zuletzt benutzte Variante wieder vorauswählen
      let varId = null;
      for (const l of S.logs) {
        const le = l.entries.find(x => x.baseId === e.id);
        if (le) { if ((e.alts || []).some(a => a.id === le.exId)) varId = le.exId; break; }
      }
      const v = (varId && findEx(varId)) || e;
      return {
        exId: e.id, varId, name: v.name, rest: e.rest || S.settings.rest, image: v.image,
        sets: Array.from({ length: Math.max(1, e.sets) }, () => ({ weight: v.weight, reps: v.reps || v.repMin, done: false })),
      };
    }),
  };
  V.tab = 'train';
  save(); render(); scrollTo(0, 0);
}
function finishSheet() {
  const { done, total } = workoutCounts();
  openSheet(`<div class="sheet-head"><h2>Training beenden</h2></div>
    <p class="sub">${done} von ${total} Sätzen erledigt${SEP}Dauer ${fmtDur(Date.now() - S.active.startedAt)}</p>
    <label class="field"><span>Notiz zum Training (optional)</span>
      <textarea class="input" id="finishNote" placeholder="z. B. Schulter gezwickt, schlecht geschlafen …">${esc(S.active.note || '')}</textarea></label>
    <div class="list"><label class="toggle"><span>Gewichte und Wiederholungen als neuen Standard in den Plan übernehmen</span>
      <input type="checkbox" id="applyPlan" checked></label></div>
    <button class="btn primary block" data-act="finishSave">Speichern</button>
    <button class="btn ghost block" data-act="closeSheet">Weiter trainieren</button>`);
}
function finishWorkout(apply, note) {
  const A = S.active;
  const prs = [];
  for (const e of A.entries) {
    const done = e.sets.filter(s => s.done);
    if (!done.length) continue;
    const top = done.reduce((b, s) => (s.weight > b.weight || (s.weight === b.weight && s.reps > b.reps)) ? s : b);
    const prev = bestSet(effId(e), e.name);
    if (isPR(top, prev)) prs.push({ name: e.name, weight: top.weight, reps: top.reps, prevWeight: prev.weight, prevReps: prev.reps });
  }
  // exId = tatsächlich gemachte Variante, baseId = Hauptübung im Plan
  const log = { id: A.id, dayId: A.dayId, dayName: A.dayName, startedAt: A.startedAt, endedAt: Date.now(), note: note || '', prs,
    entries: A.entries.map(e => ({ exId: effId(e), baseId: e.exId, name: e.name, sets: e.sets.map(s => ({ weight: s.weight, reps: s.reps, done: s.done })) })) };
  S.logs.unshift(log);
  if (apply) {
    for (const en of A.entries) {
      const pe = findEx(effId(en));
      const doneSets = en.sets.filter(s => s.done);
      if (!pe || !doneSets.length) continue;
      const ref = doneSets[doneSets.length - 1];
      pe.weight = ref.weight; pe.reps = ref.reps;
      if (!en.varId) pe.sets = en.sets.length;
    }
  }
  S.active = null;
  stopRest(); flush();
  render(); scrollTo(0, 0);
  if (!prs.length) { closeSheet(); toast('Training gespeichert'); return; }
  setSheet(`<div class="sheet-head"><h2>Neue Rekorde</h2></div>
    <div class="list">${prs.map(p => `<div class="row"><div class="grow"><div class="title">${esc(p.name)}</div>
      <div class="sub">${kgTxt(p.weight)} × ${p.reps} Wdh. <span class="muted">(vorher ${kgTxt(p.prevWeight)} × ${p.prevReps})</span></div></div></div>`).join('')}</div>
    <button class="btn primary block" data-act="closeSheet">Stark</button>`);
}

/* ----- Info-Sheet zu einer Übung ----- */
async function exInfo(i) {
  const en = S.active.entries[i];
  const pe = findEx(effId(en)) || en;
  const dbId = pe.dbId;
  openSheet(`<div class="sheet-head"><h2>${esc(en.name)}</h2><button class="linkbtn" data-act="closeSheet">Fertig</button></div>
    <div class="card" style="padding:12px">${exThumb(pe, 'musbig')}${muscleLegend(pe)}</div>
    <div class="card"><div class="sub">Notiz / Einstellungen</div>
      <div style="margin-top:4px">${pe.note ? esc(pe.note) : '<span class="muted">Noch keine – tippe im Training auf ✎</span>'}</div></div>
    <div id="instr" class="sub">${dbId ? 'Anleitung wird geladen …' : ''}</div>`);
  if (dbId) {
    try {
      const db = await loadExDb();
      const e = db.find(x => x.id === dbId);
      const box = $('#instr');
      if (box && e) box.innerHTML = `<div class="section-title">Anleitung (Englisch)</div><ol class="instr">${e.instructions.map(t => `<li>${esc(t)}</li>`).join('')}</ol>`;
    } catch { const box = $('#instr'); if (box) box.textContent = 'Anleitung offline nicht verfügbar.'; }
  }
}

/* ----- Plan ----- */
function renderPlan() {
  setTop('Plan', '', '<button class="linkbtn" data-act="addDay">+ Tag</button>');
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
    </div>`).join('')}</div>
    <p class="sub" style="margin:0 4px">Tippe auf einen Tag, um Übungen, Sätze, Wiederholungen und Gewichte zu bearbeiten.</p>`;
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
        <div class="sub">${e.sets} × ${repTxt(e)} Wdh.${SEP}${kgTxt(e.weight)}${SEP}<span class="nw">${e.rest} s Pause</span></div>
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
  D = { dayId, isNew: !src, alt: null, ex: src ? clone(src) : { id: uid(), name: '', sets: 3, repMin: 10, repMax: 12, reps: 10, weight: 0, rest: S.settings.rest, note: '', dbId: null, image: null } };
  if (D.ex.repMin == null) { D.ex.repMin = D.ex.reps; D.ex.repMax = D.ex.reps; }
  D.ex.alts = D.ex.alts || [];
  drawExSheet();
}
function drawExSheet() {
  const e = cur(), main = D.alt == null;
  const title = main ? (D.isNew ? 'Neue Übung' : 'Übung bearbeiten') : 'Alternative';
  const html = `<div class="sheet-head"><h2>${title}</h2>
      ${main ? '<button class="linkbtn" data-act="closeSheet">Abbrechen</button>' : `<button class="linkbtn" data-act="altDone">${ICON.back}Zurück</button>`}</div>
    ${main ? '' : `<p class="sub" style="margin-top:0">Alternative zu „${esc(D.ex.name || 'Übung')}“. Sätze und Pause gelten wie bei der Hauptübung – Gewicht, Verlauf und Rekorde werden getrennt geführt.</p>`}
    <label class="field" style="margin-bottom:${D.isNew || !main ? 4 : 12}px"><span>Name – tippen, um in der Übungsdatenbank zu suchen</span><input class="input" id="f-name" value="${esc(e.name)}" autocomplete="off" placeholder="${main ? 'z. B. Bankdrücken' : 'z. B. Bizepsmaschine'}"></label>
    <div id="sug"></div>
    <div class="grid2">
      <label class="field"><span>Wdh. von</span><input class="input" id="f-rmin" inputmode="numeric" value="${e.repMin}"></label>
      <label class="field"><span>Wdh. bis</span><input class="input" id="f-rmax" inputmode="numeric" value="${e.repMax}"></label>
      ${main ? `<label class="field"><span>Sätze</span><input class="input" id="f-sets" inputmode="numeric" value="${e.sets}"></label>` : ''}
      <label class="field"><span>Gewicht (kg, 0 = ohne)</span><input class="input" id="f-weight" inputmode="decimal" value="${fmtNum(e.weight)}"></label>
      ${main ? `<label class="field"><span>Pause (Sekunden)</span><input class="input" id="f-rest" inputmode="numeric" value="${e.rest}"></label>` : ''}
    </div>
    <label class="field"><span>Notiz / Einstellungen (z. B. Sitzhöhe, Stufe, Griff)</span><textarea class="input" id="f-note" placeholder="z. B. Sitz Stufe 5, Polster auf 3">${esc(e.note)}</textarea></label>
    <div class="section-title">Muskeln</div>
    <div class="card" style="padding:12px">${exThumb(e, 'musbig')}</div>
    <p class="sub" style="margin:0 4px 8px">Antippen: 1× = Hauptmuskel (kräftig), 2× = Hilfsmuskel (hell), 3× = aus.</p>
    <div class="mchips">${Object.entries(MUSCLE_DE).map(([k, l]) => {
      const st = e.muscles && e.muscles.p.includes(k) ? 'mp' : e.muscles && e.muscles.s.includes(k) ? 'ms' : '';
      return `<button class="mchip ${st}" data-act="cycleMuscle" data-m="${k}">${l}</button>`;
    }).join('')}</div>
    <button class="btn small" style="margin-top:8px" data-act="imgDb">Muskeln automatisch aus Übungsdatenbank</button>
    <div id="dbsearch"></div>
    ${main ? `<div class="section-title">Alternativen (Umschalter im Training)</div>
      ${e.alts.length ? `<div class="list">${e.alts.map((a, k) => `<button class="row" data-act="editAlt" data-k="${k}">
        ${exThumb(a)}
        <div class="grow"><div class="title">${esc(a.name || 'Ohne Namen')}</div><div class="sub">${repTxt(a)} Wdh.${SEP}${kgTxt(a.weight)}</div></div>${ICON.chev}</button>`).join('')}</div>`
        : '<p class="sub" style="margin:0 4px 8px">z. B. Maschine statt Kurzhanteln – im Training kannst du dann umschalten.</p>'}
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
    e.rest = Math.max(0, Math.round(num($('#f-rest').value)));
  }
}
function fileToDataUrl(file, max = 900) {
  return new Promise((res, rej) => {
    const img = new Image();
    const u = URL.createObjectURL(file);
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      res(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Bildfehler')); };
    img.src = u;
  });
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
  for (const o of [e, ...e.alts]) {
    if (!o._pending) continue;
    const imgId = uid();
    await idb.set('img:' + imgId, o._pending);
    localImgs[imgId] = o._pending;
    o.image = { type: 'local', value: imgId };
    delete o._pending;
  }
  if (old && old.image && old.image.type === 'local' && (!e.image || e.image.value !== old.image.value)) {
    idb.del('img:' + old.image.value); delete localImgs[old.image.value];
  }
  if (old) Object.assign(old, e); else day.exercises.push(e);
  save(); closeSheet(); render();
  for (const o of [e, ...e.alts]) warmImage(o.image);
}

/* ----- Verlauf ----- */
function exerciseNames() {
  const names = new Set();
  for (const e of allExercises()) names.add(e.name);
  for (const l of S.logs) for (const e of l.entries) names.add(e.name);
  return [...names];
}
let chartName = null;
const ddmm = t => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
function renderLog() {
  setTop('Verlauf');
  let h = renderWeek() + renderHeat() + renderBody();
  if (!S.logs.length) return h + '<div class="empty"><b>Noch keine Trainings</b>Sobald du ein Training beendest, erscheint es hier.</div>';
  h += `<div class="list"><button class="row" data-act="openExList"><div class="grow"><div class="title">Verlauf pro Übung</div>
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
      <div class="sub">${pl(r.n, 'Training', 'Trainings')}${SEP}zuletzt ${relDay(r.last)}${b ? `${SEP}Bestwert ${kgTxt(b.weight)} × ${b.reps}` : ''}</div></div>${ICON.chev}</button>`;
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
      <div class="sub">${sets.map(x => `${fmtNum(x.weight)} kg × ${x.reps}`).join(', ')}</div></div>${ICON.chev}</button>`).join('')}</div>`;
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
function muscleCounts(from) {
  const cnt = {};
  for (const l of S.logs) {
    if (l.startedAt < from) continue;
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
    <label class="field"><span>Gewicht</span><div class="unit-wrap"><input class="input" id="bwe-kg" inputmode="decimal" value="${fmtNum(e.kg)}"><span>kg</span></div></label>
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
  return lineChart(pts) + `<p class="sub" style="margin:6px 0 0">Aktuell ${fmtNum(vs[vs.length - 1])} kg${SEP}Bestwert ${fmtNum(Math.max(...vs))} kg</p>`;
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
    <div class="section-title">Darstellung</div>
    <div class="card"><div class="seg" style="margin-top:0">${[['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([v, l]) =>
      `<button class="${(S.settings.theme || 'auto') === v ? 'on' : ''}" data-act="setTheme" data-v="${v}">${l}</button>`).join('')}</div>
      <p class="sub" style="margin:8px 4px 0">Automatisch folgt der Einstellung deines Handys.</p></div>
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
      <div class="dlg-btns"><button class="btn" data-dlg="0">${esc(cancel)}</button><button class="btn ${danger ? 'danger solid' : 'primary'}" data-dlg="1">${esc(ok)}</button></div></div>`;
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
  if (sheetOpen) { hideSheet(); return; }
  if (V.sub) { V.sub = (history.state && history.state.sub) || null; subDepth = Math.max(0, subDepth - 1); render(); scrollTo(0, 0); }
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
function withUndo(msg, change, cleanup) {
  if (undoPending) finishUndo();
  const snap = JSON.stringify(S);
  change();
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

/* ---------- Aktionen ---------- */
const actions = {
  goPlan() { V.tab = 'plan'; render(); },
  async start(el) {
    if (S.active && !await ask('Neues Training starten?', 'Es läuft schon ein Training. Es wird verworfen.', 'Neu starten', true)) return;
    startWorkout(el.dataset.id);
  },
  toggleSet(el) {
    const i = +el.dataset.i, j = +el.dataset.j;
    const en = S.active.entries[i], s = en.sets[j];
    s.done = !s.done;
    save(); rerenderEntry(i);
    if (!s.done) return;
    if (navigator.vibrate) navigator.vibrate(15);
    startRest(en.rest);
    // Rekord schon während des Trainings melden (einmal pro Übung)
    if (!en.prShown && isPR(s, bestSet(effId(en), en.name))) {
      en.prShown = true; save();
      toast(`Neuer Rekord: ${en.name} – ${kgTxt(s.weight)} × ${s.reps}`);
    }
    // Alle Sätze erledigt -> zur nächsten Übung scrollen
    if (en.sets.every(x => x.done)) {
      const next = $('#en-' + (i + 1));
      if (next) setTimeout(() => next.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    }
  },
  bump(el) { bumpEntry(+el.dataset.i, num(el.dataset.v)); },
  async bumpCustom(el) {
    const v = await askText('Um wie viel erhöhen?', { value: '2,5', inputmode: 'decimal', unit: 'kg', ok: 'Erhöhen' });
    if (v === null) return;
    const n = num(v);
    if (n <= 0) { toast('Bitte eine Zahl größer 0 eingeben'); return; }
    bumpEntry(+el.dataset.i, n);
  },
  addSet(el) {
    const i = +el.dataset.i, en = S.active.entries[i];
    const last = en.sets[en.sets.length - 1] || findEx(en.exId) || { weight: 0, reps: 10 };
    en.sets.push({ weight: last.weight, reps: last.reps, done: false });
    save(); rerenderEntry(i);
  },
  removeSet(el) {
    const i = +el.dataset.i, en = S.active.entries[i];
    en.sets.pop(); save(); rerenderEntry(i);
  },
  exInfo(el) { exInfo(+el.dataset.i); },
  finish() { finishSheet(); },
  exPrev() { if (S.active && S.active.pos > 0) goEx(S.active.pos - 1); },
  exNext() {
    const A = S.active; if (!A) return;
    if (A.pos >= A.order.length - 1) { finishSheet(); return; }
    goEx(A.pos + 1);
  },
  exGo(el) { goEx(+el.dataset.k); },
  exSkip() {
    const A = S.active; if (!A || A.pos >= A.order.length - 1) return;
    const [idx] = A.order.splice(A.pos, 1);
    A.order.push(idx);
    A.entries[idx].skipped = true;
    save(); render(); scrollTo(0, 0); slideIn(1);
    toast(`${A.entries[idx].name} kommt am Ende nochmal`);
  },
  finishSave() { finishWorkout($('#applyPlan').checked, $('#finishNote').value.trim()); },
  async cancelWorkout() {
    if (!await ask('Training verwerfen?', 'Die Sätze dieses Trainings werden nicht gespeichert.', 'Verwerfen', true)) return;
    S.active = null; stopRest(); save(); render();
  },
  closeSheet() { closeSheet(); },
  tAdd(el) { T.end += (+el.dataset.d) * 1000; if (T.end < Date.now()) T.end = Date.now(); tickRest(); },
  tStop() { stopRest(); },

  addDay() {
    const d = { id: uid(), name: 'Neuer Tag', weekdays: [], exercises: [] };
    S.plan.days.push(d); save(); openSub(d.id);
    setTimeout(() => { const f = $('[data-field="dayName"]'); if (f) { f.focus(); f.select(); } }, 50);
  },
  openDay(el) { openSub(el.dataset.id); },
  back() { history.back(); },
  moveDay(el) { move(S.plan.days, el.dataset.id, +el.dataset.d); save(); render(); },
  async deleteDay() {
    const d = findDay(V.sub);
    if (!d || !await ask(`„${d.name}“ löschen?`, 'Der Tag wird mit allen Übungen gelöscht. Der Verlauf bleibt erhalten.', 'Löschen', true)) return;
    withUndo(`„${d.name || 'Tag'}“ gelöscht`, () => { S.plan.days = S.plan.days.filter(x => x.id !== d.id); save(); });
    history.back();
  },
  newEx() { editExSheet(V.sub, null); },
  editEx(el) { editExSheet(V.sub, el.dataset.id); },
  moveEx(el) { move(findDay(V.sub).exercises, el.dataset.id, +el.dataset.d); save(); render(); },
  saveEx() { saveEx(); },
  deleteEx() {
    const day = findDay(D.dayId);
    const e = day.exercises.find(x => x.id === D.ex.id);
    const img = e && e.image && e.image.type === 'local' ? e.image.value : null;
    withUndo(`„${D.ex.name || 'Übung'}“ gelöscht`, () => {
      day.exercises = day.exercises.filter(x => x.id !== D.ex.id); save();
    }, img ? () => { idb.del('img:' + img); delete localImgs[img]; } : null);
    closeSheet(); render();
  },
  imgDb() { openDbSearch(); },
  imgWeb() {
    readDraftFields();
    const q = `${cur().name || D.ex.name || 'Übung'} fitundattraktiv`;
    window.open('https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q), '_blank');
  },
  imgRemove() { readDraftFields(); const c = cur(); c.image = null; delete c._pending; drawExSheet(); },
  pickSuggest(el) {
    const e = EXDB && EXDB.find(x => x.id === el.dataset.id);
    if (!e) return;
    readDraftFields();
    const c = cur();
    c.name = e.name; c.dbId = e.id; c.image = { type: 'db', value: e.images[0] }; delete c._pending;
    c.muscles = musclesFromDb(e) || c.muscles;
    drawExSheet();
    toast('Übernommen – Name kannst du noch anpassen');
  },
  pickOwn() {
    readDraftFields();
    const c = cur();
    c.dbId = null; c.image = null; delete c._pending;
    $('#sug').innerHTML = '';
    $('#f-name').blur();
    toast('Eigene Übung – Muskeln unten antippen');
  },
  pickDb(el) {
    const e = EXDB.find(x => x.id === el.dataset.id);
    if (!e) return;
    readDraftFields();
    const c = cur();
    c.dbId = e.id; c.image = { type: 'db', value: e.images[0] }; delete c._pending;
    if (!c.name) c.name = e.name;
    c.muscles = musclesFromDb(e);
    toast('Muskeln übernommen: ' + (e.name));
    drawExSheet();
  },
  cycleMuscle(el) {
    readDraftFields();
    const c = cur(), k = el.dataset.m;
    c.muscles = c.muscles || { p: [], s: [] };
    const { p, s } = c.muscles;
    if (p.includes(k)) { c.muscles.p = p.filter(x => x !== k); c.muscles.s = [...s, k]; }
    else if (s.includes(k)) c.muscles.s = s.filter(x => x !== k);
    else c.muscles.p = [...p, k];
    const top = $('#sheet').scrollTop; drawExSheet(); $('#sheet').scrollTop = top;
  },
  async editNote(el) {
    const i = +el.dataset.i, en = S.active.entries[i];
    const pe = findEx(effId(en));
    if (!pe) { toast('Übung ist nicht mehr im Plan'); return; }
    const t = await askText('Notiz', { text: pe.name, value: pe.note || '', placeholder: 'z. B. Sitz Stufe 5, Griff eng', multiline: true });
    if (t === null) return;
    pe.note = t.trim(); save(); rerenderEntry(i);
    toast(pe.note ? 'Notiz gespeichert' : 'Notiz gelöscht');
  },
  addAlt() {
    readDraftFields();
    const m = D.ex;
    m.alts.push({ id: uid(), name: '', repMin: m.repMin, repMax: m.repMax, reps: m.repMin, weight: 0, note: '', dbId: null, image: null });
    D.alt = m.alts.length - 1; drawExSheet(); $('#sheet').scrollTop = 0;
    setTimeout(() => { const f = $('#f-name'); if (f) f.focus(); }, 50);
  },
  editAlt(el) { readDraftFields(); D.alt = +el.dataset.k; drawExSheet(); $('#sheet').scrollTop = 0; },
  altDone() {
    readDraftFields();
    if (!cur().name) { toast('Bitte einen Namen für die Alternative eingeben'); return; }
    D.alt = null; drawExSheet();
  },
  async deleteAlt() {
    if (!await ask('Alternative löschen?', 'Ihr bisheriger Verlauf bleibt erhalten.', 'Löschen', true)) return;
    D.ex.alts.splice(D.alt, 1); D.alt = null; drawExSheet();
  },
  // Wechselt reihum zur nächsten Variante (Hauptübung → Alternative 1 → … → Hauptübung)
  switchVar(el) {
    const i = +el.dataset.i, en = S.active.entries[i];
    const base = findEx(en.exId);
    if (!base || !(base.alts || []).length) return;
    const ids = [base.id, ...base.alts.map(a => a.id)];
    const next = ids[(ids.indexOf(effId(en)) + 1) % ids.length];
    en.varId = next === base.id ? null : next;
    const v = findEx(next);
    en.name = v.name; en.image = v.image; en.bumped = false; en.prShown = false;
    for (const s of en.sets) if (!s.done) { s.weight = v.weight; s.reps = v.reps || v.repMin; }
    save(); rerenderEntry(i);
    toast('Gewechselt zu ' + v.name);
  },

  openLog(el) { openLog(el.dataset.id); },
  calDay(el) { calDaySheet(+el.dataset.t); },
  calMove(el) { calDaySheet(+el.dataset.t, 'move'); },
  calPick(el) { calDaySheet(+el.dataset.t, 'pick'); },
  calMoveTo(el) {
    const t = +el.dataset.t, to = +el.dataset.to, d = planOn(t).d;
    setPlan(t, null); setPlan(to, d);
    save(); closeSheet(); render();
    toast(`${findDay(d).name} → ${dateLabel(to)}`);
  },
  calSetDay(el) {
    const t = +el.dataset.t;
    setPlan(t, el.dataset.id, el.dataset.x === '1');
    save(); closeSheet(); render();
    toast(el.dataset.x === '1' ? 'Extra-Training eingeplant' : 'Training geändert');
  },
  async calOff(el) {
    const t = +el.dataset.t, d = planOn(t).d;
    if (!await ask('Training ausfallen lassen?', `${findDay(d).name} am ${dateLabel(t, true)} wird gestrichen und zählt nicht zum Wochenziel.`, 'Ausfallen lassen', true)) return;
    setPlan(t, null);
    save(); closeSheet(); render();
  },
  calReset(el) {
    const t = +el.dataset.t;
    if (S.cal) delete S.cal[t];
    save(); calDaySheet(t); render();
  },
  calStart(el) { closeSheet(); startWorkout(el.dataset.id); },
  toggleSick(el) {
    const t = +el.dataset.t;
    S.sick = S.sick || [];
    S.sick = S.sick.includes(t) ? S.sick.filter(x => x !== t) : [...S.sick, t];
    save(); closeSheet(); render();
  },
  openLogFromCal(el) { openLog(el.dataset.id); },
  addBw() {
    const kg = num($('#bw').value);
    if (kg < 20 || kg > 400) { toast('Bitte ein Gewicht in kg eingeben (z. B. 82,5)'); return; }
    const ti = $('#bw-qtime');
    const time = ti && !ti.dataset.auto ? ti.value || null : hhmm();
    addBodyEntry(time ? bwWhen(toIsoDate(Date.now()), time) : Date.now(), kg, time);
    save(); render(); toast(`${fmtKg(kg)} um ${time || hhmm()} Uhr eingetragen`);
  },
  openWeight() { V.tab = 'log'; openSub('weight'); },
  openExList() { openSub('ex'); },
  openEx(el) { openSub('ex:' + el.dataset.name); },
  setTheme(el) { S.settings.theme = el.dataset.v; save(); applyTheme(); render(); },
  toggleList(el) { V[el.dataset.k] = !V[el.dataset.k]; render(); },
  goTab(el) { selectTab(el.dataset.tab); },
  saveName() {
    const v = $('#name-in').value.trim();
    if (!v) { toast('Bitte einen Namen eingeben'); return; }
    S.settings.name = v.slice(0, 30); save(); render();
  },
  bwRange(el) { bwRange = el.dataset.r; render(); },
  bwAddDated() {
    const ti = $('#bw-time'), today = $('#bw-date').value === toIsoDate(Date.now());
    const kg = num($('#bw-kg').value), time = ti.dataset.auto && today ? hhmm() : ti.value || null, t = bwWhen($('#bw-date').value, time);
    if (kg < 20 || kg > 400) { toast('Bitte ein Gewicht in kg eingeben (z. B. 82,5)'); return; }
    if (!t || dayStart(t) > dayStart(Date.now())) { toast('Bitte ein gültiges Datum wählen'); return; }
    addBodyEntry(t, kg, time);
    save(); render(); toast(`${fmtKg(kg)} am ${ddmm(t)}${time ? ' um ' + time + ' Uhr' : ''} eingetragen`);
  },
  clearTime(el) { const i = $('#' + el.dataset.for); i.value = ''; el.hidden = true; },
  async bwGoal() {
    const v = await askText('Zielgewicht', { text: 'Wird als Linie im Diagramm angezeigt. Leer lassen = kein Ziel.', value: S.settings.goalKg ? fmtNum(S.settings.goalKg) : '', inputmode: 'decimal', unit: 'kg' });
    if (v === null) return;
    const n = num(v);
    if (v.trim() && (n < 20 || n > 400)) { toast('Bitte ein Gewicht in kg eingeben'); return; }
    S.settings.goalKg = v.trim() ? n : null;
    save(); render();
  },
  bwEdit(el) { bwEditSheet(+el.dataset.t); },
  bwSave(el) {
    const old = +el.dataset.t, kg = num($('#bwe-kg').value), time = $('#bwe-time').value || null;
    const prev = (S.body || []).find(p => p.t === old);
    const t = bwWhen($('#bwe-date').value, time, prev && !prev.time ? old : null);
    if (kg < 20 || kg > 400) { toast('Bitte ein Gewicht in kg eingeben'); return; }
    if (!t) { toast('Bitte ein gültiges Datum wählen'); return; }
    S.body = (S.body || []).filter(p => p.t !== old);
    addBodyEntry(t, kg, time);
    save(); closeSheet(); render(); toast('Eintrag gespeichert');
  },
  bwDel(el) {
    const t = +el.dataset.t;
    withUndo('Gewichtseintrag gelöscht', () => { S.body = (S.body || []).filter(p => p.t !== t); save(); });
    closeSheet(); render();
  },
  deleteLog(el) {
    withUndo('Training gelöscht', () => { S.logs = S.logs.filter(l => l.id !== el.dataset.id); save(); });
    closeSheet(); render();
  },
  async install() { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; render(); },
  driveBackup() { if (DRIVE_DIRECT) driveUpload(); else exportData('share'); },
  driveRestore() { driveRestore(); },
  fileBackup() { exportData('file'); },
  sharePlan() { exportPlan(); },
  sharePlanLink() { sharePlanLink(); },
  pastePlanLink() { pastePlanLink(); },
  heatRange(el) { V.heat = el.dataset.r; render(); },
  toggleWd(el) {
    const d = findDay(V.sub), i = +el.dataset.wd;
    if (!d) return;
    d.weekdays = d.weekdays || [];
    d.weekdays = d.weekdays.includes(i) ? d.weekdays.filter(x => x !== i) : [...d.weekdays, i].sort();
    save(); el.classList.toggle('on');
  },
  async wipe() {
    if (!await ask('Alle Daten löschen?', 'Plan, Verlauf und Einstellungen auf diesem Handy werden gelöscht. Das kann nicht rückgängig gemacht werden.', 'Alles löschen', true)) return;
    for (const k of await idb.keys()) await idb.del(k);
    location.reload();
  },
};
function move(arr, id, d) {
  const i = arr.findIndex(x => x.id === id), j = i + d;
  if (i < 0 || j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

/* ---------- Tab-Leiste mit verschiebbarer Auswahl-Pille ---------- */
const TAB_ORDER = ['home', 'train', 'plan', 'log', 'more'];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
function selectTab(t) {
  if (sheetOpen) closeSheet();
  if (V.sub) { V.sub = null; const n = subDepth || 1; subDepth = 0; history.go(-n); }
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

// Auf der Seite nach links/rechts wischen -> Nachbarbereich (Seite folgt leicht dem Finger)
let sw = null;
document.addEventListener('touchstart', e => {
  sw = null;
  if (e.touches.length !== 1 || sheetOpen || $('#dlg')) return;
  const t = e.touches[0];
  if (t.clientX < 24 || t.clientX > innerWidth - 24) return; // Rand frei lassen für die Zurück-Geste des Handys
  if (!e.target.closest('#view') || e.target.closest('input, textarea, select, .bwsvg, .chart svg, .no-swipe')) return;
  sw = { x0: t.clientX, y0: t.clientY, t0: Date.now(), dir: null, dx: 0 };
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!sw) return;
  const t = e.touches[0], dx = t.clientX - sw.x0, dy = t.clientY - sw.y0;
  if (!sw.dir && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) sw.dir = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'h' : 'v';
  if (sw.dir !== 'h') return;
  sw.dx = dx;
  const i = TAB_ORDER.indexOf(V.tab), next = TAB_ORDER[i + (dx < 0 ? 1 : -1)];
  const v = $('#view');
  v.getAnimations().forEach(x => x.cancel());
  v.style.transform = `translateX(${dx * (next ? 0.3 : 0.08)}px)`;
  v.style.opacity = next ? Math.max(0.4, 1 - Math.abs(dx) / 600) : 1;
}, { passive: true });
document.addEventListener('touchend', () => {
  const s = sw; sw = null;
  if (!s || s.dir !== 'h') return;
  const v = $('#view'), cur = v.style.transform;
  v.style.transform = ''; v.style.opacity = '';
  const i = TAB_ORDER.indexOf(V.tab), next = TAB_ORDER[i + (s.dx < 0 ? 1 : -1)];
  const fast = Math.abs(s.dx) / (Date.now() - s.t0) > 0.4;
  if (next && (Math.abs(s.dx) > 80 || (fast && Math.abs(s.dx) > 35))) { tabHandledAt = Date.now(); selectTab(next); return; }
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
  if (f === 'chartName') { chartName = e.target.value; render(); }
  else if (f === 'importFile' && e.target.files[0]) { importData(e.target.files[0]); e.target.value = ''; }
});
document.addEventListener('focusin', e => { if (e.target.matches('.set-row input')) setTimeout(() => e.target.select(), 0); });

/* ---------- Hell / Dunkel ---------- */
const darkMq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const t = S.settings.theme || 'auto', root = document.documentElement;
  if (t === 'auto') delete root.dataset.theme; else root.dataset.theme = t;
  try { if (t === 'auto') localStorage.removeItem('gym-theme'); else localStorage.setItem('gym-theme', t); } catch { /* egal */ }
  const dark = t === 'dark' || (t === 'auto' && darkMq.matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.content = dark ? '#000000' : '#f2f2f7'; });
}
darkMq.addEventListener('change', applyTheme);

/* ---------- Start ---------- */
(async function init() {
  let saved = null;
  try {
    saved = await idb.get('state');
    if (saved) S = Object.assign(S, saved, { settings: Object.assign({}, S.settings, saved.settings) });
    // Erststart: leerer Plan zum selbst Eintragen (bestehende Daten bleiben unverändert)
    await flush();
    for (const k of await idb.keys()) if (String(k).startsWith('img:')) localImgs[k.slice(4)] = await idb.get(k);
  } catch (e) { toast('Speicher nicht verfügbar: ' + e.message); }
  applyTheme();
  render();
  if (DRIVE_DIRECT) loadGis().catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  // Neuerungen einmal nach einem Update zeigen (nicht beim allerersten Start)
  if (saved && S.settings.seenVersion !== APP_VERSION) {
    openSheet(`<div class="sheet-head"><h2>Neu in Version ${APP_VERSION}</h2></div>
      <ul class="instr" style="color:var(--text);font-size:15px">${CHANGELOG.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
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
    const txt = await (await fetch('app.js', { cache: 'no-store' })).text();
    const m = txt.match(/APP_VERSION = '([^']+)'/);
    if (!m || m[1] === APP_VERSION) return;
  } catch { return; }
  const el = document.createElement('div');
  el.id = 'update'; el.className = 'glass';
  el.innerHTML = '<div class="grow"><b>Neue Version verfügbar</b><div class="sub">Deine Daten bleiben erhalten.</div></div><button class="btn primary small" id="updBtn">Neu laden</button>';
  document.body.appendChild(el);
  $('#updBtn').addEventListener('click', async () => { await flush(); location.reload(); });
}
