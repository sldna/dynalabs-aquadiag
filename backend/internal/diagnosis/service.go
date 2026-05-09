package diagnosis

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"strconv"
	"strings"
	"time"

	"aquadiag/backend/internal/ai"
	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/models"
	"aquadiag/backend/internal/rules"
)

// Service orchestriert Validierung, Persistenz und Regelauswertung.
type Service struct {
	db    *sql.DB
	rules rules.Ruleset
	ai    ai.Config

	// now ist injizierbar, damit Tests einen festen RFC3339-Zeitstempel prüfen können.
	now func() time.Time
}

// NewService baut den Diagnose-Service.
func NewService(database *sql.DB, rs rules.Ruleset, cfg ai.Config) *Service {
	return &Service{db: database, rules: rs, ai: cfg, now: time.Now}
}

// Diagnose validiert, speichert Wasserwerte, wertet Regeln aus und persistiert das Ergebnis.
func (s *Service) Diagnose(ctx context.Context, req models.DiagnoseRequest) (models.DiagnoseAPIResponse, error) {
	if err := validateDiagnoseRequest(req); err != nil {
		return models.DiagnoseAPIResponse{}, err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return models.DiagnoseAPIResponse{}, err
	}
	defer func() { _ = tx.Rollback() }()

	tankID, err := resolveTankID(ctx, tx, req)
	if err != nil {
		return models.DiagnoseAPIResponse{}, err
	}

	symptoms := normalizeSymptoms(req.Symptoms)
	waterTestID, err := db.InsertWaterTest(ctx, tx, tankID, req.Water, symptoms)
	if err != nil {
		return models.DiagnoseAPIResponse{}, fmt.Errorf("water test: %w", err)
	}

	in := rules.FromDiagnoseRequest(req.Water, symptoms)

	evStart := time.Now()
	matches := s.rules.Evaluate(in)
	evDur := time.Since(evStart)

	matchedIDs := make([]string, 0, len(matches))
	for _, m := range matches {
		matchedIDs = append(matchedIDs, m.RuleID)
	}

	slog.Info("rule_evaluation",
		"matched_count", len(matches),
		"matched_rules", matchedIDs,
		"duration_ms", evDur.Milliseconds(),
	)

	primary := unknownRuleMatch()
	var runnerUp []models.RunnerUpItem
	if len(matches) > 0 {
		primary = matches[0]
		for _, m := range matches[1:] {
			runnerUp = append(runnerUp, models.RunnerUpItem{
				RuleID:        m.RuleID,
				DiagnosisType: m.DiagnosisType,
				Confidence:    m.Confidence,
				Severity:      m.Severity,
			})
		}
	}

	ex := ai.BuildExplanation(s.ai, primary)

	row, err := diagnosisRowFrom(waterTestID, primary, matchedIDs, runnerUp, ex)
	if err != nil {
		return models.DiagnoseAPIResponse{}, err
	}

	diagID, err := db.InsertDiagnosisResult(ctx, tx, row)
	if err != nil {
		return models.DiagnoseAPIResponse{}, err
	}
	if err := tx.Commit(); err != nil {
		return models.DiagnoseAPIResponse{}, err
	}

	meta := models.DiagnosisMeta{
		RuleEngineVersion: strconv.Itoa(s.rules.Version),
		EvaluatedRules:    s.rules.EvaluatedCount(),
		GeneratedAt:       s.now().UTC().Format(time.RFC3339),
		DiagnosisID:       diagID,
		WaterTestID:       waterTestID,
		TankID:            tankID,
	}
	return models.BuildDiagnoseResponse(matches, meta), nil
}

func validateDiagnoseRequest(req models.DiagnoseRequest) error {
	var errs []models.FieldError

	tankBlocking := false

	if req.TankID != nil && req.Tank != nil {
		tankBlocking = true
		errs = append(errs, models.FieldError{
			Field:   "body",
			Code:    "mutually_exclusive",
			Message: "Entweder tank_id oder tank angeben, nicht beides.",
		})
	} else if req.TankID == nil && req.Tank == nil {
		tankBlocking = true
		errs = append(errs, models.FieldError{
			Field:   "body",
			Code:    "required_one_of",
			Message: "tank_id oder tank ist erforderlich",
		})
	} else if req.Tank != nil {
		if strings.TrimSpace(req.Tank.Name) == "" {
			tankBlocking = true
			errs = append(errs, models.FieldError{
				Field:   "tank.name",
				Code:    "required",
				Message: "tank.name ist erforderlich",
			})
		}
		if req.Tank.VolumeLiters < 0 {
			tankBlocking = true
			errs = append(errs, models.FieldError{
				Field:   "tank.volume_liters",
				Code:    "invalid_range",
				Message: "volume_liters darf nicht negativ sein",
			})
		}
	}

	appendNonFiniteWaterErrors(&errs, req.Water)

	if !tankBlocking && !hasMeasurementsOrSymptoms(req.Water, req.Symptoms) {
		errs = append(errs, models.FieldError{
			Field:   "body",
			Code:    "insufficient_input",
			Message: "Mindestens ein Wasserparameter oder ein nicht-leeres Symptom ist erforderlich.",
		})
	}

	if len(errs) == 0 {
		return nil
	}
	return &ValidationFailedError{Errors: errs}
}

