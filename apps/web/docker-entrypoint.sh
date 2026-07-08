#!/bin/sh
set -eu

template_path="/etc/cogcs/runtime-config.template.js"
output_path="/usr/share/nginx/html/runtime-config.js"

export COGCS_API_URL="${COGCS_API_URL:-http://localhost:3030/api/v1}"
export COGCS_API_TIMEOUT="${COGCS_API_TIMEOUT:-10000}"
export COGCS_API_RETRY_ATTEMPTS="${COGCS_API_RETRY_ATTEMPTS:-3}"
export COGCS_API_RETRY_DELAY="${COGCS_API_RETRY_DELAY:-1000}"
export COGCS_SKIP_AUTH_ENABLED="${COGCS_SKIP_AUTH_ENABLED:-true}"

envsubst \
  '${COGCS_API_URL} ${COGCS_API_TIMEOUT} ${COGCS_API_RETRY_ATTEMPTS} ${COGCS_API_RETRY_DELAY} ${COGCS_SKIP_AUTH_ENABLED}' \
  < "$template_path" \
  > "$output_path"
