package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
)

type HTTPStatusError struct {
	Status int
}

func (e *HTTPStatusError) Error() string {
	if e == nil {
		return ""
	}
	return fmt.Sprintf("ai http status %d", e.Status)
}

type openAIChatCompletionsRequest struct {
	Model       string                   `json:"model"`
	Messages    []openAIChatMessage      `json:"messages"`
	Temperature float64                  `json:"temperature,omitempty"`
	ResponseFmt *openAIResponseFormatObj `json:"response_format,omitempty"`
}

type openAIResponseFormatObj struct {
	Type string `json:"type"`
}

type openAIChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIChatCompletionsResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type Client struct {
	baseURL string
	chatURL string
	apiKey  string
	http    *http.Client
	model   string
}

func newClient(cfg Config, httpClient *http.Client) *Client {
	base := strings.TrimSpace(cfg.BaseURL)
	chatURL := base
	if u, err := buildChatCompletionsURL(base); err == nil {
		chatURL = u.String()
	}
	return &Client{
		baseURL: base,
		chatURL: chatURL,
		apiKey:  strings.TrimSpace(cfg.APIKey),
		http:    httpClient,
		model:   strings.TrimSpace(cfg.Model),
	}
}

func (c *Client) ChatCompletionsURL() string {
	if c == nil {
		return ""
	}
	return c.chatURL
}

func buildChatCompletionsURL(rawBase string) (*url.URL, error) {
	s := strings.TrimSpace(rawBase)
	if s == "" {
		return nil, fmt.Errorf("empty base url")
	}
	u, err := url.Parse(s)
	if err != nil {
		return nil, err
	}

	// If caller already provided full endpoint, keep it.
	if strings.HasSuffix(strings.TrimRight(u.Path, "/"), "/chat/completions") {
		return u, nil
	}

	p := strings.TrimRight(u.Path, "/")
	if p == "" {
		p = "/v1"
	}
	// Ensure we don't accidentally create /v1/v1/...
	if strings.HasSuffix(p, "/v1") {
		u.Path = path.Join(p, "chat", "completions")
	} else {
		// Accept other base paths as-is (for proxies); append chat/completions.
		u.Path = path.Join(p, "chat", "completions")
	}
	return u, nil
}

func (c *Client) ChatCompletionsJSONOnly(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	if strings.TrimSpace(c.baseURL) == "" {
		return "", fmt.Errorf("AI_BASE_URL is required when AI_ENABLED=true")
	}
	if strings.TrimSpace(c.model) == "" {
		return "", fmt.Errorf("AI_MODEL is required when AI_ENABLED=true")
	}
	if strings.TrimSpace(c.apiKey) == "" {
		return "", fmt.Errorf("AI_API_KEY is required when AI_ENABLED=true")
	}

	reqBody := openAIChatCompletionsRequest{
		Model: c.model,
		Messages: []openAIChatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Temperature: 0.2,
		ResponseFmt: &openAIResponseFormatObj{Type: "json_object"},
	}
	b, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	endpoint := c.chatURL
	if strings.TrimSpace(endpoint) == "" {
		endpoint = c.baseURL
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(b))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		_ = body // never surface provider response body (may contain sensitive details)
		return "", &HTTPStatusError{Status: resp.StatusCode}
	}

	var out openAIChatCompletionsResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return "", fmt.Errorf("ai response json: %w", err)
	}
	if len(out.Choices) == 0 {
		return "", fmt.Errorf("ai response: missing choices")
	}
	content := strings.TrimSpace(out.Choices[0].Message.Content)
	if content == "" {
		return "", fmt.Errorf("ai response: empty content")
	}
	return content, nil
}
