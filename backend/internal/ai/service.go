package ai

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"aquadiag/backend/internal/models"
)

type ErrorCode string

const (
	ErrorCodeMissingAPIKey ErrorCode = "missing_api_key"
	ErrorCodeInvalidAPIKey ErrorCode = "invalid_api_key"
	ErrorCodeTimeout       ErrorCode = "timeout"
	ErrorCodeInvalidJSON   ErrorCode = "invalid_json"
	ErrorCodeProviderError ErrorCode = "provider_error"
	ErrorCodeDisabled      ErrorCode = "disabled"
)

type ExplainError struct {
	Code ErrorCode
	Err  error
}

func (e *ExplainError) Error() string {
	if e == nil {
		return ""
	}
	if e.Err == nil {
		return string(e.Code)
	}
	return string(e.Code) + ": " + e.Err.Error()
}

func (e *ExplainError) Unwrap() error { return e.Err }

func ErrorCodeFrom(err error) ErrorCode {
	var ee *ExplainError
	if errors.As(err, &ee) && ee != nil && ee.Code != "" {
		return ee.Code
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return ErrorCodeTimeout
	}
	return ErrorCodeProviderError
}

type Config struct {
	Enabled        bool
	APIKey         string
	BaseURL        string
	Model          string
	TimeoutSeconds int

	AppEnv string // "development" | "production" | ...
}

// NewServiceFromEnv wires the AI explanation service from env.
//
// Env:
// - AI_ENABLED=false
// - AI_API_KEY
// - AI_BASE_URL (full chat-completions endpoint URL)
// - AI_MODEL
// - AI_TIMEOUT_SECONDS=8
func NewServiceFromEnv() *Service {
	cfg := Config{
		Enabled:        parseBool(os.Getenv("AI_ENABLED")),
		APIKey:         strings.TrimSpace(os.Getenv("AI_API_KEY")),
		BaseURL:        strings.TrimSpace(os.Getenv("AI_BASE_URL")),
		Model:          strings.TrimSpace(os.Getenv("AI_MODEL")),
		TimeoutSeconds: parseIntDefault(os.Getenv("AI_TIMEOUT_SECONDS"), 8),
		AppEnv:         parseEnvDefault(os.Getenv("APP_ENV"), "development"),
	}
	return NewService(cfg, http.DefaultClient)
}

func parseEnvDefault(raw, def string) string {
	s := strings.ToLower(strings.TrimSpace(raw))
	if s == "" {
		return def
	}
	return s
}

func parseIntDefault(raw string, def int) int {
	s := strings.TrimSpace(raw)
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil || n <= 0 {
		return def
	}
	return n
}

func parseBool(raw string) bool {
	s := strings.ToLower(strings.TrimSpace(raw))
	return s == "1" || s == "true" || s == "yes" || s == "on"
}

type Service struct {
	cfg    Config
	client *Client
}

func NewService(cfg Config, httpClient *http.Client) *Service {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &Service{cfg: cfg, client: newClient(cfg, httpClient)}
}

func (s *Service) Enabled() bool {
	return s != nil && s.cfg.Enabled
}

func (s *Service) IsDevelopment() bool {
	if s == nil {
		return true
	}
	return strings.TrimSpace(strings.ToLower(s.cfg.AppEnv)) != "production"
}

func (s *Service) TimeoutSeconds() int {
	if s == nil {
		return 0
	}
	return s.cfg.TimeoutSeconds
}

func (s *Service) Model() string {
	if s == nil {
		return ""
	}
	return strings.TrimSpace(s.cfg.Model)
}

func (s *Service) BaseHost() string {
	if s == nil {
		return ""
	}
	u, err := url.Parse(strings.TrimSpace(s.cfg.BaseURL))
	if err != nil {
		return ""
	}
	return u.Host
}

func (s *Service) EndpointPath() string {
	if s == nil || s.client == nil {
		return ""
	}
	u, err := url.Parse(s.client.ChatCompletionsURL())
	if err != nil {
		return ""
	}
	return u.Path
}

