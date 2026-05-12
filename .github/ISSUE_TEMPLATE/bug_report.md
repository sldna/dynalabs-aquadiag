---
name: Bug Report
about: Ein konkretes Fehlverhalten melden
title: "fix: <kurze Beschreibung>"
labels: ["bug", "needs-triage"]
assignees: []
---

## Erwartetes Verhalten

<!-- Was sollte AquaDiag tun? -->

## Tatsächliches Verhalten

<!-- Was passiert stattdessen? -->

## Reproduktion

Schritt für Schritt, damit andere den Bug nachvollziehen können:

1. ...
2. ...
3. ...

## Screenshots / Aufzeichnung

<!-- Optional, aber sehr hilfreich. -->

## Docker / Compose Logs

<details>
<summary>Backend</summary>

```text
docker compose logs backend | tail -n 200
```

</details>

<details>
<summary>Frontend</summary>

```text
docker compose logs frontend | tail -n 200
```

</details>

## Umgebung

- AquaDiag-Version oder Commit: `git rev-parse --short HEAD`
- Betriebssystem:
- Container-Engine: `docker`/`podman` (Version)
- Browser (falls UI-Bug):
- AI aktiv? `AI_ENABLED=` (true/false)
- Eigene Regeln (`RULES_PATH` angepasst)? ja/nein

## Zusätzlicher Kontext

<!-- Weitere Auffälligkeiten, neuere Änderungen am Setup, Notizen ... -->
