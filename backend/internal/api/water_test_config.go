package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"aquadiag/backend/internal/models"
	"aquadiag/backend/internal/watertestconfig"
)

func (s *Server) routeV1WaterTestConfig(w http.ResponseWriter, r *http.Request) {
	if s.waterTestConfig == nil {
		writeJSONError(w, http.StatusServiceUnavailable, "service_unavailable", "water test config not loaded")
		return
	}
	if err := s.waterTestConfig.SeedDefaultJBLConfigIfEmpty(r.Context()); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Wassertest-Konfiguration konnte nicht initialisiert werden.")
		return
	}

	path := normalizeAPIPath(r.URL.Path)
	switch {
	case path == "/v1/water-test-config" || path == "/v1/water-test-config/active":
		if r.Method != http.MethodGet {
			writeJSONError(w, http.StatusMethodNotAllowed, "method_not_allowed", "GET only")
			return
		}
		s.handleWaterTestConfigActive(w, r)
	case path == "/v1/water-test-config/versions":
		s.handleWaterTestConfigVersions(w, r)
	case path == "/v1/water-test-config/versions/duplicate-active":
		if r.Method != http.MethodPost {
			writeJSONError(w, http.StatusMethodNotAllowed, "method_not_allowed", "POST only")
			return
		}
		out, err := s.waterTestConfig.CreateDraftFromActive(r.Context())
		writeWaterTestConfigResult(w, out, err)
	case strings.HasPrefix(path, "/v1/water-test-config/versions/"):
		s.handleWaterTestConfigVersionItem(w, r, strings.TrimPrefix(path, "/v1/water-test-config/versions/"))
	default:
		writeJSONError(w, http.StatusNotFound, "not_found", "Pfad nicht gefunden.")
	}
}

func (s *Server) handleWaterTestConfigActive(w http.ResponseWriter, r *http.Request) {
	out, err := s.waterTestConfig.GetActiveConfig(r.Context())
	out = activeCaptureConfig(out)
	writeWaterTestConfigResult(w, out, err)
}

func activeCaptureConfig(in watertestconfig.ConfigVersionDetail) watertestconfig.ConfigVersionDetail {
	tests := make([]watertestconfig.TestConfig, 0, len(in.Tests))
	activeKeys := map[string]bool{}
	for _, test := range in.Tests {
		if test.IsActive {
			tests = append(tests, test)
			activeKeys[test.Key] = true
		}
	}
	in.Tests = tests
	thresholds := map[string]watertestconfig.ThresholdGroup{}
	for key, threshold := range in.Thresholds {
		if activeKeys[key] {
			thresholds[key] = threshold
		}
	}
	timers := map[string]watertestconfig.TimerGroup{}
	for key, timer := range in.Timers {
		if activeKeys[key] || (timer.FieldKey != "" && activeKeys[timer.FieldKey]) {
			timers[key] = timer
		}
	}
	in.Thresholds = thresholds
	in.Timers = timers
	return in
}

func (s *Server) handleWaterTestConfigVersions(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		versions, err := s.waterTestConfig.ListConfigVersions(r.Context())
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "database_error", "Versionen konnten nicht geladen werden.")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"versions": versions})
	default:
		writeJSONError(w, http.StatusMethodNotAllowed, "method_not_allowed", "GET only")
	}
}

func (s *Server) handleWaterTestConfigVersionItem(w http.ResponseWriter, r *http.Request, rest string) {
	parts := splitAPIPath(rest)
	if len(parts) == 0 {
		writeJSONError(w, http.StatusNotFound, "not_found", "Pfad nicht gefunden.")
		return
	}
	id, ok := parsePositiveInt64(w, parts[0], "id")
	if !ok {
		return
	}
	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			out, err := s.waterTestConfig.GetConfigVersion(r.Context(), id)
			writeWaterTestConfigResult(w, out, err)
		case http.MethodPut:
			var payload watertestconfig.ConfigUpdatePayload
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Code: "invalid_json", Message: "Der JSON-Body ist ungültig.", Errors: []models.FieldError{{Field: "body", Code: "invalid_json", Message: "JSON konnte nicht gelesen werden."}}})
				return
			}
			out, err := s.waterTestConfig.UpdateDraftConfig(r.Context(), id, payload)
			writeWaterTestConfigResult(w, out, err)
		default:
			writeJSONError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Erlaubt sind GET oder PUT.")
		}
		return
	}
	if len(parts) != 2 || r.Method != http.MethodPost {
		writeJSONError(w, http.StatusNotFound, "not_found", "Pfad nicht gefunden.")
		return
	}
	switch parts[1] {
	case "duplicate":
		out, err := s.waterTestConfig.CreateDraftFromVersion(r.Context(), id)
		writeWaterTestConfigResult(w, out, err)
	case "validate":
		res, err := s.waterTestConfig.ValidateConfigVersion(r.Context(), id)
		if err != nil {
			writeWaterTestConfigResult(w, watertestconfig.ConfigVersionDetail{}, err)
			return
		}
		writeJSON(w, http.StatusOK, res)
	case "activate":
		out, err := s.waterTestConfig.ActivateConfigVersion(r.Context(), id)
		writeWaterTestConfigResult(w, out, err)
	default:
		writeJSONError(w, http.StatusNotFound, "not_found", "Pfad nicht gefunden.")
	}
}

func writeWaterTestConfigResult(w http.ResponseWriter, out watertestconfig.ConfigVersionDetail, err error) {
	if err == nil {
		writeJSON(w, http.StatusOK, out)
		return
	}
	if errors.Is(err, watertestconfig.ErrNotFound) {
		writeJSONError(w, http.StatusNotFound, "not_found", "Konfigurationsversion nicht gefunden.")
		return
	}
	if res, ok := watertestconfig.IsValidationError(err); ok {
		writeJSON(w, http.StatusBadRequest, res)
		return
	}
	if strings.Contains(err.Error(), "readonly") {
		writeJSONError(w, http.StatusConflict, "readonly_config", "Diese Version ist schreibgeschützt. Dupliziere sie, um Änderungen für zukünftige Messungen vorzunehmen.")
		return
	}
	writeJSONError(w, http.StatusInternalServerError, "database_error", "Wassertest-Konfiguration konnte nicht verarbeitet werden.")
}
