package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"aquadiag/backend/internal/diagnosis"
	"aquadiag/backend/internal/models"
)

func (s *Server) handleDiagnose(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSONError(w, http.StatusMethodNotAllowed, "method_not_allowed", "POST only")
		return
	}
	if s.diagnosis == nil {
		writeJSONError(w, http.StatusInternalServerError, "service_unavailable", "diagnosis service not configured")
		return
	}

	var req models.DiagnoseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Code:    "invalid_json",
			Message: "Der JSON-Body ist ungültig.",
			Errors: []models.FieldError{
				{Field: "body", Code: "invalid_json", Message: "JSON konnte nicht gelesen werden."},
			},
		})
		return
	}

	resp, err := s.diagnosis.Diagnose(r.Context(), req)
	if err != nil {
		var verr *diagnosis.ValidationFailedError
		if errors.As(err, &verr) {
			writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
				Code:    "validation_failed",
				Message: "Die Anfrage erfüllt die Validierung nicht.",
				Errors:  verr.Errors,
			})
			return
		}
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Code:    "request_failed",
			Message: err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
