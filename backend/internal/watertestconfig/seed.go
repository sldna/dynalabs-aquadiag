package watertestconfig

import (
	"context"
	"strconv"
	"strings"
)

func (s *Service) SeedDefaultJBLConfigIfEmpty(ctx context.Context) error {
	n, err := s.repo.countVersions(ctx)
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}

	tx, err := s.repo.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	res, err := tx.ExecContext(ctx, `
INSERT INTO water_test_config_versions (name, description, is_active, is_draft, activated_at, created_by)
VALUES ('JBL Freshwater Default v1', 'Initiale AquaDiag-JBL-Konfiguration aus den vorhandenen V1-Skalen.', 1, 0, CURRENT_TIMESTAMP, 'system')`)
	if err != nil {
		return err
	}
	versionID, err := res.LastInsertId()
	if err != nil {
		return err
	}
	if err := s.replaceVersionRows(ctx, tx, versionID, defaultJBLTests(), defaultJBLTimerGroups()); err != nil {
		return err
	}
	return tx.Commit()
}

func defaultJBLTests() []TestConfig {
	return []TestConfig{
		{
			Key: "temperature_c", Label: "Temperatur", Brand: "JBL", Unit: "°C", InputType: "number", SortOrder: 1, IsActive: true,
			Thresholds: thresholds([]thresholdSeed{{21, 28, StatusOK, "Temperatur liegt im üblichen Bereich."}, {19, 20.99, StatusWatch, "Temperatur weicht etwas ab."}, {28.01, 30, StatusWatch, "Temperatur weicht etwas ab."}, {-1, 18.99, StatusCritical, "Temperatur ist zu niedrig."}, {30.01, -1, StatusCritical, "Temperatur ist zu hoch."}}),
		},
		{
			Key: "ph", Label: "pH", Brand: "JBL", Unit: "", InputType: "number", SortOrder: 2, IsActive: true,
			Thresholds: thresholds([]thresholdSeed{{6.8, 8.2, StatusOK, "pH liegt im üblichen Bereich für Süßwasser-Gesellschaftsaquarien."}, {6.5, 6.79, StatusWatch, "pH weicht etwas ab – beobachten und erneut messen."}, {8.21, 8.5, StatusWatch, "pH weicht etwas ab – beobachten und erneut messen."}, {6, 6.49, StatusWatch, "pH liegt deutlich außerhalb des Normalbereichs."}, {8.51, 9, StatusWatch, "pH liegt deutlich außerhalb des Normalbereichs."}, {-1, 5.99, StatusCritical, "pH ist extrem niedrig – Stabilität prüfen."}, {9.01, -1, StatusCritical, "pH ist extrem hoch – Stabilität prüfen."}}),
		},
		{Key: "kh", Label: "KH", Brand: "JBL", Unit: "°dKH", InputType: "number", SortOrder: 3, IsActive: true,
			Thresholds: thresholds([]thresholdSeed{{5, 16, StatusOK, "KH liegt im stabilen Pufferbereich."}, {3, 4.99, StatusWatch, "KH ist grenzwertig – pH kann stärker schwanken."}, {17, 20, StatusWatch, "KH ist grenzwertig – pH kann stärker schwanken."}, {-1, 2.99, StatusCritical, "KH ist extrem niedrig – Pufferung gefährdet."}, {21, -1, StatusCritical, "KH ist extrem hoch."}})},
		{Key: "gh", Label: "GH", Brand: "JBL", Unit: "°dGH", InputType: "number", SortOrder: 4, IsActive: true,
			Thresholds: thresholds([]thresholdSeed{{8, 25, StatusOK, "GH liegt im üblichen Bereich."}, {5, 7.99, StatusWatch, "GH weicht etwas ab – Besatzansprüche prüfen."}, {25.01, 30, StatusWatch, "GH weicht etwas ab – Besatzansprüche prüfen."}, {-1, 4.99, StatusCritical, "GH ist extrem niedrig."}, {31, -1, StatusCritical, "GH ist extrem hoch."}})},
		{Key: "nitrite_no2", Label: "Nitrit (NO₂)", Brand: "JBL", Unit: "mg/l", InputType: "select", SortOrder: 5, IsActive: true,
			Values:     valueOptions([]float64{0, 0.05, 0.1, 0.2, 0.3, 0.5, 0.8, 1}),
			Thresholds: thresholds([]thresholdSeed{{0, 0.1, StatusOK, "Nitrit liegt im unkritischen Bereich."}, {0.1, 0.2, StatusWatch, "Nitrit ist leicht messbar – beobachten und Ursache prüfen."}, {0.2, 0.5, StatusWatch, "Nitrit ist erhöht – Filter und Fütterung prüfen."}, {0.5, -1, StatusCritical, "Nitrit ist kritisch erhöht – akut belastend für Fische."}})},
		{Key: "nitrate_no3", Label: "Nitrat (NO₃)", Brand: "JBL", Unit: "mg/l", InputType: "select", SortOrder: 6, IsActive: true,
			Values:     valueOptions([]float64{0, 0.5, 1, 5, 10, 15, 25, 50, 100}),
			Thresholds: thresholds([]thresholdSeed{{0, 30, StatusOK, "Nitrat liegt im üblichen Bereich."}, {30, 50, StatusWatch, "Nitrat ist erhöht – regelmäßiger Teilwasserwechsel sinnvoll."}, {50, 100, StatusWatch, "Nitrat ist deutlich erhöht – Fütterung und Mulm prüfen."}, {100, -1, StatusCritical, "Nitrat ist sehr hoch – langfristig belastend."}})},
		{Key: "ammonium_nh4", Label: "Ammonium (NH₄)", Brand: "JBL", Unit: "mg/l", InputType: "select", SortOrder: 7, IsActive: true,
			Values:     valueOptions([]float64{0, 0.05, 0.1, 0.2, 0.5, 1}),
			Thresholds: thresholds([]thresholdSeed{{0, 0.1, StatusOK, "Ammonium liegt im unkritischen Bereich."}, {0.1, 0.2, StatusWatch, "Ammonium leicht erhöht – Filter und Fütterung beobachten."}, {0.2, 0.5, StatusWatch, "Ammonium erhöht – Belastung für Fische möglich."}, {0.5, -1, StatusCritical, "Ammonium kritisch erhöht."}})},
		{Key: "phosphate_po4", Label: "Phosphat (PO₄)", Brand: "JBL", Unit: "mg/l", InputType: "number", SortOrder: 8, IsActive: true},
		{Key: "iron_fe", Label: "Eisen (Fe)", Brand: "JBL", Unit: "mg/l", InputType: "select", SortOrder: 9, IsActive: true,
			Values: valueOptions([]float64{0, 0.05, 0.1, 0.2, 0.5, 1})},
	}
}

