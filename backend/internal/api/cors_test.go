package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWithCORS_AllowsOriginAndPreflight(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	h := WithCORS([]string{"http://localhost:3000"}, mux)

	t.Run("GET adds Allow-Origin", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
			t.Fatalf("Allow-Origin: %q", got)
		}
	})

	t.Run("OPTIONS preflight", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/health", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status=%d", rec.Code)
		}
		if got := rec.Header().Get("Access-Control-Allow-Methods"); got == "" {
			t.Fatal("missing Allow-Methods")
		}
	})

	t.Run("unknown Origin omits Allow-Origin", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		req.Header.Set("Origin", "https://evil.example")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Header().Get("Access-Control-Allow-Origin") != "" {
			t.Fatal("should not reflect disallowed origin")
		}
	})
}
