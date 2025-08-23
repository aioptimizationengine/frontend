#!/bin/sh
set -e

# Defaults
: "${PORT:=8000}"
: "${INSTALL_DEV_DEPS:=false}"
: "${DEV_REQUIREMENTS_PATH:=/app/backend/requirements.dev.txt}"

start_app() {
  echo "Starting API on port ${PORT}..."
  exec python -m uvicorn api:app --host 0.0.0.0 --port "${PORT}"
}

install_dev_deps_bg() {
  if [ "${INSTALL_DEV_DEPS}" = "true" ] && [ -f "${DEV_REQUIREMENTS_PATH}" ]; then
    (
      echo "Installing development dependencies in background after startup..."
      # Wait a bit to avoid competing with immediate startup
      sleep 10
      pip install --no-cache-dir -r "${DEV_REQUIREMENTS_PATH}" || echo "Dev deps install failed (non-fatal)."
    ) &
  else
    echo "Skipping dev dependencies install (INSTALL_DEV_DEPS=${INSTALL_DEV_DEPS})."
  fi
}

install_dev_deps_bg
start_app
