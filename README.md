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
- Gewichtsverlauf: Diagramm (Zeitraum, 7-Tage-Schnitt, Ziel), Statistik, Uhrzeit wird automatisch eingetragen (änderbar)
- Design im Apple-Stil mit Hell-, Dunkel- und Automatik-Modus (Mehr → Darstellung), blauer Akzent, Wochenring auf Home
- Eigene Dialoge im App-Design, Update-Hinweis mit Änderungen
- iPhone: Safari → Teilen → „Zum Home-Bildschirm“ (Vollbild, eigenes Icon), Backup über „In Dateien sichern“ → iCloud Drive
- Die App startet leer; Plan als Link oder Datei teilen/übernehmen (Mehr → Plan), ersetzt nur den Plan
- Tab-Leiste mit verschiebbarer Pille, Wischen zwischen Bereichen, Slide-Animation
- Rückgängig nach dem Löschen; Muskel-Übersicht (Woche/4 Wochen) im Verlauf
- Rekorde und „Letzte Trainings“ zeigen die neuesten 3, „Alle anzeigen“ klappt auf

## Technik
- Reines HTML/CSS/JS ohne Build-Schritt, gehostet über GitHub Pages
- Daten nur auf dem Gerät (IndexedDB). Backup: Tab „Mehr“ → „In Drive sichern“ bzw. als Datei
- Offline-fähig über Service Worker (`sw.js`)
- Bei jeder Änderung `VERSION` in `sw.js` und `APP_VERSION` in `app.js` hochzählen

## Quellen
- Übungsdaten: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense)
- Muskelmodell: react-body-highlighter (MIT), siehe `THIRD_PARTY.md`

## Offen
- Echter Ein-Tipp-Backup nach Google Drive (Google-Cloud-OAuth einrichten)
