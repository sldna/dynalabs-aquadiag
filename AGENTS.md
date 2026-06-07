# AGENTS.md

Guidance for cloud agents working in this repository.

## Product

**Dynalabs AquaDiag v1** — minimal aquarium decision-support MVP (Go backend + Next.js frontend + SQLite + YAML rule engine).

## Cursor Cloud specific instructions

### Services

| Service | Port | Required |
|---------|------|----------|
| Backend (Go API) | 8080 | Yes |
| Frontend (Next.js) | 3000 | Yes |
| SQLite | embedded in backend | Yes (no separate container) |
| OpenAI-compatible AI | external | No (`AI_ENABLED=false` by default) |

### First-time / local dependency setup

1. Copy env file if missing: `cp .env.example .env`
2. Backend deps: `cd backend && GOTOOLCHAIN=auto go mod download`
3. Frontend deps: `cd frontend && npm ci`

### Running the stack (Docker Compose — preferred)

Docker is pre-installed in the cloud VM but the daemon may need a manual start:

```bash
sudo dockerd > /tmp/dockerd.log 2>&1 &
```

Use `sudo docker compose` (socket permissions). From repo root:

```bash
make up-d          # or: sudo docker compose up --build -d
make ps            # or: sudo docker compose ps
make logs          # follow logs
make down          # stop stack
```

**Volume permission gotcha:** The backend image runs as `nobody`. On first Compose run, if the backend exits with `unable to open database file (14)`, fix the named volume once:

```bash
VOL=$(sudo docker volume ls -q | grep aquadiag-data | head -1)
sudo docker run --rm -v "${VOL}:/data" alpine sh -c "chmod 777 /data"
sudo docker compose up -d
```

### Running without Docker (local dev)

Terminal 1 — backend:

```bash
cd backend
export DATABASE_PATH=/workspace/data/aquadiag.db
mkdir -p /workspace/data
GOTOOLCHAIN=auto CGO_ENABLED=0 go run ./cmd/api
```

Terminal 2 — frontend:

```bash
cd frontend
npm run dev
```

The frontend proxies API calls via `/api/backend` using `API_INTERNAL_BASE_URL` (set in `.env` / Compose).

### Lint, test, CI

```bash
make ci       # frontend lint + all tests + compose config check
make test     # backend + frontend tests only
make lint     # ESLint + gofmt check
```

Go requires **1.25** (`backend/go.mod`). System Go may be older — always use `GOTOOLCHAIN=auto`.

Node.js **≥ 22** for the frontend.

### Health / smoke checks

```bash
curl -sS http://localhost:8080/health
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

Example diagnosis (core hello-world):

```bash
curl -sS -X POST http://localhost:8080/v1/diagnose \
  -H "Content-Type: application/json" \
  -d '{"tank":{"name":"Test","volume_liters":180},"water":{"nitrite_mg_l":0.4},"symptoms":[]}'
```

### Key docs

- `README.md` — Quick Start, env vars, API overview
- `docs/api.md` — full API reference
- `Makefile` — all dev targets
- `.ai/workflows.md` — phased development workflow
