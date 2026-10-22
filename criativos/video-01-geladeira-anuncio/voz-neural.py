"""Narração com voz neural da Microsoft (edge-tts) no mesmo formato do voz.py do motor.

Uso (Python do motor): python voz-neural.py <pasta-do-video>
Lê falas.json ("vozNeural", "taxaNeural", "pronuncia"), quebra cada fala em trechos como o voz.py,
grava narracao/partes/<cena>_<n>.wav (PCM 16 bits mono 24 kHz) e narracao/partes.json.
Depois rode tempos.mjs normalmente.

Atenção: o edge-tts usa o serviço de leitura do Edge, sem licença clara para anúncio. Para a versão
que vai ao ar, gere as mesmas vozes pelo Azure Speech (uso comercial liberado).
"""
import asyncio
import json
import os
import re
import subprocess
import sys

import edge_tts

TAXA = 24000


def trechos(fala):
    return [m.strip() for m in re.findall(r'.+?(?:[,.:;?!]+(?=\s|$)|$)', fala) if m.strip()]


async def gerar(texto, voz, taxa, destino):
    mp3 = destino[:-4] + '.mp3'
    await edge_tts.Communicate(texto, voz, rate=taxa).save(mp3)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', str(TAXA), '-sample_fmt', 's16', destino], check=True)
    os.remove(mp3)


def main(pasta):
    with open(os.path.join(pasta, 'falas.json'), encoding='utf-8-sig') as f:
        cfg = json.load(f)
    voz = cfg.get('vozNeural', 'pt-BR-FranciscaNeural')
    taxa = cfg.get('taxaNeural', '+8%')
    dir_partes = os.path.join(pasta, 'narracao', 'partes')
    os.makedirs(dir_partes, exist_ok=True)
    for antigo in os.listdir(dir_partes):
        if antigo.endswith('.wav'):
            os.remove(os.path.join(dir_partes, antigo))
    partes = []
    for cena in cfg['cenas']:
        for n, texto in enumerate(trechos(cena['fala'])):
            dito = texto
            for escrito, extenso in cfg.get('pronuncia', {}).items():
                dito = dito.replace(escrito, extenso)
            arquivo = f"{cena['id']}_{n:02d}.wav"
            asyncio.run(gerar(dito, voz, taxa, os.path.join(dir_partes, arquivo)))
            partes.append({'cena': cena['id'], 'n': n, 'texto': texto, 'arquivo': arquivo})
            print(f'{arquivo}  {texto}')
    with open(os.path.join(pasta, 'narracao', 'partes.json'), 'w', encoding='utf-8') as f:
        json.dump(partes, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main(sys.argv[1])
