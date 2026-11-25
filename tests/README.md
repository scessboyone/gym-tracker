# Tests (Playwright)

Laufen gegen eine lokale Kopie der App in Handybreite (412 × 915), hell und dunkel.
Brauchen Node und Playwright (z. B. über den Claude-Skill `playwright-skill`).

1. Im App-Ordner einen Server starten: `python -m http.server 8777 --bind 127.0.0.1`
2. Test starten: `node <playwright-skill>/run.js tests/app-test.js`

| Datei | Was |
|---|---|
| `app-test.js` | Klickt alles durch: Plan anlegen, Training, Verlauf, Monatsrückblick, Gewicht, Neu laden (58 Prüfungen) |
| `month-text-test.js` | Vergleichstexte im Monatsrückblick an Sonderdaten (30.3., 31.5., Monatserster) |
| `offline-test.js` | Service Worker installiert sich, alle App-Dateien liegen im Cache, App startet offline |
| `screenshots.js` | Screenshots der Trainings-, Monats- und Übungsseiten mit Beispieldaten (Ordner per `PW_ARTIFACT_DIR`) |
