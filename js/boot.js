// Gym Tracker – läuft im <head>, noch bevor die Seite gezeichnet wird: Hell/Dunkel und Akzentfarbe sofort setzen
// (kein Aufblitzen), Farbe der Statusleiste anpassen. Eigene Datei statt Inline-Skript wegen der Content-Security-Policy.
(function () {
  var root = document.documentElement;
  try {
    var t = localStorage.getItem('gym-theme'); if (t) root.dataset.theme = t;
    var a = localStorage.getItem('gym-accent'); if (a) root.dataset.accent = a;
  } catch (e) { /* kein Speicher: Standardwerte */ }
  var dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#000000' : '#f2f2f7';
  // iPhone: im Dunkelmodus läuft die App bis unter die Uhrzeit (weiße Schrift), hell bleibt die normale Leiste
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').content = dark ? 'black-translucent' : 'default';
})();
