#!/bin/bash

set -e

BASE_URL="${BASE_URL:-http://127.0.0.1:5173}"
WITH_BACKEND=0
for arg in "$@"; do
  if [ "$arg" = "--with-backend" ]; then
    WITH_BACKEND=1
  fi
done

cleanup() {
  if [ -n "$VITE_PID" ]; then
    echo "Arrêt de Vite..."
    kill "$VITE_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [ "$WITH_BACKEND" -eq 1 ]; then
  if ! curl -s "${BASE_URL}/api/health" > /dev/null; then
    echo "Backend API inaccessible. Démarrez le backend avant les captures."
    echo "Exemple: npm run server"
  fi
fi

echo "Démarrage de Vite..."
npm run dev > /tmp/mission-app-vite.log 2>&1 &
VITE_PID=$!

echo "PID Vite: $VITE_PID"
echo "Attente de $BASE_URL..."

READY=0
for i in {1..40}; do
  if curl -s "$BASE_URL" > /dev/null; then
    echo "✓ Frontend prêt"
    READY=1
    break
  fi

  echo "Attente... ($i/40)"
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo "✗ Frontend non joignable. Dernières lignes du log:"
  tail -n 20 /tmp/mission-app-vite.log || true
  exit 1
fi

BASE_URL=$BASE_URL node scripts/capture-ui.js "$@"
