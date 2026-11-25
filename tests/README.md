# Tests (Playwright)

Laufen gegen eine lokale Kopie der App in Handybreite (412 × 915), hell und dunkel.
Brauchen Node und Playwright (z. B. über den Claude-Skill `playwright-skill`).

**Alles auf einmal** (startet selbst einen Server, erst Chrome wie am Pixel, dann WebKit wie Safari am iPhone):
`node <playwright-skill>/run.js tests/run-all.js` (nur ein Browser: `RUN_ENGINES=webkit`)

Einzelner Test: im App-Ordner `python -m http.server 8777 --bind 127.0.0.1` starten, dann
`node <playwright-skill>/run.js tests/app-test.js` (Safari-Engine: `PW_ENGINE=webkit` davor).
WebKit einmalig installieren: im Skill-Ordner `npx playwright install webkit`.

| Datei | Was |
|---|---|
| `app-test.js` | Klickt alles durch: Plan anlegen, Training, Verlauf, Monatsrückblick, Gewicht, Neu laden (58 Prüfungen) |
| `month-text-test.js` | Vergleichstexte im Monatsrückblick an Sonderdaten (30.3., 31.5., Monatserster) |
| `swipe-test.js` | Wischen zwischen allen Bereichen mit echten Touch-Gesten, mitten im Inhalt und im leeren Bereich unten |
| `info-test.js` | Jeder i-Knopf öffnet seine Erklärung und schließt sauber, hell und dunkel |
| `muscles-test.js` | Muskel-Statistik: Übungen ohne erledigten Satz zählen nicht, „Am meisten“ nur über 0 |
| `topbar-test.js` | Kopfzeile beim Scrollen: Home ohne Leiste, Titel scrollt weg, nur die Knopfzeile bleibt stehen |
| `review-test.js` | Die 11 Fehler aus dem Code-Review vom 25.11. gezielt nachgestellt (leerer Tag, Plan-Link-Schutz, Rückgängig …) |
| `accent-test.js` | Erster Start (Willkommens-Karte), Akzentfarbe wählen und behalten, heutiger Tag in der Akzentfarbe |
| `features-test.js` | Pause beim ersten Start, Wochenziel in der Feier, Jahresrückblick (gefälschtes Datum), Training bearbeiten, Erweiterte Informationen |
| `security-test.js` | Präparierte Backup-Datei führt nichts aus; normale Daten bleiben beim Bereinigen unverändert |
| `csp-test.js` | Content-Security-Policy: keine Verstöße bei normaler Nutzung, eingeschleuster Code blockiert, Google-Anmeldeskript und Übungsdatenbank laden |
| `offline-test.js` | Service Worker installiert sich, alle App-Dateien liegen im Cache, App startet offline |
| `run-all.js` | Startet den Server und alle Tests in Chrome und WebKit, mit Zusammenfassung |
| `screenshots.js` | Screenshots der Trainings-, Monats- und Übungsseiten mit Beispieldaten (Ordner per `PW_ARTIFACT_DIR`) |

**Vor jedem Hochladen:** Der Git-Hook `.githooks/pre-push` startet `run-all.js` bei jedem `git push` und bricht ab, wenn ein Test fehlschlägt.
Einmal pro Rechner einrichten: `git config core.hooksPath .githooks`
