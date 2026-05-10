package rules

import (
	"fmt"
	"sort"
	"strings"

	"aquadiag/backend/internal/models"
)

const (
	maxSymptomBonusSum = 0.22
	maxWaterBonusSum   = 0.18
)

func ruleBaseConfidence(r Rule) float64 {
	if r.ConfidenceBase != nil {
		return clamp01(*r.ConfidenceBase)
	}
	return clamp01(r.Confidence)
}

func hasExcludedSymptomOverlap(userSyms []string, exclude []string) bool {
	if len(exclude) == 0 {
		return false
	}
	have := symptomSet(userSyms)
	for _, ex := range exclude {
		if _, ok := have[normSym(ex)]; ok {
			return true
		}
	}
	return false
}

func symptomSet(have []string) map[string]struct{} {
	out := make(map[string]struct{}, len(have))
	for _, s := range have {
		s = normSym(s)
		if s != "" {
			out[s] = struct{}{}
		}
	}
	return out
}

func collectSymptomsFromWhen(w When, out map[string]struct{}) {
	if w.Not != nil {
		collectSymptomsFromWhen(*w.Not, out)
	}
	for _, c := range w.All {
		collectSymptomsFromWhen(c, out)
	}
	for _, c := range w.Any {
		collectSymptomsFromWhen(c, out)
	}
	f := strings.TrimSpace(strings.ToLower(w.Field))
	if f != "symptoms" {
		return
	}
	if w.Contains != nil {
		out[normSym(*w.Contains)] = struct{}{}
	}
	for _, s := range w.ContainsAny {
		out[normSym(s)] = struct{}{}
	}
	for _, s := range w.ContainsAll {
		out[normSym(s)] = struct{}{}
	}
}

func collectNumericFieldsFromWhen(w When, out map[string]struct{}) {
	if w.Not != nil {
		collectNumericFieldsFromWhen(*w.Not, out)
	}
	for _, c := range w.All {
		collectNumericFieldsFromWhen(c, out)
	}
	for _, c := range w.Any {
		collectNumericFieldsFromWhen(c, out)
	}
	f := strings.TrimSpace(strings.ToLower(w.Field))
	if f == "" || f == "symptoms" || !hasNumericComparator(w) {
		return
	}
	if isNumericRuleField(f) {
		out[f] = struct{}{}
	}
}

func computeExtras(r Rule, in EvalInput, base float64) (*models.ScoreBreakdown, []string, []models.WaterValueSignal, []string) {
	have := symptomSet(in.Symptoms)

	refSyms := make(map[string]struct{})
	collectSymptomsFromWhen(r.When, refSyms)

	symptomBonuses := map[string]float64{}
	for sym, w := range r.SymptomWeights {
		ns := normSym(sym)
		if ns == "" || w <= 0 {
			continue
		}
		if _, ok := have[ns]; ok {
			symptomBonuses[ns] += w
		}
	}

	symptomRaw := 0.0
	for _, v := range symptomBonuses {
		symptomRaw += v
	}
	symptomApplied := symptomRaw
	if symptomApplied > maxSymptomBonusSum {
		symptomApplied = maxSymptomBonusSum
	}

	waterBonuses := map[string]float64{}
	waterConditionParts := make([]string, 0, len(r.WaterBoosts))
	for i, wb := range r.WaterBoosts {
		if wb.Add <= 0 {
			continue
		}
		if evalWhen(wb.When, in) {
			key := waterBoostKey(wb.When, i)
			waterBonuses[key] = wb.Add
			waterConditionParts = append(waterConditionParts, formatWaterBoostDE(wb.When, wb.Add))
		}
	}

	waterRaw := 0.0
	for _, v := range waterBonuses {
		waterRaw += v
	}
	waterApplied := waterRaw
	if waterApplied > maxWaterBonusSum {
		waterApplied = maxWaterBonusSum
	}

	total := clamp01(base + symptomApplied + waterApplied)

	sb := &models.ScoreBreakdown{
		Base:            base,
		SymptomBonuses:  symptomBonuses,
		WaterBonuses:    waterBonuses,
		SymptomSubtotal: symptomApplied,
		WaterSubtotal:   waterApplied,
		CappedTotal:     total,
	}

	matchedSymptoms := make([]string, 0)
	seenSym := make(map[string]struct{})
	addSym := func(s string) {
		s = normSym(s)
		if s == "" {
			return
		}
		if _, ok := seenSym[s]; ok {
			return
		}
		seenSym[s] = struct{}{}
		matchedSymptoms = append(matchedSymptoms, s)
	}
	for s := range have {
		if _, ok := refSyms[s]; ok {
			addSym(s)
		}
		if _, ok := symptomBonuses[s]; ok {
			addSym(s)
		}
	}
	sort.Strings(matchedSymptoms)

	refWater := make(map[string]struct{})
	collectNumericFieldsFromWhen(r.When, refWater)
	matchedWater := make([]models.WaterValueSignal, 0)
	for f := range refWater {
		sig := waterSignalFromInput(f, in)
		if sig != nil {
			matchedWater = append(matchedWater, *sig)
		}
	}
	sort.Slice(matchedWater, func(i, j int) bool {
		return matchedWater[i].Field < matchedWater[j].Field
	})

	conditions := make([]string, 0, len(matchedSymptoms)+len(waterConditionParts)+len(matchedWater))
	for _, s := range matchedSymptoms {
		if lab := symptomConditionDE(s); lab != "" {
			conditions = append(conditions, lab)
		}
	}
	conditions = append(conditions, waterConditionParts...)
	for _, w := range matchedWater {
		conditions = append(conditions, fmt.Sprintf("%s: %.4g %s", w.LabelDE, w.Value, strings.TrimSpace(w.Unit)))
	}

	sort.Strings(conditions)

	return sb, matchedSymptoms, matchedWater, conditions
}

