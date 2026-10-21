#!/bin/sh
# Publica a página de vendas do QChef (/qchef-oferta/) e as páginas das promessas dos posts (/qchef-receita/, /qchef-desafio/)
# Copia pagina-vendas/site para low_ticket/sites/qchef-oferta e usa o publicar.sh do low_ticket.
# Uso: bash pagina-vendas/publicar.sh
set -e
ROOT=$(cd "$(dirname "$0")" && pwd)
LOW=${LOW_TICKET:-/c/projetos/low_ticket}
DEST="$LOW/sites/qchef-oferta"
rm -rf "$DEST" && mkdir -p "$DEST"
cp -r "$ROOT/site/." "$DEST/"
# Páginas que entregam as promessas dos posts (sem interação humana)
for f in receita desafio; do
  rm -rf "$LOW/sites/qchef-$f" && mkdir -p "$LOW/sites/qchef-$f"
  cp -r "$ROOT/ferramentas/$f/." "$LOW/sites/qchef-$f/"
done
sh "$LOW/deploy/publicar.sh"
echo "Página de vendas: https://appnovidades.com.br/qchef-oferta/"
echo "Receita com o que tem: https://appnovidades.com.br/qchef-receita/"
echo "Desafio 7 dias: https://appnovidades.com.br/qchef-desafio/"
