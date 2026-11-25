'use strict';
// Gym Tracker – Muskel-Grafik und Übungsdatenbank.
// Alle Dateien in js/ teilen sich den globalen Bereich; Reihenfolge siehe index.html.

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
