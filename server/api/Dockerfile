# Build Go API (context: repo root — see docker-compose.yml)
FROM golang:1.22-alpine AS gobuild
WORKDIR /src
COPY server/api/go.mod server/api/go.sum* ./
COPY server/api/ ./
RUN go mod tidy && CGO_ENABLED=0 go build -o /out/api ./cmd/api

# Runtime: Node 22 runs the TS engine via server/shim/check-cli.mjs
FROM node:22-alpine
RUN apk add --no-cache ca-certificates
WORKDIR /app

COPY packages/protocol/package.json packages/protocol/
COPY packages/protocol/src packages/protocol/src
COPY packages/engine/package.json packages/engine/
COPY packages/engine/src packages/engine/src
COPY server/shim/check-cli.mjs server/shim/check-cli.mjs

COPY --from=gobuild --chmod=755 /out/api /api

ENV CHECK_ENGINE_CLI=/app/server/shim/check-cli.mjs
EXPOSE 8080
USER node
ENTRYPOINT ["/api"]
