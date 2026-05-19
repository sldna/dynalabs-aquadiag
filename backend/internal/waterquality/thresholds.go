package waterquality

import "math"

// ProfileFreshwaterCommunity is the default V1 tank profile (community freshwater).
const ProfileFreshwaterCommunity = "freshwater_community"

// WaterValueResult is the classification for one measured parameter.
type WaterValueResult struct {
	Parameter           string
	Value               float64
	Unit                string
	Status              Status
	StatusLabel         string
	Message             string
	RecommendationShort string
}

// EvalContext carries optional fields for pH-dependent NH₃ assessment.
type EvalContext struct {
	PH    *float64
	TempC *float64
}

// EvaluateWaterValue classifies a single measurement for the given profile.
// Unknown profile names fall back to ProfileFreshwaterCommunity.
// Missing or unsupported parameters return status unknown.
func EvaluateWaterValue(parameter string, value float64, profile string) WaterValueResult {
	return EvaluateWaterValueWithContext(parameter, value, profile, EvalContext{})
}

// EvaluateWaterValueWithContext is like EvaluateWaterValue but may refine NH₄
// messaging when pH and temperature are present.
func EvaluateWaterValueWithContext(parameter string, value float64, profile string, ctx EvalContext) WaterValueResult {
	if profile == "" {
		profile = ProfileFreshwaterCommunity
	}
	switch profile {
	case ProfileFreshwaterCommunity:
		return evalFreshwaterCommunity(parameter, value, ctx)
	default:
		return evalFreshwaterCommunity(parameter, value, ctx)
	}
}

func evalFreshwaterCommunity(parameter string, value float64, ctx EvalContext) WaterValueResult {
	switch parameter {
	case "ph", "pH":
		return evalPHFreshwater(value)
	case "kh", "kh_dkh":
		return evalKHFreshwater(value)
	case "gh", "gh_dgh":
		return evalGHFreshwater(value)
	case "no2", "nitrite_mg_l":
		return evalNO2Freshwater(value)
	case "no3", "nitrate_mg_l":
		return evalNO3Freshwater(value)
	case "nh4", "nh3_nh4", "ammonium_mg_l":
		return evalNH4Freshwater(value, ctx)
	case "temperature_c", "temp_c":
		return evalTempFreshwater(value)
	case "co2", "co2_mg_l":
		return evalCO2Legacy(value)
	case "o2", "oxygen_mg_l":
		return evalOxygenLegacy(value)
	default:
		return WaterValueResult{
			Parameter:   parameter,
			Value:       value,
			Status:      StatusUnknown,
			StatusLabel: "Nicht bewertet",
			Message:     "Für diesen Parameter liegen keine JBL-Grenzwerte vor.",
		}
	}
}

func evalPHFreshwater(v float64) WaterValueResult {
	r := WaterValueResult{Parameter: "ph", Value: v}
	switch {
	case inClosed(v, 6.8, 8.2):
		return r.with(StatusGreen, "im JBL-Normalbereich",
			"pH liegt im üblichen Bereich für Süßwasser-Gesellschaftsaquarien.", "")
	case inClosed(v, 6.5, 6.79) || inClosed(v, 8.21, 8.5):
		return r.with(StatusObserve, "leicht außerhalb",
			"pH weicht etwas ab – beobachten und bei Bedarf erneut messen.",
			"Karbonathärte (KH) parallel prüfen.")
	case inClosed(v, 6.0, 6.49) || inClosed(v, 8.51, 9.0):
		return r.with(StatusWarning, "deutlich außerhalb",
			"pH liegt deutlich außerhalb des JBL-Normalbereichs.",
			"Werte erneut messen; Anpassung nur schrittweise.")
	default:
		return r.with(StatusCritical, "kritisch",
			"pH ist extrem – Stabilität und Besatz ernsthaft prüfen.",
			"Keine großen pH-Sprünge ohne Verlauf.")
	}
}

func evalKHFreshwater(v float64) WaterValueResult {
	r := WaterValueResult{Parameter: "kh", Value: v, Unit: "°dKH"}
	switch {
	case inClosed(v, 5, 16):
		return r.with(StatusGreen, "im JBL-Normalbereich", "KH liegt im stabilen Pufferbereich.", "")
	case inClosed(v, 3, 4) || inClosed(v, 17, 20):
		return r.with(StatusObserve, "leicht außerhalb",
			"KH ist grenzwertig – pH kann stärker schwanken.", "Verlauf beobachten.")
	case inClosed(v, 1, 2) || inClosed(v, 21, 25):
		return r.with(StatusWarning, "deutlich außerhalb",
			"KH ist deutlich außerhalb des JBL-Normalbereichs.", "KH und pH gemeinsam bewerten.")
	default:
		return r.with(StatusCritical, "kritisch",
			"KH ist extrem niedrig oder hoch – Pufferung gefährdet.",
			"Anpassung nur mit klarer Strategie.")
	}
}

