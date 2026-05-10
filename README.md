![Logo](frontend/public/logos/README-header.png)

[![Docker Compose](https://img.shields.io/badge/Orchestrierung-Docker%20Compose-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![SQLite](https://img.shields.io/badge/Datenbank-SQLite-003B57?logo=sqlite&logoColor=white)](README.md#v1-grenzen)
[![Go](https://img.shields.io/badge/Backend-Go-00ADD8?logo=go&logoColor=white)](backend/cmd/api/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000?logo=nextdotjs&logoColor=white)](frontend/)
[![YAML-Regeln](https://img.shields.io/badge/Regeln-YAML-0F4C5C)](rules/aquarium-rules.yaml)
[![Aquaristik](https://img.shields.io/badge/Fokus-Aquaristik-1CA7C9)](README.md#dynalabs-aquadiag-v1)
[![Source Available](https://img.shields.io/badge/Source%20Available-PolyForm%20NC-2FBF71)](LICENSE)

**Aquarienwerte verstehen. Probleme früh erkennen.**

Dynalabs AquaDiag v1 ist eine minimalistische **Entscheidungshilfe** für Aquariumprobleme: Symptome (und optional Wasserwerte) erfassen, deterministisch per YAML-Regeln auswerten, Ergebnis **handlungsorientiert** darstellen. Optional kann eine KI die Ausgabe der Regeln **erklären**, nicht jedoch die Diagnose **ersetzen** (siehe `.cursor/rules` und `.ai/architecture.md`).

Technischer Kurzname im Repo: **AquaDiag** / AquaDiag v1.

### Wichtiger Hinweis

Die Anwendung ist **keine tierärztliche Beratung** und **kein Ersatz** für Fachpersonal vor Ort. Aussagen und Empfehlungen stützen sich auf eure Eingaben und die **YAML-Regelengine**; bei gesunden oder erkrankten Tieren gilt weiterhin: bei Zweifeln oder akuten Symptomen **fachkundig beraten lassen** und das Becken **beobachten**.

## Marke & Oberfläche (Corporate Design)

Über der Einleitung zeigen **Badges** (shields.io) Stack und Fokus des Projekts; die Farben **YAML** (`#0F4C5C` Aqua Deep), **Aquaristik** (`#1CA7C9` Aqua Blue) und **Open Source** (`#2FBF71` Erfolg) sind an die CD angelehnt.

Die Web-Oberfläche folgt den Projekt-CD-Regeln (Farben **Aqua Deep / Aqua Blue / Aqua Mint**, **Deep Navy** für Header und Footer, **Soft Water** als Seitenhintergrund, **Inter** als UI-Schrift). Statusfarben für Schweregrade entsprechen der CD-Tabelle (Erfolg, Hinweis, Warnung, Kritisch, Info).

**Logos & Icon** (Next.js `public`, unter `/logos/…`):

| Datei | Verwendung |
|-------|------------|
| `frontend/public/logos/logo-full.svg` | Header auf allen Viewports (skaliert mit `max-w-full`) |
| `frontend/public/logos/logo-icon.svg` | Optional für andere Kontexte (nicht im App-Header) |
| `frontend/public/logos/favicon.svg` | Favicon (über Next.js `metadata.icons`) |

Im UI: **Header** mit Logo und Navigation (**Start**, **Becken**, **Diagnose**); **Footer** mit Produktname, Claim und Kurzhinweis zur Rolle der App (Entscheidungshilfe).

## V1-Grenzen

- Es gibt **keine** Auth, Zahlungen, Sensoren/Hardware, Kubernetes, Postgres-Pflicht, Fotoupload oder Community-Features.
- Standarddatenbank ist **SQLite**; Orchestrierung lokal oder per **Compose**.
- Die **Regelengine** ist die Quelle der Wahrheit; die **KI** nur Erklär-Layer (wenn konfiguriert).

## Repository-Überblick

| Bereich       | Pfad                         | Zweck                                              |
|--------------|-------------------------------|----------------------------------------------------|
| Backend (Go) | `backend/cmd/api/`            | HTTP-Server-Einstieg                               |
|              | `backend/internal/api/`       | Router, Handler, JSON-Helfer                       |
|              | `backend/internal/{db,rules,diagnosis,ai,models}/` | Vorbereitung V1-Pipeline                           |
| Frontend     | `frontend/src/app/`           | Next.js App Router (`/dashboard`, `/dashboard/tanks`, `/dashboard/tanks/[id]`, `/dashboard/tanks/[id]/edit`, `/dashboard/diagnose`) |
|              | `frontend/src/components/`    | UI-Bausteine (z. B. `DashboardNav`, `DashboardFooter`, `BackendStatus`, `tanks/TankCard`, `tanks/TankEditForm`, `tanks/DeleteTankDialog`) |
|              | `frontend/public/logos/`      | Marken-Assets: `logo-full.svg`, `logo-icon.svg`, `favicon.svg` |
| Regeln (YAML)| `rules/aquarium-rules.yaml` | Deterministische Regeln (optional `RULES_PATH`; siehe README) |
| Kontext      | `.ai/`                        | Architektur, Constraints, Produktkurzbeschreibung  |

Weitere Artefakte: `docker-compose.yml`, `.env.example`, `.gitignore`, `LICENSE`, `NOTICE`.

## Umgebungsvariablen (.env.example)

Kopieren: `cp .env.example .env` und bei Bedarf anpassen.

- `BACKEND_PORT` – API-Port (Standard `8080`)
- `FRONTEND_PORT` – Web-UI-Port (Standard `3000`)
- `DATABASE_PATH` – Pfad zur SQLite-Datei (im Container unter `/data/…`; Volume `aquadiag-data`)
- `AI_*` – optional; ohne Key bleibt die KI deaktiviert. Bei `AI_ENABLED=false` (Standard) liefert die API **nur** die deterministischen Regeltexte; `ai_explanation` bleibt `null`.
  - `AI_BASE_URL` erwartet eine **vollständige Chat-Completions-Endpoint-URL** (OpenAI-kompatibles Schema).
  - `AI_TIMEOUT_SECONDS` begrenzt nur den AI-Aufruf (Fallback ohne AI bei Timeout/Fehler).
- `RULES_PATH` – optional; Pfad zur Regel-Datei. Ohne Angabe: automatisch `rules/aquarium-rules.yaml` (Arbeitsverzeichnis **Repo-Root**) oder `../rules/aquarium-rules.yaml` (wenn das Backend aus `backend/` gestartet wird); im Container-Image `/app/rules/aquarium-rules.yaml`.
- `CORS_ALLOWED_ORIGINS` – erlaubte Browser-Origins für die API (Standard in Compose abgeleitet von `FRONTEND_PORT`)
- `NEXT_PUBLIC_API_BASE_URL` – Basis-URL der API **vom Browser aus** (`http://localhost:8080`, wenn Ports auf den Host gemappt sind)
- `NEXT_PUBLIC_DIAGNOSE_MOCK` – optional; `1` aktiviert eine eingebaute Beispiel-Response für `/v1/diagnose` im Frontend (für lokale UI-Entwicklung ohne Backend).
- `API_INTERNAL_BASE_URL` – optional; Basis-URL für **serverseitige** Next.js-Requests (RSC, API-Route **Proxy** unter `/api/backend/…`). In Compose ist der Standard **`http://backend:8080`** – damit Formular-Fetches im Browser über die gleiche Origin laufen und **kein CORS** zur Go-API nötig ist.

### Dashboard-`/health`-Anzeige

Die `/health`-Anzeige wird **auf dem Next.js-Server** geladen (`BackendStatus`, dynamische Route). `curl …/dashboard` zeigt den aktuellen Check im HTML mit – nicht die frühere reine Browser-Ladeanimation.

## Lokal starten

### Mit Docker Compose (oder Podman Compose)

Voraussetzung: `docker compose` bzw. `podman-compose`/`podman compose`.

```bash
cp .env.example .env
docker compose up --build
# oder:
# podman compose up --build
```

- Frontend: `http://localhost:${FRONTEND_PORT:-3000}` (Root leitet nach `/dashboard` um)
- API Health: `http://localhost:${BACKEND_PORT:-8080}/health` → JSON `{"status":"ok"}`
- **Becken (REST):**
  - `GET /v1/tanks` → `{ "tanks": [ … ] }` (neueste `id` zuerst). Jedes Becken behält die Basisfelder `id`, `name`, `volume_liters`, optional `notes`, `created_at` und kann schlanke Summary-Felder enthalten: `last_water_test_at`, `latest_diagnosis_type`, `latest_diagnosis_severity`, `latest_diagnosis_confidence`. Die Liste enthält bewusst keine vollständigen Diagnose-Payloads, Charts oder Trendanalyse.
  - `POST /v1/tanks` → Body `{ "name", "volume_liters" }`, Antwort angelegtes Becken (`201`)
  - `GET /v1/tanks/{id}` → ein Becken (`notes` optional, nach Migration `005_tank_notes`)
  - `PUT /v1/tanks/{id}` → partielle Aktualisierung: beliebige Kombination aus `name`, `volume_liters`, `notes` (mindestens eines); `notes: null` setzt die Notiz in der DB auf `NULL`
  - `DELETE /v1/tanks/{id}` → `204`, löscht zuvor alle zugehörigen `water_tests`-Zeilen und deren `diagnosis_results` (explizite Transaktion im Backend; zusätzlich FK `ON DELETE CASCADE` ab Migration `006_foreign_keys_on_delete_cascade.sql`)
- **Wassertests (lesen/löschen, keine separaten Charts/Export):**
  - `GET /v1/tanks/{id}/water-tests` → `{ "water_tests": [ … ] }`, Sortierung **neueste zuerst** (`id DESC`)
  - `GET /v1/water-tests/{id}` → eine Messung inkl. `symptoms` (aus `symptoms_json`)
  - `DELETE /v1/water-tests/{id}` → `204`, entfernt zugehörige `diagnosis_results`, dann die Messzeile (Transaktion; zusätzlich FK `ON DELETE CASCADE` ab Migration `006_foreign_keys_on_delete_cascade.sql`)
- Diagnose: `POST …/v1/diagnose` mit Tank-Bezug und optionalem `water`: **Härte** `kh_dkh` (°dKH), `gh_dgh` (°dGH); **Ionen** `nitrite_mg_l`, `nitrate_mg_l`, `ammonium_mg_l`, `co2_mg_l` (mg/l, Testkits); **O₂** `oxygen_mg_l` (mg/l). Alte Schlüssel `*_ppm` werden beim Einlesen noch akzeptiert.
  - Optional **`follow_up_answers`** (Re-Analyse mit Kontext): Array aus `{ "question": "…", "answer": "…" }`. Wird nicht von der Regelengine ausgewertet (außer später explizit gemappt), fließt aber in die **KI-Einbindetextgenerierung** ein und wird mit der neuen `diagnosis_results`-Zeile als JSON (`follow_up_answers_json`) persistiert.
  - Optionaler Explainability-Layer: `ai_explanation` ist entweder ein JSON-Objekt oder `null`. Status unter `meta.ai_status`: `"disabled" | "ok" | "failed"`. Die deterministische Diagnose bleibt immer maßgeblich.
  - **Rückfragen-Antworten (Persistenz):** `PATCH /v1/diagnoses/{id}` mit Body `{ "follow_up_answers": { "0": "…", "1": "…" } }` (Schlüssel = Index der Frage in `follow_up_questions_de`). Speichert nur Metadaten; **keine** erneute Regelauswertung und kein neuer AI-Lauf. Antwort `200` mit `{ "diagnosis_id", "follow_up_answers" }`. SQLite-Spalte `follow_up_answers_json` (Migration `007_follow_up_answers.sql`).
- Web-UI: nach `/dashboard` verlinkt **Start**, **Becken** (`/dashboard/tanks`), **Diagnose** (`/dashboard/diagnose`).

#### Strukturierte API-Fehler

Antworten bei Fehlern sind JSON mit mindestens `code` und `message`; Validierung liefert zusätzlich `errors`: Liste aus `field`, `code`, `message` (analog zu `POST /v1/diagnose`). Übliche Codes u. a.: `invalid_json`, `validation_failed`, `invalid_path`, `not_found`, `method_not_allowed`, `database_error`, `service_unavailable`.

**Beispiele**

```bash
# Becken anlegen
curl -sS -X POST "http://localhost:8080/v1/tanks" \
  -H "Content-Type: application/json" \
  -d '{"name":"Wohnzimmer","volume_liters":180}'

# Becken aktualisieren (Notizen)
curl -sS -X PUT "http://localhost:8080/v1/tanks/1" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Wechsel Filterwatte"}'

# Wassertests eines Beckens (neueste zuerst)
curl -sS "http://localhost:8080/v1/tanks/1/water-tests"

# Einzelnen Wassertest löschen
curl -sS -X DELETE "http://localhost:8080/v1/water-tests/42"
```

**Beispiel `POST /v1/diagnose`**

```bash
curl -sS -X POST "http://localhost:8080/v1/diagnose" \
  -H "Content-Type: application/json" \
  -d '{
    "tank": { "name": "Wohnzimmer", "volume_liters": 180 },
    "water": { "nitrite_mg_l": 0.4 },
    "symptoms": []
  }' | jq '{ status, top_rule: .top_diagnosis.rule_id, diagnoses: [.diagnoses[].rule_id], matched_rules, meta }'
```

#### Stabilisiertes Antwort-Schema

Jede `/v1/diagnose`-Antwort enthält **immer** die folgenden Top-Level-Felder:

- `status` (`"matched"` | `"unknown"`)
- `top_diagnosis` (Objekt bei Treffer, sonst `null`)
- `diagnoses` (immer ein Array; leer wenn kein Treffer)
- `matched_rules` (immer ein Array; leer wenn kein Treffer)
- `meta` (Objekt mit `rule_engine_version`, `evaluated_rules`, `matched_count`, `generated_at` (RFC3339) sowie den Persistenz-IDs `diagnosis_id`, `water_test_id`, `tank_id`)

**Beispiel: `status: "matched"`**

```json
{
  "status": "matched",
  "top_diagnosis": {
    "rule_id": "nitrite_risk_v1",
    "name": "Nitritbelastung",
    "diagnosis_type": "nitrite_risk",
    "severity": "high",
    "confidence": 0.9,
    "summary_de": "...",
    "reasoning_de": "...",
    "actions_now": ["..."],
    "actions_optional": ["..."],
    "avoid": ["..."],
    "follow_up_questions_de": ["..."],
    "safety_note_de": "...",
    "facts": ["..."]
  },
  "diagnoses": [
    { "rule_id": "nitrite_risk_v1", "confidence": 0.9, "...": "..." }
  ],
  "matched_rules": ["nitrite_risk_v1"],
  "meta": {
    "rule_engine_version": "1",
    "evaluated_rules": 5,
    "matched_count": 1,
    "generated_at": "2026-05-08T12:00:00Z",
    "diagnosis_id": 42,
    "water_test_id": 17,
    "tank_id": 3
  }
}
```

**Beispiel: `status: "unknown"`** (kein Regeltreffer)

```json
{
  "status": "unknown",
  "top_diagnosis": null,
  "diagnoses": [],
  "matched_rules": [],
  "meta": {
    "rule_engine_version": "1",
    "evaluated_rules": 5,
    "matched_count": 0,
    "generated_at": "2026-05-08T12:00:00Z",
    "diagnosis_id": 43,
    "water_test_id": 18,
    "tank_id": 3
  }
}
```

Garantien: `diagnoses` und `matched_rules` sind nie `null`, sondern leere Arrays bei `status: "unknown"`. `top_diagnosis` ist exakt `null` bei `unknown` und sonst gleich `diagnoses[0]` (absteigend nach `confidence` sortiert). `meta.generated_at` ist RFC3339.

#### Severity-Werte

`severity` ist über Backend, API und Frontend einheitlich. Erlaubt sind ausschließlich die folgenden Werte (aufsteigender Ernst):

| Severity   | Bedeutung                                  | UI (CD / Frontend)      |
|------------|--------------------------------------------|-------------------------|
| `info`     | Hinweis, kein direkter Handlungsdruck       | Info (`status.info`)    |
| `low`      | Geringe Auffälligkeit, beobachten           | Erfolg (`status.success`) |
| `medium`   | Spürbares Problem, zeitnah handeln        | Hinweis (`status.warning`) |
| `high`     | Deutliches Risiko, schnell handeln          | Warnung (`status.alert`) |
| `critical` | Akute Gefahr, sofort handeln                | Kritisch (`status.critical`) |

- **Backend-Validierung:** `rules/aquarium-rules.yaml` wird beim Start geprüft (`backend/internal/rules`). Der Start schlägt deterministisch fehl bei u. a. fehlender `version`, **doppelten Regel-IDs**, leerem `diagnosis_type` (bei gesetzter `id`), ungültigen `when`-Operatoren (z. B. numerische Vergleiche auf `symptoms` oder `contains_*` auf Messfeldern), widersprüchlichen `when`-Knoten oder einer fehlenden / unbekannten `severity` (Regel-Index, ID und erlaubte Werte werden genannt).
- **API-Fehler bei `/v1/diagnose`:** Antworten sind JSON mit den Feldern `code`, `message` und optional `errors` (Liste aus `field`, `code`, `message`). Ungültiger JSON-Body: `code` ist `invalid_json`; Validierungsfehler: `validation_failed`.
- **Logs:** Das Backend schreibt strukturierte JSON-Zeilen nach **stderr** (`log/slog`), u. a. `rules_loaded` (Pfad, Version, Regelanzahl) beim Start und `rule_evaluation` (Trefferzahl, Regel-IDs, `duration_ms`) je Diagnose.
- **Frontend-Mapping:** Die Farb- und Klassen-Zuordnung lebt zentral in `frontend/src/lib/severity.ts`; angezeigt wird sie über `SeverityBadge` (`frontend/src/components/SeverityBadge.tsx`). Unbekannte Werte fallen auf einen neutralen Sand-/Deep-Stil zurück (`bg-aqua-sand` etc.), statt die UI zu brechen.
- **Quelle der Wahrheit:** Bei Erweiterungen (z. B. neue Severity) müssen `backend/internal/rules/severity.go` (`AllowedSeverities`), `frontend/src/lib/severity.ts` (`SEVERITIES` + Farb-Mapping) und diese Tabelle gemeinsam aktualisiert werden.

#### Podman: „container state improper“ / Frontend startet nicht

Podman kann Container in einem ungültigen Zustand lassen (z. B. nach abgebrochenem Lauf). Dann hilft ein sauberes Herunterfahren und Neuerstellen:

```bash
podman-compose down
podman-compose up --build --force-recreate
```

Wenn das nicht reicht, den betroffenen Container hart entfernen (`podman ps -a`, dann `podman rm -f <id>`) und erneut `podman-compose up --build` ausführen.

### Ohne Docker (Entwicklung)

**Backend:**

```bash
cd backend
go run ./cmd/api
```

**Frontend** (benötigt installiertes Node.js ≥ 18):

```bash
cd frontend
npm install
npm run dev
```

Setzen Sie `NEXT_PUBLIC_API_BASE_URL` passend zur laufenden API (z. B. über `frontend/.env.local`).

## Qualitätschecks (lokal)

```bash
cd backend && gofmt -w cmd internal && go test ./...
cd frontend && npm install && npm run lint && npm test && npm run build
```

> Hinweis: Im Container-Frontend wird bei fehlender `package-lock.json` `npm install` verwendet (siehe `frontend/Dockerfile`). Für reproduzierbare Builds lohnt sich `npm install` einmal auf dem Host, um eine Lock-Datei zu erzeugen.

### Manuelle Tests (responsive Layout & Follow-up-Reanalyse)

1. **Desktop:** Dashboard und Beckenliste nutzen eine Breite bis ca. 1160–1200px; Karten erscheinen nicht wie eine schmale Mittelsäule mit großen Außenflächen (Dashboard-Kacheln im Raster bei Platz).
2. **Tablet (~768px):** Start-, Tank- und Diagnose-Seiten bleiben lesbar; zweispaltige Bereiche (z. B. Tank-Detail) nur dort, wo sinnvoll.
3. **Mobil:** Kein seitlicher Scroll (`overflow-x`), Hauptnavigation umbrochen/kompakt, Buttons groß genug zum Antippen (mind. ~44px).
4. **Diagnose:** Oberhalb von Symptomen/Messwerten sind Beckenkontext (Name/Volumen) und Beckenauswahl sichtbar; die URL `/dashboard/diagnose?tank=<id>` wählt das Becken vor (existiert die ID nicht in der Liste, bleibt die erste gültige Auswahl aktiv).
5. **Follow-up-Reanalyse:** Diagnose ausführen, unter „Rückfragen“ mindestens ein Feld ausfüllen, „Analyse mit Antworten aktualisieren“ klicken → Ladezustand, neues Ergebnis mit Hinweis „Die Analyse wurde mit deinen Antworten aktualisiert.“; bei aktiver KI (`AI_ENABLED=true`) soll die AI-Erklärung die Antworten sinnvoll einbeziehen, ohne Status oder Confidence zu „überstimmen“.

## License

AquaDiag ist **source available** unter der **PolyForm Noncommercial License 1.0.0**. Nicht-kommerzielle Nutzung ist gemäß den Lizenzbedingungen erlaubt; kommerzielle Nutzung ist untersagt.

Das Hosting von AquaDiag als kommerzielles SaaS-Angebot oder als Bestandteil eines bezahlten kommerziellen Dienstes ist ohne separate kommerzielle Lizenz nicht erlaubt. Beiträge sind willkommen; eingereichter Code wird, sofern nicht ausdrücklich anders vereinbart, unter denselben Bedingungen der PolyForm Noncommercial License 1.0.0 angenommen.

## Bekannte Einschränkungen V1

- Backend: **`GET /health`**, Becken-REST unter **`/v1/tanks`** (inkl. `PUT`/`DELETE`; Listenantwort mit schlanker letzter-Messung-/letzter-Diagnose-Summary), Wassertests **`GET /v1/tanks/{id}/water-tests`**, **`GET/DELETE /v1/water-tests/{id}`**, **`POST /v1/diagnose`**, SQLite (`tanks`, `water_tests`, `diagnosis_results`), Regeln unter **`rules/`**. Frontend: Dashboard mit **Dynalabs AquaDiag v1**-Branding (Logo im Header, Claim im Footer), Navigation zu **Becken** und **Diagnose**; Becken-Liste (`/dashboard/tanks`) zeigt Karten mit letzter Messung und, falls vorhanden, kompakter letzter Diagnose, Detail-Seite (`/dashboard/tanks/{id}`) bietet Bearbeiten, Löschen mit Bestätigungsdialog und „Neue Diagnose / Messung“ (mit vorausgewähltem Becken via `?tank=ID`). Lade-, Leer- und Fehlerzustände sind in den Server-Komponenten behandelt; nach erfolgreichem Löschen leitet das UI auf `/dashboard/tanks?deleted=...` mit kurzlebigem Erfolgs-Banner um.
- KI-Erklärung: optionaler Explainability-Layer über `AI_*`. Bei `AI_ENABLED=false` bleibt `ai_explanation=null` und das UI funktioniert unverändert; bei Fehler/Timeout gilt `meta.ai_status="failed"` ohne Diagnose-Abbruch.
