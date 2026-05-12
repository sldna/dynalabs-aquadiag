// Package waterquality provides a deterministic traffic-light style assessment
// of water test parameters.
//
// It is an *orientation layer* for the UI only and intentionally separate from
// the rule engine. The rule engine remains the single source of truth for
// diagnoses; this package only classifies individual measurements and produces
// a small overall status used to badge a water test card.
//
// Thresholds are conservative MVP heuristics for beginner-friendly aquariums.
// Any field that is nil (not measured) is reported as "unknown" and never
// degrades the overall status.
package waterquality

import "aquadiag/backend/internal/models"

// Status is the traffic-light classification for a single measurement
// (or for the whole water test).
type Status string

const (
	StatusGreen   Status = "green"
	StatusYellow  Status = "yellow"
	StatusRed     Status = "red"
	StatusUnknown Status = "unknown"
)

// Item is a single classified water value.
//
// It is intentionally JSON-marshalable for direct embedding in API responses.
type Item struct {
	Key                 string  `json:"key"`
	Label               string  `json:"label"`
	Value               float64 `json:"value"`
	Unit                string  `json:"unit,omitempty"`
	Status              Status  `json:"status"`
	Message             string  `json:"message"`
	RecommendationShort string  `json:"recommendation_short,omitempty"`
}

// Assessment is the bundled traffic-light view for a water test.
type Assessment struct {
	Status Status `json:"water_quality_status"`
	Items  []Item `json:"water_quality_items"`
}

// EvaluateWaterTest produces a traffic-light assessment for one water test.
//
// Only present (non-nil) fields contribute Items. Fields not measured are
// silently omitted so the UI does not surface "missing" values as errors.
// The overall status is derived as documented in README/docs: red beats
// yellow beats green; if no field is evaluable, the overall status is unknown.
func EvaluateWaterTest(rec models.WaterTestRecord) Assessment {
	items := make([]Item, 0, 8)

	if v := rec.NitriteMgL; v != nil {
		items = append(items, evalNitrite(*v))
	}
	if v := rec.AmmoniumMgL; v != nil {
		items = append(items, evalAmmonium(*v))
	}
	if v := rec.NitrateMgL; v != nil {
		items = append(items, evalNitrate(*v))
	}
	if v := rec.PH; v != nil {
		items = append(items, evalPH(*v))
	}
	if v := rec.KhDKH; v != nil {
		items = append(items, evalKH(*v))
	}
	if v := rec.GhDGH; v != nil {
		items = append(items, evalGH(*v))
	}
	if v := rec.TempC; v != nil {
		items = append(items, evalTemperature(*v))
	}
	if v := rec.CO2MgL; v != nil {
		items = append(items, evalCO2(*v))
	}
	if v := rec.OxygenMgL; v != nil {
		items = append(items, evalOxygen(*v))
	}

	return Assessment{
		Status: OverallStatus(items),
		Items:  items,
	}
}

// OverallStatus collapses individual item statuses to one summary value.
//
// Rules:
//   - red, if any item is red
//   - yellow, if at least one yellow exists and no red
//   - green, if at least one evaluable item and all are green
//   - unknown, if no items are evaluable
func OverallStatus(items []Item) Status {
	if len(items) == 0 {
		return StatusUnknown
	}
	hasRed := false
	hasYellow := false
	hasGreen := false
	for _, it := range items {
		switch it.Status {
		case StatusRed:
			hasRed = true
		case StatusYellow:
			hasYellow = true
		case StatusGreen:
			hasGreen = true
		}
	}
	switch {
	case hasRed:
		return StatusRed
	case hasYellow:
		return StatusYellow
	case hasGreen:
		return StatusGreen
	default:
		return StatusUnknown
	}
}

// --- individual evaluators -------------------------------------------------

// nitriteDetectionLimit is the lowest reliably resolvable NO₂ value for the
// usual hobby drop tests (JBL, Sera, Tetra etc.): ~0.01 mg/l. Values up to
// and including this limit are reported as "<0,01 mg/l" by the kit and are
// effectively "not detectable", so they stay green. The next visible test
// step (typically 0,025 mg/l) and anything above is a real detection and
// triggers at least yellow because nitrite is acutely toxic.
const nitriteDetectionLimit = 0.01

// evalNitrite: at or below the test-kit detection limit -> green. Clearly
// above the detection limit but below 0.25 mg/l -> yellow. >= 0.25 mg/l -> red.
func evalNitrite(v float64) Item {
	const key = "no2"
	const label = "Nitrit (NO₂)"
	const unit = "mg/l"
	switch {
	case v <= nitriteDetectionLimit:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:  StatusGreen,
			Message: "An oder unter der Nachweisgrenze – unauffällig.",
		}
	case v < 0.25:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusYellow,
			Message:             "Nitrit ist messbar. Beobachten und Ursache prüfen.",
			RecommendationShort: "Teilwasserwechsel und Fütterung reduzieren.",
		}
	default:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusRed,
			Message:             "Nitrit deutlich erhöht – akut kritisch für Fische.",
			RecommendationShort: "Sofort 30–50 % Wasserwechsel, nicht füttern.",
		}
	}
}

