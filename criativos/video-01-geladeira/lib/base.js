// base.js — ferramentas de animação e o "roteador" de cenas do vídeo.
// Regra de ouro: tudo é função de t. Nada de Date.now, Math.random sem semente,
// requestAnimationFrame ou transition/animation do CSS.
//
// Precisa, antes dele: <script src="tempos.js"> (gerado pelo tempos.mjs) e no HTML:
//   <div id="manchete"></div> <div id="fala"></div> e um <div class="cena" id="c1">… por cena.
// Uso no fim do video.html:
//   montarVideo({ cenas: { c1: cena1, c2: cena2 }, cores: { c1: '#2F5212' }, falaClara: ['c2'] })

// ---------- matemática do tempo ----------
const limitar = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const prog = (t, ini, dur) => limitar((t - ini) / dur)             // 0 → 1 dentro da janela
const lerp = (a, b, p) => a + (b - a) * p
const outCubic = (p) => 1 - Math.pow(1 - p, 3)
const inOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const outBack = (p) => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2) }
const pulso = (t, ini, dur) => Math.sin(prog(t, ini, dur) * Math.PI) // 0 → 1 → 0
const entra = (t, ini, dur = 0.5) => outBack(prog(t, ini, dur))     // "pop" com leve passada
// aleatório com semente: mesma semente → mesma sequência (para sortear posições uma vez só)
function semente (s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296 } }

// ---------- DOM ----------
const $ = (id) => document.getElementById(id)
const css = (el, o) => Object.assign((typeof el === 'string' ? $(el) : el).style, o)
// cuidado: passe o modo certo para quem não é block (ex.: barras em grid → mostrar(id, v, 'grid'))
const mostrar = (el, v, modo = 'block') => { (typeof el === 'string' ? $(el) : el).style.display = v ? modo : 'none' }
const fmt = (n, casas = 1) => n.toFixed(casas).replace('.', ',')
// aparece subindo e some no instante "sai"
const aparece = (el, t, ini, sai = Infinity) => {
  const p = outCubic(prog(t, ini, 0.45)), q = prog(t, sai - 0.3, 0.3)
  css(el, { opacity: p * (1 - q), transform: `translateY(${(1 - p) * 60}px) scale(${lerp(0.92, 1, p)})` })
}
// pop de etiqueta flutuando
const pop = (el, t, ini, x, y, rot = 0) => {
  const p = entra(t, ini)
  css(el, { left: x + 'px', top: y + 'px', opacity: limitar(p * 2), transform: `translateY(${Math.sin(t * 2.2 + x) * 8}px) scale(${limitar(p, 0, 1.15)}) rotate(${rot}deg)` })
}

// ---------- sincronia com a narração ----------
const TEMPOS = window.TEMPOS
const CENA = Object.fromEntries(TEMPOS.cenas.map((c) => [c.id, c]))
// instante em que a palavra começa a ser dita (n-ésima ocorrência na cena)
const W = (id, palavra, n = 0) => {
  const lista = CENA[id].palavras.filter((p) => p.txt.toLowerCase().replace(/[^\p{L}\p{N}$]/gu, '').startsWith(palavra.toLowerCase()))
  if (!lista[n]) throw new Error(`palavra "${palavra}" não encontrada na cena ${id}`)
  return lista[n].t0
}
const TR = (id, i) => CENA[id].trechos[i].t0          // início do trecho i (frase entre pontuações)
const TRfim = (id, i) => CENA[id].trechos[i].t1

// ---------- legendas: manchete (topo) e fala (palavra dita acende) ----------
for (const c of TEMPOS.cenas) {
  c.blocos = []
  let b = []
  for (const [k, w] of c.palavras.entries()) {
    b.push(w)
    if (b.length >= 6 || (/[,.:;?!]$/.test(w.txt) && b.length >= 3) || k === c.palavras.length - 1) { c.blocos.push(b); b = [] }
  }
}
let _manchete = null, _bloco = null
function desenharManchete (c, t, cor) {
  const el = $('manchete'); if (!el) return
  if (_manchete !== c.id) { el.innerHTML = (c.manchete || '').split(' ').map((p) => `<span>${p}</span>`).join(' '); _manchete = c.id }
  el.style.color = cor
  ;[...el.children].forEach((s, i) => {
    const p = limitar(outBack(prog(t, c.ini + 0.1 + i * 0.07, 0.45)), 0, 1.1)
    css(s, { opacity: limitar(p) * (1 - prog(t, c.fim - 0.3, 0.3)), transform: `translateY(${(1 - limitar(p)) * 50}px) scale(${lerp(0.9, 1, limitar(p))})` })
  })
}
function desenharFala (c, t, clara) {
  const el = $('fala'); if (!el) return
  const b = c.blocos.find((x) => t < x[x.length - 1].t1 + 0.12) || c.blocos[c.blocos.length - 1]
  const chave = c.id + b[0].t0
  if (_bloco !== chave) {
    el.innerHTML = `<span class="caixa" style="background:${clara ? '#fff' : '#1F2328'};color:${clara ? '#1F2328' : '#fff'}">` + b.map((w) => `<span class="w">${w.txt}</span>`).join(' ') + '</span>'
    _bloco = chave
  }
  el.querySelectorAll('.w').forEach((w, i) => w.classList.toggle('on', t >= b[i].t0))
  el.style.opacity = limitar(prog(t, c.palavras[0].t0 - 0.15, 0.15)) * (1 - prog(t, c.palavras[c.palavras.length - 1].t1 + 0.25, 0.25))
}

// ---------- roteador: escolhe a cena de t, faz a transição e desenha ----------
function montarVideo ({ cenas, cores = {}, falaClara = [], transicao = 0.4, largura = 1080, altura = 1920 }) {
  window.VIDEO = { largura, altura, fps: 30, duracao: TEMPOS.duracao }
  window.CENAS = TEMPOS.cenas
  const lista = TEMPOS.cenas
  window.renderAt = function (t) {
    let i = lista.findIndex((c) => t < c.fim); if (i < 0) i = lista.length - 1
    const atual = lista[i]
    for (const c of lista) mostrar(c.id, false)
    // a cena nova sobe por cima da anterior (que encolhe um pouco)
    const p = i === 0 ? 1 : inOutCubic(prog(t, atual.ini, transicao))
    if (p < 1) { const ant = lista[i - 1]; mostrar(ant.id, true); css(ant.id, { zIndex: 1, transform: `scale(${1 - p * 0.06})` }); cenas[ant.id](Math.min(t, ant.fim - 0.001)) }
    mostrar(atual.id, true)
    css(atual.id, { zIndex: 2, transform: `translateY(${(1 - p) * altura}px)` })
    cenas[atual.id](t)
    desenharManchete(atual, t, cores[atual.id] || '#1E2B16')
    desenharFala(atual, t, falaClara.includes(atual.id))
  }
  window.renderAt(0)
}