func appendNonFiniteWaterErrors(errs *[]models.FieldError, w models.WaterTestInput) {
	chk := func(ptr *float64, field string) {
		if ptr == nil {
			return
		}
		if math.IsNaN(*ptr) || math.IsInf(*ptr, 0) {
			*errs = append(*errs, models.FieldError{
				Field:   field,
				Code:    "invalid_number",
				Message: "Muss eine endliche Zahl sein.",
			})
		}
	}
	chk(w.PH, "water.ph")
	chk(w.KhDKH, "water.kh_dkh")
	chk(w.GhDGH, "water.gh_dgh")
	chk(w.TempC, "water.temp_c")
	chk(w.NitriteMgL, "water.nitrite_mg_l")
	chk(w.NitrateMgL, "water.nitrate_mg_l")
	chk(w.AmmoniumMgL, "water.ammonium_mg_l")
	chk(w.OxygenMgL, "water.oxygen_mg_l")
	chk(w.OxygenSaturationPct, "water.oxygen_saturation_pct")
	chk(w.CO2MgL, "water.co2_mg_l")
}

func hasMeasurementsOrSymptoms(w models.WaterTestInput, symptoms []string) bool {
	for _, s := range symptoms {
		if strings.TrimSpace(s) != "" {
			return true
		}
	}
	return w.PH != nil || w.KhDKH != nil || w.GhDGH != nil || w.TempC != nil ||
		w.NitriteMgL != nil || w.NitrateMgL != nil || w.AmmoniumMgL != nil ||
		w.OxygenSaturationPct != nil || w.CO2MgL != nil ||
		(w.Notes != nil && strings.TrimSpace(*w.Notes) != "")
}

func normalizeSymptoms(symptoms []string) []string {
	out := make([]string, 0, len(symptoms))
	for _, s := range symptoms {
		s = strings.TrimSpace(strings.ToLower(s))
		if s != "" {
			out = append(out, s)
		}
	}
	return out
}

func resolveTankID(ctx context.Context, tx *sql.Tx, req models.DiagnoseRequest) (int64, error) {
	if req.TankID != nil {
		_, err := db.TankByID(ctx, tx, *req.TankID)
		if err != nil {
			return 0, err
		}
		return *req.TankID, nil
	}
	return db.InsertTank(ctx, tx, strings.TrimSpace(req.Tank.Name), req.Tank.VolumeLiters)
}

func unknownRuleMatch() models.RuleMatch {
	return models.RuleMatch{
		RuleID:        "",
		Name:          "",
		DiagnosisType: "unknown",
		Confidence:    0,
		Severity:      "low",
		ActionsNow: []string{
			"Weitere Messwerte erfassen (Nitrit, Nitrat, pH, KH, GH je nach Setup) und Symptome konkret benennen.",
		},
		ActionsOptional: []string{
			"Regeldatei später erweitern oder Grenzwerte an das eigene Becken anpassen.",
		},
		Avoid: []string{
			"Keine großen Eingriffe ohne belastbare Messung und klare Symptomatik.",
		},
		Facts: []string{
			"Die Regelengine hat mit den vorliegenden Angaben keine der hinterlegten Regeln ausgelöst.",
		},
		SummaryDE: "Keine der hinterlegten Regeln passt eindeutig zu den vorliegenden Angaben.",
		ReasoningDE: "Oft fehlen einzelne Messgrößen (z. B. Nitrit) oder Symptome sind zu unspezifisch. " +
			"Mehr Daten verbessern die Treffsicherheit – die Engine bleibt deterministisch.",
		FollowUpDE: []string{
			"Welche Teststreifen/Tropfentests stehen zur Verfügung?",
			"Gibt es sichtbare Symptome wie Trübung, Algen oder Atemnot an der Oberfläche?",
		},
		SafetyNoteDE: "Entscheidungen zu Tiergesundheit können komplex sein; bei akuten Notfällen zusätzlich Fachhilfe einbeziehen.",
	}
}

func diagnosisRowFrom(
	waterTestID int64,
	primary models.RuleMatch,
	matchedIDs []string,
	runnerUp []models.RunnerUpItem,
	explanation models.Explanation,
) (models.DiagnosisResultRow, error) {
	an, err := json.Marshal(primary.ActionsNow)
	if err != nil {
		return models.DiagnosisResultRow{}, err
	}
	ao, err := json.Marshal(primary.ActionsOptional)
	if err != nil {
		return models.DiagnosisResultRow{}, err
	}
	av, err := json.Marshal(primary.Avoid)
	if err != nil {
		return models.DiagnosisResultRow{}, err
	}
	fc, err := json.Marshal(primary.Facts)
	if err != nil {
		return models.DiagnosisResultRow{}, err
	}
	matchedJSON, err := json.Marshal(matchedIDs)
	if err != nil {
		return models.DiagnosisResultRow{}, err
	}
	ruJSON, err := json.Marshal(runnerUp)
	if err != nil {
		return models.DiagnosisResultRow{}, err
	}
	exJSON, err := json.Marshal(explanation)
	if err != nil {
		return models.DiagnosisResultRow{}, err
	}

	return models.DiagnosisResultRow{
		WaterTestID:         waterTestID,
		DiagnosisType:       primary.DiagnosisType,
		Confidence:          primary.Confidence,
		Severity:            primary.Severity,
		ActionsNowJSON:      string(an),
		ActionsOptionalJSON: string(ao),
		AvoidJSON:           string(av),
		FactsJSON:           string(fc),
		MatchedRuleIDsJSON:  string(matchedJSON),
		RunnerUpJSON:        string(ruJSON),
		ExplanationJSON:     string(exJSON),
	}, nil
}
