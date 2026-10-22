// celular.js — simula o uso de um app como se fosse gravação de tela.
// HTML esperado (ver video.html do modelo):
//   <div class="fone"><div class="vidro">
//     <div class="tela" id="s-inicio"><div class="rolo">…</div></div>  (uma .tela por tela do app)
//     <div class="ui-nav" id="nav"></div>
//     <div class="onda" id="onda"></div><div class="dedo" id="dedo"></div>
//   </div></div>
// Coordenadas dos toques são dentro da tela do celular sem escala (≈ 290 × 628).

const ICONES_NAV = [
  '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  '<path d="M5 4h14v16H5z"/><path d="M9 4v16"/>',
  '<path d="M5 21V4h12l-2 4 2 4H5"/>',
  '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
]
// barra de navegação inferior; lembre de mostrar com mostrar(id, true, 'grid')
function nav (id, ativo, cor = '#4E7D22', icones = ICONES_NAV) {
  $(id).innerHTML = icones.map((d, i) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${i === ativo ? cor : '#8A9482'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`).join('')
}

// eventos: [{ t, tela, modo? }] — modo 'empurra' (desliza da direita, padrão) ou 'some' (troca com fade)
function navegar (t, eventos) {
  let i = 0
  while (i + 1 < eventos.length && t >= eventos[i + 1].t) i++
  const atual = eventos[i], ant = eventos[i - 1]
  const p = i === 0 ? 1 : inOutCubic(prog(t, atual.t, 0.35))
  for (const e of eventos) mostrar(e.tela, false)
  mostrar(atual.tela, true)
  const modo = atual.modo || 'empurra'
  if (modo === 'some') css(atual.tela, { transform: 'none', opacity: p, zIndex: 2 })
  else css(atual.tela, { transform: `translateX(${(1 - p) * 100}%)`, opacity: 1, zIndex: 2 })
  if (ant && p < 1 && ant.tela !== atual.tela) { mostrar(ant.tela, true); css(ant.tela, { transform: modo === 'some' ? 'none' : `translateX(${-p * 30}%)`, opacity: 1, zIndex: 1 }) }
  return atual
}

// toques: [{ t, x, y }] — o dedo anda até o alvo nos 0,55 s anteriores, afunda no toque e solta uma onda
function dedo (t, idDedo, idOnda, toques, ini, fim) {
  let i = 0
  while (i + 1 < toques.length && t >= toques[i + 1].t - 0.55) i++
  const alvo = toques[i], de = toques[i - 1] || { x: alvo.x + 60, y: alvo.y + 160 }
  const m = inOutCubic(prog(t, alvo.t - 0.55, 0.45))
  const aperto = pulso(t, alvo.t - 0.08, 0.22)
  const vis = limitar(prog(t, ini, 0.3)) * (1 - prog(t, fim - 0.3, 0.3))
  css(idDedo, { left: lerp(de.x, alvo.x, m) + 'px', top: lerp(de.y, alvo.y, m) + 'px', opacity: vis, transform: `scale(${1 - aperto * 0.3})` })
  const ultimo = [...toques].reverse().find((k) => t >= k.t)
  const po = ultimo ? prog(t, ultimo.t, 0.45) : 1
  css(idOnda, { left: (ultimo || alvo).x + 'px', top: (ultimo || alvo).y + 'px', opacity: (1 - po) * vis, transform: `scale(${1 + po * 1.6})` })
}

// rolagem suave de uma tela (o .rolo sobe "px" entre ini e ini+dur)
const rolar = (id, t, ini, px, dur = 0.9) => css(id, { transform: `translateY(${-inOutCubic(prog(t, ini, dur)) * px}px)` })