func defaultJBLTimerGroups() []TimerGroup {
	return []TimerGroup{
		{TestKey: "no2", Label: "NO₂", FieldKey: "nitrite_no2", IsActive: true, SortOrder: 20, Steps: timerSteps(300)},
		{TestKey: "nh4", Label: "NH₄", FieldKey: "ammonium_nh4", IsActive: true, SortOrder: 21, Steps: timerSteps(900)},
		{TestKey: "ph_74_90", Label: "pH 7,4–9,0", IsActive: false, SortOrder: 22, Steps: timerSteps(180)},
		{TestKey: "ph_60_76", Label: "pH 6,0–7,6", IsActive: false, SortOrder: 23, Steps: timerSteps(180)},
		{TestKey: "ph_30_100", Label: "pH 3,0–10,0", IsActive: false, SortOrder: 24, Steps: timerSteps(300)},
		{TestKey: "mg", Label: "Mg", IsActive: false, SortOrder: 25, Steps: timerSteps(60)},
		{TestKey: "o2", Label: "O₂", FieldKey: "oxygen_mg_l", IsActive: false, SortOrder: 26, Steps: timerSteps(30, 600)},
		{TestKey: "cu", Label: "Cu", IsActive: false, SortOrder: 27, Steps: timerSteps(900)},
		{TestKey: "k", Label: "K", IsActive: false, SortOrder: 28, Steps: timerSteps(60)},
		{TestKey: "fe", Label: "Fe", FieldKey: "iron_fe", IsActive: true, SortOrder: 29, Steps: timerSteps(600)},
		{TestKey: "sio2", Label: "SiO₂", IsActive: false, SortOrder: 30, Steps: timerSteps(180, 180, 180)},
	}
}

type thresholdSeed struct {
	min     float64
	max     float64
	status  string
	message string
}

func thresholds(in []thresholdSeed) []Threshold {
	out := make([]Threshold, 0, len(in))
	for i, seed := range in {
		th := Threshold{Status: seed.status, Message: seed.message, SortOrder: i + 1}
		if seed.min >= 0 {
			v := seed.min
			th.MinValue = &v
			th.Min = &v
		}
		if seed.max >= 0 {
			v := seed.max
			th.MaxValue = &v
			th.Max = &v
		}
		out = append(out, th)
	}
	return out
}

func valueOptions(values []float64) []ValueOption {
	out := make([]ValueOption, 0, len(values))
	for i, v := range values {
		out = append(out, ValueOption{Value: v, DisplayValue: displayNumberDE(v), Label: displayNumberDE(v), SortOrder: i + 1})
	}
	return out
}

func timerSteps(seconds ...int) []TimerStep {
	out := make([]TimerStep, 0, len(seconds))
	for i, sec := range seconds {
		label := "Einwirkzeit"
		if len(seconds) > 1 {
			label = "Schritt " + string(rune('1'+i))
		}
		out = append(out, TimerStep{StepLabel: label, Label: label, DurationSeconds: sec, StepOrder: i})
	}
	return out
}

func displayNumberDE(v float64) string {
	s := strconv.FormatFloat(v, 'f', -1, 64)
	return strings.ReplaceAll(s, ".", ",")
}
