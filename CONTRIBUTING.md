# Contributing to AquaDiag

Vielen Dank, dass du AquaDiag verbessern möchtest. Dieses Dokument beschreibt
den schnellsten Weg von „Repo geklont“ zu „Pull Request offen“.

> AquaDiag ist ein **deterministischer Aquarium-Diagnose-MVP**. Die YAML-Regel-
> Engine ist die einzige Quelle der Wahrheit; die optionale AI ist
> ausschließlich **Erklärungsschicht**. Diese Trennung ist nicht verhandelbar
> und prägt jeden Beitrag (siehe „AI Guardrails“ unten).

---

## 1. Setup

Voraussetzungen:

- Docker oder Podman mit Compose-Plugin
- Optional für lokale Entwicklung ohne Docker: Go ≥ 1.25 und Node.js ≥ 22

```bash
git clone https://github.com/sldna/dynalabs-aquadiag.git
cd dynalabs-aquadiag
cp .env.example .env
make up                # oder: docker compose up --build
```

- Frontend:  http://localhost:3000
- Backend:   http://localhost:8080/health
- Tests:     `make test`
- Linting:   `make lint`
- Hilfe:     `make help`

---

## 2. Branch-Workflow

Kein direkter Commit auf `main` / `master` / `develop`.

Jede Änderung läuft über einen eigenen Branch:

```bash
git checkout main
git pull
git checkout -b feature/<kurzer-name>
```

Branch-Namen:

| Präfix       | Wann                                      |
|--------------|-------------------------------------------|
| `feature/`   | neue Funktion                             |
| `fix/`       | Bugfix                                    |
| `refactor/`  | strukturelle Änderung ohne Verhaltensänderung |
| `docs/`      | nur Dokumentation                         |
| `chore/`     | Toolchain, CI, Build, Cleanup             |

Beispiele:

- `feature/tank-notes-export`
- `fix/diagnosis-empty-symptoms`
- `refactor/rule-evaluator-split`
- `docs/api-examples`

---

## 3. Commit-Konventionen

