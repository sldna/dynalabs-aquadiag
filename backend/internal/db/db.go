package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// Open opens SQLite with foreign keys enabled.
func Open(databasePath string) (*sql.DB, error) {
	p := strings.TrimSpace(databasePath)
	if p == "" {
		p = "aquadiag.db"
	}
	if d := filepath.Dir(p); d != "." && d != "" {
		if err := os.MkdirAll(d, 0o755); err != nil {
			return nil, fmt.Errorf("mkdir db dir: %w", err)
		}
	}
	// modernc sqlite DSN
	dsn := fmt.Sprintf("file:%s?_pragma=foreign_keys(1)&_time_format=sqlite", filepath.ToSlash(p))
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func normalizeSQLiteTimestamp(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return raw
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.UTC().Format(time.RFC3339)
	}
	if t, err := time.Parse("2006-01-02 15:04:05", s); err == nil {
		return t.UTC().Format(time.RFC3339)
	}
	return raw
}
