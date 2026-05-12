# AquaDiag – Architektur

> Status: AquaDiag V1 (Pre-Release `0.1.x`).
> Quelle der Wahrheit für die Diagnose ist die deterministische YAML-Regel-Engine.
> Der AI-Layer ist eine optionale Erklärungsschicht und niemals
> entscheidungstragend.

---

## 1. Überblick

```text
                ┌─────────────────────────────┐
                │   Browser (Next.js Client)  │
                └────────────┬────────────────┘
                             │ HTTP (mobile-first UI)
                             ▼
                ┌─────────────────────────────┐
                │  Next.js Server / RSC       │
                │  (frontend/)                │
                └────────────┬────────────────┘
                             │ HTTP   (Server-side)
                             ▼
        ┌────────────────────────────────────────────┐
        │           Go Backend (backend/)            │
        │  ┌──────────────┐  ┌──────────────────┐   │
        │  │ HTTP / JSON  │─▶│ Rule Engine      │   │
        │  │ (internal/   │  │ (internal/rules) │   │
        │  │  api)        │  └────────┬─────────┘   │
        │  └─────┬────────┘           │             │
        │        │                    ▼             │
        │        │           ┌──────────────────┐   │
        │        │           │ Diagnosis Service│   │
        │        │           │ (internal/       │   │
        │        │           │  diagnosis)      │   │
        │        │           └────────┬─────────┘   │
        │        ▼                    │             │
        │  ┌──────────────┐           ▼             │
        │  │ SQLite       │   ┌──────────────────┐  │
        │  │ (internal/db)│   │ AI Explainer     │  │
        │  └──────────────┘   │ (internal/ai,    │  │
        │                     │  optional)       │  │
        │                     └──────────────────┘  │
        └────────────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  rules/*.yaml        │
                  │  (deterministisch)   │
                  └──────────────────────┘
```

---

## 2. Komponenten

### Frontend (`frontend/`)

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS mit AquaDiag-CD-Token (Aqua Deep / Blue / Mint, Status-Farben)
- Mobile-first; Server Components als Default, Client Components nur wo nötig
- Spricht das Backend bevorzugt über die interne URL (`API_INTERNAL_BASE_URL`)
  an, damit Browser keine CORS-Hürden sehen

### Backend (`backend/`)

- Go 1.25, stdlib-HTTP (`net/http`) + kleiner Router (`internal/api`)
- Strukturierte Logs via `log/slog` (JSON nach stderr)
- Persistenz: SQLite (`modernc.org/sqlite`, CGO-frei)
- Domains: `tanks`, `water_tests`, `diagnosis_results`

### Regel-Engine (`backend/internal/rules` + `rules/aquarium-rules.yaml`)

- Liest beim Start eine deterministische YAML-Regelbasis
- Validiert das Schema deterministisch (eindeutige IDs, erlaubte Severities,
  korrekte `when`/`exclude_*`-Strukturen)
- Bewertet pro Diagnose: `confidence_base` + Symptom- & Wasser-Bonus
- Liefert ein erklärbares Score-Breakdown zurück

### AI-Layer (`backend/internal/ai`, optional)

- Nur aktiv bei `AI_ENABLED=true` und vorhandenem `AI_API_KEY`
- Schreibt **keine** Diagnose, sondern eine zusätzliche `ai_explanation`
- Bei Fehler/Timeout: `meta.ai_status="failed"`, Diagnose bleibt valide
- Darf weder Severity noch Confidence noch Maßnahmen verändern

### Persistenz (`backend/internal/db`)

- SQLite-Datei (`DATABASE_PATH`, im Container über Volume `aquadiag-data`)
- Migrations im Repo (`backend/internal/db/migrations/*.sql`)
- Foreign Keys aktiv mit `ON DELETE CASCADE`; zusätzlich explizite
  Transaktionen für Lösch-Operationen (defensive Doppelsicherung)

