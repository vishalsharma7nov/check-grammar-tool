package main

import (
	"log/slog"
	"os"

	"github.com/checkgrammar/check-grammar/server/api/internal/config"
	"github.com/checkgrammar/check-grammar/server/api/internal/httpapi"
)

func main() {
	cfg := config.FromEnv()
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel})))
	if err := httpapi.Listen(cfg); err != nil {
		slog.Error("server stopped", "err", err)
		os.Exit(1)
	}
}
