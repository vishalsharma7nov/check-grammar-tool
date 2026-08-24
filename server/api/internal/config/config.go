package config

import (
	"log/slog"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Addr              string
	PublicURL         string
	WebOrigin         string
	DatabaseURL       string
	RedisURL          string
	JWTSecret         string
	LogLevel          slog.Level
	LLMProvider       string
	LLMBaseURL        string
	LLMModel          string
	LLMAPIKey         string
	CloudLLMBaseURL   string
	CloudLLMAPIKey    string
	CloudLLMModel     string
	BillingEnabled    bool
	StripeSecret      string
	StripeWebhook     string
	StripePricePro    string
	StripePriceTeam   string
	HostedRewriteQuota int
	LanguageToolURL    string
}

func FromEnv() Config {
	level := slog.LevelInfo
	switch strings.ToLower(getenv("LOG_LEVEL", "info")) {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	}
	return Config{
		Addr:               getenv("API_ADDR", ":8080"),
		PublicURL:          getenv("API_PUBLIC_URL", "http://localhost:8080"),
		WebOrigin:          getenv("WEB_ORIGIN", "http://localhost:3000"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		RedisURL:           os.Getenv("REDIS_URL"),
		JWTSecret:          getenv("JWT_SECRET", "dev-only-change-me"),
		LogLevel:           level,
		LLMProvider:        getenv("LLM_PROVIDER", "local"),
		LLMBaseURL:         getenv("LLM_BASE_URL", "http://127.0.0.1:8081/v1"),
		LLMModel:           getenv("LLM_MODEL", "check-gec-v0"),
		LLMAPIKey:          os.Getenv("LLM_API_KEY"),
		CloudLLMBaseURL:    os.Getenv("CLOUD_LLM_BASE_URL"),
		CloudLLMAPIKey:     os.Getenv("CLOUD_LLM_API_KEY"),
		CloudLLMModel:      os.Getenv("CLOUD_LLM_MODEL"),
		BillingEnabled:     getenv("BILLING_ENABLED", "false") == "true",
		StripeSecret:       os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhook:      os.Getenv("STRIPE_WEBHOOK_SECRET"),
		StripePricePro:     os.Getenv("STRIPE_PRICE_PRO"),
		StripePriceTeam:    os.Getenv("STRIPE_PRICE_TEAM"),
		HostedRewriteQuota: atoi(getenv("HOSTED_REWRITE_MONTHLY_QUOTA", "50")),
		LanguageToolURL:    os.Getenv("LANGUAGETOOL_URL"),
	}
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func atoi(s string) int {
	n, err := strconv.Atoi(s)
	if err != nil {
		return 0
	}
	return n
}
