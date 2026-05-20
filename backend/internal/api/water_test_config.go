package api

import "net/http"

func (s *Server) handleWaterTestConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSONError(w, http.StatusMethodNotAllowed, "method_not_allowed", "GET only")
		return
	}
	if s.waterTestConfig == nil {
		writeJSONError(w, http.StatusServiceUnavailable, "service_unavailable", "water test config not loaded")
		return
	}
	writeJSON(w, http.StatusOK, s.waterTestConfig)
}
