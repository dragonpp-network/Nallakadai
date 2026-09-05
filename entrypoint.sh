#!/bin/sh
set -e

# Ensure all volume directories exist and have full read/write permissions
mkdir -p /app/data/backups /app/data/uploads /data/backups /data/uploads /tmp/nk-data 2>/dev/null || true
chmod -R 777 /app/data /data /tmp/nk-data 2>/dev/null || true
chown -R nextjs:nodejs /app/data 2>/dev/null || true

# Run application as nextjs user if running as root
if [ "$(id -u)" = "0" ]; then
  exec su-exec nextjs node server.js
else
  exec node server.js
fi
