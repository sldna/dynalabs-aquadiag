package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/models"
)

type createTankBody struct {
	Name         string  `json:"name"`
	VolumeLiters float64 `json:"volume_liters"`
}

func (s *Server) routeV1Tanks(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		writeJSONError(w, http.StatusServiceUnavailable, "service_unavailable", "database not configured")
		return
	}

	path := normalizeAPIPath(r.URL.Path)
	if path == "/v1/tanks" {
		switch r.Method {
		case http.MethodGet:
			s.handleListTanks(w, r)
		case http.MethodPost:
			s.handleCreateTank(w, r)
		default:
			writeJSONError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Erlaubt sind GET oder POST.")
		}
		return
	}

	const pref = "/v1/tanks/"
	if strings.HasPrefix(path, pref) {
		rest := strings.TrimPrefix(path, pref)
		parts := splitAPIPath(rest)
		if len(parts) == 1 {
			s.handleTankItem(w, r, parts[0])
			return
		}
		if len(parts) == 2 && parts[1] == "water-tests" && r.Method == http.MethodGet {
			s.handleTankWaterTests(w, r, parts[0])
			return
		}
		if len(parts) == 2 && parts[1] == "water-tests" {
			writeJSONError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Für Wassertests ist nur GET erlaubt.")
			return
		}
	}

	writeJSONError(w, http.StatusNotFound, "not_found", "Pfad nicht gefunden.")
}

func normalizeAPIPath(p string) string {
	p = strings.TrimSuffix(p, "/")
	if p == "" {
		return "/"
	}
	return p
}

func splitAPIPath(rest string) []string {
	var parts []string
	for _, seg := range strings.Split(rest, "/") {
		if seg != "" {
			parts = append(parts, seg)
		}
	}
	return parts
}

func parsePositiveInt64(w http.ResponseWriter, raw string, field string) (int64, bool) {
	n, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || n < 1 {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Code:    "invalid_path",
			Message: "Die angegebene ID ist ungültig.",
			Errors: []models.FieldError{
				{Field: field, Code: "invalid_integer", Message: "Muss eine positive Ganzzahl sein."},
			},
		})
		return 0, false
	}
	return n, true
}

func (s *Server) handleListTanks(w http.ResponseWriter, r *http.Request) {
	tanks, err := db.ListTanks(r.Context(), s.db)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Becken konnten nicht geladen werden.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"tanks": tanks})
}

func (s *Server) handleCreateTank(w http.ResponseWriter, r *http.Request) {
	var body createTankBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Code:    "invalid_json",
			Message: "Der JSON-Body ist ungültig.",
			Errors: []models.FieldError{
				{Field: "body", Code: "invalid_json", Message: "JSON konnte nicht gelesen werden."},
			},
		})
		return
	}
	name := strings.TrimSpace(body.Name)
	var fieldErrors []models.FieldError
	if name == "" {
		fieldErrors = append(fieldErrors, models.FieldError{
			Field:   "name",
			Code:    "required",
			Message: "name ist erforderlich.",
		})
	}
	if body.VolumeLiters < 0 {
		fieldErrors = append(fieldErrors, models.FieldError{
			Field:   "volume_liters",
			Code:    "invalid_range",
			Message: "volume_liters darf nicht negativ sein.",
		})
	}
	if len(fieldErrors) > 0 {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Code:    "validation_failed",
			Message: "Die Anfrage erfüllt die Validierung nicht.",
			Errors:  fieldErrors,
		})
		return
	}
	id, err := db.InsertTank(r.Context(), s.db, name, body.VolumeLiters)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Becken konnte nicht angelegt werden.")
		return
	}
	tank, err := db.TankByID(r.Context(), s.db, id)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Becken nicht lesbar.")
		return
	}
	writeJSON(w, http.StatusCreated, tank)
}

func (s *Server) handleTankItem(w http.ResponseWriter, r *http.Request, idStr string) {
	id, ok := parsePositiveInt64(w, idStr, "id")
	if !ok {
		return
	}
	switch r.Method {
	case http.MethodGet:
		tank, err := db.TankByID(r.Context(), s.db, id)
		if errors.Is(err, db.ErrTankNotFound) {
			writeJSONError(w, http.StatusNotFound, "not_found", "Becken nicht gefunden.")
			return
		}
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "database_error", "Becken konnte nicht geladen werden.")
			return
		}
		writeJSON(w, http.StatusOK, tank)
	case http.MethodPut:
		s.handleUpdateTank(w, r, id)
	case http.MethodDelete:
		s.handleDeleteTank(w, r, id)
	default:
		writeJSONError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Erlaubt sind GET, PUT oder DELETE.")
	}
}

