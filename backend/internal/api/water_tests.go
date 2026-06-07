package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/models"
	"aquadiag/backend/internal/waterquality"
	"aquadiag/backend/internal/watertestconfig"
)

const (
	thresholdSourceSnapshot = "snapshot"
	thresholdSourceLegacy   = "legacy_missing_snapshot"
)

// waterTestResponse extends a persisted water test with the persisted
// snapshot assessment used by the UI. It never re-evaluates legacy rows.
type waterTestResponse struct {
	models.WaterTestRecord
	WaterQualityStatus      waterquality.Status                       `json:"water_quality_status"`
	WaterQualityItems       []waterquality.Item                       `json:"water_quality_items"`
	ThresholdSource         string                                    `json:"threshold_source"`
	ConfigSnapshotCreatedAt *string                                   `json:"config_snapshot_created_at,omitempty"`
	ThresholdResults        *watertestconfig.ThresholdResultsSnapshot `json:"threshold_results_snapshot,omitempty"`
}

func enrichWaterTest(rec models.WaterTestRecord) waterTestResponse {
	if rec.ThresholdResultsSnapshotJSON == nil || strings.TrimSpace(*rec.ThresholdResultsSnapshotJSON) == "" {
		return legacyWaterTestResponse(rec)
	}
	var thresholdSnapshot watertestconfig.ThresholdResultsSnapshot
	if err := json.Unmarshal([]byte(*rec.ThresholdResultsSnapshotJSON), &thresholdSnapshot); err != nil {
		return legacyWaterTestResponse(rec)
	}
	items := itemsFromThresholdSnapshot(thresholdSnapshot)
	status := waterquality.OverallStatus(items)
	if len(items) == 0 {
		status = waterquality.StatusUnknown
	}
	createdAt := thresholdSnapshot.CreatedAt
	if rec.ConfigSnapshotJSON != nil && strings.TrimSpace(*rec.ConfigSnapshotJSON) != "" {
		var configSnapshot watertestconfig.ConfigSnapshot
		if err := json.Unmarshal([]byte(*rec.ConfigSnapshotJSON), &configSnapshot); err == nil && configSnapshot.CreatedAt != "" {
			createdAt = configSnapshot.CreatedAt
		}
	}
	return waterTestResponse{
		WaterTestRecord:         rec,
		WaterQualityStatus:      status,
		WaterQualityItems:       items,
		ThresholdSource:         thresholdSourceSnapshot,
		ConfigSnapshotCreatedAt: &createdAt,
		ThresholdResults:        &thresholdSnapshot,
	}
}

func legacyWaterTestResponse(rec models.WaterTestRecord) waterTestResponse {
	items := legacyUnknownItems(rec)
	return waterTestResponse{
		WaterTestRecord:    rec,
		WaterQualityStatus: waterquality.StatusUnknown,
		WaterQualityItems:  items,
		ThresholdSource:    thresholdSourceLegacy,
	}
}

func itemsFromThresholdSnapshot(snapshot watertestconfig.ThresholdResultsSnapshot) []waterquality.Item {
	items := make([]waterquality.Item, 0, len(snapshot.Results))
	for _, res := range snapshot.Results {
		status := waterquality.Status(watertestconfig.ThresholdStatusToWaterQuality(res.Status))
		items = append(items, waterquality.Item{
			Key:              res.TestKey,
			Label:            waterTestLabel(res.TestKey),
			Value:            res.Value,
			Unit:             res.Unit,
			Status:           status,
			StatusLabel:      thresholdStatusLabel(res.Status),
			Message:          res.Message,
			ThresholdStatus:  res.Status,
			ThresholdMessage: res.Message,
			ThresholdSource:  thresholdSourceSnapshot,
		})
	}
	return items
}

