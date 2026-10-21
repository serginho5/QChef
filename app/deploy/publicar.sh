#!/bin/sh
# Publica o QChef em https://appnovidades.com.br/qchef (igual ao Dieta Fácil)
# Gera o build aqui (com o .env local), copia para low_ticket/sites/qchef
# e usa o publicar.sh do low_ticket, que envia todos os sites para a VPS.
# Uso: sh deploy/publicar.sh
set -e

ROOT=$(cd "$(dirname "$0")/.." && pwd)
LOW_TICKET=${LOW_TICKET:-/c/projetos/low_ticket}
DESTINO=$LOW_TICKET/sites/qchef

if [ ! -f "$ROOT/.env" ]; then
  echo "Falta o arquivo .env: sem ele o build sai em modo demonstração." >&2
  exit 1
fi

cd "$ROOT"
npm run build

rm -rf "$DESTINO"
mkdir -p "$DESTINO"
cp -R "$ROOT/dist/." "$DESTINO/"

sh "$LOW_TICKET/deploy/publicar.sh"
echo "QChef: https://appnovidades.com.br/qchef/"
