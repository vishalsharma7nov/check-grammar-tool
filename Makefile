.PHONY: test api web prepare-data

test:
	npm test -w @check-grammar/engine
	cd server/api && go test ./...

api:
	cd server/api && go run ./cmd/api

web:
	npm run dev -w @check-grammar/web

prepare-data:
	python3 ml/data/prepare.py
