FROM rust:1.88-alpine AS fsrs-builder

WORKDIR /src
RUN apk add --no-cache musl-dev

COPY apps/fsrs-optimizer/Cargo.toml apps/fsrs-optimizer/Cargo.lock* ./
COPY apps/fsrs-optimizer/src ./src
RUN cargo build --release

FROM golang:1.26-alpine AS builder

WORKDIR /src

RUN apk add --no-cache git ca-certificates

COPY apps/api/go.mod apps/api/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    GOWORK=off go mod download

COPY apps/api/ .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOWORK=off go build -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata su-exec && \
    addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --from=builder /out/api /app/api
COPY --from=fsrs-builder /src/target/release/cogcs-fsrs-optimize /app/cogcs-fsrs-optimize
COPY apps/api/migrations /app/migrations
COPY apps/api/docker-entrypoint.sh /docker-entrypoint.sh

ENV FSRS_OPTIMIZER_BIN=/app/cogcs-fsrs-optimize

RUN chown -R app:app /app && chmod +x /docker-entrypoint.sh /app/cogcs-fsrs-optimize

EXPOSE 3030
ENTRYPOINT ["/docker-entrypoint.sh"]
