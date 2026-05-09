package api

import (
	"errors"
	"net/http"
	"strings"

	"aquadiag/backend/internal/db"
)

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
		writeJSON(w, http.StatusOK, rec)

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
