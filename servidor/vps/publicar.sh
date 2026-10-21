#!/bin/sh
# Publica o servidor do QChef na VPS (container Docker atrás do Traefik), igual ao webhook do Dieta Fácil.
# Precisa de servidor/vps/.env (QCHEF_GEMINI_KEY=..., KIWIFY_TOKEN=...) e servidor/vps/service-account.json, ambos fora do git.
# Uso: sh servidor/vps/publicar.sh
set -e

SERVER=${SERVER:-root@2.25.104.104}
# Se a sua internet não alcança o IPv4 da VPS: SSH_OPTS="-6" SERVER=root@srv1899434.hstgr.cloud sh ...
# (HostKeyAlias confere a chave do servidor já conhecida pelo IPv4)
SSH_OPTS="${SSH_OPTS:-} -o HostKeyAlias=2.25.104.104"
REMOTE=/docker/qchef-api
DIR=$(cd "$(dirname "$0")" && pwd)

for f in .env service-account.json; do
  [ -f "$DIR/$f" ] || { echo "Falta servidor/vps/$f." >&2; exit 1; }
done

# A geração da receita é a mesma do teste local (servidor/functions/receita.js + catálogo de fotos do app)
node "$DIR/../functions/copiar-catalogo.js"
cp "$DIR/../functions/receita.js" "$DIR/../functions/catalogo.json" "$DIR/"

ssh $SSH_OPTS "$SERVER" "mkdir -p $REMOTE"
scp $SSH_OPTS "$DIR/Dockerfile" "$DIR/docker-compose.yml" "$DIR/package.json" "$DIR/server.js" "$DIR/receita.js" "$DIR/catalogo.json" "$DIR/.env" "$DIR/service-account.json" "$SERVER:$REMOTE/"
ssh $SSH_OPTS "$SERVER" "cd $REMOTE && chmod 600 .env service-account.json && chown 1000:1000 service-account.json && docker compose up -d --build --force-recreate && docker compose ps"

echo "API: https://appnovidades.com.br/api/qchef/  ·  Webhook Kiwify: https://appnovidades.com.br/api/qchef/kiwify"