func (s *Server) handleUpdateTank(w http.ResponseWriter, r *http.Request, id int64) {
	var raw map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Code:    "invalid_json",
			Message: "Der JSON-Body ist ungültig.",
			Errors: []models.FieldError{
				{Field: "body", Code: "invalid_json", Message: "JSON konnte nicht gelesen werden."},
			},
		})
		return
	}
	if len(raw) == 0 {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Code:    "validation_failed",
			Message: "Mindestens ein Feld zum Aktualisieren ist erforderlich.",
			Errors: []models.FieldError{
				{Field: "body", Code: "required", Message: "Leerer Body ist nicht erlaubt."},
			},
		})
		return
	}

	var name *string
	var volumeLiters *float64
	var notesSet bool
	var notes *string
	var fieldErrors []models.FieldError

	if v, ok := raw["name"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			fieldErrors = append(fieldErrors, models.FieldError{
				Field: "name", Code: "invalid_json", Message: "name muss ein JSON-String sein.",
			})
		} else {
			st := strings.TrimSpace(s)
			name = &st
			if *name == "" {
				fieldErrors = append(fieldErrors, models.FieldError{
					Field: "name", Code: "required", Message: "name darf nicht leer sein.",
				})
			}
		}
	}
	if v, ok := raw["volume_liters"]; ok {
		var f float64
		if err := json.Unmarshal(v, &f); err != nil {
			fieldErrors = append(fieldErrors, models.FieldError{
				Field: "volume_liters", Code: "invalid_number", Message: "volume_liters muss eine Zahl sein.",
			})
		} else if f < 0 {
			fieldErrors = append(fieldErrors, models.FieldError{
				Field: "volume_liters", Code: "invalid_range", Message: "volume_liters darf nicht negativ sein.",
			})
		} else {
			volumeLiters = &f
		}
	}
	if v, ok := raw["notes"]; ok {
		notesSet = true
		if string(v) == "null" {
			notes = nil
		} else {
			var s string
			if err := json.Unmarshal(v, &s); err != nil {
				fieldErrors = append(fieldErrors, models.FieldError{
					Field: "notes", Code: "invalid_json", Message: "notes muss ein JSON-String oder null sein.",
				})
			} else {
				notes = &s
			}
		}
	}

	if len(fieldErrors) > 0 {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Code:    "validation_failed",
			Message: "Die Anfrage erfüllt die Validierung nicht.",
			Errors:  fieldErrors,
		})
		return
	}

	if name == nil && volumeLiters == nil && !notesSet {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Code:    "validation_failed",
			Message: "Keine der Felder name, volume_liters oder notes wurde gesetzt.",
			Errors: []models.FieldError{
				{Field: "body", Code: "no_updates", Message: "Mindestens eines der Felder name, volume_liters oder notes ist erforderlich."},
			},
		})
		return
	}

	err := db.UpdateTank(r.Context(), s.db, id, name, volumeLiters, notesSet, notes)
	if errors.Is(err, db.ErrTankNotFound) {
		writeJSONError(w, http.StatusNotFound, "not_found", "Becken nicht gefunden.")
		return
	}
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Becken konnte nicht aktualisiert werden.")
		return
	}
	tank, err := db.TankByID(r.Context(), s.db, id)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Becken nicht lesbar.")
		return
	}
	writeJSON(w, http.StatusOK, tank)
}

func (s *Server) handleDeleteTank(w http.ResponseWriter, r *http.Request, id int64) {
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Transaktion konnte nicht gestartet werden.")
		return
	}
	defer func() { _ = tx.Rollback() }()

	if err := db.DeleteTankCascade(r.Context(), tx, id); err != nil {
		if errors.Is(err, db.ErrTankNotFound) {
			writeJSONError(w, http.StatusNotFound, "not_found", "Becken nicht gefunden.")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Becken konnte nicht gelöscht werden.")
		return
	}
	if err := tx.Commit(); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Transaktion konnte nicht abgeschlossen werden.")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleTankWaterTests(w http.ResponseWriter, r *http.Request, tankIDStr string) {
	tankID, ok := parsePositiveInt64(w, tankIDStr, "id")
	if !ok {
		return
	}
	_, err := db.TankByID(r.Context(), s.db, tankID)
	if errors.Is(err, db.ErrTankNotFound) {
		writeJSONError(w, http.StatusNotFound, "not_found", "Becken nicht gefunden.")
		return
	}
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Becken konnte nicht geladen werden.")
		return
	}
	tests, err := db.ListWaterTestsByTank(r.Context(), s.db, tankID)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "database_error", "Wassertests konnten nicht geladen werden.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"water_tests": enrichWaterTests(tests)})
}
