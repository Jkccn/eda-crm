#!/bin/sh
set -e
cd /www/wwwroot/crm.eegle.com.cn
rm -rf .next
docker compose down || true
docker compose build --no-cache
docker compose up -d
sleep 8
docker compose exec -T eda-crm npx tsx prisma/seed.ts || true
curl -s -X POST http://127.0.0.1:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
echo
