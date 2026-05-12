# Security Policy

Vielen Dank, dass du die Sicherheit von AquaDiag mitdenkst.

AquaDiag ist eine **lokal betreibbare Entscheidungshilfe** ohne Authentifizierung,
ohne Cloud-Anbindung und ohne Bezahlfunktion. Trotzdem behandeln wir
Schwachstellen ernst – insbesondere alles, was Daten der Nutzer:innen, die
Integrität der Regel-Engine oder den AI-Erklärungslayer betrifft.

---

## Unterstützte Versionen

Wir unterstützen jeweils die aktuelle Minor-Version. Sicherheitsfixes werden
nur dort eingespielt; ältere Versionen müssen aktualisiert werden.

| Version          | Status                          |
|------------------|---------------------------------|
| `0.1.x`          | aktiv unterstützt (Pre-Release) |
| `< 0.1.0`        | nicht unterstützt               |

Die erste öffentliche Markierung erfolgt mit dem Release-Tag `v0.1.0`. Bis dahin
gilt der `main`-Branch als aktuell unterstützter Stand.

---

## Eine Schwachstelle melden

**Bitte keine öffentlichen Issues für Sicherheitslücken eröffnen.**

Wir bevorzugen eine **verantwortungsvolle Offenlegung** (responsible disclosure)
über einen der folgenden Wege:

1. **GitHub Security Advisory** – bevorzugt:
   `Repository → Security → Advisories → Report a vulnerability`
2. **E-Mail** an die im Repository hinterlegten Maintainer (siehe
   `git log -- .` für aktuelle Maintainer-Adressen). Verschlüsselte Kommunikation
   ist auf Anfrage möglich.

Bitte gib mit der Meldung folgende Informationen mit, soweit verfügbar:

- betroffene Komponente (Backend, Frontend, Regel-Engine, AI-Layer, Compose-Setup)
- AquaDiag-Version oder Commit-Hash
- Schritt-für-Schritt-Reproduktion
- Auswirkung (Datenverlust, Code-Execution, DoS, Datenleak usw.)
- Vorschlag zur Behebung, falls vorhanden

### Reaktionszeiten

Wir nehmen jede Meldung ernst und melden uns in der Regel innerhalb von

- **3 Werktagen** mit einer Eingangsbestätigung,
- **14 Tagen** mit einer ersten Einschätzung (Severity, geplanter Fix-Zeitraum).

Wir koordinieren das Veröffentlichungsfenster gerne mit dir.

---

## Was als Sicherheitsthema gilt

Beispiele, die wir behandeln:

- Remote Code Execution, SQL Injection, Path Traversal, SSRF
- Authentifizierungs- oder Autorisierungsumgehungen
- unsachgemäße Behandlung von API-Keys oder anderen Secrets
- Manipulation der Regel-Engine (z. B. unzulässige YAML-Inhalte, die das Backend
  zum Absturz oder zu falschen Diagnosen bringen)
- AI-Layer-Probleme, die die deterministische Diagnose außer Kraft setzen
- Container-Sicherheit (z. B. unnötige Privilegien, geleakte Builds)

Keine Sicherheitsthemen im engeren Sinn (bitte als reguläres Issue eröffnen):

- UX-Probleme, ohne Datenbezug
- Wünsche nach neuen Features
- Hinweise zu Best Practices ohne konkrete Schwachstelle

---

## Secrets & Konfiguration

Bitte beachte beim Beitragen und Betreiben:

- **Niemals echte API-Keys committen.** `.env` ist in `.gitignore`.
- Nur `.env.example` ist eingecheckt und enthält ausschließlich Beispielwerte.
- Externe AI-Aufrufe sind optional. Mit `AI_ENABLED=false` (Default) gehen keine
  Daten an Dritte.
- Bitte keine sensiblen Eingaben (Adressen, Personennamen) in Issues oder PRs.

---

## Veröffentlichung & Credit

Nach Behebung einer Schwachstelle veröffentlichen wir eine Notiz im Release-
Changelog und im GitHub Security Advisory. Auf Wunsch nennen wir dich
namentlich; alternativ bleibt die Meldung anonym.
