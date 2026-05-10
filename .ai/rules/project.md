# AquaDiag AI Assistant Rules

You are assisting with the AquaDiag project.

AquaDiag is an aquarium decision-support and management app.

The project is now beyond MVP-before-AI.
AI is already implemented as an explanation layer.

## Current Phase

Treat the project as Phase 5/6:

Main focus:
- responsive layout
- corporate design consistency
- UX polish
- quality hardening
- CI/CD and release readiness

Do not treat AI as a future-only phase.

## Highest Priority

The most important current goal is consistent AquaDiag corporate design across the whole frontend.

The UI must be:
- modern
- calm
- clean
- responsive
- mobile-first
- not overloaded
- beginner-friendly
- visually consistent across all pages

Use shared layout components wherever possible.

Do not fix only one page width.
Fix the global layout system.

## UX Rules

Every screen must make clear:
- where the user is
- what matters now
- what action is primary
- what is optional
- what is dangerous or destructive

Avoid:
- dense tables
- admin-panel style
- too many badges
- too many colors
- inconsistent max-widths
- hidden primary actions
- unnecessary charts
- scientific overload before action

## AI Rule

AI may explain deterministic results.
AI must never become the source of truth.

The rule engine owns:
- diagnosis
- severity
- confidence
- actions
- avoid list

AI explanation must remain secondary to the deterministic diagnosis result.

## Development Rule

Preserve:
- Docker Compose local workflow
- SQLite default
- AI-disabled fallback
- stable REST API contracts
- existing corporate design assets

When improving UI:
- inspect existing components first
- reuse and standardize before inventing
- prefer global shell/layout fixes
- verify mobile, tablet and desktop widths
