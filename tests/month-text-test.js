// Prüft die Vergleichstexte im Monatsrückblick an Sonderdaten (gefälschtes Datum)
const engine = require('playwright')[process.env.PW_ENGINE || 'chromium']; // PW_ENGINE=webkit: wie Safari auf dem iPhone
(async () => {
  const browser = await engine.launch({ headless: true });
  for (const [y, m, d] of [[2027, 2, 30], [2026, 4, 31], [2026, 10, 1], [2026, 10, 25]]) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block', locale: 'de-DE' });
    await ctx.addInitScript(`{ const RD = Date, off = new RD(${y}, ${m}, ${d}, 20).getTime() - RD.now();
      Date = class extends RD { constructor(...a) { a.length ? super(...a) : super(RD.now() + off); } static now() { return RD.now() + off; } }; }`);
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:8777/'); await page.locator('#view').waitFor();
    const out = await page.evaluate(async () => {
      const mk = (n, w, reps) => ({ name: n, sets: reps.map(r => ({ done: true, weight: w, reps: r })) });
      const now = Date.now(), cur = new Date(now), prevStart = new Date(cur.getFullYear(), cur.getMonth() - 1, 1, 18).getTime();
      S.logs = [
        { id: 'a', dayName: 'Push', startedAt: now - 36e5, endedAt: now - 30e5, prs: [], entries: [mk('Bankdrücken', 60, [10, 10, 10])] },
        { id: 'b', dayName: 'Push', startedAt: prevStart, endedAt: prevStart + 6e5, prs: [], entries: [mk('Bankdrücken', 62.5, [10, 9, 8])] },
      ];
      S.settings.since = prevStart;
      V.tab = 'log'; V.sub = 'month:' + monthKey(now); render();
      const vs = document.querySelector('.m-vs')?.innerText;
      const cmps = [...document.querySelectorAll('.m-cmp')].map(e => e.innerText);
      return { vs, cmps, s1: summarize(S.logs[0].entries[0].sets), s2: summarize(S.logs[1].entries[0].sets) };
    });
    console.log(`${d}.${m + 1}.${y}:`, JSON.stringify(out));
    await ctx.close();
  }
  await browser.close();
})();
