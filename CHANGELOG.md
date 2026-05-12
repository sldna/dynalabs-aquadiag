# Changelog

Alle erwähnenswerten Änderungen werden hier dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/)
und wir verwenden [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Added
- Open-Source-Launch-Vorbereitung (Phase M4):
  - `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
  - GitHub Issue- & PR-Templates (`.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md`)
  - Empfohlene Label-Liste (`.github/labels.md`)
  - Erweiterte CI: Backend `gofmt`, `go vet`, `go test` + Compose-Config-Check + Buildx-Cache
  - `Makefile` mit Standard-Dev-Commands (`make up`, `make test`, `make lint`, `make fmt`, …)
  - `docs/architecture.md`, `docs/api.md`, `docs/screenshots/.gitkeep`
  - `.editorconfig`, `.gitattributes`
  - gehärtete `.gitignore` (Secrets, SQLite-Varianten, Build-Artefakte)
- README komplett überarbeitet (Quick Start oben, Screenshots-Sektion,
  AI-Konfiguration klar erklärt, Roadmap, Contributing-Verweis)

### Changed
- `.env.example` strukturiert mit Sektions-Kommentaren (App, Ports, DB,
  Regeln, AI, API/CORS)

### Notes
- Lizenz bleibt **PolyForm Noncommercial License 1.0.0** (siehe `LICENSE`).

## [0.1.0] – geplant

Erste öffentliche Markierung. Inhalt entspricht dem aktuellen `main` zum
Zeitpunkt des Tags `v0.1.0`.

[Unreleased]: https://github.com/sldna/dynalabs-aquadiag/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sldna/dynalabs-aquadiag/releases/tag/v0.1.0
