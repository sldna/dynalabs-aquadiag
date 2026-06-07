package api

import (
	"database/sql"
	"net/http"

	"aquadiag/backend/internal/diagnosis"
	"aquadiag/backend/internal/watertestconfig"
)

// Server enthält HTTP-Handler und abhängige Services.
type Server struct {
	db              *sql.DB
	diagnosis       *diagnosis.Service
	waterTestConfig *watertestconfig.Service
}

// NewServer erstellt den API-Server. db und/oder diagnosis können nil sein (nicht genutzte Routen dann nicht aufrufen).
func NewServer(database *sql.DB, diagnosis *diagnosis.Service, waterTestConfig *watertestconfig.Service) *Server {
	if waterTestConfig == nil && database != nil {
		waterTestConfig = watertestconfig.NewService(database)
	}
	return &Server{
		db:              database,
		diagnosis:       diagnosis,
		waterTestConfig: waterTestConfig,
	}
}

// RegisterRoutes registriert alle Routen auf mux.
func RegisterRoutes(mux *http.ServeMux, srv *Server) {
	mux.HandleFunc("/health", srv.handleHealth)
	mux.HandleFunc("/v1/tanks", srv.routeV1Tanks)
	mux.HandleFunc("/v1/tanks/", srv.routeV1Tanks)
	mux.HandleFunc("/v1/water-tests/", srv.routeV1WaterTests)
	mux.HandleFunc("/v1/diagnose", srv.handleDiagnose)
	mux.HandleFunc("/v1/diagnoses/", srv.routeV1Diagnoses)
	mux.HandleFunc("/v1/water-test-config", srv.routeV1WaterTestConfig)
	mux.HandleFunc("/v1/water-test-config/", srv.routeV1WaterTestConfig)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSONError(w, http.StatusMethodNotAllowed, "method_not_allowed", "GET only")
		return
	}
	writeJSON(w, http.StatusOK, healthResponse{Status: "ok"})
}
