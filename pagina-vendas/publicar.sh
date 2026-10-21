#!/bin/sh
# Publica a página de vendas do QChef em https://appnovidades.com.br/qchef-oferta/
# Copia pagina-vendas/site para low_ticket/sites/qchef-oferta e usa o publicar.sh do low_ticket.
# Uso: bash pagina-vendas/publicar.sh
set -e
ROOT=$(cd "$(dirname "$0")" && pwd)
LOW=${LOW_TICKET:-/c/projetos/low_ticket}
DEST="$LOW/sites/qchef-oferta"
rm -rf "$DEST" && mkdir -p "$DEST"
cp -r "$ROOT/site/." "$DEST/"
sh "$LOW/deploy/publicar.sh"
echo "Página de vendas: https://appnovidades.com.br/qchef-oferta/"