func waterBoostKey(w When, idx int) string {
	f, ok := singleNumericLeafField(w)
	if ok {
		return fmt.Sprintf("%s_boost", f)
	}
	return fmt.Sprintf("water_boost_%d", idx)
}

func singleNumericLeafField(w When) (string, bool) {
	if w.Not != nil || len(w.All) > 0 || len(w.Any) > 0 {
		return "", false
	}
	f := strings.TrimSpace(strings.ToLower(w.Field))
	if f == "" || f == "symptoms" || !hasNumericComparator(w) {
		return "", false
	}
	if !isNumericRuleField(f) {
		return "", false
	}
	return f, true
}

func formatWaterBoostDE(w When, add float64) string {
	f, ok := singleNumericLeafField(w)
	if !ok {
		return fmt.Sprintf("Zusätzliches Wasser-Signal (Zuschlag zur Einordnung +%.2f)", add)
	}
	label := waterFieldLabelDE(f)
	switch {
	case w.Gte != nil:
		return fmt.Sprintf("%s über dem Schwellenwert (Zuschlag +%.2f)", label, add)
	case w.Gt != nil:
		return fmt.Sprintf("%s über dem Schwellenwert (Zuschlag +%.2f)", label, add)
	case w.Lte != nil:
		return fmt.Sprintf("%s unter dem Schwellenwert (Zuschlag +%.2f)", label, add)
	case w.Lt != nil:
		return fmt.Sprintf("%s unter dem Schwellenwert (Zuschlag +%.2f)", label, add)
	default:
		return fmt.Sprintf("%s: Bedingung für Zusatzgewicht erfüllt (+%.2f)", label, add)
	}
}

func waterSignalFromInput(field string, in EvalInput) *models.WaterValueSignal {
	field = strings.TrimSpace(strings.ToLower(field))
	v, ok := numericField(field, in)
	if !ok || v == nil {
		return nil
	}
	return &models.WaterValueSignal{
		Field:   field,
		LabelDE: waterFieldLabelDE(field),
		Value:   *v,
		Unit:    waterFieldUnit(field),
	}
}

func waterFieldLabelDE(field string) string {
	switch strings.TrimSpace(strings.ToLower(field)) {
	case "ph":
		return "pH"
	case "kh_dkh", "kh":
		return "KH (Karbonathärte)"
	case "gh_dgh", "gh":
		return "GH (Gesamthärte)"
	case "temp_c":
		return "Temperatur"
	case "nitrite_mg_l", "nitrite_ppm":
		return "Nitrit"
	case "nitrate_mg_l", "nitrate_ppm":
		return "Nitrat"
	case "ammonium_mg_l", "ammonia_ppm":
		return "Ammonium"
	case "oxygen_mg_l", "o2_mg_l":
		return "Sauerstoff (gelöst)"
	case "oxygen_saturation_pct", "o2_sat_pct":
		return "O2-Sättigung"
	case "co2_mg_l", "co2_ppm":
		return "CO2"
	default:
		return field
	}
}

