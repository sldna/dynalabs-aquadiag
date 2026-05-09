# AquaDiag AI Workflow

## Ziel

Die AI-Schicht ist ausschließlich ein Explainability Layer.

Die Rule Engine bleibt die alleinige Quelle für:
- diagnosis_type
- confidence
- severity
- actions_now
- actions_optional
- avoid
- matched_rules

AI darf niemals:
- Diagnosen erfinden
- Confidence verändern
- Rule Engine überschreiben
- Maßnahmen frei erfinden
- medizinische oder veterinärmedizinische Garantien geben

## Phase 4 Scope

Erlaubt:
- AI Explanation Service
- Prompt Builder
- JSON Schema
- Timeout Handling
- Retry Handling
- Feature Flag AI_ENABLED
- Fallback ohne AI
- API Response um ai_explanation erweitern

Nicht erlaubt:
- Chatbot
- Fotoanalyse
- RAG
- Embeddings
- Sensorik
- Zahlungsmodell
- Auth
- freie Diagnosen

## Architektur

Backend:

internal/ai/
- client.go
- prompt.go
- schema.go
- service.go

Diagnosis Flow:

1. Rule Engine erzeugt deterministisches Diagnoseergebnis.
2. Wenn AI_ENABLED=false:
   - ai_explanation = null
   - deterministische Texte bleiben erhalten.
3. Wenn AI_ENABLED=true:
   - AI bekommt nur strukturierte Rule-Engine-Daten.
   - AI gibt JSON zurück.
   - JSON wird validiert.
   - Bei Fehler/Timeout wird ohne AI weiter geantwortet.

## AI Output Schema

{
  "summary": "string",
  "human_explanation": "string",
  "priority_explanation": "string",
  "follow_up_questions": ["string"],
  "uncertainty_note": "string",
  "safety_note": "string"
}

## Fallback-Regel

AI darf niemals die Diagnosepipeline blockieren.

Wenn AI fehlschlägt:
- Response bleibt erfolgreich
- ai_explanation = null
- meta.ai_status = "failed"

## Env

AI_ENABLED=false
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=
AI_TIMEOUT_SECONDS=8