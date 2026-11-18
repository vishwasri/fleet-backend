#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-rent.verssaro.com}"
EMAIL="${2:-admin@verssaro.com}"
TARGET_DIR="${3:-.}"

case "$DOMAIN" in
  *[!A-Za-z0-9.-]*|"") echo "Invalid domain: $DOMAIN" >&2; exit 1 ;;
esac

cd "$TARGET_DIR"
mkdir -p nginx certbot/conf certbot/www

render_nginx_config() {
  sed "s/__FLEET_DOMAIN__/$DOMAIN/g" "nginx/$1.template" > nginx/active.conf
}

if [ ! -f "certbot/conf/renewal/$DOMAIN.conf" ]; then
  echo "Starting Nginx with the HTTP ACME challenge config for $DOMAIN..."
  render_nginx_config bootstrap.conf
  docker compose up -d nginx

  echo "Requesting the Let's Encrypt certificate..."
  docker compose run --rm --entrypoint /bin/sh certbot -c \
    "certbot certonly --webroot -w /var/www/certbot --cert-name '$DOMAIN' -d '$DOMAIN' --email '$EMAIL' --agree-tos --no-eff-email --non-interactive"
else
  echo "Certificate found. Checking for renewal..."
  render_nginx_config production.conf
  docker compose up -d nginx
  docker compose run --rm --entrypoint /bin/sh certbot -c \
    "certbot renew --webroot -w /var/www/certbot --quiet"
fi

render_nginx_config production.conf
docker compose exec -T nginx nginx -t
docker compose exec -T nginx nginx -s reload
echo "Nginx is serving https://$DOMAIN"
