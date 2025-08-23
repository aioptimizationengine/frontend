#!/bin/sh
set -e

DATA_DIR="/var/lib/postgresql/data"
CERTS_DIR="$DATA_DIR/certs"

fix_key_perms() {
  # Fix permissions if key is at default path
  if [ -f "$DATA_DIR/server.key" ]; then
    chown postgres:postgres "$DATA_DIR/server.key" || true
    chmod 600 "$DATA_DIR/server.key" || true
  fi
  # Fix permissions if key is under certs/
  if [ -f "$CERTS_DIR/server.key" ]; then
    chown postgres:postgres "$CERTS_DIR/server.key" || true
    chmod 600 "$CERTS_DIR/server.key" || true
  fi
}

fix_key_perms

exec docker-entrypoint.sh postgres -p "${PORT:-5432}"
