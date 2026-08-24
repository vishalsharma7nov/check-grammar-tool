package httpapi

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/checkgrammar/check-grammar/server/api/internal/auth"
	"github.com/checkgrammar/check-grammar/server/api/internal/billing"
	"github.com/checkgrammar/check-grammar/server/api/internal/check"
	"github.com/checkgrammar/check-grammar/server/api/internal/config"
	"github.com/checkgrammar/check-grammar/server/api/internal/llm"
)

type Server struct {
	cfg   config.Config
	llm   *llm.Client
	users map[string]storedUser
	mu    sync.Mutex
}

type storedUser struct {
	ID, Email, Password, Plan string
}

func Listen(cfg config.Config) error {
	s := &Server{cfg: cfg, llm: llm.New(cfg), users: map[string]storedUser{}}
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)
	r.Use(cors(cfg.WebOrigin))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]any{
			"ok": true, "llmProvider": cfg.LLMProvider, "llmBaseUrl": cfg.LLMBaseURL,
			"dataPath": "rules-on-this-process; llm=" + cfg.LLMProvider + " at " + cfg.LLMBaseURL,
		})
	})
	r.Get("/v1/data-path", s.dataPath)
	r.Get("/v1/entitlements", s.entitlements)
	r.Post("/v1/check", s.check)
	r.Post("/v2/check", s.checkLT)
	r.Post("/v1/rewrite", s.rewrite)
	r.Post("/v1/auth/register", s.register)
	r.Post("/v1/auth/login", s.login)
	r.Post("/v1/billing/checkout", s.checkout)
	r.Post("/v1/billing/webhook", s.webhook)
	r.Get("/v1/sso/saml/metadata", s.ssoMetadata)

	slog.Info("listening", "addr", cfg.Addr)
	return http.ListenAndServe(cfg.Addr, r)
}

func (s *Server) dataPath(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]any{
		"defaultMode": "privacy (browser engine, no network)",
		"localApi":    "POST /v1/check — text stays on this host",
		"localLLM":    s.cfg.LLMBaseURL + " (host process; not Docker on macOS)",
		"hostedGPU":   "opt-in Pro: our weights on our GPU. Core rules never gated.",
		"byok":        "opt-in only; disabled unless CLOUD_LLM_* is set and the user asks",
		"never":       "we never silently send demo traffic to OpenAI/Gemini",
	})
}

func (s *Server) entitlements(w http.ResponseWriter, r *http.Request) {
	u := s.userFrom(r)
	plan := "free"
	if u != nil {
		plan = u.Plan
	}
	writeJSON(w, 200, billing.ForPlan(plan, s.cfg.HostedRewriteQuota))
}

func (s *Server) check(w http.ResponseWriter, r *http.Request) {
	var req check.Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", 400)
		return
	}
	res := check.Analyze(req)
	if req.IncludeLLM {
		out, err := s.llm.Rewrite(r.Context(), req.Text, "List residual issues after rules; if none, say OK.", string(req.Dialect), false)
		if err != nil {
			res.LLM = check.LLMMeta{Used: false, Provider: "local", SkippedReason: err.Error()}
		} else {
			res.LLM = check.LLMMeta{Used: true, Provider: out.Provider, Model: out.Model}
		}
	}
	writeJSON(w, 200, res)
}

