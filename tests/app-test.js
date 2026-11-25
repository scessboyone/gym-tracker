// Durchklick-Test der Gym-Tracker-App in Handybreite, hell und dunkel
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');

const URL = process.env.TARGET_URL || 'http://127.0.0.1:8777/';
const OUT = process.env.PW_ARTIFACT_DIR || path.join(os.tmpdir(), 'gym-pw');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const ok = (scheme, name, pass, info = '') => { results.push({ scheme, name, pass, info }); console.log(`${pass ? 'OK  ' : 'FAIL'} [${scheme}] ${name}${info ? ' – ' + info : ''}`); };

async function run(browser, scheme) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, colorScheme: scheme, isMobile: true, hasTouch: true, locale: 'de-DE', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/exercises\.json|favicon|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async n => page.screenshot({ path: path.join(OUT, `${scheme}-${n}.png`) });
  const act = (a, extra = '') => page.locator(`#view [data-act="${a}"]${extra}, #topbar [data-act="${a}"]${extra}`).first();
  const overflow = async where => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(scheme, `kein seitliches Scrollen: ${where}`, w <= 1, w > 1 ? `${w}px zu breit` : '');
  };
  const settle = () => page.waitForTimeout(450); // Animationen (Slide, Sheet)

  await page.goto(URL);
  await page.locator('#view').waitFor();
  await settle();
  // Update-Hinweis / Willkommensdialog wegklicken, falls vorhanden
  for (let k = 0; k < 2; k++) { const b = page.locator('.dlg-card button.primary, .dlg-card button').first(); if (await b.isVisible().catch(() => false)) { await b.click(); await settle(); } }

  // 1. Start: leerer Zustand
  ok(scheme, 'Home: Hinweis „Noch kein Trainingsplan“', await page.getByText('Noch kein Trainingsplan').isVisible());
  await page.locator('#name-in').fill('Test');
  await act('saveName').click(); await settle();
  ok(scheme, 'Home: Begrüßung mit Namen', await page.getByRole('heading', { name: 'Hallo, Test' }).isVisible());
  await overflow('Home leer'); await shot('01-home-leer');

  // 2. Plan anlegen: Tag „Push“ für heute, zwei Übungen
  await page.locator('#tabs [data-tab="plan"]').click(); await settle();
  await act('addDay').click(); await settle();
  const dn = page.locator('[data-field="dayName"]');
  await dn.fill('Push'); await dn.dispatchEvent('change');
  const wd = (new Date().getDay() + 6) % 7;
  await page.locator(`[data-act="toggleWd"][data-wd="${wd}"]`).click(); await settle();
  for (const [name, kg] of [['Bankdrücken', '60'], ['Rudern', '50']]) {
    await act('newEx').click(); await settle();
    await page.locator('#f-name').fill(name);
    await page.locator('#f-weight').fill(kg);
    await page.locator('#f-sets').fill('3');
    await page.locator('#sheet [data-act="saveEx"]').click(); await settle();
  }
  ok(scheme, 'Plan: zwei Übungen angelegt', await page.locator('#view [data-act="editEx"]').count() === 2);
  await overflow('Tag-Editor'); await shot('02-plan-tag');
  await page.locator('#topbar [data-act="back"]').click(); await settle();
  ok(scheme, 'Plan: Tag „Push“ in der Liste', await page.locator('#view').getByText('Push').first().isVisible());

  // 3. Training: Vollbild, Sätze abhaken, weiter, beenden
  await page.locator('#tabs [data-tab="home"]').click(); await settle();
  await page.locator('#view [data-act="start"]').first().click(); await settle();
  ok(scheme, 'Training: Vollbild (Tab-Leiste weg)', await page.evaluate(() => document.body.classList.contains('focus')) && !(await page.locator('#tabs').isVisible()));
  ok(scheme, 'Training: erste Übung Bankdrücken', await page.locator('.ex-focus .ex-name').innerText() === 'Bankdrücken');
  await overflow('Training'); await shot('03-training');
  const checks = page.locator('.ex-focus [data-act="toggleSet"]');
  for (let k = 0; k < await checks.count(); k++) { await checks.nth(k).click(); await page.waitForTimeout(150); }
  ok(scheme, 'Training: Pause-Timer läuft nach dem Abhaken', await page.locator('#timer').isVisible().catch(() => false));
  await shot('04-training-abgehakt');
  await page.locator('[data-act="exNext"]').click(); await settle();
  ok(scheme, 'Training: Weiter → Rudern', await page.locator('.ex-focus .ex-name').innerText() === 'Rudern');
  await page.locator('[data-act="exPrev"]').click(); await settle();
  ok(scheme, 'Training: Zurück → Bankdrücken', await page.locator('.ex-focus .ex-name').innerText() === 'Bankdrücken');
  await page.locator('[data-act="exNext"]').click(); await settle();
  await page.locator('.ex-focus [data-act="toggleSet"]').first().click();
  // Minimieren und zurück
  await page.locator('[data-act="minimize"]').click(); await settle();
  ok(scheme, 'Training: Minimieren zeigt Tab-Leiste', await page.locator('#tabs').isVisible());
  await page.getByRole('button', { name: 'Weiter trainieren' }).click(); await settle();
  ok(scheme, 'Training: „Weiter trainieren“ zurück im Vollbild', await page.evaluate(() => document.body.classList.contains('focus')));
  await page.locator('[data-act="exNext"]').click(); await settle(); // letzte Übung → Beenden-Fenster
  ok(scheme, 'Training: Beenden-Fenster offen', await page.locator('#sheet [data-act="finishSave"]').isVisible());
  await shot('05-beenden');
  await page.locator('#sheet [data-act="finishSave"]').click(); await settle();
  for (let k = 0; k < 2; k++) { const b = page.locator('#sheet [data-act="closeSheet"]'); if (await b.isVisible().catch(() => false)) { await b.click(); await settle(); } }
  ok(scheme, 'Training: gespeichert, kein aktives Training', await page.evaluate(() => !S.active && S.logs.length === 1));

  // 4. Verlauf, Monatsrückblick, Verlauf pro Übung
  await page.locator('#tabs [data-tab="log"]').click(); await settle();
  ok(scheme, 'Verlauf: Training in „Letzte Trainings“', await page.locator('#view [data-act="openLog"]').count() >= 1);
  await overflow('Verlauf'); await shot('06-verlauf');
  await act('openMonth').click(); await settle();
  ok(scheme, 'Monatsrückblick: 1 Training', (await page.locator('.m-stats .big').first().innerText()).trim() === '1');
  ok(scheme, 'Monatsrückblick: Einzahl „1 Training“', /^Training,/.test((await page.locator('.m-stats .sub').first().innerText()).trim()));
  await overflow('Monatsrückblick'); await shot('07-monat');
  await page.locator('#topbar [data-act="back"]').click(); await settle();
  ok(scheme, 'Monatsrückblick: Zurück zum Verlauf', await page.evaluate(() => V.tab === 'log' && !V.sub));
  await act('openExList').click(); await settle();
  await page.locator('#view [data-act="openEx"]').filter({ hasText: 'Bankdrücken' }).click(); await settle();
  ok(scheme, 'Übungsverlauf: Bestwert 60 kg', (await page.locator('.ex-stats').innerText()).includes('60'));
  await overflow('Übungsverlauf'); await shot('08-uebung');

  // 5. Gewicht eintragen (Home)
  await page.locator('#tabs [data-tab="home"]').click(); await settle();
  await page.locator('#bw').fill('80,4');
  await act('addBw').click(); await settle();
  ok(scheme, 'Gewicht: Eintrag gespeichert', await page.evaluate(() => (S.body || []).some(p => p.kg === 80.4)));
  await overflow('Home mit Training'); await shot('09-home');

  // 6. Mehr
  await page.locator('#tabs [data-tab="more"]').click(); await settle();
  await overflow('Mehr'); await shot('10-mehr');

  // 7. Neu laden: Daten bleiben
  await page.waitForTimeout(800);
  await page.reload(); await page.locator('#view').waitFor(); await settle();
  ok(scheme, 'Neu laden: Training und Gewicht noch da', await page.evaluate(() => S.logs.length === 1 && (S.body || []).length === 1));

  ok(scheme, 'keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const scheme of ['light', 'dark']) {
      try { await run(browser, scheme); } catch (e) { ok(scheme, 'Testlauf abgebrochen', false, e.message.split('\n')[0]); }
    }
  } finally { await browser.close(); }
  const fail = results.filter(r => !r.pass);
  console.log(`\n${results.length - fail.length} von ${results.length} Prüfungen bestanden. Screenshots: ${OUT}`);
})();
