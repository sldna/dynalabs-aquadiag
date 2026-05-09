package api

import (
	"net/http"
	"os"
	"strings"
)

const (
	corsAllowMethods = "GET, POST, OPTIONS"
	corsAllowHeaders = "Content-Type"
)

// AllowedOriginsFromEnv returns comma-separated origins from CORS_ALLOWED_ORIGINS,
// or sensible dev defaults when unset.
func AllowedOriginsFromEnv() []string {
	raw := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if raw == "" {
		return []string{
			"http://localhost:3000",
			"http://127.0.0.1:3000",
		}
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if o := strings.TrimSpace(p); o != "" {
			out = append(out, o)
		}
	}
	return out
}

// WithCORS wraps h with CORS handling for browser clients (e.g. Next.js on another port).
func WithCORS(allowed []string, h http.Handler) http.Handler {
	allow := make(map[string]struct{}, len(allowed))
	for _, o := range allowed {
		allow[o] = struct{}{}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			if _, ok := allow[origin]; ok {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", corsAllowMethods)
				w.Header().Set("Access-Control-Allow-Headers", corsAllowHeaders)
				w.Header().Set("Access-Control-Max-Age", "86400")
			}
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		h.ServeHTTP(w, r)
	})
}
