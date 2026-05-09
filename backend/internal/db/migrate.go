package db

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strings"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

// Migrate applies SQL files from migrations/ in lexical order (once each).
func Migrate(db *sql.DB) error {
	type mi struct {
		name string
		sql  string
	}
	var items []mi
	if err := fs.WalkDir(migrationFS, "migrations", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(p, ".sql") {
			return nil
		}
		b, err := migrationFS.ReadFile(p)
		if err != nil {
			return err
		}
		items = append(items, mi{name: path.Base(p), sql: string(b)})
		return nil
	}); err != nil {
		return err
	}

	sort.Slice(items, func(i, j int) bool { return items[i].name < items[j].name })

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY
)`); err != nil {
		return fmt.Errorf("schema_migrations: %w", err)
	}

	for _, it := range items {
		var exists int
		if err := tx.QueryRow(`SELECT COUNT(1) FROM schema_migrations WHERE name = ?`, it.name).Scan(&exists); err != nil {
			return err
		}
		if exists > 0 {
			continue
		}
		if _, err := tx.Exec(it.sql); err != nil {
			return fmt.Errorf("migrate %s: %w", it.name, err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_migrations (name) VALUES (?)`, it.name); err != nil {
			return err
		}
	}

	return tx.Commit()
}