func waterFieldUnit(field string) string {
	switch strings.TrimSpace(strings.ToLower(field)) {
	case "ph":
		return ""
	case "kh_dkh", "kh":
		return "°dH"
	case "gh_dgh", "gh":
		return "°dH"
	case "temp_c":
		return "°C"
	case "nitrite_mg_l", "nitrite_ppm", "nitrate_mg_l", "nitrate_ppm",
		"ammonium_mg_l", "ammonia_ppm", "oxygen_mg_l", "o2_mg_l", "co2_mg_l", "co2_ppm":
		return "mg/l"
	case "oxygen_saturation_pct", "o2_sat_pct":
		return "%"
	default:
		return ""
	}
}

// symptomConditionDE turns stable symptom ids into short German hints for matched_conditions.
func symptomConditionDE(sym string) string {
	switch normSym(sym) {
	case "fish_gasping_surface":
		return "Symptom: Schnappen an der Wasseroberfläche"
	case "gasping":
		return "Symptom: Hecheln oder starkes Atmen"
	case "labored_breathing":
		return "Symptom: Erschwerte Atmung"
	case "fish_gasping_morning":
		return "Symptom: Morgens auffällige Atmung"
	case "white_spots":
		return "Symptom: Weißpünktchen auf Haut oder Flossen"
	case "frayed_fins":
		return "Symptom: Ausgefranste oder zerklüftete Flossen"
	case "cotton_wool_growth":
		return "Symptom: Watteartige weiße Beläge"
	case "red_skin_patches":
		return "Symptom: Rötungen oder unschöne Stellen an Haut/Flossen"
	case "ulcers_sores":
		return "Symptom: offene oder geschwürartige Stellen (Vorsicht)"
	case "flashing":
		return "Symptom: Reiben an Dekoration oder Boden"
	case "clamped_fins":
		return "Symptom: Angelegte Flossen"
	case "rapid_gill_movement":
		return "Symptom: Sehr schnelle Kiemenarbeit"
	case "loss_of_appetite":
		return "Symptom: Fressunlust"
	case "hiding":
		return "Symptom: Starkes Verstecken"
	case "cloudy_water", "milky_water", "white_haze":
		return "Symptom: Trübung oder Schleier im Wasser"
	case "green_water", "algae_on_glass", "algae_carpet", "heavy_algae":
		return "Symptom: Ausgeprägter Algenbefall oder Grünwasser-Tendenz"
	case "bacterial_bloom":
		return "Symptom: Hinweis Bakterienblüte"
	case "co2_related_ph_swings", "heavy_co2_dosing":
		return "Symptom: CO2-/pH bezogene Auffälligkeit"
	case "fish_chasing":
		return "Symptom: Aggressives Verfolgen oder Revierverhalten"
	case "fin_nipping":
		return "Symptom: Flossenbeißen"
	case "uneaten_food_remains":
		return "Symptom: Liegenbleibendes Futter"
	case "new_fish_recent":
		return "Symptom: Neu eingesetzte oder wenige Tage alte Fische"
	case "ich_like_white_grains":
		return "Symptom: Körner wie Salz oder Zucker auf Haut/Flossen"
	case "fin_damage_edges":
		return "Symptom: Flossen wirken eingerissen oder mit Löchern"
	case "fuzzy_white_patches":
		return "Symptom: Unscharfe weiße Flecken"
	case "new_aquarium_setup":
		return "Symptom: Aquarium ist neu eingerichtet oder stark umgebaut"
	case "frequent_small_die_offs":
		return "Symptom: Wiederholte kleine Fischverluste"
	case "dirty_filter_low_flow":
		return "Symptom: Filter wirkt stark verschmutzt oder Durchfluss ist schwach"
	case "incompatible_species_mix":
		return "Symptom: Vermutlich unpassende Artenkombination"
	case "heavy_feeding_habit":
		return "Symptom: Sehr reichliche oder häufige Fütterung"
	case "ph_crash_after_water_change":
		return "Symptom: Auffällige pH-Veränderung nach Wasserwechsel"
	case "temperature_swings":
		return "Symptom: Temperatur schwankt spürbar"
	case "overstocked_suspected":
		return "Symptom: Verdacht auf zu viele Fische fürs Becken"
	default:
		return ""
	}
}
