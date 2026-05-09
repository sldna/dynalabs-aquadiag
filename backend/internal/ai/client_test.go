package ai

import "testing"

func TestBuildChatCompletionsURL_BaseWithoutTrailingSlash(t *testing.T) {
	u, err := buildChatCompletionsURL("https://api.openai.com/v1")
	if err != nil {
		t.Fatal(err)
	}
	if got := u.String(); got != "https://api.openai.com/v1/chat/completions" {
		t.Fatalf("url=%q", got)
	}
}

func TestBuildChatCompletionsURL_BaseWithTrailingSlash(t *testing.T) {
	u, err := buildChatCompletionsURL("https://api.openai.com/v1/")
	if err != nil {
		t.Fatal(err)
	}
	if got := u.String(); got != "https://api.openai.com/v1/chat/completions" {
		t.Fatalf("url=%q", got)
	}
}
