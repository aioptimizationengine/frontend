#!/bin/sh
set -e

# Defaults
: "${PORT:=8000}"
: "${INSTALL_DEV_DEPS:=false}"
: "${DEV_REQUIREMENTS_PATH:=/app/backend/requirements.dev.txt}"
: "${AUTO_INIT_DB:=true}"
: "${DB_INIT_SQL:=/app/backend/database_setup.sql}"

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

init_db_schema() {
  if [ "${AUTO_INIT_DB}" = "true" ] && [ -f "${DB_INIT_SQL}" ]; then
    echo "Initializing database schema from ${DB_INIT_SQL}..."
    attempt=1
    while [ $attempt -le 10 ]; do
      if python /app/setup_db.py "${DB_INIT_SQL}"; then
        echo "Database schema applied successfully."
        return 0
      fi
      echo "DB init attempt ${attempt} failed. Retrying in 3s..."
      attempt=$((attempt+1))
      sleep 3
    done
    echo "WARNING: Failed to apply database schema after multiple attempts. Continuing startup."
  else
    echo "Skipping DB schema init (AUTO_INIT_DB=${AUTO_INIT_DB}, DB_INIT_SQL=${DB_INIT_SQL})."
  fi
}

install_dev_deps_bg
init_db_schema
start_app
