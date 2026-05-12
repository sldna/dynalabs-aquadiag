# =============================================================================
# AquaDiag – Developer Makefile
# Convenience-Targets rund um Docker Compose, Backend (Go) und Frontend (Next).
# Nichts hier ist Voraussetzung; jeder Befehl funktioniert auch ohne Makefile.
# =============================================================================

SHELL := /usr/bin/env bash

# Compose-Binary: bevorzugt `docker compose`, Fallback `podman-compose`.
COMPOSE ?= $(shell command -v docker >/dev/null 2>&1 && echo "docker compose" || echo "podman-compose")

BACKEND_DIR  := backend
FRONTEND_DIR := frontend

.DEFAULT_GOAL := help

# -----------------------------------------------------------------------------
# Hilfe
# -----------------------------------------------------------------------------

.PHONY: help
help: ## Diese Hilfe anzeigen
	@awk 'BEGIN {FS = ":.*?## "; printf "Verfügbare Targets:\n\n"} \
	/^[a-zA-Z0-9_.-]+:.*?## / {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}' \
	$(MAKEFILE_LIST)

# -----------------------------------------------------------------------------
# Docker Compose (Top-Level)
# -----------------------------------------------------------------------------

.PHONY: up
up: ## Stack bauen und starten (im Vordergrund)
	$(COMPOSE) up --build

.PHONY: up-d
up-d: ## Stack im Hintergrund starten
	$(COMPOSE) up --build -d

.PHONY: down
down: ## Stack stoppen und Container entfernen
	$(COMPOSE) down

.PHONY: logs
logs: ## Compose-Logs (follow)
	$(COMPOSE) logs -f

.PHONY: ps
ps: ## Laufende Services
	$(COMPOSE) ps

.PHONY: compose-config
compose-config: ## docker compose config validieren
	$(COMPOSE) config --quiet

# -----------------------------------------------------------------------------
# Backend (Go)
# -----------------------------------------------------------------------------

.PHONY: backend-test
backend-test: ## Go-Tests ausführen
	cd $(BACKEND_DIR) && go test ./...

.PHONY: backend-fmt
backend-fmt: ## Go-Code formatieren
	cd $(BACKEND_DIR) && gofmt -w cmd internal

.PHONY: backend-fmt-check
backend-fmt-check: ## Prüfen, ob gofmt sauber ist (CI)
	@cd $(BACKEND_DIR) && diff=$$(gofmt -l cmd internal); \
	if [ -n "$$diff" ]; then \
		echo "gofmt findings:"; echo "$$diff"; exit 1; \
	fi

.PHONY: backend-vet
backend-vet: ## go vet
	cd $(BACKEND_DIR) && go vet ./...

.PHONY: backend-run
backend-run: ## Backend lokal starten (CGO_ENABLED=0)
	cd $(BACKEND_DIR) && CGO_ENABLED=0 go run ./cmd/api

# -----------------------------------------------------------------------------
# Frontend (Next.js)
# -----------------------------------------------------------------------------

.PHONY: frontend-install
frontend-install: ## npm-Abhängigkeiten installieren
	cd $(FRONTEND_DIR) && npm install

.PHONY: frontend-dev
frontend-dev: ## Next.js Dev-Server starten
	cd $(FRONTEND_DIR) && npm run dev

.PHONY: frontend-lint
frontend-lint: ## ESLint ausführen
	cd $(FRONTEND_DIR) && npm run lint

.PHONY: frontend-test
frontend-test: ## Vitest ausführen
	cd $(FRONTEND_DIR) && npm test

.PHONY: frontend-build
frontend-build: ## Next.js Produktions-Build
	cd $(FRONTEND_DIR) && npm run build

# -----------------------------------------------------------------------------
# Sammel-Targets
# -----------------------------------------------------------------------------

.PHONY: fmt
fmt: backend-fmt ## Alle Formatierer ausführen

.PHONY: test
test: backend-test frontend-test ## Alle Tests ausführen

.PHONY: lint
lint: frontend-lint backend-fmt-check ## Lint- und Format-Checks (CI-Stil)

.PHONY: ci
ci: lint test compose-config ## Lokales CI-Pendant: lint + test + compose config

# -----------------------------------------------------------------------------
# Cleanup
# -----------------------------------------------------------------------------

.PHONY: clean
clean: ## Build- und Cache-Artefakte entfernen (lokal)
	rm -rf $(FRONTEND_DIR)/.next $(FRONTEND_DIR)/out $(FRONTEND_DIR)/coverage $(FRONTEND_DIR)/.turbo
	rm -f  $(FRONTEND_DIR)/tsconfig.tsbuildinfo
	rm -rf $(BACKEND_DIR)/bin $(BACKEND_DIR)/dist
	rm -f  $(BACKEND_DIR)/coverage.out $(BACKEND_DIR)/coverage.html

.PHONY: clean-data
clean-data: ## Lokale SQLite-Dateien außerhalb von Docker entfernen
	@find . -maxdepth 3 -name "*.db" -not -path "*/node_modules/*" -print -delete
	@find . -maxdepth 3 -name "*.sqlite*" -not -path "*/node_modules/*" -print -delete

.PHONY: clean-all
clean-all: clean ## Vollständiger Cleanup inkl. node_modules
	rm -rf $(FRONTEND_DIR)/node_modules
