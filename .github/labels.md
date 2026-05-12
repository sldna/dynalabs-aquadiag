# GitHub Labels

Empfohlene Labels für Issues und Pull Requests. Bewusst minimal gehalten,
damit Triage und Filter einfach bleiben.

## Type

| Label              | Bedeutung                                              |
|--------------------|--------------------------------------------------------|
| `bug`              | Fehlverhalten oder Regression                          |
| `enhancement`      | neue Funktion oder Verbesserung                        |
| `documentation`    | nur Dokumentation                                      |
| `refactor`         | strukturelle Änderung ohne Verhaltensänderung          |
| `chore`            | Build, CI, Tooling, Abhängigkeiten                     |
| `question`         | Frage / Setup-Hilfe                                    |
| `discussion`       | Themen, die vor einem PR diskutiert werden sollten     |

## Scope

| Label              | Bedeutung                                              |
|--------------------|--------------------------------------------------------|
| `area/backend`     | Go-Backend, REST-API                                   |
| `area/frontend`    | Next.js-UI                                             |
| `area/rules`       | YAML-Regelbasis                                        |
| `area/ai`          | optionaler AI-Explainability-Layer                     |
| `area/docs`        | README, `docs/`, Templates                             |
| `area/ci`          | GitHub Actions, Workflows                              |
| `area/docker`      | Compose, Dockerfile                                    |

## Triage & State

| Label              | Bedeutung                                              |
|--------------------|--------------------------------------------------------|
| `needs-triage`     | wartet auf Erst-Sichtung durch Maintainer:in           |
| `needs-info`       | benötigt zusätzliche Info von Reporter:in              |
| `good first issue` | guter Einstieg für neue Mitwirkende                    |
| `help wanted`      | externe Hilfe willkommen                               |
| `blocked`          | Fortschritt blockiert durch externe Abhängigkeit       |
| `wontfix`          | wird bewusst nicht umgesetzt                           |
| `duplicate`        | bereits in anderem Issue erfasst                       |

## Severity (nur Bugs)

| Label              | Bedeutung                                              |
|--------------------|--------------------------------------------------------|
| `severity/low`     | kosmetisch, kleiner Bug                                |
| `severity/medium`  | spürbar, aber kein Datenverlust                        |
| `severity/high`    | beeinflusst Diagnoseergebnis oder UX deutlich          |
| `severity/critical`| Datenverlust, Crash, Sicherheitsproblem                |

> Tipp: Labels können mit `gh label create` oder dem GitHub-UI angelegt werden.
> Eine Bulk-Anlage über GitHub-CLI ist optional und gehört nicht ins Repo.
