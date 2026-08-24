package plagiarism

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const longText = "This is a sufficiently long passage of text used to exercise the plagiarism " +
	"provider adapters in tests. It needs to be over one hundred characters so the length guard passes."

func TestSkipsWhenNotConfigured(t *testing.T) {
	res, err := Check(context.Background(), Config{}, longText)
	if err != nil {
		t.Fatal(err)
	}
	if res.SkippedReason != "no provider configured" {
		t.Fatalf("want skip reason, got %+v", res)
	}
	if res.Provider != "none" || res.Matches == nil {
		t.Fatalf("want provider none with empty matches, got %+v", res)
	}
}

func TestSkipsShortText(t *testing.T) {
	res, err := Check(context.Background(), Config{Provider: "winston", APIKey: "k"}, "too short")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(res.SkippedReason, "too short") {
		t.Fatalf("want short-text skip, got %+v", res)
	}
}

func TestResolveProvider(t *testing.T) {
	cases := []struct {
		cfg  Config
		want string
	}{
		{Config{}, "none"},
		{Config{APIKey: "k"}, "winston"},
		{Config{APIKey: "k", APIURL: "https://x"}, "generic"},
		{Config{Provider: "prepostseo", APIKey: "k"}, "prepostseo"},
		{Config{Provider: "none", APIKey: "k"}, "none"},
	}
	for _, c := range cases {
		if got := resolveProvider(c.cfg); got != c.want {
			t.Errorf("resolveProvider(%+v) = %q, want %q", c.cfg, got, c.want)
		}
	}
}

func TestWinstonAdapter(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Errorf("missing bearer auth, got %q", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"result": {"score": 42.5},
			"sources": [{
				"score": 90,
				"url": "https://example.com/article",
				"title": "Example Article",
				"plagiarismFound": [{"startIndex": 0, "endIndex": 10, "sequence": "matched passage"}]
			}]
		}`))
	}))
	defer srv.Close()

	res, err := Check(context.Background(), Config{Provider: "winston", APIKey: "test-key", APIURL: srv.URL}, longText)
	if err != nil {
		t.Fatal(err)
	}
	if res.Score != 42.5 || res.Provider != "winston" {
		t.Fatalf("bad result: %+v", res)
	}
	if len(res.Matches) != 1 || res.Matches[0].URL != "https://example.com/article" ||
		res.Matches[0].Text != "matched passage" || res.Matches[0].Similarity != 90 {
		t.Fatalf("bad matches: %+v", res.Matches)
	}
}

func TestPrepostseoAdapter(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil || r.PostForm.Get("key") != "pk" {
			t.Errorf("missing form key, got %q", r.PostForm.Get("key"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"plagPercent": 25,
			"details": [
				{"query": "a copied sentence", "unique": "false", "webs": [{"title": "Source", "url": "https://src.example"}]},
				{"query": "an original sentence", "unique": "true", "webs": []}
			]
		}`))
	}))
	defer srv.Close()

	res, err := Check(context.Background(), Config{Provider: "prepostseo", APIKey: "pk", APIURL: srv.URL}, longText)
	if err != nil {
		t.Fatal(err)
	}
	if res.Score != 25 || len(res.Matches) != 1 || res.Matches[0].Text != "a copied sentence" {
		t.Fatalf("bad result: %+v matches=%+v", res, res.Matches)
	}
}

func TestGenericAdapter(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"score": 12, "matches": [{"text": "t", "url": "https://u", "similarity": 12}]}`))
	}))
	defer srv.Close()

	res, err := Check(context.Background(), Config{Provider: "generic", APIKey: "k", APIURL: srv.URL}, longText)
	if err != nil {
		t.Fatal(err)
	}
	if res.Score != 12 || res.Provider != "generic" || len(res.Matches) != 1 {
		t.Fatalf("bad result: %+v", res)
	}
}

func TestProviderErrorSurfaces(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error":"UNAUTHORIZED"}`, http.StatusUnauthorized)
	}))
	defer srv.Close()

	_, err := Check(context.Background(), Config{Provider: "winston", APIKey: "bad", APIURL: srv.URL}, longText)
	if err == nil || !strings.Contains(err.Error(), "401") {
		t.Fatalf("want 401 error, got %v", err)
	}
}
