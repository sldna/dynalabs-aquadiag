import type { DiagnoseAPIResponse } from "@/lib/types";

export function mockDiagnoseResponse(): DiagnoseAPIResponse {
  const now = new Date().toISOString();
  return {
    status: "matched",
    top_diagnosis: {
      rule_id: "oxygen_low_surface_gasping",
      name: "Sauerstoffmangel (wahrscheinlich)",
      diagnosis_type: "oxygen_low",
      severity: "high",
      confidence: 0.82,
      summary_de:
        "Die Symptome passen zu akutem Sauerstoffmangel. Handle zuerst die Belüftung, dann Ursachen eingrenzen.",
      reasoning_de:
        "Mehrere Hinweise deuten auf zu wenig gelösten Sauerstoff hin (z. B. Schnappen an der Oberfläche). Häufige Auslöser sind zu wenig Oberflächenbewegung, starkes CO₂, hohe Temperatur oder biologische Last.\n\nDiese Diagnose ist handlungsorientiert: erst stabilisieren (O₂ hoch), dann Ursachen prüfen.",
      actions_now: [
        "Sofort Oberflächenbewegung erhöhen (Filterauslass nach oben, Strömung).",
        "Zusätzliche Belüftung zuschalten (Luftsprudler) oder Filterleistung erhöhen.",
        "CO₂-Zufuhr pausieren, bis sich die Atmung normalisiert.",
      ],
      actions_optional: [
        "Temperatur schrittweise senken (wenn möglich).",
        "Teilwasserwechsel (20–30%) mit temperiertem Wasser.",
        "Fütterung für 24h reduzieren.",
      ],
      avoid: [
        "Keine Medikamente oder „Wundermittel“ auf Verdacht dosieren.",
        "Nicht gleichzeitig mehrere große Änderungen durchführen.",
      ],
      follow_up_questions_de: [
        "Passiert das Schnappen eher morgens oder durchgehend?",
        "Läuft CO₂ aktuell (Blasenzahl / pH-Schwankungen)?",
        "Gibt es nachts starke Oberflächenruhe (kaum Strömung)?",
      ],
      safety_note_de:
        "Wenn Fische stark apathisch sind oder kippen, ist das ein Notfall: Belüftung sofort maximieren und rasch Wasserwechsel erwägen.",
      facts: [],
    },
    diagnoses: [
      {
        rule_id: "oxygen_low_surface_gasping",
        name: "Sauerstoffmangel (wahrscheinlich)",
        diagnosis_type: "oxygen_low",
        severity: "high",
        confidence: 0.82,
        summary_de:
          "Die Symptome passen zu akutem Sauerstoffmangel. Handle zuerst die Belüftung, dann Ursachen eingrenzen.",
        reasoning_de:
          "Mehrere Hinweise deuten auf zu wenig gelösten Sauerstoff hin (z. B. Schnappen an der Oberfläche).",
        actions_now: [
          "Oberflächenbewegung erhöhen und zusätzliche Belüftung einschalten.",
        ],
        actions_optional: ["Temperatur vorsichtig senken."],
        avoid: ["Keine hektischen Komplett-Umstellungen."],
        follow_up_questions_de: ["Wann tritt es am stärksten auf (morgens/abends)?"],
        safety_note_de:
          "Bei akuter Atemnot sofort belüften und Situation stabilisieren.",
        facts: [],
      },
      {
        rule_id: "co2_too_high_ph_swings",
        name: "CO₂ zu hoch / pH-Schwankungen",
        diagnosis_type: "co2_too_high",
        severity: "medium",
        confidence: 0.46,
        summary_de:
          "CO₂-Überdosierung kann die Atmung belasten und pH instabil machen.",
        reasoning_de:
          "Wenn CO₂ hoch ist und die Oberfläche ruhig, sinkt O₂ oft nachts und morgens ist es am schlimmsten.",
        actions_now: ["CO₂ pausieren und Oberflächenbewegung erhöhen."],
        actions_optional: ["CO₂-Dosierung später neu kalibrieren."],
        avoid: ["CO₂ weiter erhöhen, um pH zu drücken."],
        follow_up_questions_de: ["Wie viele Blasen/Minute und wie ist der pH-Verlauf?"],
        safety_note_de: "",
        facts: [],
      },
    ],
    matched_rules: ["oxygen_low_surface_gasping", "co2_too_high_ph_swings"],
    meta: {
      rule_engine_version: "mock",
      evaluated_rules: 42,
      matched_count: 2,
      generated_at: now,
      diagnosis_id: 123,
      water_test_id: 456,
      tank_id: 1,
    },
  };
}