// LanguageTool-shaped compatibility so existing clients can point here.
func (s *Server) checkLT(w http.ResponseWriter, r *http.Request) {
	text := r.FormValue("text")
	if text == "" && r.Header.Get("Content-Type") == "application/json" {
		var body struct {
			Text     string `json:"text"`
			Language string `json:"language"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		text = body.Text
		if body.Language != "" && r.FormValue("language") == "" {
			r.Form.Set("language", body.Language)
		}
	}
	lang := r.FormValue("language")
	d := check.EnUS
	switch {
	case strings.HasPrefix(lang, "en-GB"):
		d = check.EnGB
	case strings.HasPrefix(lang, "en-IN"):
		d = check.EnIN
	case strings.HasPrefix(lang, "en-AU"):
		d = check.EnAU
	case strings.HasPrefix(lang, "en-CA"):
		d = check.EnCA
	}
	res := check.Analyze(check.Request{Text: text, Dialect: d})
	matches := make([]map[string]any, 0, len(res.Matches))
	for _, m := range res.Matches {
		reps := make([]map[string]string, 0, len(m.Replacements))
		for _, v := range m.Replacements {
			reps = append(reps, map[string]string{"value": v})
		}
		matches = append(matches, map[string]any{
			"offset": m.Offset, "length": m.Length, "message": m.Message,
			"shortMessage": m.Category, "replacements": reps,
			"rule": map[string]string{"id": m.RuleID, "description": m.Explanation, "category": m.Category},
		})
	}
	writeJSON(w, 200, map[string]any{"software": map[string]string{"name": "Check Grammar"}, "language": map[string]string{"code": string(d)}, "matches": matches})
}

func (s *Server) rewrite(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Text        string `json:"text"`
		Instruction string `json:"instruction"`
		Dialect     string `json:"dialect"`
		Hosted      bool   `json:"hosted"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", 400)
		return
	}
	if req.Hosted {
		u := s.userFrom(r)
		plan := "free"
		if u != nil {
			plan = u.Plan
		}
		ent := billing.ForPlan(plan, s.cfg.HostedRewriteQuota)
		if !ent.HostedGPURewrite {
			http.Error(w, "hosted GPU rewrite is a Pro feature; local rewrite is free", http.StatusPaymentRequired)
			return
		}
	}
	out, err := s.llm.Rewrite(r.Context(), req.Text, req.Instruction, req.Dialect, req.Hosted)
	if err != nil {
		http.Error(w, err.Error(), 502)
		return
	}
	writeJSON(w, 200, map[string]any{"text": out.Text, "provider": out.Provider, "model": out.Model})
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	var req struct{ Email, Password string }
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.Email == "" || req.Password == "" {
		http.Error(w, "email and password required", 400)
		return
	}
	id := randID()
	s.mu.Lock()
	s.users[req.Email] = storedUser{ID: id, Email: req.Email, Password: req.Password, Plan: "free"}
	s.mu.Unlock()
	tok, _ := auth.Sign(s.cfg.JWTSecret, id, req.Email, "free", 30*24*time.Hour)
	writeJSON(w, 200, map[string]any{"token": tok, "plan": "free"})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var req struct{ Email, Password string }
	_ = json.NewDecoder(r.Body).Decode(&req)
	s.mu.Lock()
	u, ok := s.users[req.Email]
	s.mu.Unlock()
	if !ok || u.Password != req.Password {
		http.Error(w, "invalid credentials", 401)
		return
	}
	tok, _ := auth.Sign(s.cfg.JWTSecret, u.ID, u.Email, u.Plan, 30*24*time.Hour)
	writeJSON(w, 200, map[string]any{"token": tok, "plan": u.Plan})
}

func (s *Server) checkout(w http.ResponseWriter, r *http.Request) {
	if !s.cfg.BillingEnabled || s.cfg.StripeSecret == "" {
		writeJSON(w, 200, map[string]any{
			"mode": "disabled",
			"message": "Set BILLING_ENABLED=true and STRIPE_SECRET_KEY to create live Checkout sessions. " +
				"Plans sell hosted GPU of our weights, team style guides, and SSO — not the checker.",
			"prices": map[string]string{"pro": s.cfg.StripePricePro, "team": s.cfg.StripePriceTeam},
		})
		return
	}
	writeJSON(w, 200, map[string]any{"url": s.cfg.PublicURL + "/billing/placeholder"})
}

func (s *Server) webhook(w http.ResponseWriter, r *http.Request) {
	_, _ = io.ReadAll(r.Body)
	writeJSON(w, 200, map[string]string{"received": "true"})
}

func (s *Server) ssoMetadata(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/xml")
	_, _ = w.Write([]byte(`<?xml version="1.0"?><!-- SAML metadata placeholder: Team plan -->
<EntityDescriptor entityID="https://checkgrammar.example/sso"></EntityDescriptor>`))
}

func (s *Server) userFrom(r *http.Request) *auth.User {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return nil
	}
	u, err := auth.Parse(s.cfg.JWTSecret, strings.TrimPrefix(h, "Bearer "))
	if err != nil {
		return nil
	}
	return u
}

func cors(origin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			if r.Method == http.MethodOptions {
				w.WriteHeader(204)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func randID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