// Explain returns the optional AI explanation for the given deterministic diagnosis context.
// It must never change the deterministic diagnosis; it only creates an explanation object.
func (s *Service) Explain(ctx context.Context, top models.RuleMatch, all []models.RuleMatch, matchedRules []string, followUpAnswers []models.FollowUpAnswerItem) (*models.AIExplanation, error) {
	if s == nil || !s.cfg.Enabled {
		return nil, &ExplainError{Code: ErrorCodeDisabled, Err: context.Canceled}
	}

	if strings.TrimSpace(s.cfg.APIKey) == "" {
		return nil, &ExplainError{Code: ErrorCodeMissingAPIKey, Err: errors.New("AI_API_KEY missing")}
	}
	if strings.TrimSpace(s.cfg.BaseURL) == "" || strings.TrimSpace(s.cfg.Model) == "" {
		// Treat missing endpoint/model as provider/config error, but still normalized.
		return nil, &ExplainError{Code: ErrorCodeProviderError, Err: errors.New("AI_BASE_URL/AI_MODEL missing")}
	}

	timeout := time.Duration(s.cfg.TimeoutSeconds) * time.Second
	if timeout <= 0 {
		timeout = 8 * time.Second
	}
	cctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	userPrompt, err := BuildUserPrompt(top, all, matchedRules, followUpAnswers)
	if err != nil {
		return nil, err
	}

	raw, err := s.client.ChatCompletionsJSONOnly(cctx, systemPromptDE, userPrompt)
	if err != nil {
		// Preserve normalized error codes; never leak provider body/prompt.
		var he *HTTPStatusError
		if errors.As(err, &he) {
			if he.Status == 401 || he.Status == 403 {
				if s.IsDevelopment() {
					slog.Info("ai_explain_failed",
						"ai_error_code", string(ErrorCodeInvalidAPIKey),
						"http_status", he.Status,
						"endpoint_path", s.EndpointPath(),
						"model", s.Model(),
						"timeout_seconds", s.TimeoutSeconds(),
					)
				}
				return nil, &ExplainError{Code: ErrorCodeInvalidAPIKey, Err: err}
			}
			if s.IsDevelopment() {
				slog.Info("ai_explain_failed",
					"ai_error_code", string(ErrorCodeProviderError),
					"http_status", he.Status,
					"endpoint_path", s.EndpointPath(),
					"model", s.Model(),
					"timeout_seconds", s.TimeoutSeconds(),
				)
			}
			return nil, &ExplainError{Code: ErrorCodeProviderError, Err: err}
		}
		if errors.Is(err, context.DeadlineExceeded) {
			if s.IsDevelopment() {
				slog.Info("ai_explain_failed",
					"ai_error_code", string(ErrorCodeTimeout),
					"endpoint_path", s.EndpointPath(),
					"model", s.Model(),
					"timeout_seconds", s.TimeoutSeconds(),
				)
			}
			return nil, &ExplainError{Code: ErrorCodeTimeout, Err: err}
		}
		if s.IsDevelopment() {
			slog.Info("ai_explain_failed",
				"ai_error_code", string(ErrorCodeProviderError),
				"endpoint_path", s.EndpointPath(),
				"model", s.Model(),
				"timeout_seconds", s.TimeoutSeconds(),
			)
		}
		return nil, &ExplainError{Code: ErrorCodeProviderError, Err: err}
	}
	ex, err := ParseAndValidateExplanation(raw)
	if err != nil {
		if s.IsDevelopment() {
			slog.Info("ai_explain_failed",
				"ai_error_code", string(ErrorCodeInvalidJSON),
				"endpoint_path", s.EndpointPath(),
				"model", s.Model(),
				"timeout_seconds", s.TimeoutSeconds(),
			)
		}
		return nil, &ExplainError{Code: ErrorCodeInvalidJSON, Err: err}
	}
	return ex, nil
}
