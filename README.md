# Gym Tracker

Trainingsplan-App fürs Handy (PWA), live unter https://scessboyone.github.io/gym-tracker/ – **Version 1.1.0** (25.11.2026)

## Funktionen
- Home (Start-Tab): Begrüßung mit Namen, was heute ansteht (inkl. „Bereit zum Steigern“), Woche, Gewicht mit Schnell-Eintrag, letztes Training
- Training im Vollbild, eine Übung pro Seite (große Muskel-Grafik, wischen wechselt die Übung, Weiter/Zurück, Fortschrittsbalken, Übung überspringen → kommt am Ende nochmal), Sätze abhaken, Wiederholungen/Gewichte anpassen, Pausen-Timer, Auto-Scroll, Rekorde (PR)
- Progression: „Ziel geschafft – um wie viel erhöhen?“
- Pause: eine allgemeine Pause (Mehr → Training) gilt für alle Übungen, eigene Pause pro Übung nur bei Bedarf; Timer zwischen den Übungen abschaltbar; Android: Pause als Benachrichtigung, wenn man die App verlässt
- Training minimiert: Leiste über der Tab-Leiste mit Pause/Trainingszeit, antippen = zurück ins Training
- Übung auslassen (z. B. Maschine kaputt) mit Grund, steht danach im Verlauf
- Training nachtragen (Kalender-Tag oder Verlauf → „Training nachtragen“), Uhrzeit und Dauer änderbar
- Übungsanleitungen auf Deutsch (`data/anleitung-de.json`, übersetzt aus free-exercise-db)
- Fenster (Sheets) am Strich oben nach unten wegziehen
- Alternativen pro Übung (⇄-Knopf), Notizen/Einstellungen pro Übung (✎ antippen)
- Muskelmodell statt Fotos (Haupt-/Hilfsmuskeln)
- Plan-Editor mit Live-Suche in der Übungsdatenbank, „Eigene Übung“ immer möglich
- Kalender: Trainings verschieben (auch per Gedrückthalten und Ziehen), tauschen, ausfallen lassen, Extra-Training, krank melden; Wochenziel + Serie
- Verlauf pro Übung (eigene Seite): alle Sätze, Bestwert, Kurve
- Monatsrückblick: Trainings, Zeit, kg, Rekorde, Fortschritte, Muskeln und Gewicht pro Monat, Vergleich zum Vormonat
- Jahresrückblick: ab 20. Dezember als Widget auf Home (bis 31.12.), danach dauerhaft unter Verlauf
- Training nachträglich bearbeiten (Verlauf → Training → Bearbeiten), Abschluss-Feier mit Wochenziel und Serie
- Mehr → „Erweiterte Informationen“: Speicherplatz, Schutz der Daten, Installation, Umfang der Daten
- Gewichtsverlauf: Diagramm (Zeitraum, 7-Tage-Schnitt, Ziel), Statistik, Uhrzeit wird automatisch eingetragen (änderbar)
- Design im Apple-Stil mit Hell-, Dunkel- und Automatik-Modus und wählbarer Akzentfarbe (Blau, Türkis, Indigo, Lila, Pink, Rot, Graphit; Mehr → Darstellung), Wochenring auf Home
- Erster Start: Willkommens-Karte mit Name, Hell/Dunkel, Akzentfarbe und Pause zwischen den Sätzen
- Eigene Dialoge im App-Design, Update-Hinweis nur mit den Neuerungen seit der letzten Version
- Kurze Erklärungen hinter einem i-Knopf im jeweiligen Bereich (Texte in `INFO` in `js/core.js`)
- iPhone: Safari → Teilen → „Zum Home-Bildschirm“ (Vollbild, eigenes Icon), Backup über „In Dateien sichern“ → iCloud Drive
- Die App startet leer; Plan als Link oder Datei teilen/übernehmen (Mehr → Plan), ersetzt nur den Plan
- Tab-Leiste mit verschiebbarer Pille, Wischen zwischen Bereichen, Slide-Animation
- Rückgängig nach dem Löschen; Muskel-Übersicht (Woche/4 Wochen) im Verlauf, Details „Am meisten“ und „Noch nicht dran“ auf eigener Seite „Muskel-Statistik“
- Rekorde und „Letzte Trainings“ zeigen die neuesten 3, „Alle anzeigen“ klappt auf

## Technik
- Reines HTML/CSS/JS ohne Build-Schritt, gehostet über GitHub Pages
- Daten nur auf dem Gerät (IndexedDB). Backup: Mehr → „In Google Drive sichern“ (Android/PC, ein Tipp, nur Recht `drive.file`), iPhone über „In Dateien sichern“ (iCloud), oder als Datei
- Offline-fähig über Service Worker (`sw.js`)
- Content-Security-Policy im `<head>` von `index.html`: Skripte nur von der App und von Googles Anmeldung (`accounts.google.com/gsi/`); keine Inline-Skripte (Hell/Dunkel vor dem Zeichnen: `js/boot.js`). Neue externe Quellen dort eintragen
- Bei jeder Änderung `VERSION` in `sw.js` und `APP_VERSION` in `js/core.js` hochzählen
- Beim Laden (Start, Backup, Plan-Link/-Datei) prüft `cleanState`/`cleanPlan` in `js/more.js` alle Daten; neue Datenfelder dort ergänzen
- Code in `js/`, als normale Skripte nacheinander geladen (Reihenfolge in `index.html`), alle teilen sich den globalen Bereich:

| Datei | Inhalt |
|---|---|
| `boot.js` | Läuft im `<head>`: Hell/Dunkel, Akzentfarbe, Statusleiste vor dem ersten Zeichnen |
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

## Versionen
- **1.1.0** (25.11.2026, nach dem ersten echten Gym-Training): allgemeine Pause gilt für alle Übungen (eigene Pause pro Übung optional, Plan-Links bringen keine Pausen mit), Timer zwischen den Übungen abschaltbar, Android-Benachrichtigung mit runterlaufendem Pausen-Timer, Leiste im minimierten Training, Übung auslassen mit Grund, Training nachtragen, Kalendertag gedrückt halten und ziehen, Fenster am Strich wegziehen, alle 876 Übungsanleitungen auf Deutsch. Git-Tag `v1.1.0`
- **1.0.1**: Backup-Anleitung hinter dem i-Knopf (iPhone/Android)
- **1.0.0** (25.11.2026): produktiv mit Google-Drive-Backup. Git-Tag `v1.0.0`
- Ältere Versionen: Änderungsliste `CHANGELOG` in `js/core.js`

## Quellen
- Übungsdaten: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense); deutsche Anleitungen in `data/anleitung-de.json` daraus übersetzt
- Muskelmodell: react-body-highlighter (MIT), siehe `THIRD_PARTY.md`

## Ideen für später
- Freiwilliges Backup-Passwort (Backups verschlüsselt, AES-256)
- Aufwärmsätze, Schwierigkeit pro Satz, Stillstand-Hinweis, freies Training ohne Plan, Körpermaße
