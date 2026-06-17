#!/bin/bash
# Вставьте целиком в веб-консоль REG.cloud (VNC), когда SSH с ПК не работает.
set -e
export DEBIAN_FRONTEND=noninteractive

echo "=== SSH / nginx / API ==="
systemctl daemon-reexec || true
systemctl enable ssh
systemctl restart ssh
systemctl restart nginx 2>/dev/null || true
systemctl restart trassa-api 2>/dev/null || true

echo "=== Firewall ==="
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable 2>/dev/null || true
fi

echo "=== Listen ports ==="
ss -ltnp | egrep ':22|:80|:443|:4000' || true

echo "=== Local API health ==="
curl -sf http://127.0.0.1:4000/api/health && echo || echo "API not on :4000 yet (run full deploy after SSH works)"

echo "=== SSH service ==="
systemctl status ssh --no-pager | head -n 15

echo "DONE — try from PC: ssh root@194.226.166.10"
