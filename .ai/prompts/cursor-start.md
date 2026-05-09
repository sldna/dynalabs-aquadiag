# Auftrag

Erstelle Version 1 von "AquaDiag", einem MVP für regelbasierte Aquarium-Diagnosen mit optionaler AI-Erklärung.

Arbeite strikt innerhalb des V1-Scopes.

## Ziel

Baue ein lauffähiges Monorepo mit:

- Go Backend
- Next.js Frontend
- SQLite Datenbank
- YAML-basierter Rule Engine
- optionalem AI-Service
- Docker Compose Setup
- minimaler, klarer UI

## V1 darf NICHT enthalten

- Auth
- Payments
- Sensorintegration
- Shelly
- ESP32
- Kubernetes
- PostgreSQL
- Fotoanalyse
- ML Training
- Community Features

## Architektur

Backend:
- Go
- REST API
- SQLite
- YAML-Regeln
- klare Trennung zwischen API, Models, DB, Rule Engine und AI Layer

Frontend:
- Next.js
- TypeScript
- Tailwind
- Mobile-first
- einfache Forms
- klare Diagnoseanzeige

## Wichtigstes Produktprinzip

Die App ist kein Aquarium-Logbuch, sondern ein Decision-Support-System.

Der Nutzer soll nach einer Eingabe sofort wissen:

1. Was ist wahrscheinlich los?
2. Wie kritisch ist es?
3. Was soll er jetzt tun?
4. Was soll er vermeiden?

## Erste Implementierungsschritte

1. Erstelle die Repo-Struktur.
2. Erstelle docker-compose.yml.
3. Erstelle Backend Skeleton mit /health.
4. Erstelle SQLite Migrationen.
5. Implementiere die Models.
6. Implementiere Rule Engine mit YAML-Datei.
7. Erstelle POST /v1/diagnose.
8. Erstelle Frontend mit Diagnose-Flow.
9. Erstelle Ergebnis-Screen.
10. Dokumentiere Start und Nutzung in README.md.

## Qualitätsanforderungen

- Kein Overengineering
- Kleine Dateien
- Lesbare Namen
- Fehler sauber behandeln
- Keine Mock-Fantasie im Produkttext
- Keine medizinischen oder veterinärmedizinischen Garantien
- AI darf nur erklären, nicht eigenständig Diagnoseentscheidungen treffen

Beginne mit der vollständigen Projektstruktur und implementiere danach Schritt für Schritt.
