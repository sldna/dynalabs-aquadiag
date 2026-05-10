package api

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/models"
)

var followUpAnswerKeyRe = regexp.MustCompile(`^[0-9]{1,3}$`)

func (s *Server) routeV1Diagnoses(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		writeJSONError(w, http.StatusServiceUnavailable, "service_unavailable", "database not configured")
		return
	}

	path := normalizeAPIPath(r.URL.Path)
	const pref = "/v1/diagnoses/"
	if !strings.HasPrefix(path, pref) {
		writeJSONError(w, http.StatusNotFound, "not_found", "Pfad nicht gefunden.")
		return
	}

	rest := strings.TrimPrefix(path, pref)
	parts := splitAPIPath(rest)
	if len(parts) != 1 {
		writeJSONError(w, http.StatusNotFound, "not_found", "Pfad nicht gefunden.")
		return
	}

	id, ok := parsePositiveInt64(w, parts[0], "id")
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodPatch:
		s.handlePatchDiagnosisFollowUps(w, r, id)
	default:
		writeJSONError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Erlaubt ist PATCH.")
	}
}

type patchFollowUpsBody struct {
	FollowUpAnswers map[string]string `json:"follow_up_answers"`
}

const (
	maxFollowUpEntries   = 48
	maxFollowUpAnswerLen = 4000
)

func (s *Server) handlePatchDiagnosisFollowUps(w http.ResponseWriter, r *http.Request, diagnosisID int64) {
	var body patchFollowUpsBody
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
	if body.FollowUpAnswers == nil {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Code:    "validation_failed",
			Message: "follow_up_answers ist erforderlich (leeres Objekt ist erlaubt).",
			Errors: []models.FieldError{
				{Field: "follow_up_answers", Code: "required", Message: "Pflichtfeld."},
			},
		})
		return
	}
	if len(body.FollowUpAnswers) > maxFollowUpEntries {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Code:    "validation_failed",
			Message: "Zu viele Einträge in follow_up_answers.",
			Errors: []models.FieldError{
				{Field: "follow_up_answers", Code: "too_many", Message: "Maximal " + strconv.Itoa(maxFollowUpEntries) + " Antworten."},
			},
		})
		return
	}

	for k, v := range body.FollowUpAnswers {
		if !followUpAnswerKeyRe.MatchString(k) {
			writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
				Code:    "validation_failed",
				Message: "Ungültiger Schlüssel in follow_up_answers.",
				Errors: []models.FieldError{
					{Field: "follow_up_answers." + k, Code: "invalid_key", Message: "Schlüssel muss ein Index sein (z. B. \"0\", \"1\")."},
				},
			})
			return
		}
		if utf8.RuneCountInString(v) > maxFollowUpAnswerLen {
			writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
				Code:    "validation_failed",
				Message: "Antworttext zu lang.",
				Errors: []models.FieldError{
					{Field: "follow_up_answers." + k, Code: "too_long", Message: "Maximal " + strconv.Itoa(maxFollowUpAnswerLen) + " Zeichen."},
				},
			})
			return
		}
	}

	raw, err := json.Marshal(body.FollowUpAnswers)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "encode_failed", err.Error())
		return
	}

	if err := db.UpdateDiagnosisFollowUpAnswers(r.Context(), s.db, diagnosisID, string(raw)); err != nil {
		if err == db.ErrDiagnosisNotFound {
			writeJSONError(w, http.StatusNotFound, "not_found", "Diagnose nicht gefunden.")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "update_failed", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"diagnosis_id":      diagnosisID,
		"follow_up_answers": body.FollowUpAnswers,
	})
}