AquaDiag verwendet
[Conventional Commits](https://www.conventionalcommits.org/de/v1.0.0/).

Format:

```
<type>(<scope>): <kurze beschreibung im imperativ>
```

Gängige `type`-Werte:

- `feat`     – neue Funktion
- `fix`      – Bugfix
- `refactor` – Code-Strukturänderung ohne Verhaltensänderung
- `docs`     – nur Dokumentation
- `chore`    – Build, Tooling, CI, Abhängigkeiten
- `test`     – Tests ergänzen / korrigieren
- `perf`     – Performance-Verbesserung

Beispiele:

```
feat(diagnose): zusätzliche Wasserwert-Validierung
fix(frontend): Redirect nach Tank-Löschen korrigieren
refactor(rules): Scoring in eigene Datei extrahieren
docs(readme): Quick Start vereinfachen
chore(ci): gofmt-Check ergänzen
```

Kurze Subject-Zeile (≤ 72 Zeichen). Body nur, wenn er erklärt, **warum** die
Änderung nötig ist.

---

## 4. Pull-Request-Regeln

Bevor du einen PR öffnest:

1. `make lint`  läuft grün
2. `make test`  läuft grün
3. `docker compose up --build` startet vollständig
4. README / Docs aktualisiert, falls sich Verhalten oder Setup ändert
5. Keine Secrets, keine `.env`, keine SQLite-Dateien, keine Build-Artefakte
6. Commit-Historie ist sauber (squash / rebase, keine `wip` / `fixup` Commits)

Im PR-Beschreibungstext beantwortest du:

- **Was** ändert sich aus User-Sicht?
- **Warum** ist diese Änderung sinnvoll für den MVP-Scope?
- **Wie** wurde es getestet (manuell + automatisiert)?
- **Screenshots / Logs**, falls UI- oder API-Verhalten sichtbar ändert
- **Scope-Check**: bleibt es im V1-Scope (siehe unten)?

Reviews: mindestens **eine Zustimmung** vor Merge. Squash-Merge bevorzugt.

---

## 5. Code Style

### Go (Backend)

- `gofmt` ist Pflicht: `make backend-fmt-check`
- `go vet` muss durchlaufen
- Tests gehören neben den Code: `*_test.go`
- Klare, kleine Funktionen; explizite Typen; keine versteckte Magie
- Strukturierte Logs über `log/slog` (JSON, nach stderr)
- Fehler immer mit Kontext zurückgeben (`fmt.Errorf("scope: %w", err)`)
- Keine globalen Singletons außerhalb von `main`

### TypeScript / Next.js (Frontend)

- ESLint: `make frontend-lint`
- Tests mit Vitest: `make frontend-test`
- **Mobile-first**: Layouts zuerst für 360–414 px sinnvoll bauen
- Tailwind-Klassen folgen dem CD-Token-Set (Farben `aqua-*`, `status-*`)
- Server Components bevorzugt; Client Components nur, wenn echt nötig
- Keine UI-Library-Sprünge ohne Diskussion

### YAML-Regeln

- Regel-IDs sind eindeutig und stabil
- `severity` exakt aus der erlaubten Liste (`info | low | medium | high | critical`)
- Neue Felder werden in `backend/internal/rules` validiert
- Beispieleingabe + erwartete Diagnose in einem Test verewigen

---

## 6. Tests sind Pflicht

Für jede inhaltliche Änderung (Verhalten, Regelwerk, API):

- Mindestens **ein neuer oder angepasster Test** pro Pull Request
- Backend: Table-Driven-Tests dort, wo möglich
- Frontend: Vitest + Testing-Library für UI-Komponenten mit Logik
- Reine Refactors müssen den bestehenden Test-Schirm grün halten

---

## 7. Keine Arbeit direkt auf `main`

Schon erwähnt, aber wichtig genug für eine eigene Sektion:

- `main` ist immer deploy-fähig
- Force-Push auf `main` ist verboten
- Merge erst, wenn CI grün ist

---

## 8. UX-Prinzipien

AquaDiag ist **Entscheidungshilfe**, kein Logbuch.

- **Actions-first**: Was soll der Nutzer als Nächstes tun?
- **Mobile-first**: Bedienbarkeit auf dem Handy zuerst sicherstellen
- **Keine wissenschaftliche Überladung**: einfache Sprache, präzise Werte
- **Klare leere und Fehlerzustände**
- **Niemals Panik**: ruhig, sachlich, präzise (siehe CD-Tonalität)

---

## 9. AI Guardrails

Die AI darf:

- Regel-Output in nutzerfreundliches Deutsch übersetzen
- vermutete Ursache zusammenfassen
- Rückfragen formulieren
- Unsicherheit erklären

Die AI darf **nicht**:

- eine andere Diagnose als die Regel-Engine vorschlagen
- `severity` oder `confidence` überschreiben
- zusätzliche Maßnahmen erfinden
- medikamentöse oder tierärztliche Empfehlungen geben
- absolute Sicherheit suggerieren

Bei `AI_ENABLED=false` muss die App vollständig funktionieren. Wenn ein PR das
unter aktivierter AI subtil verändert, ist das ein Bug – nicht ein Feature.

---

## 10. Scope Discipline

V1 enthält bewusst **nicht**:

- Authentifizierung / Login
- Zahlungen / Abos
- Kubernetes / Helm
- ESP32 / Shelly / Sensorik
- Foto- / Bildanalyse
- Community-Features
- PostgreSQL als Pflicht

Wenn dein PR eines dieser Themen anfasst, eröffne bitte **zuerst ein Issue**
mit dem Label `discussion`. Großer Scope ohne Vorabstimmung wird in der Regel
geschlossen, nicht gemergt.

---

## 11. Lizenz von Beiträgen

Mit dem Einreichen eines Pull Requests stimmst du zu, dass dein Beitrag unter
denselben Bedingungen wie das Hauptprojekt lizenziert wird (siehe `LICENSE`,
aktuell **PolyForm Noncommercial License 1.0.0**), sofern nicht ausdrücklich
schriftlich anders vereinbart.

---

## 12. Fragen?

- Öffne ein Issue mit dem Label `question`
- Sicherheitsthemen: siehe [`SECURITY.md`](SECURITY.md), **nicht** im öffentlichen Issue-Tracker
