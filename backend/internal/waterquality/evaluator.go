// Package waterquality provides a deterministic traffic-light style assessment
// of water test parameters aligned with JBL PROAQUATEST hobby ranges.
//
// It is an *orientation layer* for the UI only and intentionally separate from
// the rule engine. The rule engine remains the single source of truth for
// diagnoses; this package only classifies individual measurements and produces
// a small overall status used to badge a water test card.
//
// Any field that is nil (not measured) is omitted and never degrades the
// overall status.
package waterquality

import "aquadiag/backend/internal/models"

// Status is the traffic-light classification for a single measurement
// (or for the whole water test).
type Status string

const (
	StatusGreen    Status = "green"
	StatusObserve  Status = "observe"
	StatusWarning  Status = "warning"
	StatusCritical Status = "critical"
	StatusUnknown  Status = "unknown"
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
	StatusLabel         string  `json:"status_label,omitempty"`
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
// silently omitted. The overall status is the worst present item status:
// critical > warning > observe > green; if no field is evaluable, unknown.
func EvaluateWaterTest(rec models.WaterTestRecord) Assessment {
	ctx := EvalContext{PH: rec.PH, TempC: rec.TempC}
	items := make([]Item, 0, 8)

	appendItem := func(key string, v float64) {
		wr := EvaluateWaterValueWithContext(key, v, ProfileFreshwaterCommunity, ctx)
		items = append(items, resultToItem(wr))
	}

	if v := rec.NitriteMgL; v != nil {
		appendItem("no2", *v)
	}
	if v := rec.AmmoniumMgL; v != nil {
		appendItem("nh3_nh4", *v)
	}
	if v := rec.NitrateMgL; v != nil {
		appendItem("no3", *v)
	}
	if v := rec.PH; v != nil {
		appendItem("ph", *v)
	}
	if v := rec.KhDKH; v != nil {
		appendItem("kh", *v)
	}
	if v := rec.GhDGH; v != nil {
		appendItem("gh", *v)
	}
	if v := rec.TempC; v != nil {
		appendItem("temperature_c", *v)
	}
	if v := rec.CO2MgL; v != nil {
		appendItem("co2", *v)
	}
	if v := rec.OxygenMgL; v != nil {
		appendItem("o2", *v)
	}

	return Assessment{
		Status: OverallStatus(items),
		Items:  items,
	}
}

func resultToItem(wr WaterValueResult) Item {
	return Item{
		Key:                 wr.Parameter,
		Label:               parameterLabelDE(wr.Parameter),
		Value:               wr.Value,
		Unit:                wr.Unit,
		Status:              wr.Status,
		StatusLabel:         wr.StatusLabel,
		Message:             wr.Message,
		RecommendationShort: wr.RecommendationShort,
	}
}

func parameterLabelDE(key string) string {
	switch key {
	case "ph":
		return "pH-Wert"
	case "kh":
		return "Karbonathärte (KH)"
	case "gh":
		return "Gesamthärte (GH)"
	case "no2":
		return "Nitrit (NO₂)"
	case "no3":
		return "Nitrat (NO₃)"
	case "nh3_nh4":
		return "Ammonium/Ammoniak (NH₃/NH₄⁺)"
	case "temperature_c":
		return "Temperatur"
	case "co2":
		return "Kohlendioxid (CO₂)"
	case "o2":
		return "Sauerstoff (O₂)"
	default:
		return key
	}
}

// OverallStatus collapses individual item statuses to one summary value.
func OverallStatus(items []Item) Status {
	if len(items) == 0 {
		return StatusUnknown
	}
	worst := StatusGreen
	worstRank := severityRank(worst)
	for _, it := range items {
		r := severityRank(it.Status)
		if r > worstRank {
			worstRank = r
			worst = it.Status
		}
	}
	if worstRank == 0 {
		return StatusUnknown
	}
	return worst
}
