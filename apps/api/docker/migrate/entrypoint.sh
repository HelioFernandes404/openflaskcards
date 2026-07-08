#!/bin/sh
set -e

DIR="${MIGRATIONS_DIR:-file:///migrations}"
URL="${DATABASE_URL:?DATABASE_URL is required}"

latest_version() {
  ls /migrations/*.sql 2>/dev/null | xargs -n1 basename | cut -d_ -f1 | sort | tail -1
}

first_version() {
  ls /migrations/*.sql 2>/dev/null | xargs -n1 basename | cut -d_ -f1 | sort | head -1
}

table_exists() {
  psql "$URL" -tAc \
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$1')"
}

detect_baseline_version() {
  if [ "$(table_exists media)" = "t" ]; then
    latest_version
    return
  fi

  if [ "$(table_exists users)" = "t" ]; then
    first_version
    return
  fi

  echo ""
}

apply_migrations() {
  atlas migrate apply --dir "$DIR" --url "$URL" "$@"
}

echo "Running database migrations..."

if ! apply_migrations 2>/tmp/atlas-err.log; then
  if ! grep -q "not clean" /tmp/atlas-err.log; then
    cat /tmp/atlas-err.log >&2
    exit 1
  fi

  BASELINE="${ATLAS_BASELINE_VERSION:-}"

  if [ -z "$BASELINE" ] && [ "${ATLAS_AUTO_BASELINE:-}" = "true" ]; then
    BASELINE="$(detect_baseline_version)"
  fi

  if [ -z "$BASELINE" ]; then
    cat /tmp/atlas-err.log >&2
    echo "" >&2
    echo "Database has schema without Atlas revision tracking." >&2
    echo "Options:" >&2
    echo "  - Fresh start: docker compose down -v && docker compose up" >&2
    echo "  - Set ATLAS_BASELINE_VERSION to the last applied migration version" >&2
    echo "  - Set ATLAS_AUTO_BASELINE=true to infer baseline from existing tables (dev)" >&2
    exit 1
  fi

  echo "Baselining Atlas to version ${BASELINE}..."
  apply_migrations --baseline "$BASELINE"
fi

echo "Migrations complete."