func evalGHFreshwater(v float64) WaterValueResult {
	r := WaterValueResult{Parameter: "gh", Value: v, Unit: "°dGH"}
	switch {
	case inClosed(v, 8, 25):
		return r.with(StatusGreen, "im JBL-Normalbereich", "GH liegt im üblichen Bereich.", "")
	case inClosed(v, 5, 7) || inClosed(v, 26, 30):
		return r.with(StatusObserve, "leicht außerhalb",
			"GH weicht etwas ab – Besatzansprüche prüfen.", "")
	case inClosed(v, 3, 4) || inClosed(v, 31, 35):
		return r.with(StatusWarning, "deutlich außerhalb",
			"GH liegt deutlich außerhalb des JBL-Normalbereichs.", "Wasser und Besatz abstimmen.")
	default:
		return r.with(StatusCritical, "kritisch",
			"GH ist extrem – Mineralgehalt passt vermutlich nicht zum Besatz.",
			"Wasseranpassung nur schrittweise.")
	}
}

func evalNO2Freshwater(v float64) WaterValueResult {
	r := WaterValueResult{Parameter: "no2", Value: v, Unit: "mg/l"}
	switch {
	case v >= 0 && v <= 0.1:
		return r.with(StatusGreen, "im JBL-Normalbereich",
			"Nitrit liegt im unkritischen Bereich.", "")
	case v > 0.1 && v <= 0.2:
		return r.with(StatusObserve, "leicht erhöht",
			"Nitrit ist leicht messbar – beobachten und Ursache prüfen.", "")
	case v > 0.2 && v <= 0.5:
		return r.with(StatusWarning, "erhöht",
			"Nitrit ist erhöht – Filter und Fütterung prüfen.",
			"Teilwasserwechsel und Fütterung reduzieren.")
	default:
		return r.with(StatusCritical, "kritisch",
			"Nitrit ist kritisch erhöht – akut belastend für Fische.",
			"Sofort 30–50 % Wasserwechsel, nicht füttern.")
	}
}

func evalNO3Freshwater(v float64) WaterValueResult {
	r := WaterValueResult{Parameter: "no3", Value: v, Unit: "mg/l"}
	switch {
	case v == 0:
		return r.with(StatusObserve, "sehr niedrig",
			"Nitrat ist nicht messbar – für Fische meist unkritisch; bei Pflanzen ggf. Düngung prüfen.", "")
	case inClosed(v, 1, 30):
		return r.with(StatusGreen, "im JBL-Normalbereich",
			"Nitrat liegt im üblichen Bereich.", "")
	case v > 30 && v <= 50:
		return r.with(StatusObserve, "leicht erhöht",
			"Nitrat ist erhöht – regelmäßiger Teilwasserwechsel sinnvoll.", "")
	case v > 50 && v <= 100:
		return r.with(StatusWarning, "deutlich erhöht",
			"Nitrat ist deutlich erhöht – Fütterung und Mulm prüfen.",
			"Häufigere Teilwasserwechsel einplanen.")
	default:
		return r.with(StatusCritical, "kritisch",
			"Nitrat ist sehr hoch – langfristig belastend.",
			"Mehrere Teilwasserwechsel über Tage, Fütterung prüfen.")
	}
}

func evalNH4Freshwater(v float64, ctx EvalContext) WaterValueResult {
	r := WaterValueResult{Parameter: "nh3_nh4", Value: v, Unit: "mg/l"}
	msgExtra := nh4PHDependentNote(ctx)

	switch {
	case v >= 0 && v <= 0.1:
		msg := "Ammonium liegt im unkritischen Bereich."
		if msgExtra != "" {
			msg += " " + msgExtra
		}
		return r.with(StatusGreen, "im JBL-Normalbereich", msg, "")
	case v > 0.1 && v <= 0.2:
		msg := "Ammonium leicht erhöht – Filter und Fütterung beobachten."
		if msgExtra != "" {
			msg += " " + msgExtra
		}
		return r.with(StatusObserve, "leicht erhöht", msg, "")
	case v > 0.2 && v <= 0.5:
		msg := "Ammonium erhöht – Belastung für Fische möglich."
		if msgExtra != "" {
			msg += " " + msgExtra
		}
		return r.with(StatusWarning, "erhöht", msg, "Teilwasserwechsel und Fütterung reduzieren.")
	default:
		msg := "Ammonium kritisch erhöht."
		if msgExtra != "" {
			msg += " " + msgExtra
		}
		return r.with(StatusCritical, "kritisch", msg, "Großer Wasserwechsel, Fütterung stoppen.")
	}
}

