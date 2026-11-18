#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-/opt/fleet}"
cd "$TARGET_DIR"

docker compose run --rm --entrypoint /bin/sh certbot -c \
  "certbot renew --webroot -w /var/www/certbot --quiet"
docker compose exec -T nginx nginx -t
docker compose exec -T nginx nginx -s reload
