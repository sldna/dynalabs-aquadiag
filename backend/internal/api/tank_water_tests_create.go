package api

import (
	"encoding/json"
	"errors"
	"io"
	"math"
	"net/http"
	"strings"

	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/models"
)

type createTankWaterTestBody struct {
	Water models.WaterTestInput `json:"water"`
}

func (s *Server) handleCreateTankWaterTest(w http.ResponseWriter, r *http.Request, tankIDStr string) {
	tankID, ok := parsePositiveInt64(w, tankIDStr, "id")
	if !ok {
		return
	}
	if _, err := db.TankByID(r.Context(), s.db, tankID); err != nil {
		if errors.Is(err, db.ErrTankNotFound) {
			writeJSONError(w, http.StatusNotFound, "not_found", "Becken nicht gefunden.")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Becken konnte nicht geladen werden.")
		return
	}

	input, err := decodeCreateTankWaterTestBody(r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Code:    "invalid_json",
			Message: "Der JSON-Body ist ungültig.",
			Errors: []models.FieldError{
				{Field: "body", Code: "invalid_json", Message: "JSON konnte nicht gelesen werden."},
			},
		})
		return
	}

	fieldErrors := validateQuickWaterTestInput(input)
	if len(fieldErrors) > 0 {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Code:    "validation_failed",
			Message: "Die Anfrage erfüllt die Validierung nicht.",
			Errors:  fieldErrors,
		})
		return
	}

	id, err := db.InsertWaterTest(r.Context(), s.db, tankID, input, []string{})
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Wassertest konnte nicht gespeichert werden.")
		return
	}
	rec, err := db.WaterTestByID(r.Context(), s.db, id)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Wassertest konnte nicht geladen werden.")
		return
	}
	writeJSON(w, http.StatusCreated, enrichWaterTest(rec))
}

func decodeCreateTankWaterTestBody(r *http.Request) (models.WaterTestInput, error) {
	raw, err := io.ReadAll(r.Body)
	if err != nil {
		return models.WaterTestInput{}, err
	}
	if strings.TrimSpace(string(raw)) == "" {
		return models.WaterTestInput{}, io.EOF
	}

	var nested createTankWaterTestBody
	if err := json.Unmarshal(raw, &nested); err != nil {
		return models.WaterTestInput{}, err
	}

	var flat models.WaterTestInput
	if err := json.Unmarshal(raw, &flat); err != nil {
		return models.WaterTestInput{}, err
	}
	return mergeWaterInput(nested.Water, flat), nil
}

func mergeWaterInput(primary models.WaterTestInput, fallback models.WaterTestInput) models.WaterTestInput {
	if primary.PH == nil {
		primary.PH = fallback.PH
	}
	if primary.KhDKH == nil {
		primary.KhDKH = fallback.KhDKH
	}
	if primary.GhDGH == nil {
		primary.GhDGH = fallback.GhDGH
	}
	if primary.TempC == nil {
		primary.TempC = fallback.TempC
	}
	if primary.NitriteMgL == nil {
		primary.NitriteMgL = fallback.NitriteMgL
	}
	if primary.NitrateMgL == nil {
		primary.NitrateMgL = fallback.NitrateMgL
	}
	if primary.AmmoniumMgL == nil {
		primary.AmmoniumMgL = fallback.AmmoniumMgL
	}
	if primary.PhosphatePO4 == nil {
		primary.PhosphatePO4 = fallback.PhosphatePO4
	}
	if primary.IronFe == nil {
		primary.IronFe = fallback.IronFe
	}
	if primary.OxygenMgL == nil {
		primary.OxygenMgL = fallback.OxygenMgL
	}
	if primary.OxygenSaturationPct == nil {
		primary.OxygenSaturationPct = fallback.OxygenSaturationPct
	}
	if primary.CO2MgL == nil {
		primary.CO2MgL = fallback.CO2MgL
	}
	if primary.Notes == nil {
		primary.Notes = fallback.Notes
	}
	return primary
}

func validateQuickWaterTestInput(wt models.WaterTestInput) []models.FieldError {
	var errs []models.FieldError

	appendErr := func(field string, code string, msg string) {
		errs = append(errs, models.FieldError{Field: field, Code: code, Message: msg})
	}
	chk := func(ptr *float64, field string) {
		if ptr == nil {
			return
		}
		if math.IsNaN(*ptr) || math.IsInf(*ptr, 0) {
			appendErr(field, "invalid_number", "Muss eine endliche Zahl sein.")
			return
		}
		if *ptr < 0 {
			appendErr(field, "invalid_range", "Wert darf nicht negativ sein.")
		}
	}

	chk(wt.PH, "water.ph")
	chk(wt.KhDKH, "water.kh_dkh")
	chk(wt.GhDGH, "water.gh_dgh")
	chk(wt.TempC, "water.temp_c")
	chk(wt.NitriteMgL, "water.nitrite_mg_l")
	chk(wt.NitrateMgL, "water.nitrate_mg_l")
	chk(wt.AmmoniumMgL, "water.ammonium_mg_l")
	chk(wt.PhosphatePO4, "water.phosphate_po4")
	chk(wt.IronFe, "water.iron_fe")
	chk(wt.OxygenMgL, "water.oxygen_mg_l")
	chk(wt.OxygenSaturationPct, "water.oxygen_saturation_pct")
	chk(wt.CO2MgL, "water.co2_mg_l")

	if !hasQuickWaterMeasurement(wt) {
		appendErr(
			"body",
			"insufficient_input",
			"Mindestens ein Wasserwert ist erforderlich.",
		)
	}

	return errs
}

func hasQuickWaterMeasurement(wt models.WaterTestInput) bool {
	return wt.PH != nil ||
		wt.KhDKH != nil ||
		wt.GhDGH != nil ||
		wt.TempC != nil ||
		wt.NitriteMgL != nil ||
		wt.NitrateMgL != nil ||
		wt.AmmoniumMgL != nil ||
		wt.PhosphatePO4 != nil ||
		wt.IronFe != nil ||
		wt.OxygenMgL != nil ||
		wt.OxygenSaturationPct != nil ||
		wt.CO2MgL != nil
}