### Frontend-Komponenten (Auswahl)

- `DashboardNav`, `DashboardFooter`: Layout-Rahmen mit CD-Branding
- `BackendStatus`: Server-Side-Anzeige des Backend-Health-Checks
- `tanks/*`: Tank-Karten, Edit-Formular, Lösch-Dialog
- `SeverityBadge`: zentrale Farb-/Status-Mappings (`lib/severity.ts`)

---

## 3. Diagnose-Pipeline

```text
1. Nutzer:in füllt Diagnose-Formular (Symptome + optionale Wasserwerte) aus
2. Frontend POSTet /v1/diagnose mit Tank-Bezug
3. Backend validiert Input (strukturierte Fehler bei Validierungsfehlschlag)
4. Backend speichert WaterTest-Zeile (auch bei späterem Mismatch)
5. Rule Engine bewertet alle Regeln (eval + scoring + exclude_*)
6. Beste Diagnose(n) werden geordnet zurückgegeben (top_diagnosis, diagnoses[])
7. Optional: AI-Layer baut ai_explanation (rein erklärend, keine neue Diagnose)
8. Diagnose-Result wird persistiert (mit Score-Breakdown, optional follow_up)
9. Frontend rendert mobile-first; Aktionen sind primär sichtbar
```

Wichtige Eigenschaften:

- **Idempotent**: Mehrfaches Senden derselben Eingabe liefert dieselbe Diagnose.
- **Erklärbar**: Jede Top-Diagnose enthält `matched_conditions`,
  `matched_symptoms`, `matched_water_values`, `score_breakdown`.
- **Ohne AI funktionsfähig**: `AI_ENABLED=false` ist der Default; `ai_explanation`
  bleibt dann `null`, `meta.ai_status="disabled"`.

---

## 4. Konfiguration

Siehe `.env.example`. Wichtige Variablen:

| Variable                    | Zweck                                       |
|-----------------------------|---------------------------------------------|
| `BACKEND_PORT`              | Backend-Listener                            |
| `FRONTEND_PORT`             | Next.js-Listener                            |
| `DATABASE_PATH`             | SQLite-Pfad (Container: `/data/...`)        |
| `RULES_PATH`                | optionaler Pfad zur YAML-Regelbasis         |
| `CORS_ALLOWED_ORIGINS`      | erlaubte Browser-Origins für die API        |
| `NEXT_PUBLIC_API_BASE_URL`  | Browser-Sicht auf die API                   |
| `API_INTERNAL_BASE_URL`     | Server-Sicht des Frontends auf die API      |
| `AI_ENABLED` / `AI_*`       | optionaler AI-Layer                         |

---

## 5. Datenmodell (Kurzform)

- `tanks(id, name, volume_liters, notes, created_at, …)`
- `water_tests(id, tank_id, …chemie-felder…, symptoms_json, created_at)`
- `diagnosis_results(id, water_test_id, rule_id, payload_json,
  follow_up_answers_json, …, created_at)`

Lösch-Verhalten:

- `DELETE /v1/tanks/{id}` löscht alle abhängigen `water_tests` und deren
  `diagnosis_results` (FK-Cascade + Transaktion).
- `DELETE /v1/water-tests/{id}` löscht abhängige `diagnosis_results` mit.

---

## 6. Erweiterungspunkte

Bewusst klein gehalten, damit der MVP nicht überfrachtet wird. Mögliche
nicht-V1-Erweiterungen (jeweils mit Issue/Discussion vorab):

- alternative Persistenz (z. B. PostgreSQL) hinter dem Repository-Interface
- zusätzliche AI-Provider (durch das `internal/ai`-Interface)
- weitere Regel-Pakete (`rules/v1/…`)
- Export-/Import-Funktionen (vorbereitet im Frontend, Logik bleibt im Backend)

Nicht für V1 vorgesehen: Auth, Payments, Kubernetes, Sensorik, Community-Features.
