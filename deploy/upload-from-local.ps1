# 从本机打包并上传到远程服务器（不依赖 GitHub）
# 用法: powershell -ExecutionPolicy Bypass -File deploy/upload-from-local.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$Remote = "root@125.77.165.125"
$RemoteDir = "/www/wwwroot/crm.eegle.com.cn"
$Archive = Join-Path $env:TEMP "eda-crm-deploy.tgz"

Push-Location $ProjectRoot
try {
  Write-Host ">> 打包（不含 .next/node_modules，由 Docker 在 Linux 内构建）..."
  if (Test-Path $Archive) { Remove-Item $Archive -Force }
  tar -czf $Archive `
    --exclude=node_modules `
    --exclude=.git `
    --exclude=.next `
    --exclude=prisma/dev.db `
    --exclude=uploads `
    --exclude=data `
    --exclude=.env `
    -C $ProjectRoot .

  Write-Host ">> 上传到服务器..."
  scp $Archive "${Remote}:${RemoteDir}/eda-crm-deploy.tgz"

  Write-Host ">> 远程解压并 Docker 部署（后台执行，日志 /tmp/eda-deploy.log）..."
  ssh -o ServerAliveInterval=30 $Remote @"
set -e
cd $RemoteDir
mkdir -p data uploads
tar -xzf eda-crm-deploy.tgz
rm -f eda-crm-deploy.tgz
if [ ! -f .env ]; then
  echo "SESSION_SECRET=`$(openssl rand -hex 32)" > .env
  echo "CRON_SECRET=" >> .env
fi
mkdir -p /www/server/panel/vhost/nginx/extension/crm.eegle.com.cn
cp -f deploy/nginx-proxy.conf /www/server/panel/vhost/nginx/extension/crm.eegle.com.cn/reverse-proxy.conf
nginx -t && nginx -s reload
nohup sh -c 'docker compose down || true; docker compose up -d --build; docker compose exec -T eda-crm npx tsx prisma/seed.ts || true' > /tmp/eda-deploy.log 2>&1 &
echo DEPLOY_STARTED
"@

  Write-Host ">> 已启动远程构建。查看进度: ssh $Remote tail -f /tmp/eda-deploy.log"
}
finally {
  Pop-Location
}
