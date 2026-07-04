#!/bin/bash
set -euo pipefail

APP_DIR="/www/wwwroot/crm.eegle.com.cn"
REPO_URL="${REPO_URL:-https://github.com/Jkccn/eda-crm.git}"
NGINX_EXT="/www/server/panel/vhost/nginx/extension/crm.eegle.com.cn"

mkdir -p "$APP_DIR" "$NGINX_EXT" "$APP_DIR/data" "$APP_DIR/uploads"

if [ ! -d "$APP_DIR/.git" ]; then
  find "$APP_DIR" -mindepth 1 -maxdepth 1 ! -name '.user.ini' -exec rm -rf {} +
  git clone "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  git pull --ff-only
fi

cd "$APP_DIR"

if [ ! -f .env ]; then
  SESSION_SECRET="$(openssl rand -hex 32)"
  cat > .env <<EOF
SESSION_SECRET=${SESSION_SECRET}
CRON_SECRET=
EOF
fi

cp -f deploy/nginx-proxy.conf "$NGINX_EXT/reverse-proxy.conf"
nginx -t
nginx -s reload

docker compose down || true
docker compose up -d --build

echo "Deployed. App listening on 127.0.0.1:3001"
