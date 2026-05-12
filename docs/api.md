# AquaDiag – API Reference

Stand: AquaDiag V1 (Pre-Release `0.1.x`). Alle Endpoints sind unauthentifiziert
und für den lokalen Betrieb gedacht. Antworten sind JSON.

Basis-URL lokal: `http://localhost:8080`

> Die vollständige Datenmodell-Beschreibung steht in
> [`architecture.md`](./architecture.md). Eine ausführliche, lebende
> README-Variante mit Beispielen befindet sich zusätzlich im Root-`README.md`.

---

## Inhaltsverzeichnis

- [Health](#health)
- [Tanks](#tanks)
- [Water Tests](#water-tests)
- [Diagnosis](#diagnosis)
- [Strukturierte Fehler](#strukturierte-fehler)
- [Severity-Werte](#severity-werte)

---

## Health

### `GET /health`

Antwort `200`:

```json
{ "status": "ok" }
```

Wird vom Container-Healthcheck und vom Dashboard genutzt.

---

## Tanks

### `GET /v1/tanks`

Listet alle Becken (neueste `id` zuerst). Antwort:

```json
{
  "tanks": [
    {
      "id": 3,
      "name": "Wohnzimmer",
      "volume_liters": 180,
      "notes": "Wechsel Filterwatte",
      "created_at": "2026-05-08T11:00:00Z",
      "last_water_test_at": "2026-05-08T12:00:00Z",
      "latest_diagnosis_type": "nitrite_poisoning",
      "latest_diagnosis_severity": "critical",
      "latest_diagnosis_confidence": 0.86
    }
  ]
}
```

Die Liste enthält bewusst keine vollständigen Diagnose-Payloads, keine Charts
und keine Trendanalyse.

### `POST /v1/tanks`

Body:

```json
{ "name": "Wohnzimmer", "volume_liters": 180 }
```

Antwort `201` mit angelegtem Becken.

### `GET /v1/tanks/{id}`

Liefert ein einzelnes Becken inkl. optionaler `notes`.

### `PUT /v1/tanks/{id}`

Partielles Update. Mindestens eines aus `name`, `volume_liters`, `notes` muss
gesetzt sein. `notes: null` löscht den Notizinhalt.

### `DELETE /v1/tanks/{id}`

`204` bei Erfolg. Löscht zuvor alle abhängigen `water_tests` und deren
`diagnosis_results` (explizite Transaktion + FK-Cascade).

---

## Water Tests

### `GET /v1/tanks/{id}/water-tests`

Antwort:

```json
{ "water_tests": [ { "id": 17, "tank_id": 3, "...": "..." } ] }
```

Sortierung: neueste zuerst (`id DESC`).

### `GET /v1/water-tests/{id}`

Eine Messung inkl. `symptoms` (decoded aus `symptoms_json`).

### `DELETE /v1/water-tests/{id}`

`204` bei Erfolg. Entfernt abhängige `diagnosis_results` mit.

---

## Diagnosis

### `POST /v1/diagnose`

Hauptendpoint. Bewertet eine Eingabe (Symptome + optionale Wasserwerte)
deterministisch über die YAML-Regel-Engine.

Beispiel-Body:

```json
{
  "tank": { "name": "Wohnzimmer", "volume_liters": 180 },
  "water": {
    "kh_dkh": 4,
    "gh_dgh": 8,
    "nitrite_mg_l": 0.4,
    "nitrate_mg_l": 25,
    "ammonium_mg_l": 0.1,
    "co2_mg_l": 20,
    "oxygen_mg_l": 7
  },
  "symptoms": ["fische_atmen_schwer"],
  "follow_up_answers": [
    { "question": "Wann hast du zuletzt gewechselt?", "answer": "vor 14 Tagen" }
  ]
}
```

Hinweise:

- `tank` kann entweder ein bestehendes Becken referenzieren oder ein neues
  Becken anlegen (abhängig vom genutzten Frontend-Flow).
- `water.*` Felder sind alle optional; mindestens ein Symptom oder ein Wert
  ist empfehlenswert, sonst liefert die API `status: "unknown"`.
- `follow_up_answers` werden persistiert und fließen in die AI-Erklärung ein,
  aber nicht in die Regel-Engine.

### Antwort-Schema

Top-Level-Felder sind **immer** gesetzt, leere Listen statt `null`:

```json
{
  "status": "matched",
  "top_diagnosis": { "rule_id": "nitrite_poisoning_v1", "...": "..." },
  "diagnoses": [ { "rule_id": "nitrite_poisoning_v1", "confidence": 0.86 } ],
  "matched_rules": ["nitrite_poisoning_v1"],
  "excluded_rules": [],
  "ai_explanation": null,
  "meta": {
    "rule_engine_version": "1",
    "evaluated_rules": 20,
    "matched_count": 1,
    "generated_at": "2026-05-08T12:00:00Z",
    "diagnosis_id": 42,
    "water_test_id": 17,
    "tank_id": 3,
    "ai_status": "disabled"
  }
}
```

Bei keinem Treffer:

```json
{
  "status": "unknown",
  "top_diagnosis": null,
  "diagnoses": [],
  "matched_rules": [],
  "excluded_rules": [],
  "ai_explanation": null,
  "meta": { "...": "..." }
}
```

`top_diagnosis` ist exakt `null` bei `unknown` und sonst identisch zu
`diagnoses[0]`. `meta.generated_at` ist RFC3339.

### Erklärbarkeit pro Diagnose

Jede Diagnose kann zusätzlich enthalten:

- `category`, `tags`
- `matched_conditions`, `matched_symptoms`, `matched_water_values`
- `score_breakdown` (`base`, `symptom_bonuses`, `water_bonuses`, `capped_total`)
- `uncertainty_note_de` (bei knappen Top-Treffern)

### AI-Status (`meta.ai_status`)

| Wert         | Bedeutung                                                        |
|--------------|------------------------------------------------------------------|
| `disabled`   | `AI_ENABLED=false` – AI wurde nicht aufgerufen                   |
| `ok`         | AI hat eine `ai_explanation` geliefert                            |
| `failed`     | AI war aktiv, Aufruf schlug fehl (Timeout, Fehler) – Diagnose bleibt valide |

### `PATCH /v1/diagnoses/{id}`

Persistiert Antworten auf Rückfragen. Body:

```json
{ "follow_up_answers": { "0": "vor 14 Tagen", "1": "kein neuer Besatz" } }
```

Schlüssel = Index in `follow_up_questions_de`. Antwort `200`:

```json
{ "diagnosis_id": 42, "follow_up_answers": { "...": "..." } }
```

Es findet **keine** erneute Regelbewertung und kein neuer AI-Lauf statt.

---

## Strukturierte Fehler

Fehler-Antworten sind JSON mit mindestens `code` und `message`. Validierungs-
Fehler enthalten zusätzlich `errors` (Liste aus `field`, `code`, `message`).

Beispiele:

```json
{ "code": "invalid_json", "message": "Body ist kein gültiges JSON" }
```

```json
{
  "code": "validation_failed",
  "message": "Eingabe ungültig",
  "errors": [
    { "field": "water.nitrite_mg_l", "code": "out_of_range", "message": "Wert darf nicht negativ sein" }
  ]
}
```

Gängige Codes: `invalid_json`, `validation_failed`, `invalid_path`,
`not_found`, `method_not_allowed`, `database_error`, `service_unavailable`.

---

## Severity-Werte

Identisch über Backend, API und Frontend:

| Severity   | Bedeutung                                  | UI                       |
|------------|--------------------------------------------|--------------------------|
| `info`     | Hinweis, kein direkter Handlungsdruck       | Info                     |
| `low`      | Geringe Auffälligkeit, beobachten           | Erfolg                   |
| `medium`   | Spürbares Problem, zeitnah handeln        | Hinweis                  |
| `high`     | Deutliches Risiko, schnell handeln          | Warnung                  |
| `critical` | Akute Gefahr, sofort handeln                | Kritisch                 |

Quelle der Wahrheit:

- Backend: `backend/internal/rules/severity.go`
- Frontend: `frontend/src/lib/severity.ts`
- Doku: dieses Dokument und `README.md`

Neue Werte erfordern Änderungen in allen drei Stellen plus einen Test.
