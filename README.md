# Gym Tracker

Trainingsplan-App fürs Handy (PWA), live unter https://scessboyone.github.io/gym-tracker/

## Funktionen
- Training: Sätze abhaken, Wiederholungen/Gewichte anpassen, Pausen-Timer, Auto-Scroll, Rekorde (PR)
- Progression: „Ziel geschafft – um wie viel erhöhen?“
- Alternativen pro Übung (⇄-Knopf), Notizen/Einstellungen pro Übung (✎ antippen)
- Muskelmodell statt Fotos (Haupt-/Hilfsmuskeln)
- Plan-Editor mit Live-Suche in der Übungsdatenbank, „Eigene Übung“ immer möglich
- Kalender: Trainings verschieben, tauschen, ausfallen lassen, Extra-Training, krank melden; Wochenziel + Serie
- Gewichtsverlauf: Diagramm (Zeitraum, 7-Tage-Schnitt, Ziel), Statistik, Einträge mit optionaler Uhrzeit
- Eigene Dialoge im App-Design, Update-Hinweis mit Änderungen
- iPhone: Safari → Teilen → „Zum Home-Bildschirm“ (Vollbild, eigenes Icon), Backup über „In Dateien sichern“ → iCloud Drive
- Die App startet leer; Plan teilen/laden als Datei (Mehr → Plan), ersetzt nur den Plan

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
