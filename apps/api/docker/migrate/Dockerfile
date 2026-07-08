# syntax=docker/dockerfile:1.7
FROM alpine:3.20

ARG ATLAS_VERSION=0.32.0

RUN apk add --no-cache postgresql-client curl ca-certificates && \
    curl -sSf "https://release.ariga.io/atlas/atlas-linux-amd64-v${ATLAS_VERSION}" \
      -o /usr/local/bin/atlas && \
    chmod +x /usr/local/bin/atlas && \
    apk del curl

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