// evalAmmonium: pH/temperature are not known here, so the heuristic stays
// conservative. Any measurable NH3/NH4+ is yellow; >= 0.5 mg/l is red.
func evalAmmonium(v float64) Item {
	const key = "nh3_nh4"
	const label = "Ammonium/Ammoniak (NH₃/NH₄⁺)"
	const unit = "mg/l"
	switch {
	case v <= 0.1:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:  StatusGreen,
			Message: "Unauffällig.",
		}
	case v < 0.5:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusYellow,
			Message:             "Leicht erhöht. Filter und Besatz prüfen.",
			RecommendationShort: "Teilwasserwechsel und Fütterung reduzieren.",
		}
	default:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusRed,
			Message:             "Stark erhöht – bei hohem pH/Temperatur giftig.",
			RecommendationShort: "Großer Wasserwechsel, Fütterung stoppen.",
		}
	}
}

func evalNitrate(v float64) Item {
	const key = "no3"
	const label = "Nitrat (NO₃)"
	const unit = "mg/l"
	switch {
	case v <= 50:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:  StatusGreen,
			Message: "Im üblichen Rahmen.",
		}
	case v <= 100:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusYellow,
			Message:             "Erhöht – regelmäßiger Wasserwechsel sinnvoll.",
			RecommendationShort: "Häufigere Teilwasserwechsel einplanen.",
		}
	default:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusRed,
			Message:             "Deutlich zu hoch – langfristig schädlich.",
			RecommendationShort: "Mehrere Wasserwechsel über Tage, Fütterung prüfen.",
		}
	}
}

func evalPH(v float64) Item {
	const key = "ph"
	const label = "pH-Wert"
	switch {
	case v >= 6.5 && v <= 7.8:
		return Item{
			Key: key, Label: label, Value: v,
			Status:  StatusGreen,
			Message: "Im typischen Bereich für Süßwasseraquarien.",
		}
	case v >= 6.0 && v <= 8.4:
		return Item{
			Key: key, Label: label, Value: v,
			Status:              StatusYellow,
			Message:             "Leicht außerhalb des Optimalbereichs – beobachten.",
			RecommendationShort: "Karbonathärte (KH) prüfen.",
		}
	default:
		return Item{
			Key: key, Label: label, Value: v,
			Status:              StatusRed,
			Message:             "Deutlich außerhalb des Normalbereichs.",
			RecommendationShort: "Werte erneut messen, Wasser anpassen.",
		}
	}
}

func evalKH(v float64) Item {
	const key = "kh"
	const label = "Karbonathärte (KH)"
	const unit = "°dKH"
	switch {
	case v >= 3 && v <= 14:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:  StatusGreen,
			Message: "Stabiler Pufferbereich.",
		}
	case v >= 2 && v <= 17:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusYellow,
			Message:             "Pufferreserve grenzwertig – pH kann schwanken.",
			RecommendationShort: "Wasserwechsel mit angepasstem Wasser.",
		}
	default:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusRed,
			Message:             "Außerhalb des stabilen Pufferbereichs.",
			RecommendationShort: "KH gezielt anpassen und pH beobachten.",
		}
	}
}

func evalGH(v float64) Item {
	const key = "gh"
	const label = "Gesamthärte (GH)"
	const unit = "°dGH"
	switch {
	case v >= 4 && v <= 20:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:  StatusGreen,
			Message: "Üblicher Bereich für viele Besatzarten.",
		}
	case v >= 2 && v <= 25:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusYellow,
			Message:             "Etwas außerhalb des Optimalbereichs.",
			RecommendationShort: "Besatzansprüche und Wasser prüfen.",
		}
	default:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusRed,
			Message:             "Deutlich außerhalb – Besatz prüfen.",
			RecommendationShort: "Wasser anpassen oder geeigneten Besatz wählen.",
		}
	}
}

func evalTemperature(v float64) Item {
	const key = "temperature_c"
	const label = "Temperatur"
	const unit = "°C"
	switch {
	case v >= 22 && v <= 28:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:  StatusGreen,
			Message: "Typischer Temperaturbereich.",
		}
	case v >= 18 && v <= 30:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusYellow,
			Message:             "Außerhalb des Optimalbereichs.",
			RecommendationShort: "Heizung/Standort prüfen.",
		}
	default:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusRed,
			Message:             "Temperatur deutlich außerhalb des sicheren Bereichs.",
			RecommendationShort: "Temperatur langsam korrigieren.",
		}
	}
}

func evalCO2(v float64) Item {
	const key = "co2"
	const label = "Kohlendioxid (CO₂)"
	const unit = "mg/l"
	switch {
	case v >= 15 && v <= 35:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:  StatusGreen,
			Message: "Für Pflanzenbecken im üblichen Rahmen.",
		}
	case v >= 10 && v <= 45:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusYellow,
			Message:             "Leicht außerhalb – Pflanzen- oder Fischverhalten beobachten.",
			RecommendationShort: "CO₂-Eintrag und Belüftung prüfen.",
		}
	default:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusRed,
			Message:             "Deutlich außerhalb des sicheren Bereichs.",
			RecommendationShort: "CO₂-Zufuhr und Belüftung korrigieren.",
		}
	}
}

func evalOxygen(v float64) Item {
	const key = "o2"
	const label = "Sauerstoff (O₂)"
	const unit = "mg/l"
	switch {
	case v >= 6:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:  StatusGreen,
			Message: "Ausreichend für die meisten Fische.",
		}
	case v >= 4:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusYellow,
			Message:             "Knapp – auf Strömung/Belüftung achten.",
			RecommendationShort: "Oberflächenbewegung oder Luftheber zuschalten.",
		}
	default:
		return Item{
			Key: key, Label: label, Value: v, Unit: unit,
			Status:              StatusRed,
			Message:             "Sauerstoff deutlich zu niedrig.",
			RecommendationShort: "Sofort Belüftung erhöhen, Besatz beobachten.",
		}
	}
}