// nh4PHDependentNote adds a calm hint when pH/temperature suggest NH₃ relevance.
func nh4PHDependentNote(ctx EvalContext) string {
	if ctx.PH == nil || ctx.TempC == nil {
		return ""
	}
	ph := *ctx.PH
	temp := *ctx.TempC
	if ph >= 7.5 && temp >= 24 {
		frac := approximateNH3Fraction(ph)
		if frac >= 0.05 {
			return "Bei diesem pH und dieser Temperatur kann der giftige NH₃-Anteil relevanter werden – Verlauf beobachten."
		}
	}
	if ph >= 8.0 {
		return "Bei höherem pH ist der NH₃-Anteil pH-abhängig – Verlauf messen, keine Panik bei 0,1 mg/l NH₄."
	}
	return ""
}

func evalTempFreshwater(v float64) WaterValueResult {
	r := WaterValueResult{Parameter: "temperature_c", Value: v, Unit: "°C"}
	switch {
	case inClosed(v, 21, 28):
		return r.with(StatusGreen, "im JBL-Normalbereich", "Temperatur liegt im üblichen Bereich.", "")
	case inClosed(v, 19, 20.9) || inClosed(v, 28.1, 30):
		return r.with(StatusObserve, "leicht außerhalb",
			"Temperatur weicht etwas ab – Heizung und Raumtemperatur prüfen.", "")
	case inClosed(v, 16, 18.9) || inClosed(v, 30.1, 32):
		return r.with(StatusWarning, "deutlich außerhalb",
			"Temperatur liegt deutlich außerhalb des JBL-Normalbereichs.",
			"Langsam korrigieren, nicht schockartig.")
	default:
		return r.with(StatusCritical, "kritisch",
			"Temperatur ist extrem – Fische können stark belastet sein.",
			"Temperatur langsam in den Zielbereich bringen.")
	}
}

// CO₂ and O₂ keep pragmatic hobby ranges (not JBL card primary focus in V1).
func evalCO2Legacy(v float64) WaterValueResult {
	r := WaterValueResult{Parameter: "co2", Value: v, Unit: "mg/l"}
	switch {
	case inClosed(v, 15, 35):
		return r.with(StatusGreen, "im üblichen Bereich", "CO₂ für Pflanzenbecken im üblichen Rahmen.", "")
	case inClosed(v, 10, 45):
		return r.with(StatusObserve, "leicht außerhalb",
			"CO₂ leicht außerhalb – Pflanzen- und Fischverhalten beobachten.", "CO₂-Eintrag prüfen.")
	default:
		return r.with(StatusWarning, "deutlich außerhalb",
			"CO₂ deutlich außerhalb – Belüftung und Dosierung prüfen.", "CO₂-Zufuhr anpassen.")
	}
}

func evalOxygenLegacy(v float64) WaterValueResult {
	r := WaterValueResult{Parameter: "o2", Value: v, Unit: "mg/l"}
	switch {
	case v >= 6:
		return r.with(StatusGreen, "im üblichen Bereich", "Sauerstoff ausreichend für die meisten Fische.", "")
	case v >= 4:
		return r.with(StatusObserve, "knapp",
			"Sauerstoff knapp – auf Strömung und Belüftung achten.", "Oberflächenbewegung erhöhen.")
	default:
		return r.with(StatusWarning, "zu niedrig",
			"Sauerstoff deutlich zu niedrig.", "Sofort Belüftung erhöhen.")
	}
}

func (r WaterValueResult) with(status Status, statusLabel, message, rec string) WaterValueResult {
	r.Status = status
	r.StatusLabel = statusLabel
	r.Message = message
	r.RecommendationShort = rec
	return r
}

func inClosed(v, lo, hi float64) bool {
	return v >= lo && v <= hi
}

// severityRank orders statuses for OverallStatus (higher = worse).
func severityRank(s Status) int {
	switch s {
	case StatusCritical:
		return 4
	case StatusWarning:
		return 3
	case StatusObserve:
		return 2
	case StatusGreen:
		return 1
	default:
		return 0
	}
}

// approximateNH3Fraction returns an approximate NH₃ fraction of total ammonia at
// given pH (25 °C reference) for optional risk hints only — not a diagnosis input.
func approximateNH3Fraction(pH float64) float64 {
	// Henderson–Hasselbalch style: fraction NH₃ increases with pH.
	// pKa ~9.25 at 25°C; simplified for UI hints.
	pKa := 9.25
	return 1.0 / (1.0 + math.Pow(10, pKa-pH))
}
