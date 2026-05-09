# Architecture

AquaDiag V1 uses:

- Go backend
- REST API
- SQLite
- YAML rule engine
- optional AI explanation service
- Next.js frontend
- Docker Compose

Diagnosis pipeline:

1. User submits tank, symptoms, and optional water values.
2. Backend validates input.
3. Backend stores water test.
4. Rule engine evaluates deterministic YAML rules.
5. Highest scoring diagnoses are selected.
6. AI service optionally converts rule output into user-friendly explanation.
7. Result is stored and returned to frontend.

The rule engine is the source of truth.
AI must never be the source of truth.
