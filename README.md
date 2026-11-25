# Gym Tracker

Trainingsplan-App fürs Handy (PWA), live unter https://scessboyone.github.io/gym-tracker/

## Funktionen
- Home (Start-Tab): Begrüßung mit Namen, was heute ansteht (inkl. „Bereit zum Steigern“), Woche, Gewicht mit Schnell-Eintrag, letztes Training
- Training im Vollbild, eine Übung pro Seite (große Muskel-Grafik, wischen wechselt die Übung, Weiter/Zurück, Fortschrittsbalken, Übung überspringen → kommt am Ende nochmal), Sätze abhaken, Wiederholungen/Gewichte anpassen, Pausen-Timer, Auto-Scroll, Rekorde (PR)
- Progression: „Ziel geschafft – um wie viel erhöhen?“
- Alternativen pro Übung (⇄-Knopf), Notizen/Einstellungen pro Übung (✎ antippen)
- Muskelmodell statt Fotos (Haupt-/Hilfsmuskeln)
- Plan-Editor mit Live-Suche in der Übungsdatenbank, „Eigene Übung“ immer möglich
- Kalender: Trainings verschieben, tauschen, ausfallen lassen, Extra-Training, krank melden; Wochenziel + Serie
- Verlauf pro Übung (eigene Seite): alle Sätze, Bestwert, Kurve
- Monatsrückblick: Trainings, Zeit, kg, Rekorde, Fortschritte, Muskeln und Gewicht pro Monat, Vergleich zum Vormonat
- Jahresrückblick: ab 20. Dezember als Widget auf Home (bis 31.12.), danach dauerhaft unter Verlauf
- Training nachträglich bearbeiten (Verlauf → Training → Bearbeiten), Abschluss-Feier mit Wochenziel und Serie
- Mehr → „Erweiterte Informationen“: Speicherplatz, Schutz der Daten, Installation, Umfang der Daten
- Gewichtsverlauf: Diagramm (Zeitraum, 7-Tage-Schnitt, Ziel), Statistik, Uhrzeit wird automatisch eingetragen (änderbar)
- Design im Apple-Stil mit Hell-, Dunkel- und Automatik-Modus und wählbarer Akzentfarbe (Blau, Türkis, Indigo, Lila, Pink, Rot, Graphit; Mehr → Darstellung), Wochenring auf Home
- Erster Start: Willkommens-Karte mit Name, Hell/Dunkel und Akzentfarbe
- Eigene Dialoge im App-Design, Update-Hinweis nur mit den Neuerungen seit der letzten Version
- Kurze Erklärungen hinter einem i-Knopf im jeweiligen Bereich (Texte in `INFO` in `js/core.js`)
- iPhone: Safari → Teilen → „Zum Home-Bildschirm“ (Vollbild, eigenes Icon), Backup über „In Dateien sichern“ → iCloud Drive
- Die App startet leer; Plan als Link oder Datei teilen/übernehmen (Mehr → Plan), ersetzt nur den Plan
- Tab-Leiste mit verschiebbarer Pille, Wischen zwischen Bereichen, Slide-Animation
- Rückgängig nach dem Löschen; Muskel-Übersicht (Woche/4 Wochen) im Verlauf, Details „Am meisten“ und „Noch nicht dran“ auf eigener Seite „Muskel-Statistik“
- Rekorde und „Letzte Trainings“ zeigen die neuesten 3, „Alle anzeigen“ klappt auf

## Technik
- Reines HTML/CSS/JS ohne Build-Schritt, gehostet über GitHub Pages
- Daten nur auf dem Gerät (IndexedDB). Backup: Tab „Mehr“ → „In Drive sichern“ bzw. als Datei
- Offline-fähig über Service Worker (`sw.js`)
- Bei jeder Änderung `VERSION` in `sw.js` und `APP_VERSION` in `js/core.js` hochzählen
- Code in `js/`, als normale Skripte nacheinander geladen (Reihenfolge in `index.html`), alle teilen sich den globalen Bereich:

| Datei | Inhalt |
|---|---|
| `core.js` | Version, Änderungen, Hilfsfunktionen, Speicher (IndexedDB), App-Zustand |
| `muscles.js` | Muskel-Grafik, Übungsdatenbank |
| `home.js` | Rendern, Trainingsauswahl, Home, Kalender-Planung |
| `training.js` | Laufendes Training im Vollbild, Info zu einer Übung |
| `plan.js` | Trainingsplan, Übung bearbeiten |
| `history.js` | Verlauf, Monatsrückblick, Verlauf pro Übung, Woche, Muskeln, Rekorde |
| `weight.js` | Körpergewicht |
| `more.js` | Einstellungen, Backup, Google Drive, Plan teilen |
| `ui.js` | Pausen-Timer, Sheets, Dialoge, Toast |
| `actions.js` | Alle Aktionen (`data-act`) und Eingaben |
| `main.js` | Tab-Leiste, Wischen, Hell/Dunkel, Start |

- Neue Dateien in `js/` auch in `index.html` und in `FILES` in `sw.js` eintragen
- Vor jedem `git push` laufen alle Tests (`.githooks/pre-push`, einrichten mit `git config core.hooksPath .githooks`)
- Automatische Tests mit Playwright in `tests/` (alle auf einmal: `tests/run-all.js`, Chrome und WebKit, siehe `tests/README.md`)
- iPhone-Startbilder in `icons/splash/`, neu erzeugen mit `tools/make-splash.js`

## Quellen
- Übungsdaten: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense)
- Muskelmodell: react-body-highlighter (MIT), siehe `THIRD_PARTY.md`

## Offen
- Echter Ein-Tipp-Backup nach Google Drive (Google-Cloud-OAuth einrichten)
