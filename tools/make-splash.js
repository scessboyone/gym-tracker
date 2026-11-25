// Erzeugt die iPhone-Startbilder (apple-touch-startup-image) in icons/splash/ und gibt die <link>-Zeilen für index.html aus.
// Start: node <playwright-skill>/run.js tools/make-splash.js   (aus dem App-Ordner)
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'icons', 'splash');
// CSS-Breite × -Höhe × Pixeldichte (Hochformat)
const DEVICES = [
  [375, 667, 2],  // iPhone SE (2./3. Gen.), 8
  [414, 896, 2],  // iPhone 11, XR
  [375, 812, 3],  // iPhone 12/13 mini, X, XS, 11 Pro
  [414, 896, 3],  // iPhone XS Max, 11 Pro Max
  [390, 844, 3],  // iPhone 12, 13, 14, 12/13 Pro
  [428, 926, 3],  // iPhone 12/13 Pro Max, 14 Plus
  [393, 852, 3],  // iPhone 14 Pro, 15, 15 Pro, 16
  [430, 932, 3],  // iPhone 14/15 Pro Max, 15 Plus, 16 Plus
  [402, 874, 3],  // iPhone 16 Pro
  [440, 956, 3],  // iPhone 16 Pro Max
];
const THEMES = { light: '#f2f2f7', dark: '#000000' };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'icons', 'icon-512.png')).toString('base64');
  const browser = await chromium.launch({ headless: true });
  const links = [];
  try {
    for (const [w, h, dpr] of DEVICES) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
      for (const [theme, bg] of Object.entries(THEMES)) {
        await page.setContent(`<html><body style="margin:0;height:100vh;display:grid;place-items:center;background:${bg}">
          <img src="${icon}" style="width:112px;height:112px;border-radius:26px"></body></html>`);
        const file = `${w * dpr}x${h * dpr}-${theme}.png`;
        await page.screenshot({ path: path.join(OUT, file) });
        links.push(`  <link rel="apple-touch-startup-image" href="icons/splash/${file}" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait) and (prefers-color-scheme: ${theme})">`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(OUT, 'links.html'), links.join('\n') + '\n');
  console.log(`${links.length} Startbilder in icons/splash/, <link>-Zeilen in icons/splash/links.html`);
})();
