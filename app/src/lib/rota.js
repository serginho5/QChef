// Roteador simples por hash (#/inicio, #/receita), funciona na web e no app instalado.
import { useSyncExternalStore } from 'react'

function ler() {
  const h = location.hash.replace(/^#/, '') || '/'
  const [caminho, qs] = h.split('?')
  return { caminho, partes: caminho.split('/').filter(Boolean), q: new URLSearchParams(qs || '') }
}
let atual = ler()
const ouv = new Set()
export function rolarTopo() {
  window.scrollTo(0, 0)
  document.querySelector('.rolagem')?.scrollTo(0, 0)
}
window.addEventListener('hashchange', () => { atual = ler(); ouv.forEach((f) => f()); rolarTopo() })

export const useRota = () => useSyncExternalStore((cb) => { ouv.add(cb); return () => ouv.delete(cb) }, () => atual)
export const navegar = (c) => { location.hash = c }
export const trocar = (c) => { history.replaceState(null, '', '#' + c); atual = ler(); ouv.forEach((f) => f()); rolarTopo() }
let passos = 0
window.addEventListener('hashchange', () => { passos++ })
export function voltar(padrao = '/inicio') {
  if (passos > 0) { passos -= 2; history.back() } else navegar(padrao)
}
