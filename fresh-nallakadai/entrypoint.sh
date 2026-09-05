#!/bin/sh
set -e

echo "=== [Nallakadai Startup] Initializing persistent storage ==="

IS_DATA_MOUNT=0
IS_APP_DATA_MOUNT=0

if [ -f "/proc/mounts" ]; then
  if grep -qE "^[^ ]+[ ]+/data([ ]|$)" /proc/mounts; then IS_DATA_MOUNT=1; fi
  if grep -qE "^[^ ]+[ ]+/app/data([ ]|$)" /proc/mounts; then IS_APP_DATA_MOUNT=1; fi
fi

PRIMARY_STORAGE="/app/data"

if [ "$IS_DATA_MOUNT" -eq 1 ] && [ "$IS_APP_DATA_MOUNT" -eq 0 ]; then
  echo "[Storage] /data is the persistent volume mount point. Unifying /app/data -> /data..."
  PRIMARY_STORAGE="/data"
  mkdir -p /data/backups /data/uploads /tmp/nk-data 2>/dev/null || true
  
  # Seed if /data is completely empty but image has build-time template
  if [ -d "/app/data" ] && [ ! -L "/app/data" ]; then
    if [ ! -f "/data/store.json" ] && [ -f "/app/data/store.json" ]; then
      echo "[Storage] Seeding initial store.json from build template into persistent /data..."
      cp -r /app/data/* /data/ 2>/dev/null || true
    fi
    rm -rf /app/data
  fi
  ln -sfn /data /app/data

elif [ "$IS_APP_DATA_MOUNT" -eq 1 ] && [ "$IS_DATA_MOUNT" -eq 0 ]; then
  echo "[Storage] /app/data is the persistent volume mount point. Unifying /data -> /app/data..."
  PRIMARY_STORAGE="/app/data"
  mkdir -p /app/data/backups /app/data/uploads /tmp/nk-data 2>/dev/null || true
  if [ ! -d "/data" ] || [ ! -L "/data" ]; then
    rm -rf /data
    ln -sfn /app/data /data 2>/dev/null || true
  fi

else
  echo "[Storage] Standard storage initialization at /app/data..."
  mkdir -p /app/data/backups /app/data/uploads /data/backups /data/uploads /tmp/nk-data 2>/dev/null || true
  if [ ! -e "/data" ]; then
    ln -sfn /app/data /data 2>/dev/null || true
  fi
fi

# Ensure full permissions for nextjs user (UID 1001)
chown -R nextjs:nodejs /app/data /data /tmp/nk-data 2>/dev/null || true
chmod -R 777 /app/data /data /tmp/nk-data 2>/dev/null || true

echo "[Storage] Storage verified at $PRIMARY_STORAGE. Starting Next.js application..."

# Drop root privileges and start Next.js
if [ "$(id -u)" = "0" ]; then
  exec su-exec nextjs node server.js
else
  exec node server.js
fi