func legacyUnknownItems(rec models.WaterTestRecord) []waterquality.Item {
	values := []struct {
		key   string
		value *float64
		unit  string
	}{
		{"temperature_c", rec.TempC, "°C"},
		{"ph", rec.PH, ""},
		{"kh", rec.KhDKH, "°dKH"},
		{"gh", rec.GhDGH, "°dGH"},
		{"nitrite_no2", rec.NitriteMgL, "mg/l"},
		{"nitrate_no3", rec.NitrateMgL, "mg/l"},
		{"ammonium_nh4", rec.AmmoniumMgL, "mg/l"},
		{"phosphate_po4", rec.PhosphatePO4, "mg/l"},
		{"iron_fe", rec.IronFe, "mg/l"},
		{"oxygen_mg_l", rec.OxygenMgL, "mg/l"},
		{"oxygen_saturation_pct", rec.OxygenSaturationPct, "%"},
		{"co2_mg_l", rec.CO2MgL, "mg/l"},
	}
	items := []waterquality.Item{}
	for _, v := range values {
		if v.value == nil {
			continue
		}
		items = append(items, waterquality.Item{
			Key:             v.key,
			Label:           waterTestLabel(v.key),
			Value:           *v.value,
			Unit:            v.unit,
			Status:          waterquality.StatusUnknown,
			StatusLabel:     "Historisch",
			Message:         "Historische Bewertung nicht verfügbar.",
			ThresholdStatus: "legacy",
			ThresholdSource: thresholdSourceLegacy,
		})
	}
	return items
}

func thresholdStatusLabel(status string) string {
	switch status {
	case watertestconfig.StatusOK:
		return "OK"
	case watertestconfig.StatusWatch:
		return "Beobachten"
	case watertestconfig.StatusCritical:
		return "Kritisch"
	default:
		return "Nicht bewertet"
	}
}

func waterTestLabel(key string) string {
	switch key {
	case "temperature_c":
		return "Temperatur"
	case "ph":
		return "pH-Wert"
	case "kh":
		return "Karbonathärte (KH)"
	case "gh":
		return "Gesamthärte (GH)"
	case "nitrite_no2":
		return "Nitrit (NO₂)"
	case "nitrate_no3":
		return "Nitrat (NO₃)"
	case "ammonium_nh4":
		return "Ammonium (NH₄)"
	case "phosphate_po4":
		return "Phosphat (PO₄)"
	case "iron_fe":
		return "Eisen (Fe)"
	case "oxygen_mg_l":
		return "Sauerstoff (O₂)"
	case "oxygen_saturation_pct":
		return "O₂-Sättigung"
	case "co2_mg_l":
		return "CO₂"
	default:
		return key
	}
}

func enrichWaterTests(recs []models.WaterTestRecord) []waterTestResponse {
	out := make([]waterTestResponse, 0, len(recs))
	for _, r := range recs {
		out = append(out, enrichWaterTest(r))
	}
	return out
}

func (s *Server) routeV1WaterTests(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		writeJSONError(w, http.StatusServiceUnavailable, "service_unavailable", "database not configured")
		return
	}

	path := normalizeAPIPath(r.URL.Path)
	const pref = "/v1/water-tests/"
	if !strings.HasPrefix(path, pref) {
		writeJSONError(w, http.StatusNotFound, "not_found", "Pfad nicht gefunden.")
		return
	}

	idStr := strings.TrimPrefix(path, pref)
	if idStr == "" || strings.Contains(idStr, "/") {
		writeJSONError(w, http.StatusNotFound, "not_found", "Pfad nicht gefunden.")
		return
	}

	id, ok := parsePositiveInt64(w, idStr, "id")
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		rec, err := db.WaterTestByID(r.Context(), s.db, id)
		if err != nil {
			if errors.Is(err, db.ErrWaterTestNotFound) {
				writeJSONError(w, http.StatusNotFound, "not_found", "Wassertest nicht gefunden.")
				return
			}
			writeJSONError(w, http.StatusInternalServerError, "database_error", "Wassertest konnte nicht geladen werden.")
			return
		}
		writeJSON(w, http.StatusOK, enrichWaterTest(rec))

	case http.MethodDelete:
		tx, err := s.db.BeginTx(r.Context(), nil)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "database_error", "Transaktion konnte nicht gestartet werden.")
			return
		}
		defer func() { _ = tx.Rollback() }()

		if err := db.DeleteWaterTestCascade(r.Context(), tx, id); err != nil {
			if errors.Is(err, db.ErrWaterTestNotFound) {
				writeJSONError(w, http.StatusNotFound, "not_found", "Wassertest nicht gefunden.")
				return
			}
			writeJSONError(w, http.StatusInternalServerError, "database_error", "Wassertest konnte nicht gelöscht werden.")
			return
		}
		if err := tx.Commit(); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "database_error", "Transaktion konnte nicht abgeschlossen werden.")
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		writeJSONError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Erlaubt sind GET oder DELETE.")
	}
}
