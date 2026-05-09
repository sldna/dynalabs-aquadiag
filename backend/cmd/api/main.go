package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"aquadiag/backend/internal/ai"
	"aquadiag/backend/internal/api"
	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/diagnosis"
	"aquadiag/backend/internal/rules"
)

func main() {
	logHandler := slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo})
	slog.SetDefault(slog.New(logHandler))

	databasePath := strings.TrimSpace(os.Getenv("DATABASE_PATH"))
	if databasePath == "" {
		databasePath = "aquadiag.db"
	}

	sqlDB, err := db.Open(databasePath)
	if err != nil {
		slog.Error("db_open_failed", "error", err.Error())
		os.Exit(1)
	}
	defer func() { _ = sqlDB.Close() }()

	if err := db.Migrate(sqlDB); err != nil {
		slog.Error("db_migrate_failed", "error", err.Error())
		os.Exit(1)
	}

	path, err := resolveRulesPath()
	if err != nil {
		slog.Error("rules_path_resolve_failed", "error", err.Error())
		os.Exit(1)
	}

	rs, err := rules.LoadFile(path)
	if err != nil {
		slog.Error("rules_load_failed", "path", path, "error", err.Error())
		os.Exit(1)
	}

	slog.Info("rules_loaded",
		"path", path,
		"version", rs.Version,
		"rules_total", len(rs.Rules),
		"rules_evaluated", rs.EvaluatedCount(),
	)

	aiSvc := ai.NewServiceFromEnv()
	slog.Info("ai_config",
		"enabled", aiSvc != nil && aiSvc.Enabled(),
		"base_host", aiSvc.BaseHost(),
		"model", aiSvc.Model(),
		"timeout_seconds", aiSvc.TimeoutSeconds(),
	)
	svc := diagnosis.NewService(sqlDB, rs, aiSvc)
	srv := api.NewServer(sqlDB, svc)

	mux := http.NewServeMux()
	api.RegisterRoutes(mux, srv)

	handler := api.WithCORS(api.AllowedOriginsFromEnv(), mux)

	addr := ":" + listenPort()
	server := &http.Server{
		Addr:    addr,
		Handler: handler,
	}

	slog.Info("api_listening", "addr", addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server_failed", "error", err.Error())
		os.Exit(1)
	}
}

func resolveRulesPath() (string, error) {
	if p := strings.TrimSpace(os.Getenv("RULES_PATH")); p != "" {
		return p, nil
	}
	for _, c := range []string{"rules/aquarium-rules.yaml", "../rules/aquarium-rules.yaml", "backend/rules/aquarium-rules.yaml"} {
		if _, err := os.Stat(c); err == nil {
			return c, nil
		}
	}
	return "", fmt.Errorf("keine aquarium-rules.yaml gefunden (Kandidaten: rules/aquarium-rules.yaml, ../rules/aquarium-rules.yaml, backend/rules/aquarium-rules.yaml); RULES_PATH setzen")
}

func listenPort() string {
	if p := os.Getenv("BACKEND_PORT"); p != "" {
		return p
	}
	return "8080"
}
