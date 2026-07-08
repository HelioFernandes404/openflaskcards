#!/bin/sh
set -e

media_dir="${MEDIA_DIR:-/app/media}"
mkdir -p "$media_dir"
chown -R app:app "$media_dir"

exec su-exec app /app/api
