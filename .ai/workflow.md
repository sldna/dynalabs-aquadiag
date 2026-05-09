# AquaDiag V1 Workflow

## Grundregel

Arbeite immer phasenweise. Implementiere nie mehrere große Phasen gleichzeitig.

Nach jeder Phase:
1. Code formatieren
2. Tests ausführen
3. Docker Compose prüfen
4. README/API-Doku aktualisieren
5. Kurz zusammenfassen:
   - Was wurde geändert?
   - Welche Dateien wurden geändert?
   - Wie wurde getestet?
   - Was ist der nächste sinnvolle Schritt?

## Aktueller Stand

Phase 1 ist abgeschlossen:
- Projektstruktur
- Backend läuft
- Frontend läuft
- Docker Compose läuft

Phase 2 ist abgeschlossen:
- YAML-basierte Rule Engine
- Multi-Diagnose-Support
- Confidence Ranking
- stabile V1-Regelbasis
- /v1/diagnose funktioniert

## Nächste Phase: Phase 3b — Benutzbarer MVP vor AI

Ziel:
Becken und Messwerte müssen verwaltbar sein, bevor AI integriert wird.

## Phase 3b Scope

Erlaubt:
- Becken bearbeiten
- Becken löschen
- Becken-Detailseite
- Messwert-Historie pro Becken
- Messwerte löschen
- Diagnose-Detailansicht, falls Daten bereits vorhanden
- strukturierte Fehler
- Delete-Confirmations
- leere Zustände
- README/API-Doku aktualisieren

Nicht erlaubt:
- AI
- Charts
- Sensorik
- Shelly
- ESP32
- Kubernetes
- PostgreSQL-Pflicht
- Auth
- Payments
- Export
- Community Features
- Änderung an aquarium-rules.yaml

## Phase 3b Backend Aufgaben

Implementiere oder prüfe:

### Tanks

- GET /v1/tanks
- GET /v1/tanks/{id}
- POST /v1/tanks
- PUT /v1/tanks/{id}
- DELETE /v1/tanks/{id}

### Water Tests

- GET /v1/tanks/{id}/water-tests
- GET /v1/water-tests/{id}
- DELETE /v1/water-tests/{id}

### Delete-Verhalten

- DELETE /v1/tanks/{id} löscht zugehörige water_tests und diagnosis_results.
- DELETE /v1/water-tests/{id} löscht zugehörige diagnosis_results.

Nutze dafür entweder:
- Foreign Keys mit ON DELETE CASCADE
oder
- explizite Transaktionen.

Wichtig:
- Keine verwaisten diagnosis_results.
- Keine verwaisten water_tests.

## Phase 3b Frontend Aufgaben

Implementiere:

### Dashboard

- Liste aller Becken
- Beckenname
- Liter
- letzte Messung, falls vorhanden
- letzter Diagnose-Status, falls vorhanden
- Button: Details
- Button: Neue Analyse

### Tank Detail Page

Route:
- /tanks/[id]

Zeigt:
- Beckeninformationen
- Bearbeiten
- Löschen
- Neue Analyse
- Messwert-Historie

### Edit Tank

Felder:
- name
- volume_liters
- notes, falls im Datenmodell vorhanden

### Delete Tank

- Bestätigungsdialog
- Hinweis, dass Messwerte und Diagnosen mit gelöscht werden
- Danach zurück zum Dashboard

### Water Test History

Auf der Tank-Detailseite:

- Messwerte newest first
- Datum
- vorhandene Werte
- Symptome
- Link/Details zur Diagnose, falls vorhanden
- Löschen-Button

### Delete Water Test

- Bestätigungsdialog
- löscht zugehörige Diagnoseergebnisse
- Liste aktualisieren

## UX Regeln

- Mobile-first
- Kein Tabellen-Dashboard
- Karten statt dichte Tabellen
- Leere Zustände sauber anzeigen
- Fehler verständlich anzeigen
- Keine wissenschaftliche Überladung
- Primäre Aktion sichtbar halten

## Testing Anforderungen

Backend:
- Tank erstellen
- Tank bearbeiten
- Tank löschen
- Water Tests pro Tank listen
- Water Test löschen
- Cascade Delete für Tank
- Cascade Delete für Water Test

Frontend:
- Dashboard zeigt Tanks
- Tank Detail lädt korrekt
- Empty State für Messwerte
- Delete Confirmation erscheint
- Fehlerzustand wird angezeigt

## Definition of Done Phase 3b

Phase 3b ist fertig, wenn:

1. Becken vollständig verwaltbar sind.
2. Messwerte pro Becken angezeigt werden.
3. Messwerte gelöscht werden können.
4. Löschen keine verwaisten Daten erzeugt.
5. UI hat Loading-, Empty- und Error-States.
6. Docker Compose startet weiterhin vollständig.
7. Tests laufen.
8. README/API-Doku ist aktualisiert.

## Danach

Erst nach Phase 3b darf Phase 4 beginnen.

Phase 4:
AI-Erklärungsschicht.

AI darf nur:
- erklären
- zusammenfassen
- Nachfragen formulieren
- Unsicherheit verständlich machen

AI darf nicht:
- Diagnose entscheiden
- Rule Engine überschreiben
- Confidence verändern
- Maßnahmen frei erfinden